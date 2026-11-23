"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Hisse kâr/zarar hesaplayıcı: alış-satış fiyatı, adet, komisyon ve komisyon BSMV'si.
 * Saf client, bağımlılıksız.
 */
export default function StockPnlCalculator() {
  const [buy, setBuy] = useState("100");
  const [sell, setSell] = useState("120");
  const [qty, setQty] = useState("100");
  const [fee, setFee] = useState("1"); // binde, alış ve satışta ayrı ayrı
  const [bsmv, setBsmv] = useState("5"); // komisyon üzerinden yüzde

  const b = parseDecimalInput(buy);
  const s = parseDecimalInput(sell);
  const q = parseDecimalInput(qty);
  const f = parseDecimalInput(fee) / 1000;
  const tax = parseDecimalInput(bsmv) / 100;
  const inputsValid = [b, s, q, f, tax].every(Number.isFinite) && b > 0 && s > 0 &&
    Number.isSafeInteger(q) && q > 0 && f >= 0 && f < 0.1 && tax >= 0 && tax < 1;
  const buyValue = inputsValid ? b * q : 0;
  const sellValue = inputsValid ? s * q : 0;
  const feesEstimate = (buyValue + sellValue) * f;
  const bsmvEstimate = feesEstimate * tax;
  const costEstimate = buyValue + buyValue * f * (1 + tax);
  const proceedsEstimate = sellValue - sellValue * f * (1 + tax);
  const pnlEstimate = proceedsEstimate - costEstimate;
  const pctEstimate = (pnlEstimate / costEstimate) * 100;
  const valid = inputsValid && [buyValue, sellValue, feesEstimate, bsmvEstimate, costEstimate, proceedsEstimate, pnlEstimate, pctEstimate]
    .every(Number.isFinite) && costEstimate > 0;
  const cost = valid ? costEstimate : 0;
  const pnl = valid ? pnlEstimate : 0;
  const pct = valid ? pctEstimate : 0;
  const fees = valid ? feesEstimate : 0;
  const taxAmount = valid ? bsmvEstimate : 0;
  const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Alış Fiyatı (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={buy}
            onChange={(e) => setBuy(e.target.value)} aria-label="Alış fiyatı" />
        </label>
        <label className="calc-field">
          <span>Satış Fiyatı (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={sell}
            onChange={(e) => setSell(e.target.value)} aria-label="Satış fiyatı" />
        </label>
        <label className="calc-field">
          <span>Adet</span>
          <input type="number" inputMode="numeric" min={1} step={1} value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Hisse adedi" />
        </label>
        <label className="calc-field">
          <span>Komisyon (binde)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={fee}
            onChange={(e) => setFee(e.target.value)} aria-label="Komisyon binde" />
        </label>
        <label className="calc-field">
          <span>Komisyon BSMV'si (%)</span>
          <input type="number" inputMode="decimal" min={0} max={99.99} step="any" value={bsmv}
            onChange={(e) => setBsmv(e.target.value)} aria-label="Komisyon üzerinden BSMV oranı yüzde" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Geçerli alış, satış, komisyon ve BSMV değerleriyle pozitif tam sayı hisse adedi girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Toplam Maliyet</span><strong>{fmt(cost)}</strong></div>
            <div><span className="calc-result-lbl">Toplam Komisyon</span><strong>{fmt(fees)}</strong></div>
            <div><span className="calc-result-lbl">Komisyon BSMV'si</span><strong>{fmt(taxAmount)}</strong></div>
            <div><span className="calc-result-lbl">Net Kâr / Zarar</span><strong className="calc-out">{fmt(pnl)}</strong></div>
            <div><span className="calc-result-lbl">Getiri</span><strong>%{pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Komisyon hem alışta hem satışta işlem tutarı üzerinden binde olarak uygulanır; BSMV komisyon üzerinden hesaplanır. Varsayılan %5 oranı değişebilir, kurumunuzun güncel tarifesini girin. Saklama ve diğer masraflar dahil değildir.</p>
    </div>
  );
}
