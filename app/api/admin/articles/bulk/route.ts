import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureArticleImage } from "@/lib/bot/ensure-image";
import { revalidatePath, revalidateTag } from "next/cache";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } },
  );
}

function revalidateArticleCollections() {
  revalidateTag("category-articles", { expire: 0 });
  revalidatePath("/api/articles");
  revalidatePath("/");
  revalidatePath("/[slug]", "page");
  revalidatePath("/kategori/[cat]", "page");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");
}

// Yayina alirken kapak gorseli uretilebiliyor; bu saniyeler surer.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:articles:bulk:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const body = payload as Record<string, unknown>;
  const rawIds = body.ids;
  const actions = ["publish", "draft", "archive", "delete"] as const;
  if (
    !Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 20
    || !rawIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100)
    || typeof body.action !== "string" || !actions.includes(body.action as (typeof actions)[number])
  ) {
    return NextResponse.json({ error: "Geçerli 1–20 makale kimliği ve işlem gerekli" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const ids = [...new Set(rawIds as string[])];
  const action = body.action;

  switch (action) {
    case "publish": {
      // Toplu yayinda da kapak gorseli sart: gorselsiz olanin gorseli burada
      // uretiliyor (2026-09-02). Uretilemeyen makale taslakta birakiliyor,
      // sessizce gri kutuyla yayina cikmiyor.
      const selected = await prisma.article.findMany({
        where: { id: { in: ids } },
        select: { id: true, status: true, imageUrl: true },
      });
      const selectedById = new Map(selected.map((article) => [article.id, article]));
      const gorselsiz = selected.filter((article) => !article.imageUrl?.trim());
      const basarisiz: string[] = [];
      for (const { id } of gorselsiz) {
        const sonuc = await ensureArticleImage(id);
        if (!sonuc.imageUrl?.trim()) basarisiz.push(id);
      }
      const yayinlanacak = ids.filter((id) => selectedById.has(id) && !basarisiz.includes(id));
      if (yayinlanacak.length) {
        const yeniYayinlar = yayinlanacak.filter((id) => selectedById.get(id)?.status !== "PUBLISHED");
        const update = await prisma.article.updateMany({
          where: { id: { in: yeniYayinlar }, status: { not: "PUBLISHED" } },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
        if (update.count > 0 || gorselsiz.length > basarisiz.length) {
          revalidateArticleCollections();
        }
      }
      const affected = yayinlanacak.length
        ? await prisma.article.count({ where: { id: { in: yayinlanacak }, status: "PUBLISHED" } })
        : 0;
      return NextResponse.json({
        ok: true,
        affected,
        gorselUretildi: gorselsiz.length - basarisiz.length,
        gorselsizKalan: basarisiz.length,
      }, { headers: PRIVATE_HEADERS });
    }
    case "draft": {
      const update = await prisma.article.updateMany({
        where: { id: { in: ids } },
        data: { status: "DRAFT" },
      });
      if (update.count > 0) revalidateArticleCollections();
      return NextResponse.json({ ok: true, affected: update.count }, { headers: PRIVATE_HEADERS });
    }
    case "archive": {
      const update = await prisma.article.updateMany({
        where: { id: { in: ids } },
        data: { status: "ARCHIVED" },
      });
      if (update.count > 0) revalidateArticleCollections();
      return NextResponse.json({ ok: true, affected: update.count }, { headers: PRIVATE_HEADERS });
    }
    case "delete": {
      const deleted = await prisma.article.deleteMany({ where: { id: { in: ids } } });
      if (deleted.count > 0) revalidateArticleCollections();
      return NextResponse.json({ ok: true, affected: deleted.count }, { headers: PRIVATE_HEADERS });
    }
    default:
      return NextResponse.json({ error: "Geçersiz action" }, { status: 400, headers: PRIVATE_HEADERS });
  }
}
