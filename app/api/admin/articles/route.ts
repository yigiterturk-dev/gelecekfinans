import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSafeArticleImageUrl } from "@/lib/image-url";
import { z } from "zod";

const createArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  meta: z.string().trim().min(1).max(2_000),
  keyword: z.string().max(2_000).optional().default(""),
  category: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(500_000),
  imageUrl: z.string().trim().max(2_048).refine(isSafeArticleImageUrl, "Görsel URL'si geçerli bir site içi yol veya HTTP(S) adresi olmalı.").optional().nullable(),
  source: z.string().max(2_000).optional().default(""),
}).strict();
const articleListQuerySchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "REJECTED", "ARCHIVED"]).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).max(5_000).default(1),
}).strict();
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function isUniqueConstraintError(error: unknown): boolean {
  return !!error && typeof error === "object" && "code" in error && error.code === "P2002";
}

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const rl = rateLimit(`admin:articles:get:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  const query = articleListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!query.success) {
    return NextResponse.json({ error: "Liste filtreleri geçersiz" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { status, category, page } = query.data;
  const search = query.data.q || undefined;
  const limit = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) {
    const normalizedSlug = slugify(search);
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      ...(normalizedSlug ? [{ slug: { contains: normalizedSlug } }] : []),
    ];
  }

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

  return NextResponse.json({ articles, total, page, pages: Math.ceil(total / limit) }, { headers: PRIVATE_HEADERS });
}

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`admin:articles:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400 });
  }
  const parsed = createArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Makale alanları geçersiz" }, { status: 400 });
  }
  const { title, meta, keyword, category, content, imageUrl: rawImageUrl, source } = parsed.data;
  // Boş string kapak görseli "görsel var" sanılıp NONE stratejisiyle yayına
  // düşüyordu (anasayfada gri kutu). Boş/whitespace → null.
  const imageUrl = typeof rawImageUrl === "string" && rawImageUrl.trim() ? rawImageUrl.trim() : null;

  if (!title || !meta || !category || !content) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const slug = slugify(title);
  if (!slug) {
    return NextResponse.json({ error: "Başlıktan geçerli bir makale adresi üretilemedi." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const existingSlug = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existingSlug) {
    return NextResponse.json({ error: "Bu başlıktan üretilen adres zaten kullanılıyor." }, { status: 409, headers: PRIVATE_HEADERS });
  }

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

  let article: Awaited<ReturnType<typeof prisma.article.create>>;
  try {
    article = await prisma.article.create({
      data: {
        title, slug, meta, keyword, category, content, imageUrl, source,
        articleSource: "MANUAL",
        status: "DRAFT",
        seoScore: seo.score,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Bu makale adresi başka bir kayıt tarafından kullanıldı." }, { status: 409, headers: PRIVATE_HEADERS });
    }
    throw error;
  }

  return NextResponse.json({ article, seo }, { headers: PRIVATE_HEADERS });
}
