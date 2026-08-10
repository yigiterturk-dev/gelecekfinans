import assert from "node:assert/strict";
import test from "node:test";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "../lib/bot/ai-budget";

test("AI bütçesi güvenli üretim varsayılanlarını kullanır", () => {
  assert.deepEqual(resolveArticleAIBudgetConfig({}), {
    dailyWriterCallLimit: 10,
    maxWriterCallsPerRun: 1,
    writerMaxOutputTokens: 2400,
    verifierMaxOutputTokens: 800,
    evidencePromptCharacterLimit: 14000,
    evidenceItemCharacterLimit: 2500,
  });
});

test("AI bütçe değişkenleri güvenli aralıklara sıkıştırılır", () => {
  const budget = resolveArticleAIBudgetConfig({
    ARTICLE_DAILY_WRITER_CALL_LIMIT: "999",
    ARTICLE_MAX_WRITER_CALLS_PER_RUN: "0",
    OPENAI_WRITER_MAX_OUTPUT_TOKENS: "9000",
    OPENAI_VERIFIER_MAX_OUTPUT_TOKENS: "10",
  });
  assert.equal(budget.dailyWriterCallLimit, 50);
  assert.equal(budget.maxWriterCallsPerRun, 1);
  assert.equal(budget.writerMaxOutputTokens, 4000);
  assert.equal(budget.verifierMaxOutputTokens, 300);
});

test("günlük bütçe İstanbul gece yarısında sıfırlanır", () => {
  assert.equal(
    startOfIstanbulDay(new Date("2026-08-06T08:15:00.000Z")).toISOString(),
    "2026-08-05T21:00:00.000Z",
  );
});
