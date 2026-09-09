import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureArticleImage } from "@/lib/bot/ensure-image";

// Yayina alirken kapak gorseli uretilebiliyor; bu saniyeler surer.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, action } = await req.json() as { ids: string[]; action: string };
  if (!ids?.length || !action) {
    return NextResponse.json({ error: "ids ve action gerekli" }, { status: 400 });
  }

  switch (action) {
    case "publish": {
      // Toplu yayinda da kapak gorseli sart: gorselsiz olanin gorseli burada
      // uretiliyor (2026-09-02). Uretilemeyen makale taslakta birakiliyor,
      // sessizce gri kutuyla yayina cikmiyor.
      const gorselsiz = await prisma.article.findMany({
        where: { id: { in: ids }, OR: [{ imageUrl: null }, { imageUrl: "" }] },
        select: { id: true },
      });
      const basarisiz: string[] = [];
      for (const { id } of gorselsiz) {
        const sonuc = await ensureArticleImage(id);
        if (!sonuc.imageUrl) basarisiz.push(id);
      }
      const yayinlanacak = ids.filter((id) => !basarisiz.includes(id));
      if (yayinlanacak.length) {
        await prisma.article.updateMany({
          where: { id: { in: yayinlanacak } },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
      }
      return NextResponse.json({
        ok: true,
        affected: yayinlanacak.length,
        gorselUretildi: gorselsiz.length - basarisiz.length,
        gorselsizKalan: basarisiz.length,
      });
    }
    case "draft":
      await prisma.article.updateMany({
        where: { id: { in: ids } },
        data: { status: "DRAFT" },
      });
      break;
    case "archive":
      await prisma.article.updateMany({
        where: { id: { in: ids } },
        data: { status: "ARCHIVED" },
      });
      break;
    case "delete":
      await prisma.article.deleteMany({ where: { id: { in: ids } } });
      break;
    default:
      return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affected: ids.length });
}
