// Mevcut makalelerin görsellerini yeni hibrit sistemle (gerçek grafik + AI) yeniler.
// Jenerik Unsplash stok fotoları gider. Çalıştırma:
//   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-images.ts [limit] [--all]
import { prisma } from "../lib/db";
import { asJson } from "../lib/prisma-json";
import { getArticleImageResult } from "../lib/bot/images";

async function main() {
  const limit = parseInt(process.argv[2] || "100");
  const onlyPublished = !process.argv.includes("--all");

  const articles = await prisma.article.findMany({
    where: onlyPublished ? { status: "PUBLISHED" } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, slug: true, keyword: true, category: true, automationMeta: true, publishedAt: true, createdAt: true, imageStrategy: true },
  });
  console.log(`[backfill] ${articles.length} makale işlenecek (${onlyPublished ? "sadece yayında" : "tümü"})`);

  // --charts-only: yalnız grafik kapaklı makaleleri yenile (17 Kas: hepsi aynı
  // "bugünün son 1 ayı" grafiğini almıştı; artık seri yayın gününde biter).
  const chartsOnly = process.argv.includes("--charts-only");
  let ok = 0, fail = 0;
  for (const a of articles) {
    if (chartsOnly && a.imageStrategy !== "MARKET_CHART") continue;
    try {
      // Kanıt sayısı geçilmezse markalı kart "kaynakla doğrulandı" rozetini
      // basamaz; eskiden bu durumda YAYINDAKİ makaleye "Editoryal inceleme
      // bekliyor" ibaresi yazılıyordu.
      const evidenceSourceCount = (a.automationMeta as { evidencePacket?: { independentSourceCount?: number } } | null)
        ?.evidencePacket?.independentSourceCount;
      // slug GEÇİLMELİ: verilmezse dosya adı `chart-borsa.png` gibi jenerik
      // oluyor ve aynı kategorideki her makale birbirinin görselini eziyor.
      // Dosya adı ayrıca görsel aramada sıralama sinyali.
      const result = await getArticleImageResult({
        title: a.title, slug: a.slug, keyword: a.keyword || "", category: a.category, evidenceSourceCount,
        asOf: a.publishedAt || a.createdAt,
      });
      const url = result.url;
      if (!url) { fail++; console.log(`[backfill] ✗ görsel üretilemedi: ${a.title.slice(0, 50)}`); continue; }
      // Lisans kanıtı makalede kalmalı: sağlayıcı, varlık kimliği, kaynak
      // sayfası ve atıf sonradan sorulduğunda gösterilebilsin.
      const previous = (a.automationMeta || {}) as Record<string, unknown>;
      await prisma.article.update({
        where: { id: a.id },
        data: {
          imageUrl: url,
          imageStrategy: result.strategy,
          automationMeta: asJson({
            ...previous,
            visual: {
              strategy: result.strategy,
              brief: result.brief,
              audit: result.audit,
              attempts: result.attempts,
              licensedAsset: result.licensedAsset,
              repairedAt: new Date().toISOString(),
              repairedBy: "BACKFILL",
            },
          }),
        },
      });
      ok++;
      console.log(`[backfill] ✓ (${ok}) ${a.category.padEnd(7)} ${result.strategy.padEnd(18)} ${a.title.slice(0, 42)}`);
    } catch (e) {
      fail++;
      console.log(`[backfill] ✗ ${a.title.slice(0, 40)} → ${(e as Error).message}`);
    }
  }
  console.log(`[backfill] BİTTİ — yenilenen: ${ok}, başarısız: ${fail}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
