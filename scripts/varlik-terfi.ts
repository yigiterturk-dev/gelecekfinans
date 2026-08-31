/**
 * Eşiği aşan varlıkları kelime havuzuna taşır. Model çağırmaz — bedava.
 * Cron da aynı işi yapıyor; bu script elle tetiklemek içindir.
 */
import { prisma } from "../lib/db";
import { promoteEntitiesToKeywords } from "../lib/bot/entities";

async function main() {
  const sonuc = await promoteEntitiesToKeywords();
  console.log(`terfi: ${sonuc.promoted.length} | zaten vardı: ${sonuc.skipped}`);
  for (const p of sonuc.promoted) console.log(`  ⬆ ${p.name} → "${p.term}"`);
}

main().finally(() => prisma.$disconnect());
