"use client";
import { useState } from "react";
import { MEMUR_DONEMLER, memurZam } from "@/lib/memur-zam";
import type { PensionHalf } from "./PensionRaiseCalculator";

/**
 * Memur ve memur emeklisi zammı. TÜFE alanı, zam penceresinin ŞİMDİYE KADAR
 * birikmiş oranıyla başlar (EVDS); pencere bitmediyse kesin olmadığı yazılır.
 * Kalan aylar için tahmin YAPILMAZ — kullanıcı kendi senaryosunu yazabilir.
 */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pc = (v: number) => "%" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => parseFloat(s.replace(",", "."));

export default function MemurRaiseCalculator({ half }: { half?: PensionHalf | null }) {
  const periods = Object.keys(MEMUR_DONEMLER);
  const initial = half && MEMUR_DONEMLER[half.raiseMonth] ? half.raiseMonth : "Ocak 2027";
  const [period, setPeriod] = useState(initial);
  const [pay, setPay] = useState("50000");
  const [tufe, setTufe] = useState(half && half.raiseMonth === initial ? half.pct.toFixed(2) : "10");
  const cfg = MEMUR_DONEMLER[period];
  const m = num(pay), t = num(tufe);
  const valid = isFinite(m) && isFinite(t) && m > 0 && t > -50 && t < 500;
  const r = valid ? memurZam(t, cfg.base, cfg.prev) : null;
  return (
    <div className="calc-box">
      <div className="market-chips" role="group" aria-label="Zam dönemi" style={{ marginBottom: 12 }}>
        {periods.map((p) => (
          <button key={p} type="button" className="market-chip" aria-pressed={p === period}
            style={p === period ? { fontWeight: 700, outline: "2px solid currentColor" } : undefined}
            onClick={() => setPeriod(p)}>{p}</button>
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
            onChange={(e) => setTufe(e.target.value)} aria-label="Altı aylık enflasyon oranı" />
        </label>
      </div>
      <p className="conv-muted" style={{ marginTop: 12 }}>
        {period} toplu sözleşme zammı <strong>%{cfg.base}</strong>; enflasyon farkı, 6 aylık TÜFE&apos;nin önceki dönem
        zammı olan %{cfg.prev}&apos;i aşan kısmıdır.
        {half && half.raiseMonth === period && (half.complete
          ? <> {half.fromLabel}–{half.toLabel} birikmiş TÜFE <strong>{pc(half.pct)}</strong> (TÜİK, kesin).</>
          : <> {half.fromLabel}–{half.toLabel} ({half.months} ay) birikmiş TÜFE şu an <strong>{pc(half.pct)}</strong>; kalan aylar açıklanınca kesinleşir.</>)}
      </p>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!r ? (
          <span className="conv-muted">Geçerli bir maaş ve enflasyon oranı girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Enflasyon Farkı</span><strong>{pc(r.fark)}</strong></div>
            <div><span className="calc-result-lbl">Toplam Memur Zammı</span><strong>{pc(r.toplam)}</strong></div>
            <div><span className="calc-result-lbl">Yeni Maaş</span><strong className="calc-out">{fmt(m * (1 + r.toplam / 100))}</strong></div>
            <div><span className="calc-result-lbl">Aylık Artış</span><strong>{fmt(m * r.toplam / 100)}</strong></div>
            <div><span className="calc-result-lbl">SSK/Bağ-Kur Emekli Zammı</span><strong>{pc(Math.max(0, t))}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">
        Oranlar 8. Dönem Toplu Sözleşme (Kamu Görevlileri Hakem Kurulu kararı, Resmî Gazete 27.08.2025) esas alınarak
        hesaplanır. Memur emeklileri memurla aynı oranı alır. Maaş kalemleri (ek ödeme, vergi dilimi) farklı etkilenebildiği
        için sonuç yaklaşık net tutardır; kesin tutar maaş bordronuzda görünür.
      </p>
    </div>
  );
}
