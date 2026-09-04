/**
 * Yayınlanmış makalesi olduğu hâlde FAILED/QUEUED görünen kelimeleri onarır.
 *
 * Neden: orchestrator'ın catch bloğu koşulsuz `markKeywordFailed` çağırıyordu;
 * makale yayımlandıktan SONRA bir adım hata verince kelime PUBLISHED'dan
 * düşüyordu (canlı vaka: "altın yatırımı nasıl yapılır", 3 Eylül).
 * Kaynak neden `lib/bot/keywords.ts` içinde düzeltildi; bu araç geçmişte
 * bozulmuş kayıtları toplar.
 *
 * Varsayılan KURU KOŞU; uygulamak için --uygula.
 *   npx tsx scripts/kelime-durum-onar.ts [--uygula]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const uygula = process.argv.includes("--uygula");

(async () => {
  const bozuk = await prisma.keyword.findMany({
    where: { status: { in: ["FAILED", "QUEUED", "IN_PROGRESS"] } },
    select: { id: true, term: true, status: true, attempts: true },
  });

  let sayac = 0;
  for (const k of bozuk) {
    const yayin = await prisma.article.findFirst({
      where: { keywordId: k.id, status: "PUBLISHED" },
      select: { slug: true, publishedAt: true },
    });
    if (!yayin) continue;
    sayac++;
    console.log(`${k.status} → PUBLISHED · ${k.term}`);
    console.log(`   makale: /${yayin.slug} (${yayin.publishedAt?.toISOString().slice(0, 10)})`);
    if (uygula) {
      await prisma.keyword.update({ where: { id: k.id }, data: { status: "PUBLISHED" } });
    }
  }

  console.log(`\n${bozuk.length} kelime tarandı, ${sayac} tanesinin yayınlanmış makalesi var.`);
  console.log(uygula ? "Durumlar düzeltildi." : "KURU KOŞU — uygulamak için --uygula ekleyin.");
  await prisma.$disconnect();
})();
