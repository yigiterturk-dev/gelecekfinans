"use client";

import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

const formatTRY = (value: number) =>
  `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function IpoDemandCalculator() {
  const [price, setPrice] = useState("");
  const [lots, setLots] = useState("");
  const unitPrice = parseDecimalInput(price);
  const requestedLots = parseDecimalInput(lots);
  const amount = unitPrice * requestedLots;
  const valid = Number.isFinite(unitPrice) && unitPrice > 0 &&
    Number.isSafeInteger(requestedLots) && requestedLots > 0 && Number.isFinite(amount);

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Pay fiyatı (₺)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="any"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            aria-label="Halka arz pay fiyatı"
          />
        </label>
        <label className="calc-field">
          <span>Talep edilecek lot</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            value={lots}
            onChange={(event) => setLots(event.target.value)}
            aria-label="Talep edilecek lot sayısı"
          />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Pay fiyatını ve pozitif, tam sayı lot miktarını girin.</span>
        ) : (
          <div>
            <span className="calc-result-lbl">Brüt talep tutarı</span>
            <strong className="calc-out">{formatTRY(amount)}</strong>
          </div>
        )}
      </div>
      <p className="conv-note">
        Hesap, pay fiyatı × talep edilen lot sayısıdır; komisyon veya diğer masrafları içermez. Tahsis, bloke ve iade
        koşulları halka arza ve aracı kuruma göre değişebilir. İzahname ile kurumunuzun başvuru ekranındaki koşulları
        kontrol edin. Bu araç getiri veya kazanç tahmini yapmaz.
      </p>
    </div>
  );
}
