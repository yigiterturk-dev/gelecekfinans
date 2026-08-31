import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { getArticleImageResult } from "@/lib/bot/images";
import { getTopics } from "@/lib/bot/topics";
import { judgeSameStory, resetSameStoryJudgeBudget, resolveArticleAIConfig, writeArticle } from "@/lib/bot/writer";
import {
  classifyRisk, decidePublication, scoreSource,
} from "@/lib/bot/autonomy";
import { AIBudgetLimitError, AIProviderFatalError } from "@/lib/bot/errors";
import {
  MIN_EVIDENCE_MATERIAL_CHARS,
  buildEvidencePacket,
  enrichEvidencePacket,
  evidenceMaterialCharacterCount,
  type ResearchCandidate,
} from "@/lib/bot/research";
import { checkPlagiarism } from "@/lib/bot/plagiarism";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "@/lib/bot/ai-budget";
import { sendBotAlert } from "@/lib/bot/alert";

/**
 * İncelemede bekleyen taslak bir gün içinde bayatlar: "BIST 100 günü kapattı"
 * haberi beş gün sonra yayınlanırsa site güncel değil güvenilmez görünür.
 * Bu yüzden REVIEW kuyruğunda bu süreyi aşan bot taslakları arşive alınır;
 * bot aynı konuyu güncel veriyle yeniden yazabilir. Elle yazılmış taslaklara
 * (articleSource != BOT) dokunulmaz.
 */
const DRAFT_STALE_HOURS = Number(process.env.ARTICLE_DRAFT_STALE_HOURS) || 36;

async function archiveStaleDrafts(runId: string): Promise<number> {
  const cutoff = new Date(Date.now() - DRAFT_STALE_HOURS * 60 * 60 * 1000);
  const { count } = await prisma.article.updateMany({
    where: { status: "DRAFT", articleSource: "BOT", createdAt: { lt: cutoff } },
    data: { status: "ARCHIVED" },
  });
  if (count > 0) {
    await logEvent(runId, "maintenance", `${count} bayat taslak arşivlendi`, {
      staleHours: DRAFT_STALE_HOURS,
    });
  }
  return count;
}

export interface OrchestratorOptions {
  count?: number;
  category?: string;
  targetWords?: number;
  autoPublish?: boolean;
  trigger: "cron" | "admin";
}

async function logEvent(
  runId: string,
  stage: string,
  message: string,
  metadata?: object,
  articleId?: string,
  level = "info",
) {
  await prisma.automationEvent.create({
    data: {
      runId, articleId, stage, message, level,
      ...(metadata ? { metadata: asJson(metadata) } : {}),
    },
  });
}

export async function runPublishingPipeline(options: OrchestratorOptions) {
  const count = Math.max(1, Math.min(options.count || 1, 10));
  const targetWords = Math.max(400, Math.min(options.targetWords || 650, 1800));
  const autoPublishEnabled = options.autoPublish === true;
  const aiBudget = resolveArticleAIBudgetConfig();
  const aiConfig = resolveArticleAIConfig();
  // Sunucu platformu isteği zorla sonlandırırsa önceki kayıt `running` kalabilir.
  // Aktif bir 300 sn işi etkilememek için yalnızca 6 dakikadan eski kayıtları
  // güvenli biçimde başarısız olarak kapat.
  await prisma.botRun.updateMany({
    where: {
      status: "running",
      startedAt: { lt: new Date(Date.now() - 6 * 60 * 1000) },
    },
    data: {
      status: "failed",
      finishedAt: new Date(),
      errors: "Sunucu zaman sınırı nedeniyle çalışma tamamlanamadı; güvenli küçük işlere bölünerek yeniden denenebilir.",
    },
  });
  const run = await prisma.botRun.create({ data: { articlesFound: 0 } });
  await logEvent(run.id, "start", `${options.trigger} yayın akışı başladı`, {
    count, targetWords, category: options.category || "otomatik", autoPublishEnabled,
    pipelineVersion: "gf-evidence-v5-cost-guard",
    aiProvider: aiConfig.provider,
    writerModel: aiConfig.writerModel,
    verifierModel: aiConfig.verifierModel,
    aiBudget,
  });
  await archiveStaleDrafts(run.id);

  // Kanıt kümesi geçmeyen konular daha LLM'e gitmeden eleneceği için daha
  // geniş aday havuzu çekilir; böylece hedef adet uğruna kalite gevşetilmez.
  // Yakın zamanda kalite kapısında reddedilen aynı başlığı her küçük işte
  // yeniden modele göndermek gereksiz kredi tüketir. Daha geniş havuz çek,
  // son 6 saatte reddedilen başlıkları soğut ve geriye kalan adaylardan çalış.
  const [topicCandidates, recentQualityEvents] = await Promise.all([
    getTopics(count * 24, options.category || undefined),
    prisma.automationEvent.findMany({
      where: {
        stage: "quality",
        level: "warning",
        createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { metadata: true },
    }),
  ]);
  const cooledTitles = new Set(
    recentQualityEvents.flatMap((event) => {
      const metadata = event.metadata as { title?: unknown } | null;
      return typeof metadata?.title === "string"
        ? [metadata.title.trim().toLocaleLowerCase("tr-TR")]
        : [];
    }),
  );
  const topics = topicCandidates
    .filter((topic) => !cooledTitles.has(topic.title.trim().toLocaleLowerCase("tr-TR")))
    .slice(0, count * 8);
  await prisma.botRun.update({ where: { id: run.id }, data: { articlesFound: topics.length } });
  if (!topics.length) {
    await logEvent(run.id, "topics", "Konu bulunamadı");
    await prisma.botRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "completed", errors: "Konu bulunamadı" },
    });
    return { added: 0, autoPublished: 0, reviewQueued: 0, blocked: 0, duplicatesSkipped: 0, errors: ["Konu bulunamadı"], runId: run.id };
  }

  const recent = await prisma.article.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, title: true, content: true, automationMeta: true },
  });
  const recentConcepts = recent
    .map((item) => {
      const meta = item.automationMeta as { visual?: { brief?: { conceptKey?: string } } } | null;
      return meta?.visual?.brief?.conceptKey;
    })
    .filter((value): value is string => Boolean(value))
    .slice(-12);
  let added = 0;
  let autoPublished = 0;
  let reviewQueued = 0;
  let blocked = 0;
  let duplicatesSkipped = 0;
  let imageFallbacks = 0;
  let writerCalls = 0;
  let dailyWriterCalls = await prisma.automationEvent.count({
    where: {
      stage: "writer_call_reserved",
      createdAt: { gte: startOfIstanbulDay() },
    },
  });
  let fatalErrorCode: string | null = null;
  const errors: string[] = [];

  resetSameStoryJudgeBudget();

  for (const topic of topics) {
    if (added >= count) break;
    try {
      /**
       * Başlık benzerliği tutmadığı için doğrulanmamış konularda son bir şans:
       * aynı olayı farklı manşetle veriyor olabilecek adaylar hakeme sorulur.
       * Çağrı burada yapılır, konu havuzu hazırlanırken değil — yazılmayacak
       * konular için kredi harcanmasın diye. İlk "aynı olay" onayı yeterlidir,
       * çünkü kapının istediği ikinci bağımsız yayıncıdır.
       */
      let packet = topic.evidencePacket;
      const candidates = topic.corroborationCandidates || [];
      // Konu, kanıt fonksiyonlarına aday olarak da girer; besleme alanları
      // eksikse (elle tetiklenen akışlar) varsayılanla tamamlanır.
      const topicAsCandidate: ResearchCandidate = {
        title: topic.title,
        summary: topic.summary,
        source: topic.source,
        sourceUrl: topic.sourceUrl,
        category: topic.category,
        pubDate: topic.pubDate ?? Date.now(),
        sourcePriority: topic.sourcePriority ?? 0,
      };
      if (packet && packet.status !== "VERIFIED" && candidates.length) {
        const confirmed = new Set<ResearchCandidate>();
        const verdicts: Array<{ source: string; sameEvent: boolean }> = [];
        for (const candidate of candidates) {
          const sameEvent = await judgeSameStory(topic, candidate);
          verdicts.push({ source: candidate.source, sameEvent });
          if (sameEvent) { confirmed.add(candidate); break; }
        }
        if (confirmed.size) {
          packet = await enrichEvidencePacket(
            buildEvidencePacket(topicAsCandidate, [topicAsCandidate, ...confirmed], confirmed),
          );
        }
        await logEvent(run.id, "corroboration_judge", "İkinci kaynak adayları hakeme soruldu", {
          title: topic.title,
          askedCandidates: candidates.length,
          verdicts,
          resolved: confirmed.size > 0,
        });
      }
      if (!packet || packet.status !== "VERIFIED" || packet.independentSourceCount < 2) {
        blocked++;
        await logEvent(run.id, "research", "Konu ikinci bağımsız kaynak bulunamadığı için durduruldu", {
          title: topic.title,
          evidenceStatus: packet?.status || "MISSING",
          independentSourceCount: packet?.independentSourceCount || 0,
          reasons: packet?.reasons || [],
          judgeCandidates: candidates.length,
        }, undefined, "warning");
        continue;
      }
      /**
       * Kanıt uzunluğu kontrolü yazarın içindeydi (writer.ts RESEARCH_BLOCKED) ama
       * bütçe rezervasyonu ondan ÖNCE yapılıyordu: gövdesi çekilemeyen, yalnızca
       * RSS özetinden ibaret konular modele hiç gitmeden koşunun ve günün yazar
       * çağrısı hakkını yakıyordu (günlük sayaç writer_call_reserved kaydını
       * saydığı için etki gün boyu kalıcıydı). Kontrol rezervasyondan önce.
       */
      const materialCharacters = evidenceMaterialCharacterCount(packet);
      if (materialCharacters < MIN_EVIDENCE_MATERIAL_CHARS) {
        blocked++;
        await logEvent(run.id, "research", "Kanıt metni kısa olduğu için konu bütçe ayrılmadan durduruldu", {
          title: topic.title,
          materialCharacters,
          requiredCharacters: MIN_EVIDENCE_MATERIAL_CHARS,
          independentSourceCount: packet.independentSourceCount,
        }, undefined, "warning");
        continue;
      }

      if (isDuplicate(topic.title, topic.summary, recent).duplicate) {
        duplicatesSkipped++;
        await logEvent(run.id, "duplicate", "Benzer başlık atlandı", { title: topic.title });
        continue;
      }

      /**
       * ── KRİTİK: hakemin onayladığı paket yazara ULAŞMALI ────────────────
       * Hakem "aynı olay" dediğinde yukarıda zenginleştirilmiş yeni bir
       * `packet` üretiliyordu ama `writeArticle` konuyu alıp KENDİ içinde
       * `topic.evidencePacket` okuyor. O alan hâlâ doğrulanmamış eski paketti:
       * hakemin onayladığı her konu, bütçe rezervasyonu yapıldıktan hemen
       * sonra "İki bağımsız kaynak doğrulaması tamamlanmadı" ile ölüyordu.
       * Kayıtlarda 116 yazar çağrısına karşılık 0 makale çıkmasının sebebi
       * buydu — model değil, paketin yazara taşınmaması.
       */
      const verifiedTopic = { ...topic, evidencePacket: packet };
      const source = scoreSource(verifiedTopic);
      const risk = classifyRisk(verifiedTopic);
      if (writerCalls >= aiBudget.maxWriterCallsPerRun) {
        throw new AIBudgetLimitError(
          `İş başına ${aiBudget.maxWriterCallsPerRun} yazar çağrısı sınırına ulaşıldı; ek çağrı yapılmadı.`,
        );
      }
      if (dailyWriterCalls >= aiBudget.dailyWriterCallLimit) {
        throw new AIBudgetLimitError(
          `Günlük ${aiBudget.dailyWriterCallLimit} yazar çağrısı sınırına ulaşıldı; ek çağrı yapılmadı.`,
        );
      }
      await logEvent(run.id, "writer_call_reserved", "Yazar modeli çağrısı bütçeden ayrıldı", {
        title: topic.title,
        provider: aiConfig.provider,
        model: aiConfig.writerModel,
        runCall: writerCalls + 1,
        dailyCall: dailyWriterCalls + 1,
        maxWriterCallsPerRun: aiBudget.maxWriterCallsPerRun,
        dailyWriterCallLimit: aiBudget.dailyWriterCallLimit,
      });
      writerCalls++;
      dailyWriterCalls++;
      const article = await writeArticle(verifiedTopic, targetWords);
      const plagiarism = checkPlagiarism({
        candidate: article.content,
        evidencePacket: packet,
        recentDocuments: recent.map((item) => ({ id: item.id, title: item.title, content: item.content })),
      });
      if (!plagiarism.passed) {
        throw new Error(`PLAGIARISM_BLOCKED: ${plagiarism.issues.join("; ")}`);
      }
      const slug = slugify(article.title);
      if (await prisma.article.findUnique({ where: { slug }, select: { id: true } })) {
        duplicatesSkipped++;
        continue;
      }
      if (isDuplicate(article.title, article.content, recent).duplicate) {
        duplicatesSkipped++;
        continue;
      }

      article.content = ensureExternalLink(
        await autoLink(article.content, article.category, slug),
        article.category,
        article.keyword,
        topic.sourceUrl,
      );
      const image = await getArticleImageResult({
        title: article.title, keyword: article.keyword, category: article.category, slug,
        recentConcepts, maxAttempts: 1,
        evidenceSourceCount: packet.independentSourceCount,
      });
      const imageUrl = image.url;
      if (!imageUrl) imageFallbacks++;
      const seo = analyzeSeo({
        title: article.title, meta: article.meta, keyword: article.keyword,
        content: article.content, slug, imageUrl,
      });
      const publication = decidePublication({
        risk: risk.level, sourceScore: source.score, seoScore: seo.score,
        hasImage: Boolean(imageUrl), autoPublishEnabled,
        verifiedEvidence: article.quality.passed && article.verification.passed,
      });
      const metadata = {
        pipelineVersion: "gf-evidence-v5-cost-guard",
        trigger: options.trigger,
        sourceUrl: topic.sourceUrl || null,
        sourceDomain: source.domain,
        sourceReasons: source.reasons,
        verifiedEvidence: article.quality.passed && article.verification.passed,
        evidencePacket: packet,
        quality: article.quality,
        verification: article.verification,
        ai: article.ai,
        plagiarism,
        plagiarismRepairApplied: article.plagiarismRepairApplied,
        relevanceScore: topic.relevanceScore || null,
        relevanceReasons: topic.relevanceReasons || [],
        riskReasons: risk.reasons,
        decisionReasons: publication.reasons,
        seoIssues: seo.issues,
        visual: {
          strategy: image.strategy,
          brief: image.brief,
          audit: image.audit,
          attempts: image.attempts,
          licensedAsset: image.licensedAsset,
        },
      };
      const created = await prisma.article.create({
        data: {
          title: article.title, slug, meta: article.meta,
          keyword: article.keyword || null, category: article.category,
          content: article.content,
          ...(article.aiExtras ? { aiExtras: asJson(article.aiExtras) } : {}),
          imageUrl, source: article.source, articleSource: "BOT",
          status: publication.decision === "AUTO_PUBLISH" ? "PUBLISHED" : "DRAFT",
          publishedAt: publication.decision === "AUTO_PUBLISH" ? new Date() : null,
          seoScore: seo.score, riskLevel: risk.level,
          publicationDecision: publication.decision,
          sourceScore: source.score, imageStrategy: image.strategy,
          automationMeta: asJson(metadata),
          autoPublished: publication.decision === "AUTO_PUBLISH",
        },
      });
      await logEvent(run.id, "decision", publication.reasons.join("; "), {
        decision: publication.decision, risk: risk.level, sourceScore: source.score,
        seoScore: seo.score, imageStrategy: image.strategy,
      }, created.id);
      // Sayaçlar yalnızca makale gerçekten kaydedildikten sonra artar. Böylece
      // DB hataları karar istatistiklerini şişirmez.
      if (publication.decision === "AUTO_PUBLISH") autoPublished++;
      else if (publication.decision === "BLOCK") blocked++;
      else reviewQueued++;
      recent.push({
        id: created.id, title: created.title, content: created.content,
        // Çeşitlilik hafızası aşağıdaki recentConcepts dizisinde ayrıca tutulur.
        automationMeta: null,
      });
      recentConcepts.push(image.brief.conceptKey);
      if (recentConcepts.length > 12) recentConcepts.shift();
      added++;
    } catch (error) {
      const message = `${topic.title.slice(0, 60)}: ${(error as Error).message}`;
      errors.push(message);
      if (error instanceof AIProviderFatalError) {
        fatalErrorCode = error.code;
        await logEvent(run.id, "configuration", message, { code: error.code }, undefined, "error");
        break;
      }
      if (/^(?:QUALITY|VERIFICATION|RESEARCH|PLAGIARISM)_BLOCKED:/.test((error as Error).message)) {
        blocked++;
        await logEvent(run.id, "quality", message, {
          title: topic.title,
          code: (error as Error).message.split(":", 1)[0],
        }, undefined, "warning");
        continue;
      }
      await logEvent(run.id, "error", message, undefined, undefined, "error");
    }
  }

  await prisma.botRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(), articlesAdded: added, duplicatesSkipped,
      autoPublished, reviewQueued, blocked, imageFallbacks,
      errors: errors.length ? errors.join("\n") : null,
      status: fatalErrorCode || (errors.length > 0 && added === 0) ? "failed" : "completed",
    },
  });

  // Ölümcül yapılandırma hatası tek koşuyu değil bütün akışı durdurur; ayrıca
  // hiç makale eklenmeden hatayla biten koşu da sessizce birikmemeli.
  //
  // ── GÜNDE EN FAZLA BİR UYARI (2026-08-13) ────────────────────────────────
  // Bot günde ÜÇ kez koşuyor (05:00, 10:00, 15:30 — vercel.json). Sorun devam
  // ettiği sürece her koşu ayrı mail atıyordu: aynı arıza için günde 3 mail.
  // Sürekli gelen alarm okunmaz hale gelir ve asıl tehlike budur — insan
  // alarmı susturur, sonraki gerçek arızayı kaçırır.
  //
  // Yeni tablo/migration gerekmedi: `status: "failed"` koşulu, alarm gönderme
  // koşuluyla BİREBİR aynı (ikisi de `fatalErrorCode || (added===0 && errors)`).
  // Yani son 24 saatte başka bir "failed" koşu varsa, o gün zaten mail gitmiş
  // demektir. İlk arızada mail ANINDA gider; tekrarları susar. Sorun düzelip
  // 24 saatten sonra tekrarlarsa yeniden uyarır.
  if (fatalErrorCode || (added === 0 && errors.length > 0)) {
    let gunlukUyariVar = false;
    try {
      const oncekiHata = await prisma.botRun.count({
        where: {
          id: { not: run.id },
          status: "failed",
          finishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      gunlukUyariVar = oncekiHata > 0;
    } catch {
      // Sayım başarısız olursa uyarıyı BASTIRMA — susmaktansa fazladan mail iyi.
      gunlukUyariVar = false;
    }

    if (gunlukUyariVar) {
      console.warn(
        `[bot-alert] Son 24 saatte zaten uyarı gönderilmiş — bu koşu için mail atlanıyor. ` +
          `(koşu: ${run.id}, kod: ${fatalErrorCode ?? "yok"})`
      );
    } else {
      // AI_BUDGET_LIMIT_REACHED bizim kendi harcama frenimiz; sağlayıcıdan gelen
      // bir arıza değil. "Sağlayıcı hatası" başlığı OpenAI kredisi bitmiş gibi
      // okunup yanlış yere bakılmasına yol açıyordu.
      const budgetBrake = fatalErrorCode === "AI_BUDGET_LIMIT_REACHED";
      await sendBotAlert({
        title: budgetBrake
          ? "Harcama freni devreye girdi (sağlayıcı arızası değil)"
          : fatalErrorCode
            ? `Sağlayıcı hatası (${fatalErrorCode})`
            : "Koşu hiç makale üretemedi",
        code: fatalErrorCode,
        errors,
        runId: run.id,
        added,
      });
    }
  }

  return {
    added, autoPublished, reviewQueued, blocked, duplicatesSkipped, imageFallbacks,
    writerCalls, errors, fatalErrorCode, runId: run.id,
  };
}
