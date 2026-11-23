"use client";
import { useEffect, useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";
import Select from "@/components/Select";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

/**
 * Altın hesaplama: tür + adet/gram → güncel TL değeri.
 * Canlı fiyatları /api/altin uçundan alır. Saf client hesap, girişler doğrulanır.
 */
interface GoldMap {
  [type: string]: {
    price: number;
    goldSource: "Yahoo Finance" | "CoinGecko" | null;
    goldUpdatedAt: string | null;
    fxUpdatedAt: string | null;
  } | null;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(new Date(value).getTime());
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

const TYPES = [
  { key: "gram-altin", label: "Gram Altın", unit: "gram" },
  { key: "ceyrek-altin", label: "Çeyrek Altın", unit: "adet" },
  { key: "yarim-altin", label: "Yarım Altın", unit: "adet" },
  { key: "cumhuriyet-altini", label: "Cumhuriyet Altını", unit: "adet" },
  { key: "ons", label: "Ons Altın", unit: "ons" },
];

const TYPE_OPTIONS = TYPES.map((type) => ({ value: type.key, label: type.label }));

export default function GoldCalculator() {
  const [prices, setPrices] = useState<GoldMap>({});
  const [loaded, setLoaded] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [type, setType] = useState("gram-altin");
  const [qty, setQty] = useState("10");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoaded(false);
    fetch("/api/altin", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Altın fiyatı isteği başarısız");
        return response.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!active) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Altın fiyatı yanıtı geçersiz");
        const source = data as Record<string, unknown>;
        const normalized: GoldMap = {};
        for (const item of TYPES) {
          const row = source[item.key];
          const price = row && typeof row === "object" ? (row as { price?: unknown }).price : null;
          normalized[item.key] = typeof price === "number" && Number.isFinite(price) && price > 0
            ? {
                price,
                goldSource: (row as { goldSource?: unknown }).goldSource === "CoinGecko"
                  ? "CoinGecko"
                  : (row as { goldSource?: unknown }).goldSource === "Yahoo Finance"
                    ? "Yahoo Finance"
                    : null,
                goldUpdatedAt: isValidDate((row as { goldUpdatedAt?: unknown }).goldUpdatedAt)
                  ? (row as { goldUpdatedAt: string }).goldUpdatedAt
                  : null,
                fxUpdatedAt: isValidDate((row as { updatedAt?: unknown }).updatedAt)
                  ? (row as { updatedAt: string }).updatedAt
                  : null,
              }
            : null;
        }
        setPrices(normalized);
        setLoaded(true);
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; controller.abort(); };
  }, [retryKey]);

  const n = parseDecimalInput(qty);
  const valid = !isNaN(n) && n >= 0 && isFinite(n);
  const unit = TYPES.find((t) => t.key === type)?.unit ?? "adet";
  const rawUnitPrice = prices[type]?.price;
  const unitPrice = typeof rawUnitPrice === "number" && Number.isFinite(rawUnitPrice) && rawUnitPrice > 0
    ? rawUnitPrice
    : null;
  const totalEstimate = valid && unitPrice != null ? n * unitPrice : null;
  const total = totalEstimate !== null && Number.isFinite(totalEstimate) ? totalEstimate : null;

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Altın Türü</span>
          <Select value={type} onChange={setType} options={TYPE_OPTIONS} ariaLabel="Altın türü" />
        </label>
        <label className="calc-field">
          <span>Miktar ({unit})</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Altın miktarı" />
        </label>
      </div>
      <div className="calc-result" aria-live="polite">
        {!loaded ? (
          <span className="conv-muted">Fiyatlar yükleniyor…</span>
        ) : unitPrice == null ? (
          <div className="conv-muted" role="alert">
            Altın fiyatı verisi alınamadı.
            <button type="button" className="search-retry" onClick={() => setRetryKey((key) => key + 1)}>
              Yeniden Dene
            </button>
          </div>
        ) : !valid ? (
          <span className="conv-muted">Geçerli bir miktar girin.</span>
        ) : total == null ? (
          <span className="conv-muted">Bu miktar için sonuç sayısal sınırı aşıyor.</span>
        ) : (
          <>
            <span className="calc-result-lbl">Tahmini Metal Değeri</span>
            <strong className="calc-out">
              ₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="conv-muted">
              Birim: ₺{unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="conv-muted">
              {prices[type]?.goldSource === "CoinGecko" ? (
                <CoinGeckoAttribution />
              ) : prices[type]?.goldSource ? `Altın veri kaynağı: ${prices[type]!.goldSource}` : "Altın veri kaynağı bildirilmedi"}
            </span>
            <span className="conv-muted">
              Altın fiyatı güncellemesi: {prices[type]?.goldUpdatedAt ? formatDateTime(prices[type]!.goldUpdatedAt!) : "kaynak zamanı paylaşılmadı"}
              {prices[type]?.fxUpdatedAt ? ` · USD/TRY referans tarihi: ${formatDate(prices[type]!.fxUpdatedAt!)}` : ""}
            </span>
          </>
        )}
      </div>
      <p className="conv-note">Gram altın 24 ayar spot değerden; çeyrek, yarım ve tam Cumhuriyet ziynet altınları Darphane'nin 22 ayar ağırlık ve saflık standardından hesaplanır. Sonuç yaklaşık metal karşılığıdır; sikke primi, işçilik, alış-satış makası ve kurum marjı dahil değildir. <a href="https://www.darphane.gov.tr/cumhuriyet-altini-uretimi" target="_blank" rel="noopener noreferrer">Darphane ağırlık ve ayar bilgileri</a>.</p>
    </div>
  );
}
