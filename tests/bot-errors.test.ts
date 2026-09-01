import assert from "node:assert/strict";
import test from "node:test";
import {
  AIBudgetLimitError,
  AIProviderConfigurationError,
  VerificationBlockedError,
  isVerificationBlockedError,
  AIProviderFatalError,
  AnthropicBillingError,
  isAnthropicBillingError,
  OpenAIQuotaError,
  isOpenAIQuotaError,
  isProviderRequestConfigurationError,
} from "../lib/bot/errors";
import { supportsReasoningEffort } from "../lib/bot/writer";

test("harcama freni kalıcı biçimde yeni model çağrılarını durdurur", () => {
  const error = new AIBudgetLimitError();
  assert.equal(error.code, "AI_BUDGET_LIMIT_REACHED");
  assert.ok(error instanceof AIProviderFatalError);
});

test("kredi ve kota tükenmesini kalıcı hata olarak tanır", () => {
  assert.equal(isOpenAIQuotaError(new Error("429 You have no credits remaining")), true);
  assert.equal(isOpenAIQuotaError({ status: 429, code: "insufficient_quota" }), true);
  assert.equal(isOpenAIQuotaError(new Error("503 service unavailable")), false);
});

test("yönetim ekranına kararlı bir hata kodu taşır", () => {
  const error = new OpenAIQuotaError();
  assert.equal(error.code, "OPENAI_QUOTA_EXHAUSTED");
  assert.equal(error.name, "OpenAIQuotaError");
});

test("Anthropic billing hatasını kalıcı sağlayıcı hatası olarak tanır", () => {
  assert.equal(isAnthropicBillingError({ status: 402, error: { type: "billing_error" } }), true);
  assert.equal(isAnthropicBillingError({ status: 429, error: { type: "rate_limit_error" } }), false);
  const error = new AnthropicBillingError();
  assert.equal(error.code, "ANTHROPIC_BILLING_ERROR");
  assert.ok(error instanceof AIProviderFatalError);
});

test("eksik sağlayıcı ayarı akışı kalıcı biçimde durdurur", () => {
  const error = new AIProviderConfigurationError("eksik");
  assert.equal(error.code, "AI_PROVIDER_CONFIGURATION_ERROR");
  assert.ok(error instanceof AIProviderFatalError);
});

test("400 'unsupported parameter' yapılandırma hatası sayılır", () => {
  const hata = {
    status: 400,
    message: "400 Unsupported parameter: 'reasoning.effort' is not supported with this model.",
  };
  assert.equal(isProviderRequestConfigurationError(hata), true);
});

test("model_not_found ve unsupported value da yapılandırma hatasıdır", () => {
  assert.equal(
    isProviderRequestConfigurationError({ status: 404, error: { code: "model_not_found" } }),
    true,
  );
  assert.equal(
    isProviderRequestConfigurationError({
      status: 400,
      message: "Unsupported value: 'none' is not supported with the 'gpt-5' model.",
    }),
    true,
  );
});

test("kota/geçici hatalar yapılandırma hatası sayılmaz", () => {
  assert.equal(isProviderRequestConfigurationError({ status: 429, message: "rate limit" }), false);
  assert.equal(isProviderRequestConfigurationError({ status: 500, message: "server error" }), false);
  assert.equal(isProviderRequestConfigurationError({ status: 400, message: "invalid json" }), false);
});

test("reasoning.effort yalnızca akıl yürüten modellere gönderilir", () => {
  assert.equal(supportsReasoningEffort("gpt-5"), true);
  assert.equal(supportsReasoningEffort("gpt-5-mini"), true);
  assert.equal(supportsReasoningEffort("o3-mini"), true);
  assert.equal(supportsReasoningEffort("gpt-4o-mini"), false);
  assert.equal(supportsReasoningEffort("gpt-4.1"), false);
});

/**
 * Doğrulayıcı reddi artık taslağı da taşıyor (orchestrator onu DRAFT olarak
 * kurtarıyor). İki şey bozulmamalı: mesaj biçimi (panel ve `engel-analiz.ts`
 * bu metne bakıyor) ve engel sınıflandırma regex'i.
 */
test("VerificationBlockedError taslağı taşır ve mesaj biçimi korunur", () => {
  const message = "VERIFICATION_BLOCKED: Uydurma kurum adı | onarım turu tutmadı";
  const error = new VerificationBlockedError(message, {
    title: "Başlık", meta: "meta", keyword: "anahtar", content: "<p>metin</p>",
    aiExtras: null, category: "ekonomi", source: "AA", wordCount: 900,
    objections: ["Uydurma kurum adı"],
  });
  assert.equal(isVerificationBlockedError(error), true);
  assert.equal(error.code, "VERIFICATION_BLOCKED");
  assert.equal(error.draft.objections.length, 1);
  assert.match(error.message, /^(?:QUALITY|VERIFICATION|RESEARCH|PLAGIARISM)_BLOCKED:/);
  assert.equal(isVerificationBlockedError(new Error(message)), false);
});
