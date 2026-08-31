/** Son koşumlarda konuların tam olarak hangi gerekçeyle düştüğünü döker. */
import { prisma } from "../lib/db";

async function main() {
  const events = await prisma.automationEvent.findMany({
    where: { stage: "research", createdAt: { gte: new Date(Date.now() - 12 * 3600 * 1000) } },
    orderBy: { createdAt: "desc" }, take: 20,
    select: { message: true, metadata: true },
  });
  const reasonCount = new Map<string, number>();
  for (const e of events) {
    const m = e.metadata as Record<string, unknown> | null;
    const key = `${e.message} | kaynakSayisi=${m?.independentSourceCount} | durum=${m?.evidenceStatus} | aday=${m?.judgeCandidates} | karakter=${m?.materialCharacters ?? "-"}`;
    reasonCount.set(key, (reasonCount.get(key) || 0) + 1);
  }
  for (const [k, v] of [...reasonCount].sort((a, b) => b[1] - a[1])) console.log(v, "×", k);

  console.log("\n--- örnek reasons ---");
  for (const e of events.slice(0, 3)) {
    const m = e.metadata as Record<string, unknown> | null;
    console.log("başlık:", m?.title);
    console.log("reasons:", JSON.stringify(m?.reasons));
    console.log("");
  }
  await prisma.$disconnect();
}
main();
