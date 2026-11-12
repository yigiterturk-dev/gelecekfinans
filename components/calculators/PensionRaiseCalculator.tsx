"use client";
import { useState } from "react";

/** Emekli maaşı zammı: mevcut maaş + zam oranı (kullanıcı girer). */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => parseFloat(s.replace(",", "."));

export default function PensionRaiseCalculator() {
  const [pay, setPay] = useState("16881");
  const [rate, setRate] = useState("10");
  const m = num(pay), p = num(rate);
  const valid = isFinite(m) && isFinite(p) && m > 0 && p >= 0 && p < 1000;
  const inc = valid ? (m * p) / 100 : 0;
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Mevcut Aylık Maaş (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={pay}
            onChange={(e) => setPay(e.target.value)} aria-label="Mevcut emekli aylık maaşı" />
        </label>
        <label className="calc-field">
          <span>Zam Oranı (%)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={rate}
            onChange={(e) => setRate(e.target.value)} aria-label="Zam oranı yüzdesi" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli bir maaş ve zam oranı girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Zam Tutarı</span><strong>{fmt(inc)}</strong></div>
            <div><span className="calc-result-lbl">Yeni Aylık Maaş</span><strong className="calc-out">{fmt(m + inc)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Fark</span><strong>{fmt(inc * 12)}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Emekli aylıkları, enflasyon farkı kadar (ve varsa ek artışla) güncellenir. Zam oranı açıklanana kadar tahmini bir oran girerek senaryo görebilirsiniz; kesin tutar için SGK’nın duyurusuna bakın. Aylık üzerinden kesilen vergi veya kesintiler hesaba katılmaz.</p>
    </div>
  );
}
