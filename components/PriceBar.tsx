"use client";
import { useEffect, useState } from "react";

interface Prices {
  tcmb?: { usd?: { satis?: number }; eur?: { satis?: number }; gbp?: { satis?: number } };
  gold?: { price?: number; pct?: number | null };
  bist?: { price?: number; pct?: number | null };
  btc?: { price?: number; pct?: number | null };
}
interface PriceItem { l: string; v?: number; pct?: number | null; raw?: boolean }

export default function PriceBar() {
  const [p, setP] = useState<Prices>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const go = async () => {
      controller = new AbortController();
      try {
        const response = await fetch("/api/fiyatlar", { signal: controller.signal });
        if (!response.ok) throw new Error("Piyasa fiyatı isteği başarısız");
        const data: unknown = await response.json();
        if (!active) return;
        setP(data && typeof data === "object" && !Array.isArray(data) ? data as Prices : {});
      } catch {
        // Eski fiyatlar varsa koru; ilk istekte yükleme durumunu kapat.
      } finally {
        if (active) {
          setLoading(false);
          timer = setTimeout(() => void go(), 60_000);
        }
      }
    };
    void go();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, []);

  const items: PriceItem[] = [
    { l: "DOLAR",    v: p.tcmb?.usd?.satis },
    { l: "EURO",     v: p.tcmb?.eur?.satis },
    { l: "POUND",    v: p.tcmb?.gbp?.satis },
    { l: "ALTIN",    v: p.gold?.price, pct: p.gold?.pct },
    { l: "BIST 100", v: p.bist?.price, pct: p.bist?.pct, raw: true },
    { l: "BTC",      v: p.btc?.price,  pct: p.btc?.pct },
  ].map((item) => ({
    ...item,
    v: typeof item.v === "number" && Number.isFinite(item.v) && item.v > 0 ? item.v : undefined,
    pct: typeof item.pct === "number" && Number.isFinite(item.pct) ? item.pct : undefined,
  })).filter((item) => item.v !== undefined);

  if (loading) {
    return (
      <div className="pbar">
        <div className="pbar-scroll">
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", padding: "0 20px" }}>Fiyatlar yükleniyor…</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="pbar" role="status" aria-label="Piyasa fiyatları">
        <div className="pbar-scroll">
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", padding: "0 20px" }}>Piyasa verileri şu anda alınamıyor.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pbar">
      <div className="pbar-scroll">
        {items.map(i => {
          const trend = typeof i.pct !== "number" || i.pct === 0 ? "flat" : i.pct > 0 ? "up" : "dn";
          return (
            <div key={i.l} className="pbar-item">
              <span className="pbar-lbl">{i.l}</span>
              <span className="pbar-val">{!i.raw && "₺"}{i.v!.toLocaleString("tr-TR",{minimumFractionDigits:i.raw?0:2,maximumFractionDigits:2})}</span>
              {i.pct != null && (
                <span className={`pbar-${trend}`}>
                  {trend === "up" ? "▲ " : trend === "dn" ? "▼ " : ""}{Math.abs(i.pct).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
