/** Rehber (Şerit B) akışını elle çalıştırır ve olayları döker. */
import { runGuidePipeline } from "../lib/bot/guide-orchestrator";
import { prisma } from "../lib/db";

async function main() {
  const result = await runGuidePipeline({
    count: Number(process.argv[2]) || 1,
    trigger: "admin",
    autoPublish: true,
    category: process.argv[3] || undefined,
  });
  console.log("SONUÇ:", JSON.stringify(result, null, 2));
  const events = await prisma.automationEvent.findMany({
    where: { runId: result.runId }, orderBy: { createdAt: "asc" },
    select: { stage: true, level: true, message: true, metadata: true },
  });
  for (const e of events) {
    console.log(`[${e.level}] ${e.stage}: ${e.message}`);
    const m = e.metadata as Record<string, unknown> | null;
    if (m?.reasons) console.log("   reasons:", JSON.stringify(m.reasons));
    if (m?.wordCount) console.log("   kelime:", m.wordCount, "| seo:", m.seoScore, "| küme:", m.cluster);
  }
  await prisma.$disconnect();
}
main();
