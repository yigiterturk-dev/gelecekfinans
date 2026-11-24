/**
 * Model harcamasını gün gün gösterir.
 *   npx tsx --env-file=.env --env-file=.env.local scripts/maliyet.ts [gün]
 *
 * Kaynak: koşu sonunda yazılan `stage:"cost"` AutomationEvent kayıtları.
 * Model çağırmaz, bedavadır.
 */
import { prisma } from "../lib/db";
import { estimateCostUsd, type UsageSummary } from "../lib/bot/usage";

const days = Number(process.argv[2]) || 14;

function displayProvider(provider: string, model: string): string {
  if (provider === "deepseek" && model.toLowerCase().startsWith("gemini-")) {
    return "Google Gemini API (uyumlu adapter: deepseek)";
  }
  return provider;
}

async function main() {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [events, reservations] = await Promise.all([
    prisma.automationEvent.findMany({
      where: { stage: "cost", createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, runId: true, metadata: true },
    }),
    prisma.automationEvent.findMany({
      where: { stage: "model_spend_reservation", createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, metadata: true },
    }),
  ]);

  if (!events.length && !reservations.length) {
    console.log(`son ${days} günde maliyet kaydı yok.`);
    console.log("(ölçüm 1 Eylül 2026'da eklendi; öncesi için kayıt yoktur)");
    await prisma.$disconnect();
    return;
  }

  const byDay = new Map<string, { calls: number; input: number; output: number; cost: number; unpriced: Set<string> }>();
  const byModel = new Map<string, { calls: number; input: number; output: number; cost: number }>();
  const byAdapterModel = new Map<string, { calls: number; cost: number; priced: boolean }>();
  const byRunConfigStage = new Map<string, { calls: number; input: number; output: number; cost: number }>();
  const byStage = new Map<string, { calls: number; cost: number }>();
  const byStageModel = new Map<string, { calls: number; attempted: number; missingUsage: number; input: number; output: number; cost: number }>();
  const byEndpoint = new Map<string, { calls: number; attempted: number; missingUsage: number; input: number; output: number; cost: number }>();
  const unpriced = new Set<string>();
  const historicalEstimateByModel = new Map<string, { calls: number; input: number; output: number; usd: number }>();
  const historicalUnknownModels = new Set<string>();
  let total = 0;
  let reservedTotal = 0;
  let malformedReservations = 0;
  const reservedByBucket = new Map<string, { calls: number; usd: number }>();

  for (const event of reservations) {
    const metadata = event.metadata as { stage?: unknown; model?: unknown; endpointHost?: unknown; reservedCostUsd?: unknown } | null;
    const usd = metadata?.reservedCostUsd;
    if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0) {
      malformedReservations += 1;
      continue;
    }
    reservedTotal += usd;
    const stage = typeof metadata?.stage === "string" ? metadata.stage : "aşama kaydı yok";
    const model = typeof metadata?.model === "string" ? metadata.model : "model kaydı yok";
    const host = typeof metadata?.endpointHost === "string" ? metadata.endpointHost : "uç kaydı yok";
    const key = `${stage} | ${model} | ${host}`;
    const row = reservedByBucket.get(key) ?? { calls: 0, usd: 0 };
    row.calls += 1;
    row.usd += usd;
    reservedByBucket.set(key, row);
  }

  const runIds = [...new Set(events.map((event) => event.runId).filter((id): id is string => Boolean(id)))];
  const startEvents = runIds.length
    ? await prisma.automationEvent.findMany({
        where: { stage: "start", runId: { in: runIds } },
        select: { runId: true, metadata: true },
      })
    : [];
  const runConfigById = new Map(startEvents.map((event) => {
    const metadata = event.metadata as { aiProvider?: unknown; writerModel?: unknown; verifierModel?: unknown } | null;
    return [event.runId, {
      provider: typeof metadata?.aiProvider === "string" ? metadata.aiProvider : "sağlayıcı kaydı yok",
      writerModel: typeof metadata?.writerModel === "string" ? metadata.writerModel : "model kaydı yok",
      verifierModel: typeof metadata?.verifierModel === "string" ? metadata.verifierModel : "model kaydı yok",
    }] as const;
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
      const rawProvider = event.runId ? runConfigById.get(event.runId)?.provider || "başlangıç kaydı yok" : "koşu kimliği yok";
      const adapter = displayProvider(rawProvider, model);
      const adapterModel = `${adapter} | ${model}`;
      const am = byAdapterModel.get(adapterModel) ?? { calls: 0, cost: 0, priced: true };
      am.calls += stat.calls;
      am.cost += stat.costUsd;
      am.priced = am.priced && !(usage.unpricedModels || []).includes(model);
      byAdapterModel.set(adapterModel, am);
      if ((usage.unpricedModels || []).includes(model)) {
        const estimate = estimateCostUsd({ model, inputTokens: stat.inputTokens, outputTokens: stat.outputTokens });
        if (estimate.priced) {
          const historical = historicalEstimateByModel.get(model) ?? { calls: 0, input: 0, output: 0, usd: 0 };
          historical.calls += stat.calls;
          historical.input += stat.inputTokens;
          historical.output += stat.outputTokens;
          historical.usd += estimate.costUsd;
          historicalEstimateByModel.set(model, historical);
        } else {
          historicalUnknownModels.add(model);
        }
      }
    }
    for (const [stage, stat] of Object.entries(usage.byStage || {})) {
      const s = byStage.get(stage) ?? { calls: 0, cost: 0 };
      s.calls += stat.calls; s.cost += stat.costUsd; byStage.set(stage, s);
      const runConfig = event.runId ? runConfigById.get(event.runId) : undefined;
      const model = runConfig
        ? (stage === "writer" ? runConfig.writerModel : runConfig.verifierModel)
        : "başlangıç kaydı yok";
      const provider = displayProvider(runConfig?.provider || "sağlayıcı kaydı yok", model);
      const key = `${provider} | ${model} | ${stage}`;
      const configured = byRunConfigStage.get(key) ?? { calls: 0, input: 0, output: 0, cost: 0 };
      configured.calls += stat.calls;
      configured.input += stat.inputTokens;
      configured.output += stat.outputTokens;
      configured.cost += stat.costUsd;
      byRunConfigStage.set(key, configured);
    }
    for (const [stage, models] of Object.entries(usage.byStageAndModel || {})) {
      for (const [model, stat] of Object.entries(models)) {
        const key = `${stage} | ${model}`;
        const row = byStageModel.get(key) ?? { calls: 0, attempted: 0, missingUsage: 0, input: 0, output: 0, cost: 0 };
        row.calls += stat.calls;
        row.attempted += stat.attemptedCalls;
        row.missingUsage += stat.callsWithoutUsage;
        row.input += stat.inputTokens;
        row.output += stat.outputTokens;
        row.cost += stat.costUsd;
        byStageModel.set(key, row);
      }
    }
    for (const [host, stat] of Object.entries(usage.byEndpointHost || {})) {
      const row = byEndpoint.get(host) ?? { calls: 0, attempted: 0, missingUsage: 0, input: 0, output: 0, cost: 0 };
      row.calls += stat.calls;
      row.attempted += stat.attemptedCalls;
      row.missingUsage += stat.callsWithoutUsage;
      row.input += stat.inputTokens;
      row.output += stat.outputTokens;
      row.cost += stat.costUsd;
      byEndpoint.set(host, row);
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

  console.log("\n=== AŞAMA / MODEL (koşu başlangıç ayarlarından) ===");
  for (const [key, row] of [...byRunConfigStage.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
    console.log(
      `${key.padEnd(72)} | çağrı ${String(row.calls).padStart(3)} | ` +
      `girdi ${String(row.input).padStart(9)} | çıktı ${String(row.output).padStart(9)} | $${row.cost.toFixed(4)}`,
    );
  }

  if (byStageModel.size) {
    console.log("\n=== AŞAMA / MODEL (başarısız denemeler dahil) ===");
    for (const [key, row] of [...byStageModel.entries()].sort((a, b) => b[1].cost - a[1].cost)) {
      console.log(
        `${key.padEnd(48)} | yanıt ${String(row.calls).padStart(3)} / deneme ${String(row.attempted).padStart(3)} | ` +
        `usage yok ${String(row.missingUsage).padStart(3)} | kayıtlı $${row.cost.toFixed(4)}`,
      );
    }
  } else {
    console.log("\nAşama/model ayrıntısı eski kayıt formatında tutulmamış.");
  }

  if (byEndpoint.size) {
    console.log("\n=== UÇ NOKTA HOSTU ===");
    for (const [host, row] of [...byEndpoint.entries()].sort((a, b) => b[1].calls - a[1].calls)) {
      console.log(`${host.padEnd(36)} | yanıt ${String(row.calls).padStart(3)} / deneme ${String(row.attempted).padStart(3)} | usage yok ${String(row.missingUsage).padStart(3)}`);
    }
  } else {
    console.log("Uç nokta hostu eski maliyet kayıtlarında tutulmamış.");
  }

  if (unpriced.size) {
    console.log(`\nBİLİNEN MALİYET ALT SINIRI: $${total.toFixed(4)} | GERÇEK TOPLAM: BİLİNMİYOR`);
    console.log(`Fiyat kaydı olmayan model(ler): ${[...unpriced].join(", ")} — $0 kabul edilmedi.`);
  } else {
    console.log(`\nKAYITLI TOPLAM: $${total.toFixed(4)} | sağlayıcı faturasıyla mutabakat değildir.`);
  }

  if (historicalEstimateByModel.size || historicalUnknownModels.size) {
    console.log("\n=== ESKİ KAYITLAR İÇİN BUGÜNKÜ STANDART TARİFEYLE KARŞILAŞTIRMA ===");
    for (const [model, row] of [...historicalEstimateByModel.entries()].sort((a, b) => b[1].usd - a[1].usd)) {
      console.log(
        `${model.padEnd(32)} | çağrı ${String(row.calls).padStart(3)} | ` +
        `${row.input} girdi / ${row.output} çıktı | yaklaşık $${row.usd.toFixed(4)} (ücretsiz katman ve fatura bilinmiyor)`,
      );
    }
    if (historicalUnknownModels.size) {
      console.log(`Bugünkü tarifesi de olmayan geçmiş model(ler): ${[...historicalUnknownModels].join(", ")}.`);
    }
    console.log("Bu karşılaştırma kayıtlı toplamın üzerine eklenmez ve eski API faturalarını yeniden kurmaz.");
  }

  console.log(`\n=== ÖN REZERVASYONLAR (son ${days} gün) ===`);
  if (reservations.length) {
    for (const [key, row] of [...reservedByBucket.entries()].sort((a, b) => b[1].usd - a[1].usd)) {
      console.log(`${key.padEnd(72)} | ${row.calls} rezervasyon | üst sınır $${row.usd.toFixed(4)}`);
    }
    console.log(
      `Toplam ${reservations.length} ön rezervasyon: en çok $${reservedTotal.toFixed(4)} ayrılmış. ` +
      "Bu, fatura değildir; başarısız/yanıtsız çağrılarda da rezervasyon tutulur ve ölçülen maliyetle toplanmamalıdır.",
    );
  } else {
    console.log("Kalıcı model isteği rezervasyonu yok; eski maliyet kayıtları ön-rezervasyon döneminden olabilir.");
  }
  if (malformedReservations) {
    console.log(`Bozuk maliyet alanlı rezervasyon: ${malformedReservations}; doğru üst sınır bilinmiyor.`);
  }

  await prisma.$disconnect();
}

main();
