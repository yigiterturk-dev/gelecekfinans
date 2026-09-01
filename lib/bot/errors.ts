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

/**
 * Modelin/parametrenin sağlayıcıda karşılığı olmadığını söyleyen 400'ler.
 *
 * Bunlar koşuma özgü değil, YAPILANDIRMAYA özgüdür: aynı env ile bir sonraki
 * konu da, bir sonraki koşum da aynı hatayı alır. Sıradan hata sayıldıklarında
 * döngü devam ediyor ve koşumun kalan yazar çağrısı hakkını da yakıyorlar —
 * 1 Eylül 2026'da env'de yazar modeli akıl yürütmeyen bir modele çekilince
 * "Unsupported parameter: 'reasoning.effort'" 400'ü iki çağrıyı birden yaktı,
 * koşum 0 makaleyle bitti. Ölümcül sayılınca koşum ilk hatada durur ve uyarı
 * maili gider.
 */
export function isProviderRequestConfigurationError(error: unknown): boolean {
  const value = (error || {}) as OpenAIErrorLike;
  if (value.status !== 400 && value.status !== 404) return false;
  const message = `${value.message || ""} ${value.error?.message || ""}`.toLocaleLowerCase("en-US");
  const code = `${value.code || ""} ${value.error?.code || ""}`.toLocaleLowerCase("en-US");
  return (
    message.includes("unsupported parameter") ||
    message.includes("unsupported value") ||
    message.includes("unknown parameter") ||
    message.includes("does not exist") ||
    code.includes("model_not_found") ||
    code.includes("unsupported_parameter") ||
    code.includes("unsupported_value")
  );
}

/**
 * Doğrulayıcının reddettiği ama BİTMİŞ olan taslak.
 *
 * Neden ayrı bir hata sınıfı: yazar çağrısının parası ödendi, metin yazıldı,
 * kalite ve intihal kapılarından geçti — yalnızca doğrulayıcı itiraz etti.
 * Eskiden bu taslak tamamen kayboluyordu ve gün sıfır makaleyle kapanıyordu
 * (1 Eylül 2026'da üç koşum böyle bitti). Artık orchestrator hatayı yakalayıp
 * içeriği `DRAFT` olarak kaydediyor: yayına ÇIKMIYOR, panelde onay bekliyor.
 *
 * Mesaj biçimi bilerek korunuyor (`VERIFICATION_BLOCKED: ... | onarım turu
 * tutmadı`) — panel ve `engel-analiz.ts` bu metne bakıyor.
 */
export class VerificationBlockedError extends Error {
  readonly code = "VERIFICATION_BLOCKED";

  constructor(
    message: string,
    readonly draft: {
      title: string;
      meta: string;
      keyword: string;
      content: string;
      aiExtras: unknown;
      category: string;
      source: string;
      wordCount: number;
      objections: string[];
    },
  ) {
    super(message);
    this.name = "VerificationBlockedError";
  }
}

export function isVerificationBlockedError(error: unknown): error is VerificationBlockedError {
  return error instanceof VerificationBlockedError;
}
