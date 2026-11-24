import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Parser from "rss-parser";
import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { resolveArticleAIConfig, writeArticle } from "@/lib/bot/writer";
import { getArticleImageResult } from "@/lib/bot/images";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { classifyTopicText, findCorroboratedTopic } from "@/lib/bot/topics";
import { classifyRisk, scoreSource } from "@/lib/bot/autonomy";
import { checkPlagiarism } from "@/lib/bot/plagiarism";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { AIProviderFatalError, AIProviderQuotaError } from "@/lib/bot/errors";
import { isAIAutomationEnabled, resolveArticleAIBudgetConfig, startOfIstanbulDay } from "@/lib/bot/ai-budget";
import { resetUsageLedger, usageSummary } from "@/lib/bot/usage";
import { acquireCronLock, releaseCronLock } from "@/lib/bot/cron-lock";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const researchInputSchema = z.object({
  title: z.string().trim().min(1).max(500),
  summary: z.string().trim().max(1_000).optional().default(""),
}).strict();

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } }
  );
}

// Tek makale üretimi 120sn altında kalır; güvenli sınır.
export const maxDuration = 120;

const parser = new Parser({ timeout: 10000 });

// Bazı kaynaklar UA'sız isteği bloklar; gerçek tarayıcı UA ile çekiyoruz (bkz. lib/bot/topics.ts).
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface ResearchResult {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
}

// Google News RSS başlıklarında genelde "Başlık - Kaynak" formatı olur; kaynağı ayıkla.
function splitSource(title: string, feedSource: string): { title: string; source: string } {
  const idx = title.lastIndexOf(" - ");
  if (idx > 0 && idx > title.length - 60) {
    return { title: title.slice(0, idx).trim(), source: title.slice(idx + 3).trim() };
  }
  return { title: title.trim(), source: feedSource };
}

function isUniqueConstraintError(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "P2002";
}

class DailyWriterBudgetExceededError extends Error {}

// GET ?q=... → Google News RSS araması, ilk ~20 sonucu döndürür.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:research:get:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const validQuery = z.string().min(1).max(200).safeParse(q);
  if (!validQuery.success) {
    return NextResponse.json({ error: "Arama terimi geçersiz." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const feed = await parser.parseString(xml);

    const results: ResearchResult[] = (feed.items || []).slice(0, 20).map((item) => {
      const rawTitle = (item.title || "").trim();
      const { title, source } = splitSource(rawTitle, feed.title || "Google Haberler");
      const snippet = (item.contentSnippet || item.content || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 240);
      return {
        title,
        link: item.link || "",
        source,
        pubDate: item.pubDate || "",
        snippet,
      };
    }).filter((r) => r.title);

    return NextResponse.json({ results }, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Haberler şu anda getirilemiyor." }, { status: 502, headers: PRIVATE_HEADERS });
  }
}

// POST → seçilen başlığı güncel feed havuzunda ikinci bir yayıncıyla doğrular;
// doğrulanamayan seçim model çağrısı yapılmadan 422 ile durur.
export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  // This manual path calls writeArticle directly, outside the shared
  // orchestrator. Keep it behind the same explicit zero-spend switch.
  if (!isAIAutomationEnabled()) {
    return NextResponse.json({
      error: "AI otomasyonu kapalı; model çağrısı yapılmadı.",
    }, { status: 503, headers: PRIVATE_HEADERS });
  }

  const limit = rateLimit(`admin:research:post:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = researchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Başlık veya özet geçersiz." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { title, summary } = parsed.data;
  const classification = classifyTopicText(title, summary);
  if (!classification.category) {
    return NextResponse.json({ error: "Başlık finans/ekonomi konusu olarak doğrulanamadı." }, { status: 422, headers: PRIVATE_HEADERS });
  }

  let topic: Awaited<ReturnType<typeof findCorroboratedTopic>>;
  try {
    topic = await findCorroboratedTopic(title, classification.category);
  } catch {
    return NextResponse.json(
      { error: "Bağımsız kaynak doğrulaması şu anda yapılamıyor." },
      { status: 502, headers: PRIVATE_HEADERS },
    );
  }
  if (!topic?.evidencePacket || topic.evidencePacket.status !== "VERIFIED") {
    return NextResponse.json({
      error: "İkinci bağımsız yayıncı bulunamadı. Bu konu için otomatik taslak oluşturulmadı.",
    }, { status: 422, headers: PRIVATE_HEADERS });
  }

  // Serialize manual writes with scheduled pipelines and reserve their daily
  // writer-call budget before the first paid request can be sent.
  const lock = await acquireCronLock("bot:publishing-pipeline");
  if (!lock) {
    return NextResponse.json({ error: "Yazı hattı şu anda çalışıyor; model çağrısı yapılmadı." }, {
      status: 409,
      headers: { ...PRIVATE_HEADERS, "Retry-After": "60" },
    });
  }

  resetUsageLedger();
  let botRunId: string | undefined;
  let articleId: string | undefined;
  let runStatus = "failed";
  let runError: string | null = null;
  let articlesAdded = 0;
  let duplicatesSkipped = 0;
  let manualWriterCalls = 0;
  try {
    const run = await prisma.botRun.create({ data: { articlesFound: 1 } });
    botRunId = run.id;
    const budget = resolveArticleAIBudgetConfig();
    const newsWriterCallLimit = Math.max(1, budget.dailyWriterCallLimit - budget.guideWriterCallReserve);
    const reservedToday = await prisma.automationEvent.count({
      where: { stage: "writer_call_reserved", createdAt: { gte: startOfIstanbulDay() } },
    });
    const aiConfig = resolveArticleAIConfig();
    const reserveWriterCall = async () => {
      if (
        manualWriterCalls >= budget.maxWriterCallsPerRun ||
        reservedToday + manualWriterCalls >= newsWriterCallLimit
      ) {
        throw new DailyWriterBudgetExceededError();
      }
      manualWriterCalls++;
      await prisma.automationEvent.create({
        data: {
          runId: botRunId,
          stage: "writer_call_reserved",
          message: "Admin araştırma yazarı çağrısı günlük bütçeden ayrıldı",
          metadata: asJson({
            title: topic.title,
            trigger: "admin-research",
            provider: aiConfig.provider,
            model: aiConfig.writerModel,
            call: manualWriterCalls,
            maxWriterCallsPerRun: budget.maxWriterCallsPerRun,
            dailyCall: reservedToday + manualWriterCalls,
            dailyWriterCallLimit: newsWriterCallLimit,
          }),
        },
      });
    };

    const article = await writeArticle(topic, 550, { beforeWriterCall: reserveWriterCall });
    const recent = await prisma.article.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 90 * 86400000) } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, title: true, content: true },
    });
    const plagiarism = checkPlagiarism({
      candidate: article.content,
      evidencePacket: topic.evidencePacket,
      recentDocuments: recent,
    });
    if (!plagiarism.passed) {
      runError = "PLAGIARISM_BLOCKED";
      await prisma.automationEvent.create({
        data: {
          runId: botRunId,
          stage: "quality",
          level: "warning",
          message: "Admin araştırma taslağı intihal kontrolünü geçemedi",
          metadata: asJson({ code: "PLAGIARISM_BLOCKED", issues: plagiarism.issues }),
        },
      });
      return NextResponse.json({ error: `Kopya kontrolü geçmedi: ${plagiarism.issues.join("; ")}` }, { status: 422, headers: PRIVATE_HEADERS });
    }
    const slug = slugify(article.title);
    if (!slug) {
      runError = "INVALID_SLUG";
      return NextResponse.json({ error: "Üretilen başlıktan geçerli bir makale adresi üretilemedi." }, { status: 422, headers: PRIVATE_HEADERS });
    }

    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      runStatus = "completed";
      duplicatesSkipped = 1;
      return NextResponse.json({ error: "Bu başlıktan zaten bir makale mevcut.", articleId: existing.id }, { status: 409, headers: PRIVATE_HEADERS });
    }

    article.content = await autoLink(article.content, article.category, slug);
    // Harici link garantisi (yazar harici link eklemediyse resmi kaynak ekle).
    article.content = ensureExternalLink(article.content, article.category, article.keyword);

    // Görseli önceden hesapla: hem SEO görsel kontrolünü besler hem DB'ye yazılır.
    const image = await getArticleImageResult({
      title: article.title,
      keyword: article.keyword,
      category: article.category,
      evidenceSourceCount: topic.evidencePacket.independentSourceCount,
    });
    const imageUrl = image.url;

    const seo = analyzeSeo({
      title: article.title, meta: article.meta,
      keyword: article.keyword, content: article.content, slug, imageUrl,
    });

    const sourceScore = scoreSource(topic);
    const risk = classifyRisk(topic);
    const created = await prisma.article.create({
      data: {
        title: article.title,
        slug,
        meta: article.meta,
        keyword: article.keyword || null,
        category: article.category,
        content: article.content,
        ...(article.aiExtras ? { aiExtras: asJson(article.aiExtras) } : {}),
        imageUrl,
        source: article.source,
        articleSource: "BOT",
        // Araştırmadan üretilen makale her zaman TASLAK olarak kaydedilir;
        // kullanıcı düzenleyip onayladıktan sonra yayınlasın.
        status: "DRAFT",
        seoScore: seo.score,
        riskLevel: risk.level,
        sourceScore: sourceScore.score,
        imageStrategy: image.strategy,
        publicationDecision: "REVIEW",
        automationMeta: asJson({
          pipelineVersion: "gf-evidence-v4",
          trigger: "admin-research",
          verifiedEvidence: true,
          evidencePacket: topic.evidencePacket,
          quality: article.quality,
          verification: article.verification,
          plagiarism,
          visual: {
            strategy: image.strategy,
            brief: image.brief,
            audit: image.audit,
            attempts: image.attempts,
            licensedAsset: image.licensedAsset,
          },
        }),
        publishedAt: null,
      },
    });

    articleId = created.id;
    articlesAdded = 1;
    runStatus = "completed";
    return NextResponse.json({ ok: true, articleId: created.id, title: created.title, seoScore: seo.score }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof DailyWriterBudgetExceededError) {
      runError = "AI_BUDGET_LIMIT_REACHED";
      if (botRunId) {
        await prisma.automationEvent.create({
          data: {
            runId: botRunId,
            stage: "budget",
            level: "warning",
            message: "Admin araştırma yazarı günlük/koşum kotasına ulaştı; ek model çağrısı yapılmadı",
            metadata: asJson({ code: runError, reservedWriterCalls: manualWriterCalls }),
          },
        }).catch(() => {});
      }
      return NextResponse.json({ error: "Günlük haber yazarı çağrı kotası doldu; ek model çağrısı yapılmadı." }, {
        status: 429,
        headers: PRIVATE_HEADERS,
      });
    }
    if (error instanceof AIProviderFatalError) {
      runError = error.code;
      await prisma.automationEvent.create({
        data: {
          runId: botRunId,
          stage: "configuration",
          level: "error",
          message: error.message,
          metadata: asJson({
            code: error.code,
            provider: process.env.ARTICLE_AI_PROVIDER || null,
            ...(error instanceof AIProviderQuotaError ? error.toMetadata() : {}),
          }),
        },
      }).catch(() => {});
      return NextResponse.json({ error: error.message, code: error.code }, {
        status: error instanceof AIProviderQuotaError ? 429 : 503,
        headers: PRIVATE_HEADERS,
      });
    }
    if (isUniqueConstraintError(error)) {
      runStatus = "completed";
      duplicatesSkipped = 1;
      return NextResponse.json({ error: "Bu makale adresi başka bir kayıt tarafından kullanıldı." }, { status: 409, headers: PRIVATE_HEADERS });
    }
    runError = error instanceof Error ? error.message.slice(0, 500) : "MANUAL_RESEARCH_FAILED";
    return NextResponse.json({ error: "Makale üretilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 500, headers: PRIVATE_HEADERS });
  } finally {
    try {
      const usage = usageSummary();
      if (usage.calls > 0 || usage.attemptedCalls > 0 || manualWriterCalls > 0) {
        await prisma.automationEvent.create({
          data: {
            runId: botRunId,
            articleId,
            stage: "cost",
            message: `${usage.attemptedCalls} model isteği; ${usage.callsWithoutUsage} kullanım verisi eksik; ${manualWriterCalls} yazar çağrısı ayrıldı; ${usage.inputTokens + usage.outputTokens} token; $${usage.costUsd.toFixed(4)}`,
            metadata: asJson({
              ...usage,
              trigger: "admin-research",
              reservedWriterCalls: manualWriterCalls,
              ...(usage.calls === 0 && manualWriterCalls > 0 ? { costIsComplete: false } : {}),
            }),
          },
        });
      }
    } catch (usageError) {
      console.error("[bot-cost] admin araştırma maliyeti kaydedilemedi:", (usageError as Error).message);
    }
    if (botRunId) {
      await prisma.botRun.update({
        where: { id: botRunId },
        data: {
          finishedAt: new Date(),
          articlesAdded,
          duplicatesSkipped,
          reviewQueued: articlesAdded,
          blocked: runStatus === "failed" ? 1 : 0,
          errors: runError,
          status: runStatus,
        },
      }).catch((runErrorUpdate) => {
        console.error("[bot-run] admin araştırma koşusu kapatılamadı:", (runErrorUpdate as Error).message);
      });
    }
    await releaseCronLock(lock).catch(() => {});
  }
}
