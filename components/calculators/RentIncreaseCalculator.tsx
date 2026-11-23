"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Kira artışı: mevcut kira × TÜFE 12 aylık ortalama değişim oranı (TBK 344).
 * `rates` verilirse (TÜİK/EVDS) yenileme ayı seçilir, oran otomatik gelir;
 * veri gelmezse eski elle giriş modu çalışır.
 */
export interface RentRate { renewal: string; source: string; avg12: number }
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = parseDecimalInput;

export default function RentIncreaseCalculator({ rates }: { rates?: RentRate[] }) {
  const [rent, setRent] = useState("20000");
  const [rate, setRate] = useState(rates?.length ? rates[0].avg12.toFixed(2) : "");
  const [picked, setPicked] = useState(rates?.length ? rates[0].renewal : "");
  const r = num(rent), p = num(rate);
  const inputsValid = Number.isFinite(r) && Number.isFinite(p) && r > 0 && p >= 0 && p < 1000;
  const increaseEstimate = inputsValid ? (r * p) / 100 : null;
  const newRentEstimate = increaseEstimate === null ? null : r + increaseEstimate;
  const annualIncreaseEstimate = increaseEstimate === null ? null : increaseEstimate * 12;
  const annualEstimate = newRentEstimate === null ? null : newRentEstimate * 12;
  const valid = inputsValid && increaseEstimate !== null && newRentEstimate !== null &&
    annualIncreaseEstimate !== null && annualEstimate !== null &&
    [increaseEstimate, newRentEstimate, annualIncreaseEstimate, annualEstimate].every(Number.isFinite);
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Mevcut Aylık Kira (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={rent}
            onChange={(e) => setRent(e.target.value)} aria-label="Mevcut aylık kira" />
        </label>
        <label className="calc-field">
          <span>TÜFE 12 Aylık Ortalama Artış (%)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={rate}
            onChange={(e) => { setRate(e.target.value); setPicked(""); }} aria-label="TÜFE 12 aylık ortalama artış yüzdesi" />
        </label>
      </div>
      {(!rates || rates.length === 0) && (
        <p className="conv-muted" style={{ marginTop: 10 }}>
          Güncel oran otomatik alınamadı. Hesaplama için yenileme ayınıza ait TÜİK TÜFE 12 aylık ortalama oranını girin.
        </p>
      )}
      {rates && rates.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <span className="calc-result-lbl">Kira yenileme ayınız</span>
          <div className="market-chips" role="group" aria-label="Kira yenileme ayı" style={{ marginTop: 8 }}>
            {rates.map((r) => (
              <button key={r.renewal} type="button" className="market-chip"
                aria-pressed={picked === r.renewal}
                style={picked === r.renewal ? { borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 700 } : undefined}
                onClick={() => { setPicked(r.renewal); setRate(r.avg12.toFixed(2)); }}>
                {r.renewal}
              </button>
            ))}
          </div>
          {picked && (
            <p className="conv-muted" style={{ marginTop: 8 }}>
              {picked} yenilemesinde azami oran: {rates.find((r) => r.renewal === picked)?.source} TÜFE 12 aylık ortalama
              değişimi (TÜİK, TCMB EVDS üzerinden).
            </p>
          )}
        </div>
      )}
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!inputsValid ? (
          <span className="conv-muted">Geçerli bir kira tutarı ve oran girin.</span>
        ) : !valid ? (
          <span className="conv-muted">Bu değerlerle hesaplanan sonuç sayısal sınırı aşıyor.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Artış Tutarı</span><strong>{fmt(increaseEstimate!)}</strong></div>
            <div><span className="calc-result-lbl">Yeni Aylık Kira</span><strong className="calc-out">{fmt(newRentEstimate!)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Ek Kira</span><strong>{fmt(annualIncreaseEstimate!)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Toplam Kira</span><strong>{fmt(annualEstimate!)}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Türk Borçlar Kanunu m. 344 uyarınca yenilenen kira dönemlerinde artış, bir önceki kira yılındaki TÜFE 12 aylık ortalama değişim oranını aşamaz. Oranı TÜİK’in açıkladığı güncel veriden girin; taraflar daha düşük bir oranda da anlaşabilir. Bu araç bilgilendiricidir, hukuki görüş değildir.</p>
    </div>
  );
}
