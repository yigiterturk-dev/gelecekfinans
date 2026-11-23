"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Bileşik faiz hesaplayıcı: başlangıç tutarı + (isteğe bağlı) aylık ek yatırım.
 * Yıllık nominal oran, aylık bileşikleme. Saf client, bağımlılıksız.
 */
export default function CompoundCalculator() {
  const [principal, setPrincipal] = useState("100000");
  const [monthly, setMonthly] = useState("0");
  const [annualRate, setAnnualRate] = useState("40");
  const [years, setYears] = useState("5");

  const P = parseDecimalInput(principal);
  const M = parseDecimalInput(monthly);
  const r = parseDecimalInput(annualRate) / 100;
  const y = parseDecimalInput(years);
  const inputsValid =
    isFinite(P) && P >= 0 && isFinite(M) && M >= 0 && P + M > 0 &&
    isFinite(r) && r >= -1 && r <= 10 && isFinite(y) && y >= 1 / 12 && y <= 50;

  let total: number | null = null;
  let invested: number | null = null;
  if (inputsValid) {
    const n = Math.round(y * 12);
    const i = r / 12;
    let bal = P;
    for (let k = 0; k < n; k++) bal = bal * (1 + i) + M;
    total = bal;
    invested = P + M * n;
  }
  const valid = total !== null && Number.isFinite(total) && invested !== null && Number.isFinite(invested);
  const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Başlangıç Tutarı (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={principal}
            onChange={(e) => setPrincipal(e.target.value)} aria-label="Başlangıç tutarı" />
        </label>
        <label className="calc-field">
          <span>Aylık Ek Yatırım (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={monthly}
            onChange={(e) => setMonthly(e.target.value)} aria-label="Aylık ek yatırım" />
        </label>
        <label className="calc-field">
          <span>Yıllık Getiri (%)</span>
          <input type="number" inputMode="decimal" min={-100} max={1000} step="any" value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)} aria-label="Yıllık getiri oranı" />
        </label>
        <label className="calc-field">
          <span>Süre (yıl, en az 1 ay)</span>
          <input type="number" inputMode="decimal" min={1 / 12} max={50} step="any" value={years}
            onChange={(e) => setYears(e.target.value)} aria-label="Süre yıl" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli tutar, −%100 ile %1.000 arasında yıllık getiri ve süre girin; hesap sonucu sayısal sınırı aşmamalı.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Toplam Yatırılan</span><strong>{fmt(invested!)}</strong></div>
            <div><span className="calc-result-lbl">Toplam Getiri</span><strong>{fmt(total! - invested!)}</strong></div>
            <div><span className="calc-result-lbl">Dönem Sonu Değer</span><strong className="calc-out">{fmt(total!)}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Yıllık oran aylık bileşikleme ile uygulanır; süre en yakın aya yuvarlanır ve ek yatırım her ayın sonunda yapılır. Vergi, komisyon ve enflasyon hesaba katılmaz; getiriler garanti değildir.</p>
    </div>
  );
}
