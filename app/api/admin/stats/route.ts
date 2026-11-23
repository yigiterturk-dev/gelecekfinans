import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }

  const period = req.nextUrl.searchParams.get("period") || "7d";
  const days = period === "30d" ? 30 : period === "24h" ? 1 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Prisma DateTime alanı PostgreSQL'de UTC timestamp olarak saklanır.
  // Önce anı UTC olarak yorumla, sonra İstanbul yerel gününe çevir.
  const [totalViews, topPages, dailyRows] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.groupBy({
      by: ["path"],
      where: { createdAt: { gte: since } },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 20,
    }),
    prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
      SELECT TO_CHAR(local_day, 'YYYY-MM-DD') AS day, COUNT(*) AS count
      FROM (
        SELECT ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul')::date AS local_day
        FROM "PageView"
        WHERE "createdAt" >= ${since}
      ) AS views_by_local_day
      GROUP BY local_day
      ORDER BY local_day ASC
    `,
  ]);
  const daily = dailyRows.map(({ day, count }) => ({
    date: day,
    count: Number(count),
  }));

  // "En Çok Okunan Makaleler" — YALNIZCA gerçek makale path'leri.
  // Tek segmentli path'leri ("/<slug>") aday al, DB'de Article.slug ile eşleşmeyenleri
  // (kategori sayfaları /altin /doviz, araç sayfaları /araclar, sabit sayfalar vb.) ELE.
  const candidateSlugs = topPages
    .filter(p => /^\/[^/]+$/.test(p.path) && p.path !== "/")
    .map(p => p.path.replace(/^\//, ""));

  const articles = candidateSlugs.length > 0
    ? await prisma.article.findMany({
        where: { slug: { in: candidateSlugs } },
        select: { slug: true, title: true, category: true },
      })
    : [];
  const articleMap = new Map(articles.map(a => [a.slug, a]));

  // Sadece DB'de karşılığı olan makaleler kalır → kategori/araç sayfaları otomatik elenir.
  const topArticles = topPages.flatMap(p => {
    const slug = p.path.replace(/^\//, "");
    const article = articleMap.get(slug);
    if (!article) return [];
    return [{ path: p.path, views: p._count.path, title: article.title, category: article.category }];
  }).slice(0, 10);

  return NextResponse.json({
    totalViews,
    topPages: topPages.map(p => ({ path: p.path, views: p._count.path })),
    topArticles,
    daily,
  }, { headers: PRIVATE_HEADERS });
}
