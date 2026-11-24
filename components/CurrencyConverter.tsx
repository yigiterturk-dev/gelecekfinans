"use client";
import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Günlük referans kurlu döviz çevirici. Kurları /api/doviz uçundan alır (savunmacı, önbellekli).
 * Saf client hesap; girişler doğrulanır (negatif/NaN engellenir).
 */
interface FxMap {
  [pair: string]: { rate: number; updatedAt?: string | null } | null;
}

const OPTIONS = [
  { code: "USD", label: "Dolar (USD)", pair: "usd-try" },
  { code: "EUR", label: "Euro (EUR)", pair: "eur-try" },
  { code: "GBP", label: "Sterlin (GBP)", pair: "gbp-try" },
  { code: "CHF", label: "İsviçre Frangı (CHF)", pair: "chf-try" },
  { code: "SAR", label: "Suudi Arabistan Riyali (SAR)", pair: "sar-try" },
  { code: "AED", label: "Birleşik Arap Emirlikleri Dirhemi (AED)", pair: "aed-try" },
  { code: "RUB", label: "Rus Rublesi (RUB)", pair: "rub-try" },
  { code: "AZN", label: "Azerbaycan Manatı (AZN)", pair: "azn-try" },
  { code: "JPY", label: "Japon Yeni (JPY)", pair: "jpy-try" },
  { code: "CNY", label: "Çin Yuanı (CNY)", pair: "cny-try" },
  { code: "CAD", label: "Kanada Doları (CAD)", pair: "cad-try" },
  { code: "TRY", label: "Türk Lirası (TRY)", pair: null as string | null },
];

const SELECT_OPTIONS = OPTIONS.map((option) => ({ value: option.code, label: option.label }));

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default function CurrencyConverter({ defaultFrom = "USD" }: { defaultFrom?: string }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateDates, setRateDates] = useState<Record<string, string>>({});
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState("TRY");

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/doviz", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Kur isteği başarısız");
        return response.json();
      })
      .then((data: unknown) => {
        if (!active) return;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Kur yanıtı geçersiz");
        const d = data as FxMap;
        const map: Record<string, number> = { TRY: 1 };
        const dates: Record<string, string> = {};
        for (const opt of OPTIONS) {
          const fx = opt.pair ? d[opt.pair] : null;
          if (typeof fx?.rate === "number" && Number.isFinite(fx.rate) && fx.rate > 0) {
            map[opt.code] = fx.rate;
            if (typeof fx.updatedAt === "string" && isIsoDate(fx.updatedAt)) {
              dates[opt.code] = fx.updatedAt;
            }
          }
        }
        setRates(map);
        setRateDates(dates);
        setLoadState("ready");
      })
      .catch(() => { if (active) setLoadState("error"); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [retryKey]);

  const num = parseDecimalInput(amount);
  const valid = !isNaN(num) && num >= 0 && isFinite(num);
  const fromTl = from === "TRY" ? 1 : rates[from];
  const toTl = to === "TRY" ? 1 : rates[to];
  const canConvert = valid && Number.isFinite(fromTl) && fromTl! > 0 && Number.isFinite(toTl) && toTl! > 0;
  const needsRate = from !== "TRY" || to !== "TRY";
  const result = canConvert ? (num * fromTl!) / toTl! : null;
  const resultValid = result !== null && Number.isFinite(result);
  const referenceDates = Array.from(new Set([from, to]))
    .flatMap((code) => {
      const date = rateDates[code];
      return code !== "TRY" && date ? [{ code, date }] : [];
    });

  return (
    <div className="conv-box">
      <div className="conv-row">
        <label className="conv-field">
          <span>Miktar</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Çevrilecek miktar"
          />
        </label>
        <label className="conv-field">
          <span>Kaynak</span>
          <Select
            value={from}
            onChange={setFrom}
            options={SELECT_OPTIONS}
            ariaLabel="Kaynak para birimi"
          />
        </label>
        <button
          type="button"
          className="conv-swap"
          onClick={() => { setFrom(to); setTo(from); }}
          aria-label="Para birimlerini değiştir"
        >⇅</button>
        <label className="conv-field">
          <span>Hedef</span>
          <Select
            value={to}
            onChange={setTo}
            options={SELECT_OPTIONS}
            ariaLabel="Hedef para birimi"
          />
        </label>
      </div>
      <div className="conv-result" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Sıfır veya daha büyük geçerli bir miktar girin.</span>
        ) : needsRate && loadState === "loading" ? (
          <span className="conv-muted">Kurlar yükleniyor…</span>
        ) : needsRate && !canConvert ? (
          <div className="conv-muted" role="alert">
            Seçilen para birimi için referans kuru alınamadı.
            <button
              type="button"
              className="search-retry"
              onClick={() => {
                setLoadState("loading");
                setRetryKey((key) => key + 1);
              }}
            >Yeniden Dene</button>
          </div>
        ) : !canConvert ? (
          <span className="conv-muted">Bu dönüşüm için geçerli kur bulunamadı.</span>
        ) : !resultValid ? (
          <span className="conv-muted">Girilen tutar için hesaplanan sonuç sayısal sınırı aşıyor.</span>
        ) : (
          <>
            <strong>
              {num.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {from}
            </strong>
            {" = "}
            <strong className="conv-out">
              {result!.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {to}
            </strong>
          </>
        )}
      </div>
      {loadState === "ready" && referenceDates.length > 0 && (
        <p className="conv-muted" style={{ marginTop: 8 }}>
          Referans tarihi: {referenceDates.map(({ code, date }) =>
            `${code} ${new Date(`${date}T00:00:00Z`).toLocaleDateString("tr-TR", { timeZone: "UTC" })}`,
          ).join(" · ")}
        </p>
      )}
      <p className="conv-note">
        Kaynak: <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer">Frankfurter</a> günlük referans kurlarıdır; serbest piyasa ve banka alış-satış fiyatlarından farklılık gösterebilir.
      </p>
    </div>
  );
}
