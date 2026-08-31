/** Tek konu için yayın akışını elle çalıştırır; nerede takıldığını canlı gösterir. */
import { runPublishingPipeline } from "../lib/bot/orchestrator";
import { prisma } from "../lib/db";

async function main() {
  const category = process.argv[2] && process.argv[2] !== "otomatik" ? process.argv[2] : undefined;
  const result = await runPublishingPipeline({ count: 1, trigger: "admin", autoPublish: true, category });
  console.log("SONUÇ:", JSON.stringify(result, null, 2));
  const events = await prisma.automationEvent.findMany({
    where: { runId: result.runId }, orderBy: { createdAt: "asc" },
    select: { stage: true, level: true, message: true, metadata: true },
  });
  console.log("\n--- olaylar ---");
  for (const e of events) {
    const m = e.metadata as Record<string, unknown> | null;
    console.log(`[${e.level}] ${e.stage}: ${e.message}`);
    if (m?.reasons) console.log("   reasons:", JSON.stringify(m.reasons));
    if (m?.verdicts) console.log("   verdicts:", JSON.stringify(m.verdicts));
    if (m?.independentSourceCount !== undefined) console.log("   kaynak:", m.independentSourceCount, "aday:", m.judgeCandidates);
  }
  await prisma.$disconnect();
}
main();
