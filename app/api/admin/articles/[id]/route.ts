import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { analyzeSeo } from "@/lib/seo";
import { revalidatePath } from "next/cache";

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
   * KAPAK GORSELI OLMADAN YAYIN YOK.
   *
   * NEDEN (2026-09-02): imageUrl'i bos bir makale elle yayina alinmisti ve
   * anasayfanin lider kartinda gri bir kutu olarak duruyordu. Gorsel kontrolu
   * yalnizca bot akisindaydi; elle yayin bu kontrolun disindaydi.
   */
  if (status === "PUBLISHED") {
    const mevcut = await prisma.article.findUnique({
      where: { id },
      select: { imageUrl: true },
    });
    const sonGorsel =
      updateData.imageUrl !== undefined ? updateData.imageUrl : mevcut?.imageUrl;
    if (!sonGorsel) {
      return NextResponse.json(
        { error: "Kapak gorseli olmayan makale yayina alinamaz" },
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
