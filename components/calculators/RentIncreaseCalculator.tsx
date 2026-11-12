"use client";
import { useState } from "react";

/** Kira artışı: mevcut kira ve TÜFE 12 aylık ortalama değişim oranı (kullanıcı girer). */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => parseFloat(s.replace(",", "."));

export default function RentIncreaseCalculator() {
  const [rent, setRent] = useState("20000");
  const [rate, setRate] = useState("30");
  const r = num(rent), p = num(rate);
  const valid = isFinite(r) && isFinite(p) && r > 0 && p >= 0 && p < 1000;
  const inc = valid ? (r * p) / 100 : 0;
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
            onChange={(e) => setRate(e.target.value)} aria-label="TÜFE 12 aylık ortalama artış yüzdesi" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli bir kira tutarı ve oran girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Artış Tutarı</span><strong>{fmt(inc)}</strong></div>
            <div><span className="calc-result-lbl">Yeni Aylık Kira</span><strong className="calc-out">{fmt(r + inc)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Toplam Kira</span><strong>{fmt((r + inc) * 12)}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Türk Borçlar Kanunu m. 344 uyarınca yenilenen kira dönemlerinde artış, bir önceki kira yılındaki TÜFE 12 aylık ortalama değişim oranını aşamaz. Oranı TÜİK’in açıkladığı güncel veriden girin; taraflar daha düşük bir oranda da anlaşabilir. Bu araç bilgilendiricidir, hukuki görüş değildir.</p>
    </div>
  );
}
