import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Parser from "rss-parser";
import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { writeArticle } from "@/lib/bot/writer";
import { getArticleImageResult } from "@/lib/bot/images";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { classifyTopicText, findCorroboratedTopic } from "@/lib/bot/topics";
import { classifyRisk, scoreSource } from "@/lib/bot/autonomy";
import { checkPlagiarism } from "@/lib/bot/plagiarism";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
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

// GET ?q=... → Google News RSS araması, ilk ~20 sonucu döndürür.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:research:get:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "Arama terimi gerekli." }, { status: 400 });

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=tr&gl=TR&ceid=TR:tr`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    clearTimeout(t);
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

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: `Haberler getirilemedi: ${(e as Error).message}` }, { status: 502 });
  }
}

// POST → seçilen başlığı güncel feed havuzunda ikinci bir yayıncıyla doğrular;
// doğrulanamayan seçim model çağrısı yapılmadan 422 ile durur.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:research:post:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const body = await req.json().catch(() => ({}));
  const title: string = (body.title || "").trim();
  if (!title) return NextResponse.json({ error: "Başlık gerekli." }, { status: 400 });

  const summary = (body.summary || "").trim();
  const classification = classifyTopicText(title, summary);
  if (!classification.category) {
    return NextResponse.json({ error: "Başlık finans/ekonomi konusu olarak doğrulanamadı." }, { status: 422 });
  }

  const topic = await findCorroboratedTopic(title, classification.category);
  if (!topic?.evidencePacket || topic.evidencePacket.status !== "VERIFIED") {
    return NextResponse.json({
      error: "İkinci bağımsız yayıncı bulunamadı. Bu konu için otomatik taslak oluşturulmadı.",
    }, { status: 422 });
  }

  try {
    const article = await writeArticle(topic, 550);
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
      return NextResponse.json({ error: `Kopya kontrolü geçmedi: ${plagiarism.issues.join("; ")}` }, { status: 422 });
    }
    const slug = slugify(article.title);

    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Bu başlıktan zaten bir makale mevcut.", articleId: existing.id }, { status: 409 });
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

    return NextResponse.json({ ok: true, articleId: created.id, title: created.title, seoScore: seo.score });
  } catch (e) {
    return NextResponse.json({ error: `Makale üretilemedi: ${(e as Error).message}` }, { status: 500 });
  }
}
