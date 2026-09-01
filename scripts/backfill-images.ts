// Mevcut makalelerin görsellerini yeni hibrit sistemle (gerçek grafik + AI) yeniler.
// Jenerik Unsplash stok fotoları gider. Çalıştırma:
//   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-images.ts [limit] [--all]
import { prisma } from "../lib/db";
import { getArticleImage } from "../lib/bot/images";

async function main() {
  const limit = parseInt(process.argv[2] || "100");
  const onlyPublished = !process.argv.includes("--all");

  const articles = await prisma.article.findMany({
    where: onlyPublished ? { status: "PUBLISHED" } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, keyword: true, category: true, automationMeta: true },
  });
  console.log(`[backfill] ${articles.length} makale işlenecek (${onlyPublished ? "sadece yayında" : "tümü"})`);

  let ok = 0, fail = 0;
  for (const a of articles) {
    try {
      // Kanıt sayısı geçilmezse markalı kart "kaynakla doğrulandı" rozetini
      // basamaz; eskiden bu durumda YAYINDAKİ makaleye "Editoryal inceleme
      // bekliyor" ibaresi yazılıyordu.
      const evidenceSourceCount = (a.automationMeta as { evidencePacket?: { independentSourceCount?: number } } | null)
        ?.evidencePacket?.independentSourceCount;
      const url = await getArticleImage({
        title: a.title, keyword: a.keyword || "", category: a.category, evidenceSourceCount,
      });
      if (!url) { fail++; console.log(`[backfill] ✗ görsel üretilemedi: ${a.title.slice(0, 50)}`); continue; }
      await prisma.article.update({ where: { id: a.id }, data: { imageUrl: url } });
      ok++;
      console.log(`[backfill] ✓ (${ok}) ${a.category.padEnd(7)} ${a.title.slice(0, 50)}`);
    } catch (e) {
      fail++;
      console.log(`[backfill] ✗ ${a.title.slice(0, 40)} → ${(e as Error).message}`);
    }
  }
  console.log(`[backfill] BİTTİ — yenilenen: ${ok}, başarısız: ${fail}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
