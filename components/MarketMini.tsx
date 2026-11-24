"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import Sparkline from "./Sparkline";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

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
  tcmb?: { source?: string; usd?: { satis?: number }; eur?: { satis?: number } };
  gold?: { price?: number; pct?: number | null; sparkline?: number[] };
  bist?: { price?: number; pct?: number | null; sparkline?: number[]; source?: string; updatedAt?: string | null };
  btc?: { price?: number; pct?: number | null; updatedAt?: string | null };
}
interface Coin {
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  last_updated?: string | null;
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
  checkedAt?: Date | null;
}

const mono = "var(--mono), ui-monospace, monospace";
const SOURCE_STALE_AFTER_MS = 6 * 60_000;

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
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return <span style={{ ...s, color: "var(--muted)" }}>—</span>;
  }
  if (v === 0) {
    return <span aria-label="Değişim yok" style={{ ...s, color: "var(--muted)" }}>0.00%</span>;
  }
  const up = v > 0;
  return (
    <span style={{ ...s, color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "▲" : "▼"} {Math.abs(v).toFixed(2)}%
    </span>
  );
}

export default function MarketMini() {
  const [f, setF] = useState<Fiyatlar>({});
  const [btc, setBtc] = useState<{ price?: number; pct?: number | null; sparkline?: number[] }>({});
  const [loaded, setLoaded] = useState(false);
  const [marketCheckedAt, setMarketCheckedAt] = useState<Date | null>(null);
  const [cryptoCheckedAt, setCryptoCheckedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let requestTimeout: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const go = async () => {
      const activeController = new AbortController();
      controller = activeController;
      const signal = activeController.signal;
      requestTimeout = setTimeout(() => activeController.abort(), 15_000);
      const [marketResult, cryptoResult] = await Promise.allSettled([
        fetch("/api/fiyatlar", { signal }).then(async (response) => {
          if (!response.ok) throw new Error("Market request failed");
          return response.json() as Promise<unknown>;
        }),
        fetch("/api/kripto", { signal }).then(async (response) => {
          if (!response.ok) throw new Error("Crypto request failed");
          return response.json() as Promise<unknown>;
        }),
      ]);
      if (requestTimeout) clearTimeout(requestTimeout);
      requestTimeout = undefined;
      if (cancelled) return;

      if (marketResult.status === "fulfilled") {
        const market = marketResult.value;
        if (market && typeof market === "object" && !Array.isArray(market)) {
          setF(market as Fiyatlar);
          const marketPrices = market as Fiyatlar;
          const hasMarketPrice = [
            marketPrices.tcmb?.usd?.satis,
            marketPrices.tcmb?.eur?.satis,
            marketPrices.gold?.price,
            marketPrices.bist?.price,
            marketPrices.btc?.price,
          ].some((price) => typeof price === "number" && Number.isFinite(price) && price > 0);
          if (hasMarketPrice) setMarketCheckedAt(new Date());
          if (marketPrices.btc?.updatedAt && Number.isFinite(Date.parse(marketPrices.btc.updatedAt))) {
            setCryptoCheckedAt(new Date(marketPrices.btc.updatedAt));
          }
        }
      }
      if (cryptoResult.status === "fulfilled" && Array.isArray(cryptoResult.value)) {
        const coins = cryptoResult.value as Coin[];
        const bitcoin = coins.find((coin) => coin?.symbol?.toLowerCase() === "btc");
        if (bitcoin && Number.isFinite(bitcoin.current_price) && bitcoin.current_price > 0) {
          setBtc({
            price: bitcoin.current_price,
            pct: bitcoin.price_change_percentage_24h,
            sparkline: bitcoin.sparkline_in_7d?.price,
          });
          setCryptoCheckedAt(
            typeof bitcoin.last_updated === "string" && Number.isFinite(Date.parse(bitcoin.last_updated))
              ? new Date(bitcoin.last_updated)
              : null,
          );
        }
      }
      setNow(Date.now());
      setLoaded(true);
      // Sabit interval yerine tur tamamlandıktan sonra bekle; yavaş istekler üst üste binmez.
      timer = setTimeout(() => void go(), 60_000);
    };
    void go();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (requestTimeout) clearTimeout(requestTimeout);
      controller?.abort();
    };
  }, []);

  const rows: Row[] = [
    { name: "Dolar", sub: "USD/TRY", href: "/doviz/usd-try", price: f.tcmb?.usd?.satis, prefix: "₺", frac: 4, checkedAt: marketCheckedAt },
    { name: "Euro", sub: "EUR/TRY", href: "/doviz/eur-try", price: f.tcmb?.eur?.satis, prefix: "₺", frac: 4, checkedAt: marketCheckedAt },
    { name: "Gram Altın", sub: "24 ayar", href: "/altin/gram-altin", price: f.gold?.price, pct: f.gold?.pct, sparkline: f.gold?.sparkline, prefix: "₺", frac: 2, checkedAt: marketCheckedAt },
    { name: "Bitcoin", sub: "BTC/TRY", href: "/kripto", price: btc.price ?? f.btc?.price, pct: btc.pct ?? f.btc?.pct, sparkline: btc.sparkline, prefix: "₺", frac: 0, checkedAt: btc.price != null ? cryptoCheckedAt : marketCheckedAt },
    { name: "BIST 100", sub: "Endeks", href: "/borsa", price: f.bist?.price, pct: f.bist?.pct, sparkline: f.bist?.sparkline, prefix: "", frac: 0, checkedAt: marketCheckedAt },
  ];
  const pricedRows = rows.filter((row) => typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0);
  const hasPrice = pricedRows.length > 0;
  const missingPrices = pricedRows.length < rows.length;
  const staleData = pricedRows.some((row) => !row.checkedAt || now - row.checkedAt.getTime() > SOURCE_STALE_AFTER_MS);
  const statusColor = !loaded || (hasPrice && (staleData || missingPrices)) ? "#d97706" : hasPrice ? "#15803d" : "#dc2626";
  const statusText = !loaded
    ? "Veri yükleniyor"
    : !hasPrice
      ? "Veri alınamadı"
      : staleData && missingPrices
        ? "Bazı fiyatlar eksik veya gecikti"
        : staleData
          ? "Bazı yanıtlar gecikti"
          : missingPrices
            ? "Bazı fiyatlar alınamadı"
            : "Yakın zamanda veri alındı";
  const hasBitcoinPrice =
    (typeof btc.price === "number" && Number.isFinite(btc.price) && btc.price > 0) ||
    (typeof f.btc?.price === "number" && Number.isFinite(f.btc.price) && f.btc.price > 0);

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
        <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
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
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            marginLeft: "auto",
            fontFamily: mono,
            fontSize: 9.5,
            letterSpacing: "0.04em",
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          {statusText}
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
              {!loaded ? (
                <div style={{ fontFamily: mono, fontSize: 8, color: "var(--muted)", opacity: 0.4 }}>Yükleniyor...</div>
              ) : r.sparkline && r.sparkline.length > 1 ? (
                <Sparkline data={r.sparkline} up={(r.pct ?? 0) >= 0} width={80} height={24} bare />
              ) : (
                <span aria-label={`${r.name} için grafik verisi bulunmuyor`} style={{ fontFamily: mono, fontSize: 9, color: "var(--muted)" }}>Grafik yok</span>
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
      {hasBitcoinPrice && (
        <div style={{ padding: "0 12px 10px", textAlign: "right" }}><CoinGeckoAttribution /></div>
      )}
    </section>
  );
}
