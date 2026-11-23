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
    select: { createdAt: true, runId: true, metadata: true },
  });

  if (!events.length) {
    console.log(`son ${days} günde maliyet kaydı yok.`);
    console.log("(ölçüm 1 Eylül 2026'da eklendi; öncesi için kayıt yoktur)");
    await prisma.$disconnect();
    return;
  }

  const byDay = new Map<string, { calls: number; input: number; output: number; cost: number; unpriced: Set<string> }>();
  const byModel = new Map<string, { calls: number; input: number; output: number; cost: number }>();
  const byAdapterModel = new Map<string, { calls: number; cost: number; priced: boolean }>();
  const byStage = new Map<string, { calls: number; cost: number }>();
  const unpriced = new Set<string>();
  let total = 0;

  const runIds = [...new Set(events.map((event) => event.runId).filter((id): id is string => Boolean(id)))];
  const startEvents = runIds.length
    ? await prisma.automationEvent.findMany({
        where: { stage: "start", runId: { in: runIds } },
        select: { runId: true, metadata: true },
      })
    : [];
  const adapterByRun = new Map(startEvents.map((event) => {
    const metadata = event.metadata as { aiProvider?: unknown } | null;
    return [event.runId, typeof metadata?.aiProvider === "string" ? metadata.aiProvider : "başlangıç kaydı yok"] as const;
  }));

  for (const event of events) {
    const usage = event.metadata as unknown as UsageSummary | null;
    if (!usage || typeof usage.costUsd !== "number") continue;
    const day = event.createdAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    const row = byDay.get(day) ?? { calls: 0, input: 0, output: 0, cost: 0, unpriced: new Set<string>() };
    row.calls += usage.calls;
    row.input += usage.inputTokens;
    row.output += usage.outputTokens;
    row.cost += usage.costUsd;
    for (const model of usage.unpricedModels || []) row.unpriced.add(model);
    byDay.set(day, row);
    total += usage.costUsd;
    for (const [model, stat] of Object.entries(usage.byModel || {})) {
      const m = byModel.get(model) ?? { calls: 0, input: 0, output: 0, cost: 0 };
      m.calls += stat.calls;
      m.input += stat.inputTokens;
      m.output += stat.outputTokens;
      m.cost += stat.costUsd;
      byModel.set(model, m);
      const adapter = event.runId ? adapterByRun.get(event.runId) || "başlangıç kaydı yok" : "koşu kimliği yok";
      const adapterModel = `${adapter} | ${model}`;
      const am = byAdapterModel.get(adapterModel) ?? { calls: 0, cost: 0, priced: true };
      am.calls += stat.calls;
      am.cost += stat.costUsd;
      am.priced = am.priced && !(usage.unpricedModels || []).includes(model);
      byAdapterModel.set(adapterModel, am);
    }
    for (const [stage, stat] of Object.entries(usage.byStage || {})) {
      const s = byStage.get(stage) ?? { calls: 0, cost: 0 };
      s.calls += stat.calls; s.cost += stat.costUsd; byStage.set(stage, s);
    }
    for (const model of usage.unpricedModels || []) unpriced.add(model);
  }

  console.log(`=== GÜNLÜK (son ${days} gün, ${events.length} koşu) ===`);
  for (const [day, row] of [...byDay.entries()].sort()) {
    const cost = row.unpriced.size
      ? `$${row.cost.toFixed(4)} + bilinmeyen (${[...row.unpriced].join(", ")})`
      : `$${row.cost.toFixed(4)}`;
    console.log(
      `${day} | çağrı ${String(row.calls).padStart(3)} | girdi ${String(row.input).padStart(7)} | ` +
      `çıktı ${String(row.output).padStart(6)} | ${cost}`,
    );
  }

  console.log("\n=== MODELE GÖRE ===");
  for (const [model, m] of [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    const cost = unpriced.has(model) ? "maliyet bilinmiyor" : `kayıtlı $${m.cost.toFixed(4)}`;
    console.log(
      `${model.padEnd(32)} | çağrı ${String(m.calls).padStart(3)} | ` +
      `girdi ${String(m.input).padStart(9)} | çıktı ${String(m.output).padStart(9)} | ${cost}`,
    );
  }

  console.log("\n=== ADAPTER / MODEL (bazı eski koşularda başlangıç kaydı yok) ===");
  for (const [key, value] of [...byAdapterModel.entries()].sort((a, b) => b[1].calls - a[1].calls)) {
    const cost = value.priced ? `kayıtlı $${value.cost.toFixed(4)}` : "maliyet bilinmiyor";
    console.log(`${key.padEnd(58)} | çağrı ${String(value.calls).padStart(3)} | ${cost}`);
  }

  console.log("\n=== AŞAMAYA GÖRE (yalnız fiyatı bilinen maliyet) ===");
  for (const [stage, s] of [...byStage.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    console.log(`${stage.padEnd(16)} | çağrı ${String(s.calls).padStart(3)} | kayıtlı $${s.cost.toFixed(4)}`);
  }

  if (unpriced.size) {
    console.log(`\nBİLİNEN MALİYET ALT SINIRI: $${total.toFixed(4)} | GERÇEK TOPLAM: BİLİNMİYOR`);
    console.log(`Fiyat kaydı olmayan model(ler): ${[...unpriced].join(", ")} — $0 kabul edilmedi.`);
  } else {
    console.log(`\nKAYITLI TOPLAM: $${total.toFixed(4)} | sağlayıcı faturasıyla mutabakat değildir.`);
  }

  await prisma.$disconnect();
}

main();
