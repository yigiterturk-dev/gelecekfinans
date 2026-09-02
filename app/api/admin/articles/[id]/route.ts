import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeSeo } from "@/lib/seo";
import { revalidatePath } from "next/cache";
import { ensureArticleImage } from "@/lib/bot/ensure-image";

// Yayina alirken kapak gorseli uretilebiliyor; bu saniyeler surer.
export const maxDuration = 300;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const seo = analyzeSeo(article);
  return NextResponse.json({ article, seo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { title, meta, keyword, category, content, imageUrl, status, premium } = body;

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
    if (status === "PUBLISHED") updateData.publishedAt = new Date();
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
    const mevcut = await prisma.article.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    let sonGorsel =
      updateData.imageUrl !== undefined ? updateData.imageUrl : mevcut?.imageUrl;
    if (!sonGorsel) {
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
      if (uretilen.imageUrl) delete updateData.imageUrl;
    }
    if (!sonGorsel) {
      return NextResponse.json(
        { error: "Kapak gorseli uretilemedi, makale yayina alinamadi" },
        { status: 400 },
      );
    }
  }

  const article = await prisma.article.update({ where: { id }, data: updateData });

  const seo = analyzeSeo(article);
  await prisma.article.update({ where: { id }, data: { seoScore: seo.score } });

  // Auto revalidate on publish/unpublish
  if (status !== undefined) {
    revalidatePath("/");
    revalidatePath(`/${article.slug}`);
    revalidatePath(`/kategori/${article.category}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/feed.xml");
  }

  return NextResponse.json({ article: { ...article, seoScore: seo.score }, seo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
