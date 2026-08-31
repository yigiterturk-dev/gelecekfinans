/** Anahtar kelime havuzunu tohum listesinden doldurur. Tekrar çalıştırılabilir. */
import { getKeywordPoolStats, seedKeywords } from "../lib/bot/keywords";
import { prisma } from "../lib/db";

async function main() {
  const result = await seedKeywords();
  console.log(`tohum: ${result.total} | yeni: ${result.created} | güncellenen: ${result.updated}`);
  console.log("havuz:", JSON.stringify(await getKeywordPoolStats()));
  await prisma.$disconnect();
}
main();
