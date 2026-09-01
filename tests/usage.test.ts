import assert from "node:assert/strict";
import test from "node:test";
import { estimateCostUsd, findModelPrice, recordUsage, resetUsageLedger, usageSummary } from "../lib/bot/usage";

test("fiyat tablosu sürüm ekli model adını en uzun önekle eşler", () => {
  assert.equal(findModelPrice("gpt-5")?.input, 1.25);
  // gpt-5-mini, yanlışlıkla gpt-5 fiyatından sayılmamalı (8 kat pahalı).
  assert.equal(findModelPrice("gpt-5-mini-2026-01-01")?.input, 0.25);
  assert.equal(findModelPrice("gpt-4o-mini")?.output, 0.6);
  assert.equal(findModelPrice("bilinmeyen-model"), null);
});

test("önbellekli girdi iki kez saymaz", () => {
  // 1M girdinin 1M'i önbellekli: tamamı indirimli fiyattan sayılmalı.
  const cached = estimateCostUsd({ model: "gpt-5", inputTokens: 1_000_000, cachedInputTokens: 1_000_000, outputTokens: 0 });
  assert.equal(cached.costUsd, 0.125);
  const fresh = estimateCostUsd({ model: "gpt-5", inputTokens: 1_000_000, outputTokens: 0 });
  assert.equal(fresh.costUsd, 1.25);
});

test("fiyatı bilinmeyen model maliyeti şişirmez, işaretlenir", () => {
  resetUsageLedger();
  recordUsage("writer", "yeni-model-x", { input_tokens: 1000, output_tokens: 1000 });
  const summary = usageSummary();
  assert.equal(summary.costUsd, 0);
  assert.deepEqual(summary.unpricedModels, ["yeni-model-x"]);
});

test("usage gelmezse ölçüm sessizce atlanır", () => {
  resetUsageLedger();
  recordUsage("writer", "gpt-5", undefined);
  recordUsage("writer", "gpt-5", null);
  recordUsage("writer", "gpt-5", { input_tokens: 0, output_tokens: 0 });
  assert.equal(usageSummary().calls, 0);
});

test("koşu özeti aşama ve modele göre toplanır", () => {
  resetUsageLedger();
  recordUsage("writer", "gpt-5", {
    input_tokens: 10_000,
    output_tokens: 3_000,
    input_tokens_details: { cached_tokens: 2_000 },
  });
  recordUsage("verifier", "gpt-4o-mini", { input_tokens: 4_000, output_tokens: 500 });
  // DeepSeek/Chat API alan adları da okunmalı.
  recordUsage("judge", "gpt-5-mini", { prompt_tokens: 1_000, completion_tokens: 200 });

  const summary = usageSummary();
  assert.equal(summary.calls, 3);
  assert.equal(summary.inputTokens, 15_000);
  assert.equal(summary.outputTokens, 3_700);
  assert.equal(summary.cachedInputTokens, 2_000);
  assert.equal(summary.byStage.writer.calls, 1);
  assert.equal(summary.byModel["gpt-4o-mini"].calls, 1);
  assert.deepEqual(summary.unpricedModels, []);

  // yazar: 8000*1.25 + 2000*0.125 + 3000*10 = 0.01 + 0.00025 + 0.03
  assert.equal(summary.byStage.writer.costUsd, 0.04025);
  // doğrulayıcı: 4000*0.15 + 500*0.6 = 0.0006 + 0.0003
  assert.equal(summary.byStage.verifier.costUsd, 0.0009);
  // hakem: 1000*0.25 + 200*2 = 0.00025 + 0.0004
  assert.equal(summary.byStage.judge.costUsd, 0.00065);
  assert.equal(summary.costUsd, 0.0418);
});

test("ledger koşu başında sıfırlanır", () => {
  resetUsageLedger();
  recordUsage("writer", "gpt-5", { input_tokens: 100, output_tokens: 100 });
  assert.equal(usageSummary().calls, 1);
  resetUsageLedger();
  assert.equal(usageSummary().calls, 0);
  assert.equal(usageSummary().costUsd, 0);
});
