"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Sparkline from "./Sparkline";

/**
 * KOMPAKT PİYASA WIDGET'I (sağ ray) — CNBC/Reuters tarzı küçük "Piyasalar" listesi.
 *
 * Eski dev "CANLI PİYASA" board'unun (MarketBoard) ana sayfadaki yerini alır.
 * Aynı canlı veri uçlarını (/api/fiyatlar, /api/kripto) yeniden kullanır; ayrı
 * bir veri akışı kurmaz. Üst slim ticker (PriceBar) ile birlikte piyasa verisi
 * ARTIK İKİNCİL: tek satır şerit (üstte) + tek küçük widget (rayda), sayfayı
 * dolduran tablo yok. Haber lider.
 *
 * NOT: INLINE STYLE kullanır — Tailwind v4 utility üretimi bu projede güvenilmez
 * (çok-lockfile workspace-root + içerik taraması → sınıflar sessizce düşüyor →
 * "her şey dip dibe"). Inline style hiçbir CSS derleme/önbellek koşuluna bağlı
 * değil → boşluk/hizalama her zaman uygulanır. Renkler :root CSS değişkenlerinden.
 * Yükseklik rezerve edilir (sabit satır sayısı) → CLS yok.
 */

interface Fiyatlar {
  tcmb?: { usd?: { satis?: number }; eur?: { satis?: number } };
  gold?: { price?: number; pct?: number; sparkline?: number[] };
  bist?: { price?: number; pct?: number; sparkline?: number[] };
  btc?: { price?: number; pct?: number };
  usdHistory?: number[];
  usdPct?: number;
  eurHistory?: number[];
  eurPct?: number;
}
interface Coin {
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  sparkline_in_7d?: { price: number[] };
}
interface Row {
  name: string;
  sub: string;
  href: string;
  price?: number;
  pct?: number | null;
  prefix?: string;
  frac?: number;
  sparkline?: number[];
}

const mono = "var(--mono), ui-monospace, monospace";

function num(v: number, frac = 2) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

function Pct({ v }: { v: number | null | undefined }) {
  const s: CSSProperties = {
    fontFamily: mono,
    fontSize: 11.5,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    whiteSpace: "nowrap",
  };
  if (v == null) return <span style={{ ...s, color: "var(--muted)" }}>—</span>;
  const up = v >= 0;
  return (
    <span style={{ ...s, color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

export default function MarketMini() {
  const [f, setF] = useState<Fiyatlar>({});
  const [btc, setBtc] = useState<{ price?: number; pct?: number; sparkline?: number[] }>({});
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const go = async () => {
      try {
        const [marketResponse, cryptoResponse] = await Promise.all([
          fetch("/api/fiyatlar"),
          fetch("/api/kripto"),
        ]);
        const market = (await marketResponse.json()) as Fiyatlar;
        const coins = (await cryptoResponse.json()) as Coin[];
        setF(market);
        if (Array.isArray(coins)) {
          const b = coins.find((c) => c.symbol?.toLowerCase() === "btc");
          if (b) setBtc({ price: b.current_price, pct: b.price_change_percentage_24h, sparkline: b.sparkline_in_7d?.price });
        }
        setUpdatedAt(new Date());
      } catch {
        // Keep the last successful values visible if a provider is temporarily unavailable.
      } finally {
        setLoaded(true);
      }
    };
    go();
    const id = setInterval(go, 60000);
    return () => clearInterval(id);
  }, []);

  const rows: Row[] = [
    { name: "Dolar", sub: "USD/TRY", href: "/doviz/usd-try", price: f.tcmb?.usd?.satis, pct: f.usdPct, sparkline: f.usdHistory, prefix: "₺", frac: 4 },
    { name: "Euro", sub: "EUR/TRY", href: "/doviz/eur-try", price: f.tcmb?.eur?.satis, pct: f.eurPct, sparkline: f.eurHistory, prefix: "₺", frac: 4 },
    { name: "Gram Altın", sub: "24 ayar", href: "/altin/gram-altin", price: f.gold?.price, pct: f.gold?.pct, sparkline: f.gold?.sparkline, prefix: "₺", frac: 2 },
    { name: "Bitcoin", sub: "BTC/USD", href: "/kripto", price: btc.price ?? f.btc?.price, pct: btc.pct ?? f.btc?.pct, sparkline: btc.sparkline, prefix: "$", frac: 0 },
    { name: "BIST 100", sub: "Endeks", href: "/borsa", price: f.bist?.price, pct: f.bist?.pct, sparkline: f.bist?.sparkline, prefix: "", frac: 0 },
  ];

  return (
    <section
      aria-label="Piyasalar"
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--paper)",
        boxShadow: "0 1px 2px rgba(15,23,42,.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "13px 18px 12px",
          borderBottom: "1px solid var(--border2)",
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#15803d", display: "inline-block" }} />
        <span
          style={{
            fontFamily: mono,
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--accent)",
          }}
        >
          Piyasalar
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 9.5,
            letterSpacing: "0.04em",
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          {updatedAt ? `Son kontrol ${updatedAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "Veri bekleniyor"}
        </span>
      </div>

      <div style={{ padding: "4px 8px 6px" }}>
        {rows.map((r, i) => (
          <Link
            key={r.name}
            href={r.href}
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 80px 1fr",
              alignItems: "center",
              rowGap: 2,
              columnGap: 12,
              minHeight: 46,
              padding: "9px 10px",
              textDecoration: "none",
              borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                {r.name}
              </span>
              <span style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 500, letterSpacing: "0.04em", color: "var(--muted)" }}>
                {r.sub}
              </span>
            </span>
            <div style={{ width: 80, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loaded && r.sparkline && r.sparkline.length > 1 ? (
                <Sparkline data={r.sparkline} up={(r.pct ?? 0) >= 0} width={80} height={24} bare />
              ) : (
                <div style={{ fontFamily: mono, fontSize: 8, color: "var(--muted)", opacity: 0.4 }}>Yükleniyor...</div>
              )}
            </div>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 13,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: "var(--ink)",
                  whiteSpace: "nowrap",
                }}
              >
                {loaded && r.price != null ? `${r.prefix ?? "₺"}${num(r.price, r.frac ?? 2)}` : "—"}
              </span>
              <Pct v={loaded ? r.pct : undefined} />
            </span>
          </Link>
        ))}
      </div>

      <div style={{ display: "flex", borderTop: "1px solid var(--border2)" }}>
        {[
          { l: "Döviz", href: "/doviz" },
          { l: "Altın", href: "/altin" },
          { l: "Kripto", href: "/kripto" },
        ].map((x, i) => (
          <Link
            key={x.href}
            href={x.href}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "11px 6px",
              fontFamily: mono,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "var(--accent)",
              textDecoration: "none",
              borderLeft: i > 0 ? "1px solid var(--border)" : "none",
            }}
          >
            {x.l}
          </Link>
        ))}
      </div>
    </section>
  );
}
