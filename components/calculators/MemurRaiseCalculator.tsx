"use client";
import { useState } from "react";
import { MEMUR_DONEMLER, memurZam } from "@/lib/memur-zam";
import { parseDecimalInput } from "@/lib/parse-decimal-input";
import type { PensionHalf } from "./PensionRaiseCalculator";

/**
 * Memur ve memur emeklisi zammı. TÜFE alanı, zam penceresinin ŞİMDİYE KADAR
 * birikmiş oranıyla başlar (EVDS); pencere bitmediyse kesin olmadığı yazılır.
 * Kalan aylar için tahmin YAPILMAZ — kullanıcı kendi senaryosunu yazabilir.
 */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pc = (v: number) => "%" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = parseDecimalInput;

export default function MemurRaiseCalculator({ half }: { half?: PensionHalf | null }) {
  const periods = Object.keys(MEMUR_DONEMLER);
  const initial = half && MEMUR_DONEMLER[half.raiseMonth] ? half.raiseMonth : "Ocak 2027";
  const [period, setPeriod] = useState(initial);
  const [pay, setPay] = useState("50000");
  const [tufeByPeriod, setTufeByPeriod] = useState<Record<string, string>>({
    [initial]: half && half.raiseMonth === initial ? half.pct.toFixed(2) : "",
  });
  const tufe = tufeByPeriod[period] ?? "";
  const cfg = MEMUR_DONEMLER[period];
  const m = num(pay), t = num(tufe);
  const inputsValid = Number.isFinite(m) && Number.isFinite(t) && m > 0 && t > -50 && t < 500;
  const r = inputsValid ? memurZam(t, cfg.base, cfg.prev) : null;
  const newPayEstimate = r ? m * (1 + r.toplam / 100) : null;
  const monthlyIncreaseEstimate = r ? (m * r.toplam) / 100 : null;
  const valid = r !== null && newPayEstimate !== null && monthlyIncreaseEstimate !== null &&
    [r.fark, r.toplam, newPayEstimate, monthlyIncreaseEstimate].every(Number.isFinite);

  function selectPeriod(next: string) {
    setTufeByPeriod((current) => {
      if (Object.prototype.hasOwnProperty.call(current, next)) return current;
      return {
        ...current,
        [next]: half && half.raiseMonth === next ? half.pct.toFixed(2) : "",
      };
    });
    setPeriod(next);
  }

  return (
    <div className="calc-box">
      <div className="market-chips" role="group" aria-label="Zam dönemi" style={{ marginBottom: 12 }}>
        {periods.map((p) => (
          <button key={p} type="button" className="market-chip" aria-pressed={p === period}
            style={p === period ? { fontWeight: 700, outline: "2px solid currentColor" } : undefined}
            onClick={() => selectPeriod(p)}>{p}</button>
        ))}
      </div>
      <div className="calc-row">
        <label className="calc-field">
          <span>Mevcut Aylık Net Maaş (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={pay}
            onChange={(e) => setPay(e.target.value)} aria-label="Mevcut memur maaşı" />
        </label>
        <label className="calc-field">
          <span>6 Aylık Enflasyon (TÜFE, %)</span>
          <input type="number" inputMode="decimal" step="any" value={tufe}
            onChange={(e) => setTufeByPeriod((current) => ({ ...current, [period]: e.target.value }))}
            aria-label="Altı aylık enflasyon oranı" />
        </label>
      </div>
      <p className="conv-muted" style={{ marginTop: 12 }}>
        {period} toplu sözleşme zammı <strong>%{cfg.base}</strong>; enflasyon farkı, 6 aylık TÜFE&apos;nin önceki dönem
        zammı olan %{cfg.prev}&apos;i aşan kısmıdır.
        {half && half.raiseMonth === period && (half.complete
          ? <> {half.fromLabel}–{half.toLabel} birikmiş TÜFE <strong>{pc(half.pct)}</strong> (TÜİK, kesin).</>
          : <> {half.fromLabel}–{half.toLabel} ({half.months} ay) birikmiş TÜFE şu an <strong>{pc(half.pct)}</strong>; kalan aylar açıklanınca kesinleşir.</>)}
        {(!half || half.raiseMonth !== period) && <> Bu dönem için TÜFE otomatik doldurulmuyor; gerçekleşen 6 aylık oranı veya kendi senaryonuzu girin.</>}
      </p>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!inputsValid ? (
          <span className="conv-muted">Geçerli bir maaş ve enflasyon oranı girin.</span>
        ) : !valid || !r ? (
          <span className="conv-muted">Bu değerlerle hesaplanan sonuç sayısal sınırı aşıyor.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Enflasyon Farkı</span><strong>{pc(r.fark)}</strong></div>
            <div><span className="calc-result-lbl">Toplam Memur Zammı</span><strong>{pc(r.toplam)}</strong></div>
            <div><span className="calc-result-lbl">Yeni Maaş</span><strong className="calc-out">{fmt(newPayEstimate!)}</strong></div>
            <div><span className="calc-result-lbl">Aylık Artış</span><strong>{fmt(monthlyIncreaseEstimate!)}</strong></div>
            <div><span className="calc-result-lbl">SSK/Bağ-Kur Emekli Zammı</span><strong>{pc(Math.max(0, t))}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">
        Oranlar <a href="https://www.csgb.gov.tr/cgm/haberler/27082025/" target="_blank" rel="noopener noreferrer">Çalışma ve Sosyal Güvenlik Bakanlığının 8. Dönem Toplu Sözleşme duyurusu</a> (Kamu Görevlileri Hakem Kurulu kararı, Resmî Gazete 27.08.2025) esas alınarak
        hesaplanır. Memur emeklileri memurla aynı oranı alır. Maaş kalemleri (ek ödeme, vergi dilimi) farklı etkilenebildiği
        için sonuç yaklaşık net tutardır; kesin tutar maaş bordronuzda görünür.
      </p>
    </div>
  );
}
