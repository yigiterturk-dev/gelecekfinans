/**
 * Model çağrılarının token kullanımını ve dolar maliyetini ölçer.
 *
 * Neden var: 1 Eylül 2026'ya kadar bot hiçbir yere token yazmıyordu; harcama
 * ancak çağrı sayısından TAHMİN edilebiliyordu. OpenAI'ın kendi harcama ucu
 * (`/v1/organization/costs`) proje anahtarıyla okunamıyor (`api.usage.read`
 * yetkisi ister), yani dışarıdan da bakılamıyor. Bu yüzden ölçüm burada,
 * çağrının döndürdüğü `usage` alanından yapılıyor.
 *
 * Tasarım: koşu boyunca bellekte biriktir, koşu sonunda TEK bir
 * AutomationEvent (`stage:"cost"`) yaz. Her çağrı için ayrı satır yazmak
 * hem DB'yi şişirir hem de yazar çağrısı patladığında kayıt bırakmaz.
 */

export type UsageStage = "writer" | "verifier" | "judge" | "entity";

export interface UsageEntry {
  stage: UsageStage;
  model: string;
  /** Hostname only, never the configured URL path, query, or credentials. */
  endpointHost: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** Fiyat tablosunda karşılığı yoksa maliyet 0 yazılır ve bu bayrak kalkar. */
  priced: boolean;
}

/** 1M token başına USD; standart ücretli katman liste fiyatı tahminleri. Ücretsiz katman/gerçek fatura durumunu kanıtlamaz. */
interface ModelPrice {
  input: number;
  cachedInput: number;
  output: number;
}

const PRICES: Record<string, ModelPrice> = {
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
  "gpt-4o": { input: 2.5, cachedInput: 1.25, output: 10 },
  "gpt-4o-mini": { input: 0.15, cachedInput: 0.075, output: 0.6 },
  // Google Gemini API standard paid tier; free tier usage is not billable.
  "gemini-2.5-flash": { input: 0.3, cachedInput: 0.03, output: 2.5 },
  // Google's announced Gemini 2.5 Flash successor; standard text rates checked 2026-11-24.
  "gemini-3.5-flash-lite": { input: 0.3, cachedInput: 0.03, output: 2.5 },
};

/**
 * Model adı sürüm ekiyle gelebilir (`gpt-5-2026-01-01`). En uzun eşleşen
 * önek kazanır: `gpt-5-mini-...` yanlışlıkla `gpt-5` fiyatından sayılmasın.
 */
export function findModelPrice(model: string): ModelPrice | null {
  const name = model.trim().toLowerCase();
  if (PRICES[name]) return PRICES[name];
  const prefix = Object.keys(PRICES)
    .filter((key) => name.startsWith(`${key}-`))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PRICES[prefix] : null;
}

export function estimateCostUsd(args: {
  model: string;
  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;
}): { costUsd: number; priced: boolean } {
  const price = findModelPrice(args.model);
  if (!price) return { costUsd: 0, priced: false };
  const cached = Math.max(0, args.cachedInputTokens || 0);
  // `input_tokens` önbellekli olanları DA içerir; iki kez saymamak için ayrılıyor.
  const fresh = Math.max(0, args.inputTokens - cached);
  const costUsd =
    (fresh * price.input + cached * price.cachedInput + Math.max(0, args.outputTokens) * price.output) / 1_000_000;
  return { costUsd, priced: true };
}

/** Sağlayıcı yanıtlarındaki usage alanının ortak biçimi (Responses + Chat API). */
export interface ProviderUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  input_tokens_details?: { cached_tokens?: number | null } | null;
  prompt_tokens_details?: { cached_tokens?: number | null } | null;
}

let ledger: UsageEntry[] = [];
let attemptLedger: Array<{ stage: UsageStage; model: string; endpointHost: string; reservedCostUsd: number }> = [];

export function resetUsageLedger(): void {
  ledger = [];
  attemptLedger = [];
}

/** Record an outbound model request before sending it, even when it later fails. */
export function recordCallAttempt(
  stage: UsageStage,
  model: string,
  endpointHost = "unknown",
  reservedCostUsd = 0,
): void {
  attemptLedger.push({ stage, model, endpointHost, reservedCostUsd: Math.max(0, reservedCostUsd) });
}

/**
 * Ölçüm hiçbir koşulda koşuyu düşürmemeli: usage gelmezse sessizce atlanır.
 * Maliyet kaydı uğruna makale kaybetmek en pahalı hata olurdu.
 */
export function recordUsage(
  stage: UsageStage,
  model: string,
  usage: ProviderUsage | null | undefined,
  endpointHost = "unknown",
): void {
  if (!usage) return;
  const inputTokens = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.output_tokens ?? usage.completion_tokens ?? 0);
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens)) return;
  if (inputTokens <= 0 && outputTokens <= 0) return;
  const cachedInputTokens = Number(
    usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0,
  ) || 0;
  const { costUsd, priced } = estimateCostUsd({ model, inputTokens, cachedInputTokens, outputTokens });
  ledger.push({ stage, model, endpointHost, inputTokens, cachedInputTokens, outputTokens, costUsd, priced });
}

export interface UsageSummary {
  /** Cost-cap implementation whose preflight reservations are already persisted. */
  spendGuardVersion: 1;
  /** Provider responses that included measurable token usage. */
  calls: number;
  /** Outbound model requests issued, whether they returned usage or failed. */
  attemptedCalls: number;
  /** Requests whose responses did not provide measurable token usage. */
  callsWithoutUsage: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  /** Tahminî en yüksek maliyet: ölçülmüş kullanım ile bekleyen çağrı rezervi arasında büyük olan. */
  reservedCostUsd: number;
  /** Fiyatı bilinmeyen model varsa maliyet EKSİK demektir; adları burada. */
  unpricedModels: string[];
  /** Fiyatı bilinmeyen çağrı bulunduğunda toplam kesin değildir. */
  costIsComplete: boolean;
  byStage: Record<string, { calls: number; attemptedCalls: number; callsWithoutUsage: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  byModel: Record<string, { calls: number; attemptedCalls: number; callsWithoutUsage: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  byEndpointHost: Record<string, { calls: number; attemptedCalls: number; callsWithoutUsage: number; inputTokens: number; outputTokens: number; costUsd: number }>;
  /** Cross-tab for identifying which model generated cost at each pipeline stage. */
  byStageAndModel: Record<string, Record<string, {
    calls: number;
    attemptedCalls: number;
    callsWithoutUsage: number;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>>;
}

export function usageSummary(): UsageSummary {
  const summary: UsageSummary = {
    spendGuardVersion: 1,
    calls: ledger.length,
    attemptedCalls: attemptLedger.length,
    callsWithoutUsage: Math.max(0, attemptLedger.length - ledger.length),
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    reservedCostUsd: 0,
    unpricedModels: [],
    costIsComplete: true,
    byStage: {},
    byModel: {},
    byEndpointHost: {},
    byStageAndModel: {},
  };
  const unpriced = new Set<string>();
  for (const entry of ledger) {
    summary.inputTokens += entry.inputTokens;
    summary.cachedInputTokens += entry.cachedInputTokens;
    summary.outputTokens += entry.outputTokens;
    summary.costUsd += entry.costUsd;
    if (!entry.priced) unpriced.add(entry.model);
    for (const [bucket, key] of [
      [summary.byStage, entry.stage],
      [summary.byModel, entry.model],
      [summary.byEndpointHost, entry.endpointHost],
    ] as const) {
      const row = bucket[key] ?? { calls: 0, attemptedCalls: 0, callsWithoutUsage: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      row.calls += 1;
      row.inputTokens += entry.inputTokens;
      row.outputTokens += entry.outputTokens;
      row.costUsd += entry.costUsd;
      bucket[key] = row;
    }
    const stageModels = summary.byStageAndModel[entry.stage] ?? {};
    const modelRow = stageModels[entry.model] ?? {
      calls: 0,
      attemptedCalls: 0,
      callsWithoutUsage: 0,
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
    modelRow.calls += 1;
    modelRow.inputTokens += entry.inputTokens;
    modelRow.cachedInputTokens += entry.cachedInputTokens;
    modelRow.outputTokens += entry.outputTokens;
    modelRow.costUsd += entry.costUsd;
    stageModels[entry.model] = modelRow;
    summary.byStageAndModel[entry.stage] = stageModels;
  }
  for (const attempt of attemptLedger) {
    summary.reservedCostUsd += attempt.reservedCostUsd;
    const stageRow = summary.byStage[attempt.stage] ?? {
      calls: 0, attemptedCalls: 0, callsWithoutUsage: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    stageRow.attemptedCalls += 1;
    summary.byStage[attempt.stage] = stageRow;

    const modelRow = summary.byModel[attempt.model] ?? {
      calls: 0, attemptedCalls: 0, callsWithoutUsage: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    modelRow.attemptedCalls += 1;
    summary.byModel[attempt.model] = modelRow;

    const endpointRow = summary.byEndpointHost[attempt.endpointHost] ?? {
      calls: 0, attemptedCalls: 0, callsWithoutUsage: 0, inputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    endpointRow.attemptedCalls += 1;
    summary.byEndpointHost[attempt.endpointHost] = endpointRow;

    const stageModels = summary.byStageAndModel[attempt.stage] ?? {};
    const stageModelRow = stageModels[attempt.model] ?? {
      calls: 0, attemptedCalls: 0, callsWithoutUsage: 0,
      inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0,
    };
    stageModelRow.attemptedCalls += 1;
    stageModels[attempt.model] = stageModelRow;
    summary.byStageAndModel[attempt.stage] = stageModels;
  }
  for (const row of [...Object.values(summary.byStage), ...Object.values(summary.byModel), ...Object.values(summary.byEndpointHost)]) {
    row.callsWithoutUsage = Math.max(0, row.attemptedCalls - row.calls);
  }
  for (const models of Object.values(summary.byStageAndModel)) {
    for (const row of Object.values(models)) {
      row.callsWithoutUsage = Math.max(0, row.attemptedCalls - row.calls);
    }
  }
  summary.costUsd = Number(summary.costUsd.toFixed(6));
  summary.reservedCostUsd = Number(summary.reservedCostUsd.toFixed(6));
  for (const bucket of [summary.byStage, summary.byModel, summary.byEndpointHost]) {
    for (const row of Object.values(bucket)) row.costUsd = Number(row.costUsd.toFixed(6));
  }
  for (const models of Object.values(summary.byStageAndModel)) {
    for (const row of Object.values(models)) row.costUsd = Number(row.costUsd.toFixed(6));
  }
  summary.unpricedModels = [...unpriced];
  summary.costIsComplete = unpriced.size === 0 && summary.callsWithoutUsage === 0;
  return summary;
}
