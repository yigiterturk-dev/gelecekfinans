"use client";
import { useEffect, useState } from "react";
import Select from "@/components/Select";

/**
 * Altın hesaplama: tür + adet/gram → güncel TL değeri.
 * Canlı fiyatları /api/altin uçundan alır. Saf client hesap, girişler doğrulanır.
 */
interface GoldMap {
  [type: string]: { price: number } | null;
}

const TYPES = [
  { key: "gram-altin", label: "Gram Altın", unit: "gram" },
  { key: "ceyrek-altin", label: "Çeyrek Altın", unit: "adet" },
  { key: "cumhuriyet-altini", label: "Cumhuriyet Altını", unit: "adet" },
  { key: "ons", label: "Ons Altın", unit: "ons" },
];

const TYPE_OPTIONS = TYPES.map((type) => ({ value: type.key, label: type.label }));

export default function GoldCalculator() {
  const [prices, setPrices] = useState<GoldMap>({});
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState("gram-altin");
  const [qty, setQty] = useState("10");

  useEffect(() => {
    let active = true;
    fetch("/api/altin")
      .then((r) => r.json())
      .then((d: GoldMap) => { if (active) { setPrices(d); setLoaded(true); } })
      .catch(() => setLoaded(true));
    return () => { active = false; };
  }, []);

  const n = parseFloat(qty.replace(",", "."));
  const valid = !isNaN(n) && n >= 0 && isFinite(n);
  const unit = TYPES.find((t) => t.key === type)?.unit ?? "adet";
  const unitPrice = prices[type]?.price ?? null;
  const total = valid && unitPrice != null ? n * unitPrice : null;

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>Altın Türü</span>
          <Select value={type} onChange={setType} options={TYPE_OPTIONS} ariaLabel="Altın türü" />
        </label>
        <label className="calc-field">
          <span>Miktar ({unit})</span>
          <input type="number" inputMode="decimal" min={0} step="any" value={qty}
            onChange={(e) => setQty(e.target.value)} aria-label="Altın miktarı" />
        </label>
      </div>
      <div className="calc-result" aria-live="polite">
        {!loaded ? (
          <span className="conv-muted">Fiyatlar yükleniyor…</span>
        ) : unitPrice == null ? (
          <span className="conv-muted">Altın fiyatı verisi alınamadı, lütfen daha sonra tekrar deneyin.</span>
        ) : !valid ? (
          <span className="conv-muted">Geçerli bir miktar girin.</span>
        ) : (
          <>
            <span className="calc-result-lbl">Toplam Değer</span>
            <strong className="calc-out">
              ₺{total!.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span className="conv-muted">
              Birim: ₺{unitPrice.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </>
        )}
      </div>
      <p className="conv-note">Hesaplama uluslararası ons altın fiyatından türetilmiştir; kapalıçarşı ve banka fiyatlarından farklılık gösterebilir.</p>
    </div>
  );
}
