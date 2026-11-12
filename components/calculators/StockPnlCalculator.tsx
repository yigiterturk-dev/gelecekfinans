"use client";
import { useState } from "react";

/**
 * Hisse kâr/zarar hesaplayıcı: alış-satış fiyatı, adet ve komisyon (binde).
 * Saf client, bağımlılıksız.
 */
export default function StockPnlCalculator() {
  const [buy, setBuy] = useState("100");
  const [sell, setSell] = useState("120");
  const [qty, setQty] = useState("100");
  const [fee, setFee] = useState("1"); // binde, alış ve satışta ayrı ayrı

  const b = parseFloat(buy.replace(",", "."));
  const s = parseFloat(sell.replace(",", "."));
  const q = parseFloat(qty.replace(",", "."));
  const f = parseFloat(fee.replace(",", ".")) / 1000;
  const valid = [b, s, q, f].every(isFinite) && b > 0 && s > 0 && q > 0 && f >= 0 && f < 0.1;

  let cost = 0, proceeds = 0, pnl = 0, pct = 0, fees = 0;
  if (valid) {
    const buyVal = b * q;
    const sellVal = s * q;
    fees = (buyVal + sellVal) * f;
    cost = buyVal + buyVal * f;
    proceeds = sellVal - sellVal * f;
    pnl = proceeds - cost;
    pct = (pnl / cost) * 100;
  }
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
          <input type="number" inputMode="decimal" min={0} step="any" value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Hisse adedi" />
        </label>
        <label className="calc-field">
          <span>Komisyon (binde)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={fee}
            onChange={(e) => setFee(e.target.value)} aria-label="Komisyon binde" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Alış, satış, adet ve komisyon için geçerli değerler girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Toplam Maliyet</span><strong>{fmt(cost)}</strong></div>
            <div><span className="calc-result-lbl">Toplam Komisyon</span><strong>{fmt(fees)}</strong></div>
            <div><span className="calc-result-lbl">Net Kâr / Zarar</span><strong className="calc-out">{fmt(pnl)}</strong></div>
            <div><span className="calc-result-lbl">Getiri</span><strong>%{pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">Komisyon hem alışta hem satışta, işlem tutarı üzerinden binde olarak uygulanır. BSMV ve diğer masraflar ayrıca hesaba katılmaz; kurumunuzun tarifesine bakın.</p>
    </div>
  );
}
