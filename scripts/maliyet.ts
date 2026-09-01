/**
 * Model harcamasını gün gün gösterir.
 *   npx tsx --env-file=.env --env-file=.env.local scripts/maliyet.ts [gün]
 *
 * Kaynak: koşu sonunda yazılan `stage:"cost"` AutomationEvent kayıtları.
 * Model çağırmaz, bedavadır.
 */
import { prisma } from "../lib/db";
import type { UsageSummary } from "../lib/bot/usage";

const days = Number(process.argv[2]) || 14;

async function main() {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.automationEvent.findMany({
    where: { stage: "cost", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, metadata: true },
  });

  if (!events.length) {
    console.log(`son ${days} günde maliyet kaydı yok.`);
    console.log("(ölçüm 1 Eylül 2026'da eklendi; öncesi için kayıt yoktur)");
    await prisma.$disconnect();
    return;
  }

  const byDay = new Map<string, { calls: number; input: number; output: number; cost: number }>();
  const byModel = new Map<string, { calls: number; cost: number }>();
  const byStage = new Map<string, { calls: number; cost: number }>();
  const unpriced = new Set<string>();
  let total = 0;

  for (const event of events) {
    const usage = event.metadata as unknown as UsageSummary | null;
    if (!usage || typeof usage.costUsd !== "number") continue;
    const day = event.createdAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    const row = byDay.get(day) ?? { calls: 0, input: 0, output: 0, cost: 0 };
    row.calls += usage.calls;
    row.input += usage.inputTokens;
    row.output += usage.outputTokens;
    row.cost += usage.costUsd;
    byDay.set(day, row);
    total += usage.costUsd;
    for (const [model, stat] of Object.entries(usage.byModel || {})) {
      const m = byModel.get(model) ?? { calls: 0, cost: 0 };
      m.calls += stat.calls; m.cost += stat.costUsd; byModel.set(model, m);
    }
    for (const [stage, stat] of Object.entries(usage.byStage || {})) {
      const s = byStage.get(stage) ?? { calls: 0, cost: 0 };
      s.calls += stat.calls; s.cost += stat.costUsd; byStage.set(stage, s);
    }
    for (const model of usage.unpricedModels || []) unpriced.add(model);
  }

  console.log(`=== GÜNLÜK (son ${days} gün, ${events.length} koşu) ===`);
  for (const [day, row] of [...byDay.entries()].sort()) {
    console.log(
      `${day} | çağrı ${String(row.calls).padStart(3)} | girdi ${String(row.input).padStart(7)} | ` +
      `çıktı ${String(row.output).padStart(6)} | $${row.cost.toFixed(4)}`,
    );
  }

  console.log("\n=== MODELE GÖRE ===");
  for (const [model, m] of [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    console.log(`${model.padEnd(16)} | çağrı ${String(m.calls).padStart(3)} | $${m.cost.toFixed(4)}`);
  }

  console.log("\n=== AŞAMAYA GÖRE ===");
  for (const [stage, s] of [...byStage.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    console.log(`${stage.padEnd(16)} | çağrı ${String(s.calls).padStart(3)} | $${s.cost.toFixed(4)}`);
  }

  const dayCount = byDay.size || 1;
  const perDay = total / dayCount;
  console.log(`\nTOPLAM: $${total.toFixed(4)} | günlük ort. $${perDay.toFixed(4)} | aylık gidiş $${(perDay * 30).toFixed(2)}`);
  if (unpriced.size) {
    console.log(`⚠️ fiyatı bilinmeyen model(ler): ${[...unpriced].join(", ")} — toplam EKSİK.`);
  }

  await prisma.$disconnect();
}

main();
