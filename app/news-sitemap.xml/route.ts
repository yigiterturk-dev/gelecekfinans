import { prisma } from "@/lib/db";
import { absoluteImageUrl } from "@/lib/image-url";

const BASE = "https://gelecekfinans.com";

export const dynamic = "force-dynamic";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  // Google News sitemap yalnızca son iki gündeki haberleri taşımalıdır.
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
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
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
