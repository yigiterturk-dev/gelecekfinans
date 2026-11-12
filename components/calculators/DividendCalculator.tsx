"use client";
import { useState } from "react";

/** Temettü: adet, hisse başına brüt temettü, stopaj, hisse fiyatı (verim için). */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => parseFloat(s.replace(",", "."));

export default function DividendCalculator() {
  const [qty, setQty] = useState("1000");
  const [dps, setDps] = useState("2");
  const [price, setPrice] = useState("50");
  const [tax, setTax] = useState("10");
  const q = num(qty), d = num(dps), pr = num(price), t = num(tax) / 100;
  const valid = [q, d, pr, t].every(isFinite) && q > 0 && d >= 0 && pr > 0 && t >= 0 && t < 1;
  const gross = valid ? q * d : 0;
  const stopaj = gross * t;
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Hisse Adedi</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Hisse adedi" />
        </label>
        <label className="calc-field">
          <span>Hisse Başına Brüt Temettü (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={dps}
            onChange={(e) => setDps(e.target.value)} aria-label="Hisse başına brüt temettü" />
        </label>
        <label className="calc-field">
          <span>Hisse Fiyatı (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={price}
            onChange={(e) => setPrice(e.target.value)} aria-label="Hisse fiyatı" />
        </label>
        <label className="calc-field">
          <span>Stopaj (%)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={tax}
            onChange={(e) => setTax(e.target.value)} aria-label="Temettü stopaj yüzdesi" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Tüm alanlar için geçerli değerler girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Brüt Temettü</span><strong>{fmt(gross)}</strong></div>
            <div><span className="calc-result-lbl">Stopaj</span><strong>{fmt(stopaj)}</strong></div>
            <div><span className="calc-result-lbl">Net Temettü</span><strong className="calc-out">{fmt(gross - stopaj)}</strong></div>
            <div><span className="calc-result-lbl">Brüt Temettü Verimi</span><strong>%{((d / pr) * 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Stopaj oranı varsayılan olarak %10 girilidir; yürürlükteki oranı ve kendi vergi durumunuzu (beyan gerekliliği dahil) kontrol edin. Verim, girilen hisse fiyatına göre hesaplanır. Bu araç bilgilendiricidir, yatırım veya vergi tavsiyesi değildir.</p>
    </div>
  );
}
