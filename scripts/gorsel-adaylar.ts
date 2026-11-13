// Görsel adaylarını İNDİRMEDEN listeler: hangi makaleye hangi stok görsel
// seçilecek, lisansı ve kaynağı ne? Tek tek onay beklemek yerine toplu denetim.
//   npx tsx --env-file=.env.prod scripts/gorsel-adaylar.ts [limit] [--bos]
import { prisma } from "../lib/db";
import { buildStockQuery, searchStockMedia, stockMediaConfigured } from "../lib/bot/stock-media";

async function main() {
  if (!stockMediaConfigured()) {
    console.log("[adaylar] PEXELS_API_KEY veya PIXABAY_API_KEY yok — hepsi markalı karta düşer.");
    process.exit(0);
  }

  const limit = parseInt(process.argv[2] || "20");
  const onlyEmpty = process.argv.includes("--bos");
  const articles = await prisma.article.findMany({
    where: onlyEmpty ? { imageStrategy: { not: "LICENSED_MEDIA" } } : {},
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: { title: true, keyword: true, category: true, imageStrategy: true },
  });
  console.log(`[adaylar] ${articles.length} makale · stok: ${process.env.PEXELS_API_KEY ? "pexels " : ""}${process.env.PIXABAY_API_KEY ? "pixabay" : ""}`);

  let found = 0;
  for (const article of articles) {
    const query = buildStockQuery(article);
    const result = await searchStockMedia({ query: "", category: article.category, headline: article.title });
    const attempts = result.attempts.map((a) => `${a.provider}:${a.candidates}`).join(" ");
    if (result.asset) {
      found++;
      console.log(`✓ ${article.title.slice(0, 48)}`);
      console.log(`  sorgu: ${query}`);
      console.log(`  seçilen: ${result.asset.provider}/${result.asset.assetId} · ${result.asset.width}x${result.asset.height} · ${attempts}`);
      console.log(`  lisans: ${result.asset.licenseName} · ${result.asset.attribution}`);
      console.log(`  kaynak: ${result.asset.sourceUrl}`);
    } else {
      console.log(`✗ ${article.title.slice(0, 48)} → markalı kart (${attempts})`);
    }
  }
  console.log(`[adaylar] BİTTİ — stok bulunan: ${found}/${articles.length}`);
  await prisma.$disconnect();
}

main().catch((error) => { console.error(error); process.exit(1); });
