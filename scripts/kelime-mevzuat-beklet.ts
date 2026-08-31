/**
 * Vergi/mevzuat kelimelerini beklemeye alır.
 *
 * Kavramsal rehber şeridi somut oran ve mevzuat maddesi yazamaz; "kripto para
 * vergisi" gibi bir kelime tam olarak bunu gerektirir. Yazdırmak yerine
 * beklemeye alınır — resmî PDF korpusu kurulunca açılacak.
 */
import { prisma } from "../lib/db";

const MEVZUAT = /vergi|stopaj|beyanname|mevzuat|yasal|kanun/i;

async function main() {
  const apply = process.argv.includes("--apply");
  const all = await prisma.keyword.findMany({ select: { id: true, term: true, status: true } });
  const hits = all.filter((k) => MEVZUAT.test(k.term));
  for (const k of hits) console.log(`${apply ? "beklemeye alındı" : "aday"}: ${k.term}`);
  if (apply && hits.length) {
    await prisma.keyword.updateMany({
      where: { id: { in: hits.map((k) => k.id) } },
      data: { status: "PAUSED", notes: "Somut vergi/mevzuat bilgisi gerekiyor; resmî kaynak korpusu bekleniyor" },
    });
  }
  console.log(`${hits.length} kelime`);
  await prisma.$disconnect();
}
main();
