"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Enflasyon hesaplayıcı: dönem yönünü seçerek tutarı kümülatif enflasyonla
 * ileri taşır veya geçmiş satın alma gücüne çevirir.
 * Saf client, bağımlılıksız.
 */
export default function InflationCalculator() {
  const [direction, setDirection] = useState<"past-to-present" | "present-to-past">("past-to-present");
  const [amount, setAmount] = useState("10000");
  const [totalInflation, setTotalInflation] = useState("65"); // dönem kümülatif %

  const A = parseDecimalInput(amount);
  const inf = parseDecimalInput(totalInflation) / 100;
  const inputsValid = Number.isFinite(A) && A > 0 && Number.isFinite(inf) && inf > -1;

  const adjustedEstimate = inputsValid
    ? direction === "past-to-present" ? A * (1 + inf) : A / (1 + inf)
    : null;
  const differenceEstimate = adjustedEstimate === null
    ? null
    : direction === "past-to-present" ? adjustedEstimate - A : A - adjustedEstimate;
  const valid = adjustedEstimate !== null && Number.isFinite(adjustedEstimate) &&
    differenceEstimate !== null && Number.isFinite(differenceEstimate);
  const adjusted = valid ? adjustedEstimate : null;
  const difference = valid ? differenceEstimate : null;

  const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Hesap yönü</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)} aria-label="Enflasyon hesap yönü">
            <option value="past-to-present">Geçmiş tutarı bugüne taşı</option>
            <option value="present-to-past">Bugünkü tutarı geçmişe indir</option>
          </select>
        </label>
        <label className="calc-field">
          <span>{direction === "past-to-present" ? "Geçmiş dönemdeki tutar (₺)" : "Bugünkü tutar (₺)"}</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={amount}
            onChange={(e) => setAmount(e.target.value)} aria-label={direction === "past-to-present" ? "Geçmiş dönemdeki tutar" : "Bugünkü tutar"} />
        </label>
        <label className="calc-field">
          <span>Dönem Enflasyonu (%)</span>
          <input type="number" inputMode="decimal" step="any" value={totalInflation}
            onChange={(e) => setTotalInflation(e.target.value)} aria-label="Toplam enflasyon oranı" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli tutar ve enflasyon oranı girin; hesap sonucu sayısal sınırı aşmamalı.</span>
        ) : (
          <>
            <div>
              <span className="calc-result-lbl">{direction === "past-to-present" ? "Bugünkü karşılığı" : "Geçmiş dönemdeki nominal karşılığı"}</span>
              <strong className="calc-out">{fmt(adjusted!)}</strong>
              <span className="conv-muted">{direction === "past-to-present" ? "Aynı alım gücünü korumak için gereken tutar." : "Bu tutarın geçmiş dönemdeki nominal karşılığı."}</span>
            </div>
            <div>
              <span className="calc-result-lbl">Dönemler arası nominal fark</span>
              <strong>{fmt(difference!)}</strong>
              <span className="conv-muted">Seçilen iki dönem arasındaki tutar farkı.</span>
            </div>
          </>
        )}
      </div>
      <p className="conv-note">Hesap, girilen kümülatif enflasyon oranını seçtiğiniz yönde uygular. Resmî TÜİK verileri için ilgili kurum yayınlarını esas alın.</p>
    </div>
  );
}
