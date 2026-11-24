type ProviderErrorLike = {
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

export class AIProviderQuotaError extends AIProviderFatalError {
  readonly provider: string;
  readonly providerEndpointHost: string | null;
  readonly providerErrorCode: string | null;
  readonly providerStatus: number | null;
  readonly quotaReason: string;

  constructor(provider: string, error?: unknown, providerEndpointHost?: string) {
    const details = getProviderQuotaDetails(error);
    const reason = describeProviderQuota(details.providerErrorCode);
    const prefix = provider === "openai"
      ? "OpenAI API isteği durduruldu"
      : "Seçili yapay zekâ sağlayıcısı kota veya harcama sınırı nedeniyle isteği durdurdu";
    super(
      `${prefix}: ${reason}${details.providerErrorCode ? ` (sağlayıcı kodu: ${details.providerErrorCode})` : ""}.`,
      "AI_PROVIDER_QUOTA_EXHAUSTED",
    );
    this.provider = provider;
    this.providerEndpointHost = providerEndpointHost || null;
    this.providerErrorCode = details.providerErrorCode;
    this.providerStatus = details.providerStatus;
    this.quotaReason = reason;
    this.name = "AIProviderQuotaError";
  }

  toMetadata() {
    return {
      provider: this.provider,
      providerEndpointHost: this.providerEndpointHost,
      providerErrorCode: this.providerErrorCode,
      providerStatus: this.providerStatus,
      quotaReason: this.quotaReason,
    };
  }
}

/** Keep the OpenAI-specific code so its existing cooldown remains effective. */
export class OpenAIQuotaError extends AIProviderQuotaError {
  readonly code = "OPENAI_QUOTA_EXHAUSTED";

  constructor(error?: unknown, providerEndpointHost?: string) {
    super("openai", error, providerEndpointHost);
    this.name = "OpenAIQuotaError";
  }
}

export function providerQuotaError(
  provider: string,
  error?: unknown,
  providerEndpointHost?: string,
): AIProviderQuotaError {
  return provider === "openai"
    ? new OpenAIQuotaError(error, providerEndpointHost)
    : new AIProviderQuotaError(provider, error, providerEndpointHost);
}

/** A payment-required response means this provider cannot process requests. */
export class AIProviderBillingError extends AIProviderFatalError {
  readonly providerEndpointHost: string | null;
  readonly providerErrorCode: string | null;
  readonly providerStatus: number | null;
  readonly billingReason: string;

  constructor(provider: string, error?: unknown, providerEndpointHost?: string) {
    const details = getProviderQuotaDetails(error);
    const billingReason = describeProviderBilling(details.providerErrorCode);
    super(
      `${provider} sağlayıcısı 402 ödeme/faturalandırma yanıtı verdi: ${billingReason}. Bu koşudaki yeni model çağrıları durduruldu.`,
      "AI_PROVIDER_BILLING_ERROR",
    );
    this.providerEndpointHost = providerEndpointHost || null;
    this.providerErrorCode = details.providerErrorCode;
    this.providerStatus = details.providerStatus;
    this.billingReason = billingReason;
    this.name = "AIProviderBillingError";
  }

  toMetadata() {
    return {
      providerEndpointHost: this.providerEndpointHost,
      providerErrorCode: this.providerErrorCode,
      providerStatus: this.providerStatus,
      billingReason: this.billingReason,
    };
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

export function isProviderQuotaError(error: unknown): boolean {
  const { providerStatus, providerErrorCode, providerMessage } = getProviderQuotaDetails(error);
  const message = providerMessage.toLocaleLowerCase("en-US");
  const code = (providerErrorCode || "").toLocaleLowerCase("en-US");
  const quotaCodes = new Set([
    "insufficient_quota",
    "credit_balance_exhausted",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "organization_usage_limit_exceeded",
    "billing_not_active",
  ]);
  if (quotaCodes.has(code)) return true;
  const hasQuotaSignal = (
    code.includes("insufficient_quota") ||
    code.includes("spend_limit_exceeded") ||
    code.includes("usage_limit_exceeded") ||
    message.includes("no credits remaining") ||
    message.includes("exceeded your current quota") ||
    message.includes("billing")
  );
  return hasQuotaSignal && (providerStatus === 429 || code.includes("insufficient_quota") || message.includes("429"));
}

/** @deprecated Use the provider-neutral name; retained for older consumers. */
export const isOpenAIQuotaError = isProviderQuotaError;

function getProviderQuotaDetails(error: unknown) {
  const value = (error || {}) as ProviderErrorLike;
  return {
    providerStatus: Number.isFinite(value.status) ? value.status! : null,
    providerErrorCode: value.error?.code || value.code || null,
    providerMessage: `${value.message || ""} ${value.error?.message || ""}`.trim(),
  };
}

function describeProviderQuota(code: string | null): string {
  switch (code?.toLocaleLowerCase("en-US")) {
    case "credit_balance_exhausted":
      return "ön ödemeli API kredisi tükenmiş";
    case "organization_spend_limit_exceeded":
      return "kuruluş harcama sınırına ulaşılmış";
    case "project_spend_limit_exceeded":
      return "proje harcama sınırına ulaşılmış";
    case "organization_usage_limit_exceeded":
      return "kuruluş kullanım limitine ulaşılmış";
    case "billing_not_active":
      return "API sağlayıcısında faturalandırma etkin değil";
    case "insufficient_quota":
      return "kota yetersiz; bakiye veya limit nedeni ayrıca doğrulanmalı";
    default:
      return "kota ya da harcama limiti hatası; bakiye nedeni ayrıca doğrulanmalı";
  }
}

function describeProviderBilling(code: string | null): string {
  switch (code?.toLocaleLowerCase("en-US")) {
    case "credit_balance_exhausted": return "ön ödemeli API kredisi tükenmiş";
    case "organization_spend_limit_exceeded": return "kuruluş harcama sınırına ulaşılmış";
    case "project_spend_limit_exceeded": return "proje harcama sınırına ulaşılmış";
    case "organization_usage_limit_exceeded": return "kuruluş kullanım limitine ulaşılmış";
    case "billing_not_active": return "faturalandırma etkin değil";
    default: return "ödeme yanıtı alındı; bakiye veya limit nedeni doğrulanamadı";
  }
}

export function isAnthropicBillingError(error: unknown): boolean {
  const value = (error || {}) as AnthropicErrorLike;
  const type = `${value.error?.type || ""}`.toLocaleLowerCase("en-US");
  const message = `${value.message || ""} ${value.error?.message || ""}`.toLocaleLowerCase("en-US");
  return value.status === 402 || type === "billing_error" || message.includes("credit balance");
}

export function isProviderBillingError(error: unknown): boolean {
  return (error as { status?: number } | null)?.status === 402;
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
  const value = (error || {}) as ProviderErrorLike;
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
export interface BlockedDraftPayload {
  title: string;
  meta: string;
  keyword: string;
  content: string;
  aiExtras: unknown;
  category: string;
  source: string;
  wordCount: number;
  objections: string[];
  /** Evidence used by the writer, retained so an editor can inspect citations. */
  evidencePacket?: unknown;
}

/**
 * Bitmiş ama yayına çıkamayan makalelerin ortak taşıyıcısı.
 *
 * Kural: yazar çağrısının parası ödenmiş bir metin SİLİNMEZ. Kapı ne olursa
 * olsun (doğrulayıcı ya da kalite), metin `DRAFT` olarak kaydedilir ve panelde
 * insan onayı bekler. Silme yalnızca metnin esasında sorun varsa olur —
 * kanıtsız iddia, intihal, kaynaklarda olmayan rakam.
 */
export abstract class BlockedDraftError extends Error {
  abstract readonly code: string;

  constructor(message: string, readonly draft: BlockedDraftPayload) {
    super(message);
  }
}

export class VerificationBlockedError extends BlockedDraftError {
  readonly code = "VERIFICATION_BLOCKED";

  constructor(message: string, draft: BlockedDraftPayload) {
    super(message, draft);
    this.name = "VerificationBlockedError";
  }
}

/**
 * Kalite kapısında YALNIZCA kozmetik sorun kaldığında atılır (uzunluk, odak
 * kelimenin yerleşimi). 2 Eylül 2026'ya kadar bu durumda düz `Error` atılıyor
 * ve bitmiş makale imha ediliyordu; canlı örnek 181 karakterlik meta.
 */
export class QualityBlockedError extends BlockedDraftError {
  readonly code = "QUALITY_BLOCKED";

  constructor(message: string, draft: BlockedDraftPayload) {
    super(message, draft);
    this.name = "QualityBlockedError";
  }
}

export function isVerificationBlockedError(error: unknown): error is VerificationBlockedError {
  return error instanceof VerificationBlockedError;
}

export function isBlockedDraftError(error: unknown): error is BlockedDraftError {
  return error instanceof BlockedDraftError;
}
