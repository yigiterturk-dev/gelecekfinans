import assert from "node:assert/strict";
import test from "node:test";
import {
  AIBudgetLimitError,
  AIProviderConfigurationError,
  AIProviderFatalError,
  AnthropicBillingError,
  isAnthropicBillingError,
  OpenAIQuotaError,
  isOpenAIQuotaError,
} from "../lib/bot/errors";

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
