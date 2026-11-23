import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeSeo } from "@/lib/seo";
import { revalidatePath, revalidateTag } from "next/cache";
import { ensureArticleImage } from "@/lib/bot/ensure-image";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isSafeArticleImageUrl } from "@/lib/image-url";

const articlePatchSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  meta: z.string().trim().min(1).max(2_000).optional(),
  keyword: z.string().max(2_000).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  content: z.string().trim().min(1).max(500_000).optional(),
  imageUrl: z.string().trim().max(2_048).refine(isSafeArticleImageUrl, "Görsel URL'si geçerli bir site içi yol veya HTTP(S) adresi olmalı.").nullable().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "REJECTED", "ARCHIVED"]).optional(),
  premium: z.boolean().optional(),
}).strict();
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } },
  );
}

// Yayina alirken kapak gorseli uretilebiliyor; bu saniyeler surer.
export const maxDuration = 300;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const limit = rateLimit(`admin:article:get:${clientIp(_req)}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404, headers: PRIVATE_HEADERS });

  const seo = analyzeSeo(article);
  return NextResponse.json({ article, seo }, { headers: PRIVATE_HEADERS });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const limit = rateLimit(`admin:article:patch:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400 });
  }
  const parsed = articlePatchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return NextResponse.json({ error: "Makale alanları geçersiz veya boş" }, { status: 400 });
  }

  const { title, meta, keyword, category, content, imageUrl, status, premium } = parsed.data;

  const existing = await prisma.article.findUnique({
    where: { id },
    select: { status: true, imageUrl: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404, headers: PRIVATE_HEADERS });

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (meta !== undefined) updateData.meta = meta;
  if (keyword !== undefined) updateData.keyword = keyword;
  if (category !== undefined) updateData.category = category;
  if (content !== undefined) updateData.content = content;
  // Boş string yerine null yaz: image-repair cron'u null olanları onarıyor.
  if (imageUrl !== undefined) updateData.imageUrl = typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null;
  if (premium !== undefined) updateData.premium = !!premium;
  if (status !== undefined) {
    updateData.status = status;
    if (status === "PUBLISHED" && existing.status !== "PUBLISHED") {
      updateData.publishedAt = new Date();
    }
  }

  /**
   * KAPAK GORSELI OLMADAN YAYIN YOK — AMA ONCE URETMEYI DENE.
   *
   * NEDEN (2026-09-02): imageUrl'i bos bir makale elle yayina alinmisti ve
   * anasayfanin lider kartinda gri bir kutu olarak duruyordu. Ilk cozum
   * yayini reddetmekti; o da isi Yigit'in ustune yikiyordu (taslagi acip
   * gorsel bekle, image-repair cron'una sira gelsin...). Artik yayina alma
   * aninda gorsel yerinde uretiliyor; yalnizca uretim de basarisiz olursa
   * yayin reddediliyor.
   */
  if (status === "PUBLISHED") {
    let sonGorsel =
      updateData.imageUrl !== undefined ? updateData.imageUrl : existing.imageUrl;
    const hasUsableImage = typeof sonGorsel === "string" && sonGorsel.trim().length > 0;
    if (!hasUsableImage) {
      // Once alanlar kaydedilsin ki gorsel brief'i guncel basliktan uretilsin.
      if (Object.keys(updateData).length > 1) {
        const { status: _s, publishedAt: _p, ...alanlar } = updateData as Record<string, unknown>;
        if (Object.keys(alanlar).length) {
          await prisma.article.update({ where: { id }, data: alanlar });
        }
      }
      const uretilen = await ensureArticleImage(id);
      sonGorsel = uretilen.imageUrl;
      // ensureArticleImage imageUrl'i kendisi yazdi; ustune null yazmayalim.
      if (uretilen.imageUrl?.trim()) delete updateData.imageUrl;
    }
    if (typeof sonGorsel !== "string" || sonGorsel.trim().length === 0) {
      return NextResponse.json(
        { error: "Kapak gorseli uretilemedi, makale yayina alinamadi" },
        { status: 400, headers: PRIVATE_HEADERS },
      );
    }
  }

  const article = await prisma.article.update({ where: { id }, data: updateData });

  const seo = analyzeSeo(article);
  await prisma.article.update({ where: { id }, data: { seoScore: seo.score } });
  revalidateTag("category-articles", { expire: 0 });
  revalidatePath("/api/articles");

  // Yayımlanmış içerik değişince sayfa, listeler ve dağıtım uçları birlikte yenilenir.
  if (status !== undefined || article.status === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath(`/${article.slug}`);
    revalidatePath(`/kategori/${article.category}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/feed.xml");
    revalidatePath("/news-sitemap.xml");
  }

  return NextResponse.json({ article: { ...article, seoScore: seo.score }, seo }, { headers: PRIVATE_HEADERS });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const limit = rateLimit(`admin:article:delete:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { id } = await params;
  const existing = await prisma.article.findUnique({ where: { id }, select: { slug: true, category: true, status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.article.delete({ where: { id } });
  revalidateTag("category-articles", { expire: 0 });
  revalidatePath("/api/articles");
  if (existing.status === "PUBLISHED") {
    revalidatePath("/");
    revalidatePath(`/${existing.slug}`);
    revalidatePath(`/kategori/${existing.category}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/feed.xml");
    revalidatePath("/news-sitemap.xml");
  }
  return NextResponse.json({ ok: true });
}
