"use client";
import { useState } from "react";
import { parseDecimalInput } from "@/lib/parse-decimal-input";

/**
 * Mevduat (vadeli hesap) faiz hesaplayıcı. Brüt + stopaj sonrası net getiri.
 * Saf client, bağımlılıksız.
 */
export default function DepositCalculator() {
  const [principal, setPrincipal] = useState("100000");
  const [annualRate, setAnnualRate] = useState("45"); // yıllık brüt %
  const [days, setDays] = useState("32");
  const [tax, setTax] = useState("17.5"); // 32 günlük, yeni açılan TL vadeli hesap için genel oran

  const P = parseDecimalInput(principal);
  const ar = parseDecimalInput(annualRate) / 100;
  const d = Number(days);
  const t = parseDecimalInput(tax) / 100;
  const grossEstimate = P * ar * (d / 365);
  const netEstimate = P + grossEstimate * (1 - t);
  const valid =
    Number.isFinite(P) && P > 0 &&
    Number.isFinite(ar) && ar >= 0 &&
    Number.isInteger(d) && d > 0 && d <= 3650 &&
    Number.isFinite(t) && t >= 0 && t < 1 &&
    Number.isFinite(grossEstimate) && Number.isFinite(netEstimate);

  let gross: number | null = null;
  let taxAmt: number | null = null;
  let net: number | null = null;
  let netTotal: number | null = null;
  if (valid) {
    gross = grossEstimate;
    taxAmt = gross * t;
    net = gross - taxAmt;
    netTotal = P + net;
  }

  const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Anapara (₺)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={principal}
            onChange={(e) => setPrincipal(e.target.value)} aria-label="Anapara" />
        </label>
        <label className="calc-field">
          <span>Yıllık Faiz (%)</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)} aria-label="Yıllık brüt faiz" />
        </label>
        <label className="calc-field">
          <span>Vade (gün)</span>
          <input type="number" inputMode="numeric" min={1} max={3650} step={1} value={days}
            onChange={(e) => setDays(e.target.value)} aria-label="Vade gün" />
        </label>
        <label className="calc-field">
          <span>Stopaj (%)</span>
          <input type="number" inputMode="decimal" min={0} max={99} step="any" value={tax}
            onChange={(e) => setTax(e.target.value)} aria-label="Stopaj oranı" />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">Anapara, faiz, vade ve stopaj için geçerli değerler girin.</span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Brüt Faiz</span><strong>{fmt(gross!)}</strong></div>
            <div><span className="calc-result-lbl">Stopaj Kesintisi</span><strong>{fmt(taxAmt!)}</strong></div>
            <div><span className="calc-result-lbl">Net Faiz</span><strong className="calc-out">{fmt(net!)}</strong></div>
            <div><span className="calc-result-lbl">Vade Sonu Toplam</span><strong>{fmt(netTotal!)}</strong></div>
          </>
        )}
      </div>
      <p className="conv-note">
        Basit faiz yöntemiyle (yıllık 365 gün) hesaplanır. Stopaj oranı vade değişince otomatik değişmez: varsayılan
        %17,5, 9 Temmuz 2025&apos;ten sonra açılan veya yenilenen 32 günlük TL hesap örneğine göredir. Aynı tarihten sonra
        açılan veya yenilenen genel TL mevduatta stopaj 6 aya kadar %17,5, 1 yıla kadar %15 ve 1 yıldan uzun vadede
        %10&apos;dur. Vade, açılış tarihi, para birimi veya hesap türü farklıysa Stopaj (%) alanını bankanızdan teyit ettiğiniz
        oranla güncelleyin. Ayrıntı
        için <a href="https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Ffileadmin%2Fbeyannamerehberi%2F2026%2F2026_Gecici67.pdf" target="_blank" rel="noopener noreferrer">GİB mevduat stopajı rehberine</a> bakın.
      </p>
    </div>
  );
}
