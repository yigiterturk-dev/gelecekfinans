"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Emekli maaşı zammı: mevcut maaş + zam oranı.
 * `half` verilirse (TÜİK/EVDS) oran, zam penceresinin ŞİMDİYE KADAR birikmiş
 * TÜFE'si ile başlar; pencere bitmediyse bunun kesin zam olmadığı yazılır.
 * Kalan aylar için tahmin YAPILMAZ.
 */
export interface PensionHalf { fromLabel: string; toLabel: string; months: number; pct: number; complete: boolean; raiseMonth: string }
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = parseDecimalInput;

export default function PensionRaiseCalculator({ half }: { half?: PensionHalf | null }) {
  const [pay, setPay] = useState("");
  const [rate, setRate] = useState(half ? half.pct.toFixed(2) : "");
  const m = num(pay), p = num(rate);
  const inputsValid = Number.isFinite(m) && Number.isFinite(p) && m > 0 && p >= 0 && p < 1000;
  const incEstimate = (m * p) / 100;
  const newPayEstimate = m + incEstimate;
  const annualDifferenceEstimate = incEstimate * 12;
  const valid = inputsValid && [incEstimate, newPayEstimate, annualDifferenceEstimate].every(Number.isFinite);
  const inc = valid ? incEstimate : 0;
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Mevcut Kök Aylık (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={pay}
            onChange={(e) => setPay(e.target.value)} aria-label="Mevcut emekli kök aylığı" />
        </label>
        <label className="calc-field">
          <span>Zam Oranı (%)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={rate}
            onChange={(e) => setRate(e.target.value)} aria-label="Zam oranı yüzdesi" />
        </label>
      </div>
      {half && (
        <p className="conv-muted" style={{ marginTop: 12 }}>
          {half.complete
            ? <>{half.raiseMonth} zammının dayanağı olan {half.fromLabel}–{half.toLabel} birikmiş TÜFE: <strong>%{half.pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong> (TÜİK).</>
            : <>{half.fromLabel}–{half.toLabel} ({half.months} ay) birikmiş TÜFE şu an <strong>%{half.pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong>. {half.raiseMonth} zammı, kalan aylar açıklanınca kesinleşir; bu oran henüz kesin zam değildir.</>}
        </p>
      )}
      {!half && (
        <p className="conv-muted" style={{ marginTop: 12 }}>
          TÜİK/EVDS verisi alınamadı; oran alanı boş bırakıldı. Resmî oran açıklanmadıysa yalnızca kendi varsayımınızla senaryo kurun.
        </p>
      )}
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli bir maaş ve zam oranı girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Zam Tutarı</span><strong>{fmt(inc)}</strong></div>
            <div><span className="calc-result-lbl">Zam Sonrası Kök Aylık</span><strong className="calc-out">{fmt(newPayEstimate)}</strong></div>
            <div>
              <span className="calc-result-lbl">Yıllıklandırılmış Fark</span>
              <strong>{fmt(annualDifferenceEstimate)}</strong>
              <span className="conv-muted">Aylık fark × 12; zam ayına göre yıl içinde fiilen ödenecek toplam değildir.</span>
            </div>
          </>
        )}
      </div>
      <p className="conv-note">Emekli aylıkları, enflasyon farkı kadar (ve varsa ek artışla) güncellenir. Zam oranı açıklanana kadar tahmini bir oran girerek senaryo görebilirsiniz; kesin tutar için SGK’nın duyurusuna bakın. Aylık üzerinden kesilen vergi veya kesintiler hesaba katılmaz.</p>
    </div>
  );
}
