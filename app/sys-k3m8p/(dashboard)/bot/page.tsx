"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Select from "@/components/Select";

interface Topic {
  title: string;
  summary: string;
  category: string;
  source: string;
  imageUrl?: string;
  evidencePacket?: {
    status: "VERIFIED" | "INSUFFICIENT";
    independentSourceCount: number;
  };
}

interface BotRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  articlesFound: number;
  articlesAdded: number;
  duplicatesSkipped: number;
  autoPublished: number;
  reviewQueued: number;
  blocked: number;
  imageFallbacks: number;
  errors: string | null;
  status: string;
}

interface CostSummary {
  today: number;
  week: number;
  month: number;
  historicalStandardEstimate: number;
  reservedSpendUsd: number;
  reservationCalls: number;
  calls: number;
  measuredDays: number;
  projectedMonthly: number;
  byModel: Record<string, number>;
  byEndpointHost: Record<string, number>;
  attemptedCalls: number;
  callsWithoutUsage: number;
  unverifiedEvents: number;
  costIsComplete: boolean;
  unpricedModels: string[];
}

interface BlockRow {
  createdAt: string;
  stage: string;
  message: string;
  level: string;
}

interface DecisionRow {
  id: string;
  title: string;
  slug: string;
  status: string;
  riskLevel: "GREEN" | "YELLOW" | "RED";
  publicationDecision: "AUTO_PUBLISH" | "REVIEW" | "BLOCK";
  sourceScore: number | null;
  seoScore: number | null;
  imageStrategy: string | null;
  createdAt: string;
  automationMeta?: {
    evidencePacket?: {
      status?: string;
      independentSourceCount?: number;
      reasons?: string[];
      evidence?: Array<{
        id?: string;
        source?: string;
        title?: string;
        summary?: string;
        sourceUrl?: string | null;
        publishedAt?: string | null;
      }>;
    };
    blockedBy?: string;
    reviewReasons?: string[];
    qualityObjections?: string[];
    verificationObjections?: string[];
    quality?: {
      passed?: boolean;
      score?: number;
      wordCount?: number;
      issues?: string[];
    };
    verification?: {
      passed?: boolean;
      unsupportedClaims?: string[];
      conflictingClaims?: string[];
    };
    plagiarism?: {
      passed?: boolean;
      score?: number;
      issues?: string[];
    };
    visual?: {
      attempts?: number;
      brief?: {
        conceptKey?: string;
        subject?: string;
        mode?: string;
        rationale?: string;
      };
      audit?: {
        relevance?: number;
        authenticity?: number;
        artifactFree?: number;
        editorialValue?: number;
        cropSafety?: number;
        originality?: number;
        approved?: boolean;
        feedback?: string;
        method?: string;
        reasons?: string[];
      } | null;
    };
  } | null;
}

function safeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function displayBlockMessage(message: string): string {
  return message.replace(
    /OpenAI kredisi tükendi\. Billing bakiyesi yenilenene kadar üretim durduruldu\./g,
    "Eski OpenAI kota/limit hatası; bu kayıt tek başına bakiyenin sıfır olduğunu kanıtlamaz.",
  );
}

interface BotResult {
  added?: number;
  autoPublished?: number;
  reviewQueued?: number;
  duplicatesSkipped?: number;
  blocked?: number;
  writerCalls?: number;
  errors?: string[];
  error?: string;
  fatalErrorCode?: string;
}

interface AIProviderStatus {
  connected: boolean;
  automationEnabled: boolean;
  provider: "openai" | "anthropic" | "deepseek" | "gemini";
  providerLabel: string;
  billingLabel: string;
  writerModel: string;
  verifierModel: string;
  billingUrl: string;
  dailyWriterCalls: number;
  dailyWriterCallLimit: number;
  dailySpendLimitUsd: number;
  maxWriterCallsPerRun: number;
  writerMaxOutputTokens: number;
  verifierMaxOutputTokens: number;
  openAICostStatus: "AVAILABLE" | "ADMIN_KEY_REQUIRED" | "UNAVAILABLE";
  openAIMonthToDateUsd: number | null;
}

const CATEGORIES = [
  { value: "", label: "Tümü" },
  { value: "kripto", label: "Kripto" },
  { value: "borsa", label: "Borsa" },
  { value: "doviz", label: "Döviz" },
  { value: "altin", label: "Altın" },
  { value: "ekonomi", label: "Ekonomi" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export default function BotPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [runs, setRuns] = useState<BotRun[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(1);
  const [result, setResult] = useState<string | null>(null);
  const [aiProvider, setAIProvider] = useState<AIProviderStatus | null>(null);
  const [cost, setCost] = useState<CostSummary | null>(null);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const topicsRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      try {
        const responses = await Promise.all([
          fetch("/api/bot/topics", { signal: controller.signal }),
          fetch("/api/admin/bot-runs", { signal: controller.signal }),
          fetch("/api/admin/ai-provider", { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        const unauthorized = responses.some((response) => response.status === 401);
        if (active) setSessionExpired(unauthorized);
        if (unauthorized) {
          throw new Error("Yönetim oturumunuz sona ermiş. Devam etmek için yeniden giriş yapın.");
        }
        if (responses.some((response) => !response.ok)) {
          throw new Error("Bot paneli verileri yüklenemedi.");
        }
        const [topicsData, runsData, billingData]: unknown[] = await Promise.all(
          responses.map((response) => response.json().catch(() => null)),
        );
        if (!isRecord(topicsData) || !Array.isArray(topicsData.topics)
          || !isRecord(runsData) || !Array.isArray(runsData.runs)
          || !Array.isArray(runsData.recentDecisions) || !isRecord(runsData.cost)
          || !Array.isArray(runsData.blocks) || !isRecord(billingData)
          || typeof billingData.connected !== "boolean" || typeof billingData.automationEnabled !== "boolean") {
          throw new Error("Bot panelinden geçersiz veri yanıtı geldi.");
        }
        if (!active) return;
        setTopics(topicsData.topics as Topic[]);
        setRuns(runsData.runs as BotRun[]);
        setDecisions(runsData.recentDecisions as DecisionRow[]);
        setCost(runsData.cost as unknown as CostSummary);
        setBlocks(runsData.blocks as BlockRow[]);
        setAIProvider(billingData as unknown as AIProviderStatus);
      } catch {
        if (active && !controller.signal.aborted) {
          setLoadError("Bot paneli verileri yüklenemedi. Oturum veya servis bağlantısını kontrol edip yeniden deneyin.");
        }
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
      topicsRequest.current?.abort();
    };
  }, [reloadKey]);

  const loadTopics = async (cat: string) => {
    topicsRequest.current?.abort();
    const controller = new AbortController();
    topicsRequest.current = controller;
    setCategory(cat);
    setTopics([]);
    setTopicsError("");
    setTopicsLoading(true);
    try {
      const response = await fetch(`/api/bot/topics?category=${encodeURIComponent(cat)}`, { signal: controller.signal });
      const data: unknown = await response.json().catch(() => null);
      if (controller.signal.aborted) return;
      if (!response.ok || !isRecord(data) || !Array.isArray(data.topics)) {
        throw new Error("Konular yüklenemedi.");
      }
      setTopics(data.topics as Topic[]);
    } catch {
      if (!controller.signal.aborted) setTopicsError("Seçilen kategorinin konuları yüklenemedi.");
    } finally {
      if (!controller.signal.aborted) setTopicsLoading(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      // Tek istekte 5-10 makale Vercel'in 300 sn sınırını aşabiliyor. Toplu
      // seçimleri bağımsız tek-makale işleri olarak sırala; her iş kendi
      // kalite/kanıt kapılarını tamamlasın, toplam sonuç arayüzde birleşsin.
      const total: Required<Pick<BotResult, "added" | "autoPublished" | "reviewQueued" | "duplicatesSkipped" | "blocked" | "writerCalls">> & { errors: string[] } = {
        added: 0,
        autoPublished: 0,
        reviewQueued: 0,
        duplicatesSkipped: 0,
        blocked: 0,
        writerCalls: 0,
        errors: [],
      };
      let fatalErrorCode: string | undefined;

      for (let index = 0; index < count; index += 1) {
        setResult(`${index + 1}/${count} güvenli üretim işi çalışıyor…`);
        const res = await fetch("/api/bot/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 1, category, words: 650 }),
        });
        const raw = await res.text();
        let data: BotResult;
        try {
          data = JSON.parse(raw) as BotResult;
        } catch {
          throw new Error(res.ok ? "Üretim yanıtı okunamadı" : `Üretim isteği ${res.status} ile tamamlanamadı`);
        }
        if (data.error) throw new Error(data.error);

        total.added += data.added ?? 0;
        total.autoPublished += data.autoPublished ?? 0;
        total.reviewQueued += data.reviewQueued ?? 0;
        total.duplicatesSkipped += data.duplicatesSkipped ?? 0;
        total.blocked += data.blocked ?? 0;
        total.writerCalls += data.writerCalls ?? 0;
        total.errors.push(...(data.errors ?? []));
        fatalErrorCode = data.fatalErrorCode;
        if (fatalErrorCode) break;
      }

      if (fatalErrorCode === "OPENAI_QUOTA_EXHAUSTED") {
        const providerDetail = total.errors.find((error) => error.includes("OpenAI API isteği durduruldu"));
        setResult(providerDetail
          ? `Hata: ${providerDetail} Akış durduruldu.`
          : "Hata: OpenAI API kota/limit hatası. Bakiye ve proje/kuruluş harcama/kullanım limitlerini kontrol edin; hata bakiyenin tükendiğini tek başına kanıtlamaz. Akış durduruldu.");
      } else if (fatalErrorCode === "AI_PROVIDER_QUOTA_EXHAUSTED") {
        const providerDetail = total.errors.find((error) => error.includes("Seçili yapay zekâ sağlayıcısı"));
        setResult(providerDetail
          ? `Hata: ${providerDetail} Bu hata tek başına bakiye bittiğini kanıtlamaz. Akış durduruldu.`
          : "Hata: Seçili yapay zekâ sağlayıcısı kota veya harcama sınırına ulaştı. Akış durduruldu; bu, bakiye bittiğini tek başına kanıtlamaz.");
      } else if (fatalErrorCode === "ANTHROPIC_BILLING_ERROR") {
        setResult(
          "Hata: Anthropic API bakiyesi veya ödeme ayarı kullanıma izin vermiyor. platform.claude.com üzerinden billing durumunu kontrol edin."
        );
      } else if (fatalErrorCode === "AI_PROVIDER_CONFIGURATION_ERROR") {
        setResult("Hata: Yapay zekâ sağlayıcısının API anahtarı veya model ayarı eksik.");
      } else if (fatalErrorCode === "AI_BUDGET_LIMIT_REACHED") {
        setResult("Yazar çağrı sınırı doldu: bu iş veya günlük yazar çağrısı tavanı aşıldı; yeni yazar çağrısı yapılmadı.");
      } else {
        setResult(
          `${total.added} makale oluşturuldu · ${total.writerCalls} yazar çağrısı · ${total.autoPublished} otomatik yayında · ${total.reviewQueued} incelemede · ${total.blocked} kalite kapısında durdu · ${total.duplicatesSkipped} benzer içerik atlandı` +
            (total.errors.length ? `, ${total.errors.length} hata` : "")
        );
      }
    } catch (e) {
      setResult(`Hata: ${(e as Error).message}`);
    } finally {
      try {
        const runsRes = await fetch("/api/admin/bot-runs");
        const runsData: unknown = await runsRes.json().catch(() => null);
        if (!runsRes.ok || !isRecord(runsData) || !Array.isArray(runsData.runs)
          || !Array.isArray(runsData.recentDecisions) || !isRecord(runsData.cost) || !Array.isArray(runsData.blocks)) {
          throw new Error("Bot çalışma raporu yenilenemedi.");
        }
        setRuns(runsData.runs as BotRun[]);
        setDecisions(runsData.recentDecisions as DecisionRow[]);
        setCost(runsData.cost as unknown as CostSummary);
        setBlocks(runsData.blocks as BlockRow[]);
      } catch {
        setLoadError("Üretim sonrası bot çalışma raporu yenilenemedi.");
      }
      setGenerating(false);
    }
  };

  if (loading) return <p style={{ color: "var(--muted)" }}>Yükleniyor...</p>;

  return (
    <div>
      <div className="adm-page-head"><h1 className="adm-h1">Otonom Yayın Merkezi</h1></div>
      {loadError && (
        <div role="alert" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, padding: 12, border: "1px solid var(--dn)", borderRadius: 8, color: "var(--dn)" }}>
          <span style={{ flex: 1, fontSize: 13 }}>{sessionExpired ? "Yönetim oturumunuz sona ermiş. Devam etmek için yeniden giriş yapın." : loadError}</span>
          {sessionExpired ? (
            <Link className="adm-btn" href="/sys-k3m8p/giris">Yönetim Girişi</Link>
          ) : (
            <button className="adm-btn" onClick={() => { setLoading(true); setLoadError(""); setReloadKey((key) => key + 1); }}>Yeniden Dene</button>
          )}
        </div>
      )}

      <div className="adm-card" style={{ borderColor: "#d9d4ff" }}>
        <div className="adm-card-h">
          <div>
            <b>{aiProvider?.providerLabel || "Yapay Zekâ API"}</b>
            <small>Model rolleri · yazar çağrı sınırı · günlük tahmini harcama tavanı</small>
          </div>
          <span style={{
            whiteSpace: "nowrap",
            fontSize: 10,
            padding: "5px 9px",
            borderRadius: 999,
            background: !aiProvider?.automationEnabled
              ? "rgba(148,163,184,.16)"
              : aiProvider.connected ? "var(--up-soft)" : "#fef2f2",
            color: !aiProvider?.automationEnabled
              ? "var(--muted)"
              : aiProvider.connected ? "var(--up)" : "var(--dn)",
            fontFamily: "var(--mono)",
          }}>
            {!aiProvider?.automationEnabled
              ? "OTOMASYON KAPALI · ÇAĞRI YOK"
              : aiProvider.connected ? "AYARLI" : "YAPILANDIRMA EKSİK"}
          </span>
        </div>
        <div className="adm-card-b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <ProviderMetric label="YAZAR" value={aiProvider?.writerModel || "—"} />
            <ProviderMetric label="DOĞRULAYICI" value={aiProvider?.verifierModel || "—"} />
            <ProviderMetric
              label="GÜNLÜK YAZAR ÇAĞRISI"
              value={aiProvider ? `${aiProvider.dailyWriterCalls}/${aiProvider.dailyWriterCallLimit}` : "—"}
            />
            <ProviderMetric
              label="İŞ BAŞINA SINIR"
              value={aiProvider ? `${aiProvider.maxWriterCallsPerRun} yazım` : "—"}
            />
            <ProviderMetric
              label="GÜNLÜK UYGULAMA TAVANI"
              value={aiProvider ? `$${aiProvider.dailySpendLimitUsd.toFixed(2)}` : "—"}
            />
            <ProviderMetric
              label="YAZAR TOKEN TAVANI"
              value={aiProvider ? aiProvider.writerMaxOutputTokens.toLocaleString("tr-TR") : "—"}
            />
            <ProviderMetric
              label="DOĞRULAMA TOKEN TAVANI"
              value={aiProvider ? aiProvider.verifierMaxOutputTokens.toLocaleString("tr-TR") : "—"}
            />
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <a
              href={aiProvider?.billingUrl || "https://platform.openai.com/settings/organization/billing/overview"}
              target="_blank"
              rel="noopener noreferrer"
              className="adm-btn adm-btn-primary"
            >
              {aiProvider?.billingLabel || "Sağlayıcı panelini aç ↗"}
            </a>
            <p style={{ maxWidth: 680, color: "var(--muted)", fontSize: 11, lineHeight: 1.55 }}>
              Yazar çağrı sayısı sınırına ek olarak AI_DAILY_SPEND_LIMIT_USD tüm model aşamalarına uygulama tarafında
              tahmini dolar tavanı koyar. 0 veya ayar yoksa model isteği gönderilmez; fiyatı ya da gün içi kullanımı
              ölçülemeyen model/çağrı da durdurulur. İstek öncesi tam çıktı tavanı rezervasyonu gün sonuna kadar
              tutulur; kullanılmayan rezerv de günlük payı azaltır. Bu tahmin sağlayıcı faturası değildir ve kendi
              harcama limitinin yerini tutmaz. Doğrulama sonrası ek onarım çağrıları varsayılan olarak kapalıdır.
            </p>
          </div>
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 11, lineHeight: 1.5 }}>
            OpenAI kurum API kullanımı (bu ay): {aiProvider?.openAICostStatus === "AVAILABLE"
              ? `$${(aiProvider.openAIMonthToDateUsd ?? 0).toFixed(4)} · tüm kurum projeleri, kredi bakiyesi/tahsilat değil`
              : aiProvider?.openAICostStatus === "ADMIN_KEY_REQUIRED"
                ? "Rapor için OPENAI_ADMIN_KEY gerekli; bu anahtar model üretiminde kullanılmaz."
                : "OpenAI maliyet raporu şu anda alınamıyor."}
          </p>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h">
          <div>
            <b>Model Harcaması</b>
            <small>
              {cost?.measuredDays
                ? `Uygulama kayıtları · ${cost.measuredDays} gün · ${cost.calls} çağrı · sağlayıcı faturası değil`
                : "Ölçüm 1 Eylül 2026'da eklendi; ilk koşumdan sonra dolar."}
            </small>
          </div>
          {cost && cost.projectedMonthly > 0 && (
            <span style={{
              whiteSpace: "nowrap", fontSize: 10, padding: "5px 9px", borderRadius: 999,
              background: cost.unpricedModels.length > 0 || cost.projectedMonthly > 75 ? "#fef2f2" : "var(--up-soft)",
              color: cost.unpricedModels.length > 0 || cost.projectedMonthly > 75 ? "var(--dn)" : "var(--up)",
              fontFamily: "var(--mono)",
            }}>
              {cost.unpricedModels.length > 0
                ? "MALİYET EKSİK"
                : cost.projectedMonthly > 75 ? "TAHMİNİ EŞİK AŞILDI" : "TAHMİNİ EŞİK ALTINDA"}
            </span>
          )}
        </div>
        <div className="adm-card-b">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <ProviderMetric label="BUGÜN" value={cost ? `$${cost.today.toFixed(4)}` : "—"} />
            <ProviderMetric label="SON 7 GÜN" value={cost ? `$${cost.week.toFixed(2)}` : "—"} />
            <ProviderMetric label="SON 30 GÜN" value={cost ? `$${cost.month.toFixed(2)}` : "—"} />
            {cost && cost.historicalStandardEstimate > 0 && (
              <ProviderMetric
                label="GEÇMİŞ KAYITLAR · STANDART TARİFE"
                value={`~$${cost.historicalStandardEstimate.toFixed(2)}`}
              />
            )}
            <ProviderMetric
              label="30 GÜN ÖN REZERVASYON"
              value={cost ? `$${cost.reservedSpendUsd.toFixed(2)} · ${cost.reservationCalls} istek` : "—"}
            />
            <ProviderMetric
              label={cost && (cost.unpricedModels.length > 0 || !cost.costIsComplete) ? "EKSİK KAYITLI AYLIK TAHMİN" : "TAHMİNİ AYLIK GİDİŞ"}
              value={cost?.projectedMonthly
                ? `$${cost.projectedMonthly.toFixed(2)}${cost.unpricedModels.length || !cost.costIsComplete ? "+" : ""} / $75 eşik`
                : "—"}
            />
            {cost && Object.entries(cost.byModel).map(([model, value]) => (
              <ProviderMetric key={model} label={model.toUpperCase()} value={`$${value.toFixed(4)}`} />
            ))}
            {cost && Object.entries(cost.byEndpointHost).map(([host, value]) => (
              <ProviderMetric key={host} label={`UÇ: ${host}`} value={`$${value.toFixed(4)}`} />
            ))}
          </div>
          <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 11 }}>
            Geçmiş standart tarife karşılaştırması eski kayıtlarda ücreti yazılmamış tokenlara uygulanır; son 30 gün kayıtlı tutarına eklenmez, sağlayıcı faturası veya ücretsiz katman durumunu göstermez. Ön rezervasyonlar ücret değildir; çağrı yanıt vermese bile üst bütçe payı olarak kalabilir. Uç alanı isteğin gittiği hostname bilgisini gösterir. $75 uyarı eşiğidir, otomatik durdurma sınırı değildir.
          </p>
          {cost && !cost.costIsComplete && (
            <p style={{ marginTop: 12, color: "var(--dn)", fontSize: 11 }}>
              Ölçüm tam değil: {cost.callsWithoutUsage} istek kullanım verisi olmadan bitti; {cost.unverifiedEvents} eski koşuda istek denemeleri sayılmamış. Gösterilen maliyet alt sınırdır.
            </p>
          )}
          {cost && cost.unpricedModels.length > 0 && (
            <p style={{ marginTop: 12, color: "var(--dn)", fontSize: 11 }}>
              Fiyatı bilinmeyen model: {cost.unpricedModels.join(", ")} — gösterilen tutar eksik; gerçek harcama daha yüksek olabilir.
            </p>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h">
          <div>
            <b>Son 48 Saatte Duran İşler</b>
            <small>Makale neden çıkmadı: kanıt, kalite, bütçe ve yapılandırma engelleri</small>
          </div>
        </div>
        <div className="adm-card-b">
          {blocks.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 12 }}>Son 48 saatte duran iş yok.</p>
          ) : (
            <ul style={{ display: "grid", gap: 8, listStyle: "none", padding: 0, margin: 0 }}>
              {blocks.map((block, index) => (
                <li
                  key={`${block.createdAt}-${index}`}
                  style={{
                    display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 10, alignItems: "baseline",
                    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px",
                  }}
                >
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {new Date(block.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                  </span>
                  <span style={{
                    fontFamily: "var(--mono)", fontSize: 9, padding: "3px 7px", borderRadius: 999, whiteSpace: "nowrap",
                    background: block.level === "error" ? "#fef2f2" : "var(--surface-2, #f4f4f5)",
                    color: block.level === "error" ? "var(--dn)" : "var(--muted)",
                  }}>
                    {block.stage.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink)", overflowWrap: "anywhere" }}>{displayBlockMessage(block.message)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Yayın Akışını Çalıştır</b><small>Kaynak → içerik → görsel → kalite kapısı → yayın kararı</small></div></div>
        <div className="adm-card-b">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label className="adm-label">Kategori</label>
            <Select className="sel-adm" value={category} onChange={loadTopics} options={CATEGORIES} ariaLabel="Kategori" />
          </div>
          <div>
            <label className="adm-label">Adet</label>
            <Select
            className="sel-adm"
              value={String(count)}
              onChange={(value) => setCount(Number(value))}
              options={[1, 2, 3, 5, 10].map((n) => ({ value: String(n), label: `${n} makale` }))}
              ariaLabel="Üretilecek makale adedi"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating || !aiProvider?.automationEnabled || !aiProvider.connected}
            className="adm-btn adm-btn-primary"
          >
            {generating
              ? "Akış çalışıyor..."
              : !aiProvider
                ? "Sağlayıcı durumu yükleniyor..."
                : !aiProvider.automationEnabled
                  ? "Otomasyon kapalı"
                  : !aiProvider.connected
                    ? "Sağlayıcı ayarı eksik"
                    : "Akışı Başlat"}
          </button>
        </div>
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>
          Bot çıktıları editör incelemesi için taslak kalır. Her üretim isteği tek makale ve 650 kelime hedefiyle çalışır.
        </p>
        {result && (
          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--surface)", borderRadius: 8, fontSize: 13, color: result.startsWith("Hata") ? "var(--dn)" : "var(--up)" }}>
            {result}
          </div>
        )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Son Yayın Kararları</b><small>Karar motorunun son 20 içerik için verdiği sonuç</small></div></div>
        <div className="adm-card-b">
          {decisions.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Henüz karar kaydı yok</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {decisions.map((item) => (
                <div key={item.id} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>{item.title}</p>
                      <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>
                        Kaynak {item.sourceScore ?? "—"}/100 · SEO {item.seoScore ?? "—"}/100 · {item.imageStrategy || "görsel bekliyor"}
                      </p>
                      {item.automationMeta?.evidencePacket && (
                        <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 5 }}>
                          Kanıt: {item.automationMeta.evidencePacket.independentSourceCount ?? 0} bağımsız kaynak ·
                          {item.automationMeta.quality?.passed ? ` kalite ${item.automationMeta.quality.score ?? "—"}/100` : " kalite bekliyor"} ·
                          {item.automationMeta.verification?.passed ? " doğrulandı" : " doğrulama bekliyor"} ·
                          {item.automationMeta.plagiarism?.passed ? ` özgünlük ${item.automationMeta.plagiarism.score ?? 100}/100` : " kopya kontrolü bekliyor"}
                        </p>
                      )}
                      {item.automationMeta && (
                        (item.automationMeta.evidencePacket?.evidence?.length ?? 0) > 0 ||
                        item.automationMeta.blockedBy ||
                        (item.automationMeta.reviewReasons?.length ?? 0) > 0 ||
                        (item.automationMeta.qualityObjections?.length ?? 0) > 0 ||
                        (item.automationMeta.verificationObjections?.length ?? 0) > 0
                      ) && (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ fontSize: 12, color: "var(--ink2)", cursor: "pointer" }}>
                            Kaynaklar ve inceleme gerekçeleri
                          </summary>
                          <div style={{ marginTop: 8, display: "grid", gap: 8, fontSize: 12, color: "var(--muted)" }}>
                            {item.automationMeta.blockedBy && (
                              <p><b style={{ color: "var(--ink2)" }}>Engel:</b> {item.automationMeta.blockedBy}</p>
                            )}
                            {[
                              ["İnceleme nedenleri", item.automationMeta.reviewReasons],
                              ["Kalite itirazları", item.automationMeta.qualityObjections],
                              ["Doğrulama itirazları", item.automationMeta.verificationObjections],
                              ["Kanıt notları", item.automationMeta.evidencePacket?.reasons],
                            ].map(([label, reasons]) => Array.isArray(reasons) && reasons.length > 0 && (
                              <p key={String(label)}><b style={{ color: "var(--ink2)" }}>{label}:</b> {reasons.join(" · ")}</p>
                            ))}
                            {(item.automationMeta.evidencePacket?.evidence ?? []).map((entry, index) => {
                              const sourceUrl = safeHttpUrl(entry.sourceUrl);
                              return (
                                <div key={entry.id || `${entry.source || "kaynak"}-${index}`} style={{ padding: 8, border: "1px solid var(--border)", borderRadius: 7 }}>
                                  <p><b style={{ color: "var(--ink2)" }}>{entry.source || "Kaynak"}</b>{entry.publishedAt ? ` · ${new Date(entry.publishedAt).toLocaleDateString("tr-TR")}` : ""}</p>
                                  {entry.title && <p style={{ marginTop: 3 }}>{entry.title}</p>}
                                  {entry.summary && <p style={{ marginTop: 3 }}>{entry.summary}</p>}
                                  {sourceUrl && <a href={sourceUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 4, color: "var(--link, #2563eb)" }}>Kaynağı aç</a>}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                      {item.automationMeta?.visual?.brief && (
                        <details style={{ marginTop: 8 }}>
                          <summary style={{ fontSize: 12, color: "var(--ink2)", cursor: "pointer" }}>
                            Görsel kararı · {item.automationMeta.visual.brief.conceptKey || item.automationMeta.visual.brief.mode}
                          </summary>
                          <div style={{ marginTop: 8, display: "grid", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                            <p><b style={{ color: "var(--ink2)" }}>Brief:</b> {item.automationMeta.visual.brief.subject}</p>
                            {item.automationMeta.visual.audit?.method ? (
                              <p>
                                <b style={{ color: "var(--ink2)" }}>Denetim:</b>{" "}
                                {item.automationMeta.visual.audit.method} · {item.automationMeta.visual.audit.reasons?.join("; ")}
                              </p>
                            ) : item.automationMeta.visual.audit ? (
                              <p>
                                <b style={{ color: "var(--ink2)" }}>Kalite:</b>{" "}
                                Alaka {item.automationMeta.visual.audit.relevance ?? "—"} ·
                                Gerçekçilik {item.automationMeta.visual.audit.authenticity ?? "—"} ·
                                Artefakt {item.automationMeta.visual.audit.artifactFree ?? "—"} ·
                                Kırpma {item.automationMeta.visual.audit.cropSafety ?? "—"} ·
                                Özgünlük {item.automationMeta.visual.audit.originality ?? "—"}
                              </p>
                            ) : (
                              <p>Veri grafiği · görsel üretim denetimi gerektirmedi</p>
                            )}
                            <p>Deneme: {item.automationMeta.visual.attempts ?? 1}</p>
                          </div>
                        </details>
                      )}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 5 }}>
                      <span style={{
                        whiteSpace: "nowrap", fontSize: 10, padding: "4px 8px", borderRadius: 5,
                        background: item.status === "PUBLISHED" || item.publicationDecision === "AUTO_PUBLISH" ? "var(--up-soft)" : item.riskLevel === "RED" ? "#fef2f2" : "#fffbeb",
                        color: item.status === "PUBLISHED" || item.publicationDecision === "AUTO_PUBLISH" ? "var(--up)" : item.riskLevel === "RED" ? "var(--dn)" : "#b45309",
                      }}>
                        {item.status === "PUBLISHED" ? "YAYINDA" : item.publicationDecision === "AUTO_PUBLISH" ? "YAYINA HAZIR" : item.publicationDecision === "BLOCK" ? "ENGELLENDİ" : item.riskLevel === "RED" ? "HASSAS · İNCELE" : "İNCELE"}
                      </span>
                      {item.status === "PUBLISHED" && item.riskLevel !== "GREEN" && (
                        <span style={{
                          whiteSpace: "nowrap", fontSize: 10, padding: "4px 8px", borderRadius: 5,
                          background: item.riskLevel === "RED" ? "#fef2f2" : "#fffbeb",
                          color: item.riskLevel === "RED" ? "var(--dn)" : "#b45309",
                        }}>
                          {item.riskLevel === "RED" ? "RİSK: YÜKSEK" : "RİSK: ORTA"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Güncel Konular</b><small>{topicsLoading ? "Yükleniyor…" : `${topics.length} başlık bulundu`}</small></div></div>
        <div className="adm-card-b">
        {topics.length === 0 ? (
          <div>
            <p style={{ color: topicsError ? "var(--dn)" : "var(--muted)", fontSize: 13 }}>
              {topicsLoading ? "Konular getiriliyor…" : topicsError || "Konu bulunamadı"}
            </p>
            {topicsError && !topicsLoading && (
              <button className="adm-btn" style={{ marginTop: 8 }} onClick={() => void loadTopics(category)}>Konuları Yeniden Dene</button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {topics.slice(0, 15).map((t, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--surface)", borderRadius: 8, gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "var(--ink2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{t.source}</p>
                  <p style={{ fontSize: 10, color: t.evidencePacket?.status === "VERIFIED" ? "var(--up)" : "#b45309", marginTop: 3 }}>
                    {t.evidencePacket?.status === "VERIFIED"
                      ? `${t.evidencePacket.independentSourceCount} bağımsız kaynak doğrulandı`
                      : "İkinci kaynak bekleniyor"}
                  </p>
                </div>
                <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "var(--surface2)", color: "var(--ink2)", whiteSpace: "nowrap", fontFamily: "var(--mono)" }}>{t.category}</span>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-h"><div><b>Çalışma Geçmişi</b><small>Son bot çalıştırma kayıtları</small></div></div>
        <div className="adm-card-b">
        {runs.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Henüz çalışma yok</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {runs.map((r) => (
              <div key={r.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: "var(--ink2)", fontFamily: "var(--mono)" }}>{new Date(r.startedAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
                  <span style={{ fontSize: 11, padding: "4px 8px", borderRadius: 4, fontFamily: "var(--mono)", background: r.status === "completed" ? "var(--up-soft)" : "#fffbeb", color: r.status === "completed" ? "var(--up)" : "#d97706" }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 12 }}>
                  <Stat label="Bulunan" value={r.articlesFound} />
                  <Stat label="Eklenen" value={r.articlesAdded} color="var(--up)" />
                  <Stat label="Yayında" value={r.autoPublished} color="var(--up)" />
                  <Stat label="İncelemede" value={r.reviewQueued} color="#d97706" />
                  <Stat label="Duplicate" value={r.duplicatesSkipped} color="#d97706" />
                </div>
                {r.errors && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ fontSize: 11, color: "var(--dn)", cursor: "pointer" }}>Hatalar</summary>
                    <pre style={{ fontSize: 11, color: "var(--dn)", marginTop: 8, whiteSpace: "pre-wrap" }}>{displayBlockMessage(r.errors)}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontFamily: "var(--display)", fontSize: 20, fontWeight: 700, color: color || "var(--ink)" }}>{value}</p>
    </div>
  );
}

function ProviderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
      <p style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)", letterSpacing: ".08em" }}>{label}</p>
      <p style={{ color: "var(--ink)", fontSize: 13, fontWeight: 650, marginTop: 7, overflowWrap: "anywhere" }}>{value}</p>
    </div>
  );
}
