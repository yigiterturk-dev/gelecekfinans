import { prisma } from "@/lib/db";
import { absoluteImageUrl } from "@/lib/image-url";

const BASE = "https://gelecekfinans.com";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type HaberSatiri = {
  slug: string;
  title: string;
  publishedAt: Date | null;
  imageUrl: string | null;
};

export async function GET() {
  // Google News sitemap yalnızca son iki gündeki haberleri taşımalıdır.
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  // DB erişilemezse (Neon egress kotası dolduğunda oluyor) 500 dönmek yerine
  // GEÇERLİ ama boş bir sitemap dön. 500, Search Console'da kalıcı sitemap
  // hatası olarak birikiyordu — 2026-09-09'dan beri "hata=1".
  let articles: HaberSatiri[] = [];
  let veriOkundu = true;
  try {
    articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: since },
      },
      orderBy: { publishedAt: "desc" },
      take: 1000,
      select: {
        slug: true,
        title: true,
        publishedAt: true,
        imageUrl: true,
      },
    });
  } catch (hata) {
    veriOkundu = false;
    console.error("news-sitemap: makaleler okunamadı", hata);
  }

  const urls = articles.map((article) => {
    const publishedAt = article.publishedAt;
    if (!publishedAt) return "";
    // Görsel URL'i kendi alan adımıza normalize edilir (bkz. lib/image-url.ts).
    const imageUrl = absoluteImageUrl(article.imageUrl, BASE);
    const image = imageUrl
      ? `<image:image><image:loc>${escapeXml(imageUrl)}</image:loc><image:caption>${escapeXml(article.title)}</image:caption></image:image>`
      : "";
    return `<url>
  <loc>${BASE}/${escapeXml(article.slug)}</loc>
  <news:news>
    <news:publication><news:name>GelecekFinans</news:name><news:language>tr</news:language></news:publication>
    <news:publication_date>${publishedAt.toISOString()}</news:publication_date>
    <news:title>${escapeXml(article.title)}</news:title>
  </news:news>
  ${image}
</url>`;
  }).filter(Boolean).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Veri okunamadıysa kısa önbellek: DB dönünce sitemap hızla dolsun.
      "Cache-Control": veriOkundu
        ? "public, max-age=300, s-maxage=300, stale-while-revalidate=600"
        : "public, max-age=60, s-maxage=60",
    },
  });
}
