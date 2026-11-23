"use client";
import { useState } from "react";
import { YIL_2026, brutNetYil, netBrut } from "@/lib/maas";

/**
 * Brüt ↔ net maaş, 2026 (özel sektör, normal işçi, teşviksiz, bekar/çocuksuz ayrımı yok —
 * AGİ 2022'den beri yok, asgari ücret istisnası herkese aynı).
 */
const AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => {
  const value = s.trim().replace(/\s/g, "");
  if (!value) return NaN;

  // Türkçe binlik noktası ve ondalık virgülünü, ayrıca ondalık nokta girişini kabul et.
  if (value.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(value)) return NaN;
    return Number(value.replace(/\./g, "").replace(",", "."));
  }
  if (value.includes(".")) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ""));
    if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return NaN;
  }
  return /^\d+$/.test(value) ? Number(value) : NaN;
};

export default function SalaryCalculator() {
  const [mode, setMode] = useState<"brut" | "net">("brut");
  const [amount, setAmount] = useState("50000");
  const v = num(amount);
  const valid = isFinite(v) && v >= (mode === "brut" ? YIL_2026.asgariBrut : 28_075.5) && v < 10_000_000;
  const brut = valid ? (mode === "brut" ? v : netBrut(v)) : 0;
  const yil = valid ? brutNetYil(brut) : [];
  const yillikNet = yil.reduce((s, a) => s + a.net, 0);

  return (
    <div className="calc-box">
      <div className="market-chips" role="group" aria-label="Hesap yönü" style={{ marginBottom: 12 }}>
        {(["brut", "net"] as const).map((m) => (
          <button key={m} type="button" className="market-chip" aria-pressed={m === mode}
            style={m === mode ? { fontWeight: 700, outline: "2px solid currentColor" } : undefined}
            onClick={() => setMode(m)}>{m === "brut" ? "Brütten Nete" : "Netten Brüte"}</button>
        ))}
      </div>
      <div className="calc-row">
        <label className="calc-field">
          <span>{mode === "brut" ? "Aylık Brüt Maaş (₺)" : "Ocak Ayı Net Maaş (₺)"}</span>
          <input type="text" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)} aria-label={mode === "brut" ? "Aylık brüt maaş" : "Aylık net maaş"} />
        </label>
      </div>
      <div className="calc-result calc-result-grid" aria-live="polite">
        {!valid ? (
          <span className="conv-muted">
            Asgari ücretin (brüt {fmt(YIL_2026.asgariBrut)}, net ₺28.075,50) üzerinde bir tutar girin.
          </span>
        ) : (
          <>
            <div><span className="calc-result-lbl">Brüt Maaş</span><strong>{fmt(brut)}</strong></div>
            <div><span className="calc-result-lbl">Ocak Net</span><strong className="calc-out">{fmt(yil[0].net)}</strong></div>
            <div><span className="calc-result-lbl">Aralık Net</span><strong>{fmt(yil[11].net)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Ortalama Net</span><strong>{fmt(yillikNet / 12)}</strong></div>
            <div><span className="calc-result-lbl">İşverene Maliyet (Aylık)</span><strong>{fmt(yil[0].isverenMaliyet)}</strong></div>
          </>
        )}
      </div>
      {valid && (
        <div className="crypto-table-wrap" style={{ marginTop: 16 }}>
          <table className="crypto-table">
            <thead>
              <tr><th>Ay</th><th>SGK + İşsizlik</th><th>Gelir Vergisi</th><th>Damga V.</th><th>Net</th><th title="Ay sonu kümülatif gelir vergisi matrahının ulaştığı marjinal oran">Ay Sonu Dilimi</th></tr>
            </thead>
            <tbody>
              {yil.map((a) => (
                <tr key={a.ay}>
                  <td>{AYLAR[a.ay - 1]}</td>
                  <td>{fmt(a.sgk + a.issizlik)}</td>
                  <td>{fmt(a.gelirVergisi)}</td>
                  <td>{fmt(a.damga)}</td>
                  <td><strong>{fmt(a.net)}</strong></td>
                  <td>%{Math.round(a.vergiOrani * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="conv-note">
        Maaşı Türkçe biçimde (50.000,50) veya ondalık noktayla (50000.50) girebilirsiniz.{" "}
        2026 ücret vergisi dilimleri için <a href="https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-tarifeleri%2Fgelir-vergisi-tarifesi-2026.pdf" target="_blank" rel="noopener noreferrer">GİB 2026 tarifesi</a>,
        asgari ücret ve işveren maliyeti için <a href="https://www.csgb.gov.tr/poco-pages/asgari-ucret/" target="_blank" rel="noopener noreferrer">Çalışma Bakanlığı 2026 tablosu</a> esas alınır. Hesaplamada asgari ücret istisnası, SGK işçi payı %14, işsizlik %1, damga vergisi binde 7,59 ve prime esas kazanç tavanı {fmt(YIL_2026.sgkTavan)} kullanılır.
        Özel sektörde teşviksiz normal işçi içindir; engelli indirimi, BES kesintisi, ikramiye ve yan haklar dahil değildir.
        Tablodaki ay sonu dilimi, kümülatif matrahın ulaştığı marjinal oranı gösterir; o ayın tüm matrahına tek oran uygulanmaz.
        Netten brüte hesap ocak ayı netine göre yapılır. 2027 asgari ücreti ve vergi dilimleri açıklandığında araç güncellenir.
      </p>
    </div>
  );
}
