import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { saveBlockedDraft } from "./blocked-draft";
import { isVerificationBlockedError } from "./errors";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { autoLink, linkEntitySources, linkGuideCluster } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { getArticleImageResult } from "@/lib/bot/images";
import { writeEntityArticle, writeGuideArticle } from "@/lib/bot/writer";
import { resetUsageLedger, usageSummary } from "@/lib/bot/usage";
import { buildGuideTopic } from "@/lib/bot/evergreen";
import { buildEntityTopic, type EntityTopic } from "@/lib/bot/entity-topic";
import {
  markKeywordFailed, markKeywordInProgress, markKeywordInReview, markKeywordPublished, pickKeywords,
} from "@/lib/bot/keywords";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "@/lib/bot/ai-budget";
import { AIProviderFatalError } from "@/lib/bot/errors";

/**
 * Şerit B — rehber yayın akışı.
 *
 * Haber akışından ayrı bir dosya, çünkü sıralaması temelden farklı: konu
 * dışarıdan gelmez, havuzdan SEÇİLİR; kanıt gazeteden değil resmî kurumdan
 * toplanır; başarısızlık konuyu kaybetmez, kelimeyi kuyruğa geri koyar.
 *
 * Günlük yazar çağrısı bütçesi haber şeridiyle ORTAKTIR (aynı
 * `writer_call_reserved` kaydını sayar): iki şerit birbirinden habersiz
 * harcama yapamaz.
 */

export interface GuidePipelineOptions {
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

export async function runGuidePipeline(options: GuidePipelineOptions) {
  const count = Math.max(1, Math.min(options.count || 1, 5));
  const targetWords = Math.max(900, Math.min(options.targetWords || 1200, 1800));
  const autoPublishEnabled = options.autoPublish === true;
  const aiBudget = resolveArticleAIBudgetConfig();

  resetUsageLedger();
  const run = await prisma.botRun.create({ data: { articlesFound: 0 } });
  await logEvent(run.id, "start", `${options.trigger} rehber akışı başladı`, {
    count, targetWords, category: options.category || "otomatik", autoPublishEnabled,
    pipelineVersion: "gf-guide-v1",
  });

  const keywords = await pickKeywords(count, options.category);
  await prisma.botRun.update({ where: { id: run.id }, data: { articlesFound: keywords.length } });
  if (!keywords.length) {
    await logEvent(run.id, "keywords", "Yazılacak anahtar kelime kalmadı", {}, undefined, "warning");
    await prisma.botRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "completed", errors: "Kuyrukta uygun anahtar kelime yok" },
    });
    return { added: 0, autoPublished: 0, reviewQueued: 0, blocked: 0, errors: [], runId: run.id };
  }

  let dailyWriterCalls = await prisma.automationEvent.count({
    where: { stage: "writer_call_reserved", createdAt: { gte: startOfIstanbulDay() } },
  });
  const writerStageCalls = () => usageSummary().byStage.writer?.calls ?? 0;

  let added = 0;
  let autoPublished = 0;
  let reviewQueued = 0;
  let blocked = 0;
  const errors: string[] = [];
  let fatalErrorCode: string | null = null;

  const recent = await prisma.article.findMany({
    where: { status: { in: ["PUBLISHED", "DRAFT"] } },
    orderBy: { createdAt: "desc" }, take: 200,
    select: { id: true, title: true, content: true },
  });

  for (const keyword of keywords) {
    // `catch` bloğu da bunlara bakıyor (bkz. taslak kurtarma), bu yüzden
    // `try` dışında duruyorlar.
    const isEntity = keyword.origin === "entity";
    let evidencePacket: unknown;
    let evidenceSourceScore = 0;
    try {
      if (dailyWriterCalls >= aiBudget.dailyWriterCallLimit) {
        await logEvent(run.id, "budget", "Günlük yazar çağrısı sınırına ulaşıldı; rehber akışı durdu", {
          dailyWriterCallLimit: aiBudget.dailyWriterCallLimit,
        }, undefined, "warning");
        break;
      }

      const clusterArticles = await prisma.article.findMany({
        where: { cluster: keyword.cluster, status: "PUBLISHED" },
        select: { title: true, slug: true, keywordId: true },
        take: 10,
      });
      const hubKeyword = await prisma.keyword.findFirst({
        where: { cluster: keyword.cluster, isHub: true },
        select: { articleId: true },
      });

      /**
       * Şerit seçimi kelimenin KÖKENİNE bakar, kategorisine değil.
       * `origin: "entity"` olan kelimeler varlık motorunun terfi ettirdiği
       * "X kimdir" sorularıdır: kanıtları resmî kurumdan değil, botun kendi
       * arşivindeki doğrulanmış haberlerden gelir ve kanıt kapısı zorunlu
       * çalışır. Aynı kuyruk, aynı bütçe, farklı malzeme.
       */
      /**
       * Yazar çağrısından ÖNCE: bu kelimede zaten makale var mı?
       *
       * Kurtarma yolundaki işaretleme boşluğu yüzünden kuyrukta, yayımlanmış
       * makalesi olan kelimeler birikti. Kelime bir kez ürününü verdiyse
       * yeniden yazmak hem para harcar hem de aynı anahtar kelimede iki sayfa
       * bırakır (arama motorunda birbirlerini yerler).
       */
      const existingArticle = await prisma.article.findFirst({
        where: { keywordId: keyword.id, status: { in: ["PUBLISHED", "DRAFT"] } },
        select: { id: true, status: true, title: true },
        orderBy: { createdAt: "desc" },
      });
      if (existingArticle) {
        if (existingArticle.status === "PUBLISHED") {
          await markKeywordPublished(keyword.id, existingArticle.id);
        } else {
          await markKeywordInReview(keyword.id, existingArticle.id, "önceki taslak hâlâ incelemede");
        }
        await logEvent(run.id, "duplicate", "Kelimenin makalesi zaten var; yazar çağrısı yapılmadı", {
          keyword: keyword.term, articleStatus: existingArticle.status, title: existingArticle.title,
        });
        continue;
      }

      const topic = isEntity
        ? await buildEntityTopic(keyword)
        : await buildGuideTopic(keyword, {
            clusterArticles: clusterArticles.map((item) => ({
              title: item.title,
              slug: item.slug,
              isHub: Boolean(hubKeyword?.articleId) && item.keywordId === keyword.id,
            })),
          });

      if (topic.evidencePacket.status !== "VERIFIED") {
        blocked++;
        await markKeywordFailed(keyword.id, topic.evidencePacket.reasons.join("; "));
        await logEvent(run.id, "research",
          isEntity
            ? "Arşiv kanıtı yetersiz; varlık kelimesi kuyruğa geri kondu"
            : "Resmî kaynak kanıtı yetersiz; kelime kuyruğa geri kondu", {
          keyword: keyword.term,
          reasons: topic.evidencePacket.reasons,
          sourceCount: topic.evidencePacket.independentSourceCount,
        }, undefined, "warning");
        continue;
      }

      evidencePacket = topic.evidencePacket;
      evidenceSourceScore = topic.evidencePacket.evidence[0]?.sourceScore ?? 0;

      await markKeywordInProgress(keyword.id);
      await logEvent(run.id, "writer_call_reserved", "Rehber yazar çağrısı bütçeden ayrıldı", {
        keyword: keyword.term, dailyCall: dailyWriterCalls + 1,
      });
      dailyWriterCalls++;

      /**
       * Haber şeridiyle aynı sayım düzeltmesi: kalite reddinde çalışan onarım
       * turu ayrı bir ücretli çağrıdır ve günlük tavandan düşmelidir. Bkz.
       * `orchestrator.ts` içindeki aynı blok.
       */
      const article = await (async () => {
        const callsBefore = writerStageCalls();
        try {
          return isEntity
            ? await writeEntityArticle(topic as EntityTopic, Math.min(targetWords, 1000))
            : await writeGuideArticle(topic, targetWords);
        } finally {
          const repairCalls = Math.max(0, writerStageCalls() - callsBefore - 1);
          for (let repair = 0; repair < repairCalls; repair++) {
            dailyWriterCalls++;
            await logEvent(run.id, "writer_call_reserved", "Onarım turu yazar çağrısı bütçeden düşüldü", {
              keyword: keyword.term, repair: true, dailyCall: dailyWriterCalls,
            });
          }
        }
      })();
      const slug = slugify(article.title);
      if (await prisma.article.findUnique({ where: { slug }, select: { id: true } })) {
        await markKeywordFailed(keyword.id, "Aynı slug zaten var");
        blocked++;
        continue;
      }
      if (isDuplicate(article.title, article.content, recent).duplicate) {
        await markKeywordFailed(keyword.id, "Benzer içerik zaten yayımlanmış");
        blocked++;
        await logEvent(run.id, "duplicate", "Benzer rehber zaten var", { keyword: keyword.term });
        continue;
      }

      let content = await autoLink(article.content, article.category, slug);
      content = isEntity
        ? linkEntitySources(content, (topic as EntityTopic).clusterArticles, slug)
        : await linkGuideCluster(content, keyword.cluster, slug, keyword.isHub);
      /**
       * Rehber kavramsal üretiliyor, yani atıf verecek bir haber kaynağı yok.
       * Buna rağmen okuru resmî veri kaynağına yönlendiren tek bir dış bağlantı
       * gerekli: hem SEO çözümlemesi kopuk sayfayı cezalandırıyor hem de
       * finans içeriğinde "nereden doğrularım" sorusunun cevabı olmalı.
       * Bağlantı `nofollow` — link suyu dışarı akmaz.
       */
      content = ensureExternalLink(content, article.category, article.keyword, undefined);

      const image = await getArticleImageResult({
        title: article.title, keyword: article.keyword, category: article.category,
        slug, recentConcepts: [], maxAttempts: 1,
        evidenceSourceCount: topic.evidencePacket.independentSourceCount,
      });
      const seo = analyzeSeo({
        title: article.title, meta: article.meta, keyword: article.keyword,
        content, slug, imageUrl: image.url,
      });

      /**
       * Rehber içerikte otomatik yayın ölçütü haberden farklı ve daha net:
       * kanıt resmî kaynaktan geldiği ve metin doğrulayıcıdan geçtiği için
       * "kaynak skoru / risk" gibi haber sinyalleri anlamsız. Kapı görsel ve
       * SEO eşiği. Yine de otomatik yayın kapalıysa kuyruğa düşer.
       */
      const publish = autoPublishEnabled && Boolean(image.url) && seo.score >= 70;
      const created = await prisma.article.create({
        data: {
          title: article.title, slug, meta: article.meta,
          keyword: article.keyword, category: article.category,
          content,
          ...(article.aiExtras ? { aiExtras: asJson(article.aiExtras) } : {}),
          imageUrl: image.url, source: article.source, articleSource: "BOT",
          track: "GUIDE",
          keywordId: keyword.id,
          cluster: keyword.cluster,
          status: publish ? "PUBLISHED" : "DRAFT",
          publishedAt: publish ? new Date() : null,
          seoScore: seo.score,
          riskLevel: "GREEN",
          publicationDecision: publish ? "AUTO_PUBLISH" : "REVIEW",
          sourceScore: topic.evidencePacket.evidence[0]?.sourceScore ?? 80,
          imageStrategy: image.strategy,
          autoPublished: publish,
          automationMeta: asJson({
            pipelineVersion: "gf-guide-v1",
            trigger: options.trigger,
            track: isEntity ? "ENTITY" : "GUIDE",
            cluster: keyword.cluster,
            isHub: keyword.isHub,
            intent: keyword.intent,
            evidencePacket: topic.evidencePacket,
            quality: article.quality,
            verification: article.verification,
            plagiarism: article.plagiarism,
            ai: article.ai,
            seoIssues: seo.issues,
            visual: { strategy: image.strategy, brief: image.brief, audit: image.audit },
          }),
        },
      });

      await markKeywordPublished(keyword.id, created.id);
      added++;
      if (publish) autoPublished++;
      else reviewQueued++;
      recent.push({ id: created.id, title: created.title, content: created.content });
      await logEvent(run.id, "decision",
        `${isEntity ? "Varlık yazısı" : "Rehber"} ${publish ? "otomatik yayımlandı" : "incelemeye alındı"}`, {
        keyword: keyword.term, seoScore: seo.score, imageStrategy: image.strategy,
        wordCount: article.wordCount, cluster: keyword.cluster,
      }, created.id);
    } catch (error) {
      const message = `${keyword.term}: ${(error as Error).message}`;
      errors.push(message);
      await markKeywordFailed(keyword.id, (error as Error).message);
      /**
       * Doğrulayıcı reddi = bitmiş makale. Çöpe atmak yerine `DRAFT` olarak
       * kaydediyoruz; yayına çıkmaz, panelde onay bekler. Kayıt hatası koşumu
       * düşürmemeli — kurtarma bir ikramiye, akışın şartı değil.
       */
      if (isVerificationBlockedError(error)) {
        try {
          const rescued = await saveBlockedDraft(error, {
            trigger: options.trigger,
            track: isEntity ? "ENTITY" : "GUIDE",
            keywordId: keyword.id,
            cluster: keyword.cluster,
            sourceScore: evidenceSourceScore,
            evidencePacket,
          });
          if (rescued) {
            reviewQueued++;
            // Taslak inceleme bekliyor: kelime kuyruğa DÖNMEMELİ, yoksa bot
            // aynı rehberi her koşuda baştan yazar (bkz. markKeywordInReview).
            await markKeywordInReview(
              keyword.id, rescued.id, (error.draft.objections || []).join("; ") || "doğrulayıcı itirazı",
            );
            await logEvent(run.id, "decision",
              "Doğrulayıcı itiraz etti; makale silinmedi, incelemeye alındı", {
              keyword: keyword.term, objections: error.draft.objections,
            }, rescued.id, "warning");
          }
        } catch (rescueError) {
          console.error("[bot-guide] taslak kurtarılamadı:", (rescueError as Error).message);
        }
      }
      if (error instanceof AIProviderFatalError) {
        fatalErrorCode = error.code;
        await logEvent(run.id, "configuration", message, { code: error.code }, undefined, "error");
        break;
      }
      blocked++;
      await logEvent(run.id, "error", message, { keyword: keyword.term }, undefined, "error");
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
      finishedAt: new Date(), articlesAdded: added, autoPublished, reviewQueued, blocked,
      errors: errors.length ? errors.join("\n") : null,
      status: fatalErrorCode ? "failed" : "completed",
    },
  });

  return { added, autoPublished, reviewQueued, blocked, errors, fatalErrorCode, runId: run.id };
}
