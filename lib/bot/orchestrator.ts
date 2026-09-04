import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { findSourceRepeat, isDuplicate } from "@/lib/duplicate";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { getArticleImageResult } from "@/lib/bot/images";
import { getTopics } from "@/lib/bot/topics";
import { notifyGoogleUrlUpdated } from "@/lib/bot/indexing";
import { notifyIndexNow } from "@/lib/bot/indexnow";

const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";
import { extractEntities, judgeSameStory, resetSameStoryJudgeBudget, resolveArticleAIConfig, sameStoryJudgeFailures, sameStoryJudgeSkipped, writeArticle } from "@/lib/bot/writer";
import { resetUsageLedger, usageSummary } from "@/lib/bot/usage";
import { recordEntities } from "@/lib/bot/entities";
import {
  classifyRisk, decidePublication, scoreSource,
} from "@/lib/bot/autonomy";
import { AIBudgetLimitError, AIProviderFatalError, isBlockedDraftError } from "@/lib/bot/errors";
import { saveBlockedDraft } from "@/lib/bot/blocked-draft";
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
  /**
   * ── AYNI HİKÂYE, İKİ BAŞLIK ────────────────────────────────────────────
   * 3 Eylül 2026 koşusunda "Merkez Bankası rezervleri 188,2 milyar dolar oldu"
   * ve "Merkez Bankası rezervleri belli oldu" AYNI koşuda ayrı ayrı yazıldı:
   * farklı yayıncı, farklı URL, aynı olay. `isDuplicate` yalnızca YAYINDAKİ
   * makalelere bakıyordu; ikisi de yayına çıkmadığı için karşılaştırma hiç
   * yapılmadı ve dört gpt-5 çağrısı sıfır makale için harcandı.
   * Bu liste, koşu içinde yazara GÖNDERİLMİŞ konuları da karşılaştırmaya sokar.
   */
  const attemptedInRun: { id: string; title: string; content: string }[] = [];
  const writerStageCalls = () => usageSummary().byStage.writer?.calls ?? 0;
  let dailyWriterCalls = await prisma.automationEvent.count({
    where: {
      stage: "writer_call_reserved",
      createdAt: { gte: startOfIstanbulDay() },
    },
  });
  let fatalErrorCode: string | null = null;
  const errors: string[] = [];

  resetSameStoryJudgeBudget();
  resetUsageLedger();

  for (const topic of topics) {
    if (added >= count) break;
    try {
      /**
       * ── Kaynak kimliği tekrarı (hakemden ve bütçeden ÖNCE) ──────────────
       * 2-3 Eylül'de aynı haberturk haberi iki kez yazıldı: akşam "gün
       * düşüşle kapandı", ertesi sabah "satıcılı kapanış". Başlık eşiği
       * (3 ortak kelime) tutmadı çünkü ortak yalnızca "borsa/istanbulda"ydı.
       * Kaynak URL'i ve kanıt kimlikleri ise birebir aynıydı — tekrarı en
       * ucuz ve yanlış pozitifsiz yakalayan sinyal budur.
       */
      const earlyRepeat = findSourceRepeat(
        { sourceUrl: topic.sourceUrl, evidencePacket: topic.evidencePacket },
        recent,
      );
      if (earlyRepeat) {
        duplicatesSkipped++;
        await logEvent(run.id, "duplicate", "Aynı kaynaktan daha önce haber yazılmış", {
          title: topic.title,
          matchId: earlyRepeat.matchId,
          matchTitle: earlyRepeat.matchTitle,
          reason: earlyRepeat.reason,
          key: earlyRepeat.key,
        });
        continue;
      }
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
        // `verdicts` DENEMEYİ sayar, gerçek model çağrısını değil: tavan
        // dolunca soru modele hiç gitmeden "aynı olay değil" sayılır.
        // `skippedByBudget` ikisini ayırır — reddedilen konu ile bakılmayan
        // konu aynı şey değil, kayıtta da aynı görünmemeli.
        await logEvent(run.id, "corroboration_judge", "İkinci kaynak adayları hakeme soruldu", {
          title: topic.title,
          askedCandidates: candidates.length,
          verdicts,
          resolved: confirmed.size > 0,
          skippedByBudget: sameStoryJudgeSkipped(),
          judgeFailures: sameStoryJudgeFailures(),
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

      // Hakem paketi zenginleştirmiş olabilir: yeni gelen kanıtlar arşivdeki
      // bir haberle örtüşüyorsa yazar çağrısı yapılmadan burada durulur.
      const packetRepeat = findSourceRepeat({ sourceUrl: topic.sourceUrl, evidencePacket: packet }, recent);
      if (packetRepeat) {
        duplicatesSkipped++;
        await logEvent(run.id, "duplicate", "Aynı kaynaktan daha önce haber yazılmış", {
          title: topic.title,
          matchId: packetRepeat.matchId,
          matchTitle: packetRepeat.matchTitle,
          reason: packetRepeat.reason,
          key: packetRepeat.key,
        });
        continue;
      }

      if (isDuplicate(topic.title, topic.summary, [...recent, ...attemptedInRun]).duplicate) {
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
      attemptedInRun.push({ id: `run-attempt-${writerCalls}`, title: topic.title, content: topic.summary });
      /**
       * ── BÜTÇE SAYACI GERÇEK ÇAĞRIYI SAYAR ──────────────────────────────
       * Sayaç konu başına 1 artıyordu ama `writeArticle` kalite reddinde bir
       * ONARIM TURU daha çalıştırıyor (`MAX_ATTEMPTS`). 3 Eylül koşusunda
       * maliyet defteri 6 gpt-5 yazar çağrısı gösterirken sayaç 3'te kaldı:
       * "koşu başına 3 çağrı" tavanı pratikte 6 çağrıya, günlük 16 tavanı 32'ye
       * izin veriyordu. Onarım turları burada defterden okunup düşülüyor ki
       * tavan gerçek parayı sınırlasın.
       */
      const article = await (async () => {
        const callsBefore = writerStageCalls();
        try {
          return await writeArticle(verifiedTopic, targetWords);
        } finally {
          const repairCalls = Math.max(0, writerStageCalls() - callsBefore - 1);
          for (let repair = 0; repair < repairCalls; repair++) {
            writerCalls++;
            dailyWriterCalls++;
            await logEvent(run.id, "writer_call_reserved", "Onarım turu yazar çağrısı bütçeden düşüldü", {
              title: topic.title,
              provider: aiConfig.provider,
              model: aiConfig.writerModel,
              repair: true,
              runCall: writerCalls,
              dailyCall: dailyWriterCalls,
              maxWriterCallsPerRun: aiBudget.maxWriterCallsPerRun,
              dailyWriterCallLimit: aiBudget.dailyWriterCallLimit,
            });
          }
        }
      })();
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

      /**
       * Yayımlanan adres Google'a bildirilir. Sitemap tek başına yetmiyor:
       * 3 Eylül taramasında 52 adresin 23'ü hâlâ "URL is unknown to Google"du
       * ve en iyi sıralayan sayfa Google'ın kaydında 404'te takılıydı.
       * Hata bilerek yutulur — makale zaten kaydedildi, bildirim tutmadı diye
       * yayın geri alınmaz; sonuç kayda düşer ki kurulum eksikse görünsün.
       */
      if (publication.decision === "AUTO_PUBLISH") {
        const ping = await notifyGoogleUrlUpdated(`${SITE_URL}/${slug}`);
        if (!ping.ok) {
          await logEvent(run.id, "indexing", "Google dizin bildirimi gönderilemedi", {
            slug, reason: ping.reason, detail: ping.detail,
          }, created.id, "warning");
        } else {
          await logEvent(run.id, "indexing", "Google'a dizin bildirimi gönderildi", { slug }, created.id);
        }
        // Bing/Yandex tarafı: IndexNow. Google'dan bağımsız, hatası da ayrı
        // kayda düşer — biri tutmadı diye diğeri atlanmaz.
        const inPing = await notifyIndexNow([`${SITE_URL}/${slug}`]);
        if (!inPing.ok) {
          await logEvent(run.id, "indexing", "IndexNow bildirimi gönderilemedi", {
            slug, reason: inPing.reason, detail: inPing.detail,
          }, created.id, "warning");
        } else {
          await logEvent(run.id, "indexing", "IndexNow bildirimi gönderildi", { slug }, created.id);
        }
      }

      // Varlık çıkarımı: haberin yan ürünü olarak şirket/kişi/kurum kaydı.
      // Neden burada: elimizde HEM doğrulanmış kanıt paketi HEM de kaydedilmiş
      // makale kimliği yalnızca bu noktada birlikte var. Çağrı bilerek
      // try/catch içinde ve hatası yutuluyor — makale zaten kaydedildi,
      // varlık kaydı tutmazsa yayın geri alınmamalı.
      try {
        const evidenceText = packet.evidence
          .map((item) => [item.title, item.content || item.summary].filter(Boolean).join(". "))
          .join("\n\n");
        const extracted = await extractEntities(article.title, packet.evidence);
        if (extracted.length) {
          const entityResult = await recordEntities(
            created.id, article.category, extracted, evidenceText,
            article.title, packet.evidence.map((item) => item.title),
          );
          await logEvent(run.id, "entity",
            `${entityResult.recorded} varlık kaydedildi` +
            (entityResult.rejected ? `, ${entityResult.rejected} kanıtsız düşürüldü: ${entityResult.rejectedNames.join(", ")}` : ""),
            entityResult, created.id);
        }
      } catch (entityError) {
        await logEvent(run.id, "entity", `Varlık çıkarımı başarısız: ${(entityError as Error).message}`,
          {}, created.id, "warning");
      }
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
      /**
       * Doğrulayıcı reddi = bitmiş makale. Silmek yerine `DRAFT` olarak
       * kaydediyoruz (yayına ÇIKMAZ, panelde onay bekler). Kurtarma hatası
       * koşumu düşürmez; akışın şartı değil.
       */
      if (isBlockedDraftError(error)) {
        try {
          const rescued = await saveBlockedDraft(error, {
            trigger: options.trigger,
            track: "NEWS",
            sourceScore: 0,
          });
          if (rescued) {
            await logEvent(run.id, "decision",
              error.code === "QUALITY_BLOCKED"
                ? "Kalite kapısında yalnızca kozmetik sorun kaldı; makale silinmedi, incelemeye alındı"
                : "Doğrulayıcı itiraz etti; makale silinmedi, incelemeye alındı", {
              title: topic.title, code: error.code, objections: error.draft.objections,
            }, rescued.id, "warning");
          }
        } catch (rescueError) {
          console.error("[bot] taslak kurtarılamadı:", (rescueError as Error).message);
        }
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

  // ── MALİYET KAYDI ────────────────────────────────────────────────────────
  // Koşu boyunca biriken token kullanımı tek olayda yazılır. Ölçüm başarısız
  // olsa bile koşu sonucu etkilenmemeli: kayıt hatası yutulur.
  try {
    const usage = usageSummary();
    if (usage.calls > 0) {
      await logEvent(
        run.id,
        "cost",
        `${usage.calls} model çağrısı, ${usage.inputTokens + usage.outputTokens} token, ` +
        `$${usage.costUsd.toFixed(4)}`,
        usage,
      );
    }
  } catch (usageError) {
    console.error("[bot-cost] maliyet kaydedilemedi:", (usageError as Error).message);
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
