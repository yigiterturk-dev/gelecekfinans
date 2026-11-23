"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { TROY_OUNCE_GRAMS, ziynetGoldFineGrams } from "@/lib/gold-standards";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

/**
 * Yoğun, taranabilir PİYASA TABLOSU (Investing/Doviz tarzı).
 * Mevcut canlı veri uçlarını (/api/fiyatlar, /api/kripto) yeniden kullanır.
 *
 * NOT: Bu komponent INLINE STYLE kullanır — Tailwind utility üretimi bu projede
 * (Next çok-lockfile workspace-root + v4 içerik taraması) güvenilmez çıktığı için
 * board ham metin kalıyordu. Inline style hiçbir CSS derleme/önbellek koşuluna
 * bağlı değildir → her zaman render eder. Renkler :root CSS değişkenlerinden gelir.
 */

interface Fiyatlar {
  tcmb?: { usd?: { satis?: number }; eur?: { satis?: number }; gbp?: { satis?: number } };
  gold?: { price?: number; pct?: number | null };
  bist?: { price?: number; pct?: number | null };
  btc?: { price?: number; pct?: number | null };
}
interface Coin {
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}
interface Row {
  name: string;
  sub?: string;
  href: string;
  price?: number;
  pct?: number | null;
  prefix?: string;
  frac?: number;
}

function num(v: number, frac = 2) {
  return v.toLocaleString("tr-TR", { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

const mono = "var(--font-mono, ui-monospace), monospace";

function Pct({ v }: { v: number | null | undefined }) {
  const s: CSSProperties = {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    whiteSpace: "nowrap",
  };
  if (v == null) return <span style={{ ...s, color: "var(--muted)" }}>—</span>;
  const up = v >= 0;
  return (
    <span style={{ ...s, color: up ? "#15803d" : "#dc2626" }}>
      {up ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

function Table({ rows, all }: { rows: Row[]; all: { l: string; href: string } }) {
  return (
    <div style={{ padding: "2px 6px 6px" }}>
      {rows.map((r, i) => (
        <Link
          key={r.name + i}
          href={r.href}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            alignItems: "center",
            gap: 10,
            minHeight: 44,
            padding: "9px 12px",
            textDecoration: "none",
            borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
          }}
        >
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
              {r.name}
            </span>
            {r.sub && (
              <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: "var(--muted)" }}>{r.sub}</span>
            )}
          </span>
          <span
            style={{
              fontFamily: mono,
              fontSize: 13.5,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              color: "var(--ink)",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            {r.price != null ? `${r.prefix ?? "₺"}${num(r.price, r.frac ?? 2)}` : "—"}
          </span>
          <span style={{ minWidth: 64, textAlign: "right" }}>
            <Pct v={r.pct} />
          </span>
        </Link>
      ))}
      <Link
        href={all.href}
        style={{
          display: "block",
          padding: "10px 10px 6px",
          fontFamily: mono,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.04em",
          color: "var(--accent)",
          textDecoration: "none",
        }}
      >
        {all.l} →
      </Link>
    </div>
  );
}

const colWrap: CSSProperties = {
  flex: "1 1 240px",
  minWidth: 220,
  borderRight: "1px solid var(--border)",
};
const colTitle: CSSProperties = {
  padding: "12px 18px 6px",
  fontFamily: mono,
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  color: "var(--muted)",
};

export default function MarketBoard() {
  const [f, setF] = useState<Fiyatlar>({});
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const go = () => {
      fetch("/api/fiyatlar")
        .then((r) => r.json())
        .then((d: Fiyatlar) => setF(d))
        .catch(() => {})
        .finally(() => setLoaded(true));
      fetch("/api/kripto")
        .then((r) => r.json())
        .then((d: Coin[]) => Array.isArray(d) && setCoins(d))
        .catch(() => {});
    };
    go();
    const id = setInterval(go, 60000);
    return () => clearInterval(id);
  }, []);

  const doviz: Row[] = [
    { name: "Dolar", sub: "USD/TRY", href: "/doviz/usd-try", price: f.tcmb?.usd?.satis, prefix: "₺", frac: 4 },
    { name: "Euro", sub: "EUR/TRY", href: "/doviz/eur-try", price: f.tcmb?.eur?.satis, prefix: "₺", frac: 4 },
    { name: "Sterlin", sub: "GBP/TRY", href: "/doviz/gbp-try", price: f.tcmb?.gbp?.satis, prefix: "₺", frac: 4 },
    { name: "BIST 100", sub: "Endeks", href: "/doviz", price: f.bist?.price, pct: f.bist?.pct, prefix: "", frac: 0 },
  ];
  const altin: Row[] = [
    { name: "Gram Altın", sub: "24 ayar", href: "/altin/gram-altin", price: f.gold?.price, pct: f.gold?.pct },
    { name: "Çeyrek Altın", sub: "22 ayar metal", href: "/altin/ceyrek-altin", price: f.gold?.price ? f.gold.price * ziynetGoldFineGrams("quarter") : undefined, pct: f.gold?.pct },
    { name: "Yarım Altın", sub: "22 ayar metal", href: "/altin/yarim-altin", price: f.gold?.price ? f.gold.price * ziynetGoldFineGrams("half") : undefined, pct: f.gold?.pct },
    { name: "Cumhuriyet", sub: "Tam · 22 ayar metal", href: "/altin/cumhuriyet-altini", price: f.gold?.price ? f.gold.price * ziynetGoldFineGrams("full") : undefined, pct: f.gold?.pct },
    { name: "Ons Altın", sub: "31.1 g", href: "/altin/ons", price: f.gold?.price ? f.gold.price * TROY_OUNCE_GRAMS : undefined, pct: f.gold?.pct, frac: 0 },
  ];
  const kripto: Row[] = coins.slice(0, 4).map((c) => ({
    name: c.symbol?.toUpperCase() ?? "",
    href: "/kripto",
    price: c.current_price,
    pct: c.price_change_percentage_24h,
    frac: c.current_price >= 1000 ? 0 : 2,
  }));
  if (!kripto.length) {
    kripto.push({ name: "Bitcoin", sub: "BTC", href: "/kripto", price: f.btc?.price, pct: f.btc?.pct, frac: 0 });
  }

  const skeleton: Row[] = [
    { name: "—", href: "#" },
    { name: "—", href: "#" },
    { name: "—", href: "#" },
    { name: "—", href: "#" },
  ];

  return (
    <section
      aria-label="Canlı piyasa verileri"
      style={{
        margin: "24px 0 36px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--bg)",
        boxShadow: "0 1px 2px rgba(15,23,42,.05)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 14,
          padding: "10px 18px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--accent-ink)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#15803d", display: "inline-block" }} />
          Canlı Piyasa
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: "0.04em",
            color: "var(--muted)",
          }}
        >
          60 sn’de bir güncellenir
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={colWrap}>
          <div style={colTitle}>Döviz Kurları</div>
          <Table rows={loaded ? doviz : skeleton} all={{ l: "Tüm döviz kurları", href: "/doviz" }} />
        </div>
        <div style={colWrap}>
          <div style={colTitle}>Altın Fiyatları</div>
          <Table rows={loaded ? altin : skeleton} all={{ l: "Tüm altın fiyatları", href: "/altin" }} />
        </div>
        <div style={{ ...colWrap, borderRight: "none" }}>
          <div style={colTitle}>Kripto Para</div>
          <Table rows={loaded ? kripto : skeleton} all={{ l: "Tüm kripto fiyatları", href: "/kripto" }} />
        </div>
      </div>
      <p style={{ margin: "0 18px 12px", fontSize: 11, color: "var(--muted)" }}>
        Çeyrek ve tam altın tutarları Darphane ziynet ağırlığı ve 22 ayar saflıkla hesaplanan yaklaşık metal değeridir; fiziki piyasa fiyatı değildir.
      </p>
      {loaded && kripto.length > 0 && (
        <p style={{ margin: "0 18px 12px", textAlign: "right" }}><CoinGeckoAttribution /></p>
      )}
    </section>
  );
}
