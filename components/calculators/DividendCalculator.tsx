"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/** Temettü: adet, hisse başına brüt temettü, stopaj, hisse fiyatı (verim için). */
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = parseDecimalInput;

export default function DividendCalculator() {
  const [qty, setQty] = useState("1000");
  const [dps, setDps] = useState("2");
  const [price, setPrice] = useState("50");
  const [tax, setTax] = useState("15");
  const q = num(qty), d = num(dps), pr = num(price), t = num(tax) / 100;
  const gross = q * d;
  const yieldPercent = (d / pr) * 100;
  const valid = [q, d, pr, t, gross, yieldPercent].every(Number.isFinite) && Number.isSafeInteger(q) &&
    q > 0 && d >= 0 && pr > 0 && t >= 0 && t < 1;
  const calculatedGross = valid ? gross : 0;
  const stopaj = calculatedGross * t;
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Hisse Adedi</span>
          <input type="number" inputMode="numeric" min={1} step={1} value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Hisse adedi" />
        </label>
        <label className="calc-field">
          <span>Hisse Başına Yıllık Brüt Temettü (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={dps}
            onChange={(e) => setDps(e.target.value)} aria-label="Hisse başına yıllık brüt temettü" />
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
          <span className="conv-muted">Pozitif tam sayı hisse adedi ile geçerli fiyat ve oranları girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Brüt Temettü</span><strong>{fmt(calculatedGross)}</strong></div>
            <div><span className="calc-result-lbl">Stopaj</span><strong>{fmt(stopaj)}</strong></div>
            <div><span className="calc-result-lbl">Net Temettü</span><strong className="calc-out">{fmt(calculatedGross - stopaj)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Brüt Temettü Verimi</span><strong>%{yieldPercent.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">
        Hisse yılda birden fazla ödeme yapıyorsa hisse başı brüt tutarları toplayıp yıllık toplamı girin. Varsayılan %15, GVK 94 kapsamındaki genel tevkifat oranıdır; alıcının mükellefiyetine ve kurumun türüne göre
        oran veya beyan durumu değişebilir. <a href="https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-kanununun-94uncu-maddesinde-yer-alan-kesinti-oranlari.pdf" target="_blank" rel="noopener noreferrer">GİB güncel kesinti oranlarını</a> ve kendi durumunuzu kontrol edin. Temettü verimi, yıllık brüt temettünün girilen hisse fiyatına oranıdır. Bu araç bilgilendirme amaçlıdır; yatırım veya vergi tavsiyesi değildir.
      </p>
    </div>
  );
}
