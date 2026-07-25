import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { getArticleImageResult } from "@/lib/bot/images";
import { getTopics } from "@/lib/bot/topics";
import { writeArticle } from "@/lib/bot/writer";
import {
  classifyRisk, decidePublication, scoreSource,
} from "@/lib/bot/autonomy";

export interface OrchestratorOptions {
  count?: number;
  category?: string;
  targetWords?: number;
  autoPublish?: boolean;
  trigger: "cron" | "admin";
}

async function logEvent(runId: string, stage: string, message: string, metadata?: object, articleId?: string) {
  await prisma.automationEvent.create({
    data: {
      runId, articleId, stage, message,
      ...(metadata ? { metadata: asJson(metadata) } : {}),
    },
  });
}

export async function runPublishingPipeline(options: OrchestratorOptions) {
  const count = Math.max(1, Math.min(options.count || 3, 10));
  const targetWords = Math.max(400, Math.min(options.targetWords || 1000, 1800));
  const autoPublishEnabled = options.autoPublish !== false;
  const run = await prisma.botRun.create({ data: { articlesFound: 0 } });
  await logEvent(run.id, "start", `${options.trigger} yayın akışı başladı`, {
    count, targetWords, category: options.category || "otomatik", autoPublishEnabled,
    pipelineVersion: "gf-autonomy-v1",
  });

  const topics = await getTopics(count * 3, options.category || undefined);
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
    where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
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
  const errors: string[] = [];

  for (const topic of topics) {
    if (added >= count) break;
    try {
      if (isDuplicate(topic.title, topic.summary, recent).duplicate) {
        duplicatesSkipped++;
        await logEvent(run.id, "duplicate", "Benzer başlık atlandı", { title: topic.title });
        continue;
      }

      const source = scoreSource(topic);
      const risk = classifyRisk(topic);
      const article = await writeArticle(topic, targetWords);
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
      );
      const image = await getArticleImageResult({
        title: article.title, keyword: article.keyword, category: article.category,
        recentConcepts, maxAttempts: 1,
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
      });
      const metadata = {
        pipelineVersion: "gf-autonomy-v1",
        trigger: options.trigger,
        sourceUrl: topic.sourceUrl || null,
        sourceDomain: source.domain,
        sourceReasons: source.reasons,
        riskReasons: risk.reasons,
        decisionReasons: publication.reasons,
        seoIssues: seo.issues,
        visual: {
          strategy: image.strategy,
          brief: image.brief,
          audit: image.audit,
          attempts: image.attempts,
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
      await logEvent(run.id, "error", message);
    }
  }

  await prisma.botRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(), articlesAdded: added, duplicatesSkipped,
      autoPublished, reviewQueued, blocked, imageFallbacks,
      errors: errors.length ? errors.join("\n") : null,
      status: errors.length && !added ? "failed" : "completed",
    },
  });
  return { added, autoPublished, reviewQueued, blocked, duplicatesSkipped, imageFallbacks, errors, runId: run.id };
}
