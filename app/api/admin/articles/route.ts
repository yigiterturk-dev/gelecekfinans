import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`admin:articles:get:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const url = req.nextUrl;
  const status = url.searchParams.get("status") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const search = url.searchParams.get("q") || undefined;
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, title: true, slug: true, category: true, status: true,
        articleSource: true, seoScore: true, publishedAt: true, createdAt: true, duplicateOf: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  return NextResponse.json({ articles, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`admin:articles:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const body = await req.json();
  const { title, meta, keyword, category, content, imageUrl: rawImageUrl, source } = body;
  // Boş string kapak görseli "görsel var" sanılıp NONE stratejisiyle yayına
  // düşüyordu (anasayfada gri kutu). Boş/whitespace → null.
  const imageUrl = typeof rawImageUrl === "string" && rawImageUrl.trim() ? rawImageUrl.trim() : null;

  if (!title || !meta || !category || !content) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const slug = slugify(title);

  // Duplicate check
  const recent = await prisma.article.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { id: true, title: true, content: true },
  });
  const dupCheck = isDuplicate(title, content, recent);
  if (dupCheck.duplicate) {
    return NextResponse.json({
      error: "Duplicate tespit edildi",
      matchId: dupCheck.matchId,
      score: dupCheck.score,
    }, { status: 409 });
  }

  // SEO score (kapak görseli varsa görsel kontrolüne dahil edilir)
  const seo = analyzeSeo({ title, meta, keyword, content, slug, imageUrl });

  const article = await prisma.article.create({
    data: {
      title, slug, meta, keyword, category, content, imageUrl, source,
      articleSource: "MANUAL",
      status: "DRAFT",
      seoScore: seo.score,
    },
  });

  return NextResponse.json({ article, seo });
}
