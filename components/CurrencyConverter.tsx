"use client";
import { useEffect, useState } from "react";
import Select from "@/components/Select";

/**
 * Canlı döviz çevirici. Kurları /api/doviz uçundan alır (savunmacı, önbellekli).
 * Saf client hesap; girişler doğrulanır (negatif/NaN engellenir).
 */
interface FxMap {
  [pair: string]: { rate: number } | null;
}

const OPTIONS = [
  { code: "USD", label: "Dolar (USD)", pair: "usd-try" },
  { code: "EUR", label: "Euro (EUR)", pair: "eur-try" },
  { code: "GBP", label: "Sterlin (GBP)", pair: "gbp-try" },
  { code: "TRY", label: "Türk Lirası (TRY)", pair: null as string | null },
];

const SELECT_OPTIONS = OPTIONS.map((option) => ({ value: option.code, label: option.label }));

export default function CurrencyConverter({ defaultFrom = "USD" }: { defaultFrom?: string }) {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState("TRY");

  useEffect(() => {
    let active = true;
    fetch("/api/doviz")
      .then((r) => r.json())
      .then((d: FxMap) => {
        if (!active) return;
        const map: Record<string, number> = { TRY: 1 };
        for (const opt of OPTIONS) {
          if (opt.pair && d[opt.pair]?.rate) map[opt.code] = d[opt.pair]!.rate;
        }
        setRates(map);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const num = parseFloat(amount.replace(",", "."));
  const valid = !isNaN(num) && num >= 0 && isFinite(num);
  const fromTl = from === "TRY" ? 1 : rates[from];
  const toTl = to === "TRY" ? 1 : rates[to];
  const canConvert = valid && fromTl != null && toTl != null;
  const result = canConvert ? (num * fromTl) / toTl : null;

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
        {!loaded ? (
          <span className="conv-muted">Kurlar yükleniyor…</span>
        ) : !canConvert ? (
          <span className="conv-muted">Geçerli bir miktar girin (kur verisi alınamadıysa daha sonra deneyin).</span>
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
      <p className="conv-note">Kurlar bilgilendirme amaçlıdır; serbest piyasa ve banka kurlarından farklılık gösterebilir.</p>
    </div>
  );
}
