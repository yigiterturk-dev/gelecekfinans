type OpenAIErrorLike = {
  status?: number;
  code?: string;
  message?: string;
  error?: { code?: string; message?: string };
};

type AnthropicErrorLike = {
  status?: number;
  message?: string;
  error?: { type?: string; message?: string };
};

export class AIProviderFatalError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AIProviderFatalError";
  }
}

export class OpenAIQuotaError extends AIProviderFatalError {
  readonly code = "OPENAI_QUOTA_EXHAUSTED";

  constructor() {
    super(
      "OpenAI kredisi tükendi. Billing bakiyesi yenilenene kadar üretim durduruldu.",
      "OPENAI_QUOTA_EXHAUSTED",
    );
    this.name = "OpenAIQuotaError";
  }
}

export class AnthropicBillingError extends AIProviderFatalError {
  readonly code = "ANTHROPIC_BILLING_ERROR";

  constructor() {
    super(
      "Anthropic API bakiyesi veya ödeme ayarı kullanıma izin vermiyor. Claude Console billing ayarlarını kontrol edin.",
      "ANTHROPIC_BILLING_ERROR",
    );
    this.name = "AnthropicBillingError";
  }
}

export class AIBudgetLimitError extends AIProviderFatalError {
  readonly code = "AI_BUDGET_LIMIT_REACHED";

  constructor(message = "Yapay zekâ harcama freni devreye girdi; yeni model çağrısı yapılmadı.") {
    super(message, "AI_BUDGET_LIMIT_REACHED");
    this.name = "AIBudgetLimitError";
  }
}

export class AIProviderConfigurationError extends AIProviderFatalError {
  readonly code = "AI_PROVIDER_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message, "AI_PROVIDER_CONFIGURATION_ERROR");
    this.name = "AIProviderConfigurationError";
  }
}

export function isOpenAIQuotaError(error: unknown): boolean {
  const value = (error || {}) as OpenAIErrorLike;
  const message = `${value.message || ""} ${value.error?.message || ""}`.toLocaleLowerCase("en-US");
  const code = `${value.code || ""} ${value.error?.code || ""}`.toLocaleLowerCase("en-US");
  const hasQuotaSignal = (
    code.includes("insufficient_quota") ||
    message.includes("no credits remaining") ||
    message.includes("exceeded your current quota") ||
    message.includes("billing")
  );
  return hasQuotaSignal && (value.status === 429 || code.includes("insufficient_quota") || message.includes("429"));
}

export function isAnthropicBillingError(error: unknown): boolean {
  const value = (error || {}) as AnthropicErrorLike;
  const type = `${value.error?.type || ""}`.toLocaleLowerCase("en-US");
  const message = `${value.message || ""} ${value.error?.message || ""}`.toLocaleLowerCase("en-US");
  return value.status === 402 || type === "billing_error" || message.includes("credit balance");
}
