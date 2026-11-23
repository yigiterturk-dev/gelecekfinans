"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

/**
 * "Piyasa Hareketleri" rayı — en çok yükselen / düşen kripto paralar.
 * CryptoTicker ile aynı uç noktayı (/api/kripto) yeniden kullanır; ayrı bir
 * veri akışı kurmaz. Yükseklik rezerve edilir → CLS yok.
 *
 * NOT: INLINE STYLE kullanır — Tailwind utility üretimi bu projede güvenilmez
 * çıktığı için (çok-lockfile workspace-root + v4 içerik taraması) gap/padding
 * sınıfları render'a yansımıyordu → "her şey dip dibe". Inline style hiçbir CSS
 * derleme koşuluna bağlı değil → boşluklar her zaman uygulanır.
 */
interface Coin {
  id: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  last_updated?: string | null;
}

type MovingCoin = Coin & { price_change_percentage_24h: number };

const mono = "var(--mono), ui-monospace, monospace";

function num(v: number) {
  return v >= 1000
    ? v.toLocaleString("tr-TR", { maximumFractionDigits: 0 })
    : v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MoverRow({ c, last }: { c: MovingCoin; last: boolean }) {
  const pct = c.price_change_percentage_24h;
  const up = pct >= 0;
  return (
    <Link
      href="/kripto"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto",
        alignItems: "center",
        gap: 12,
        minHeight: 40,
        padding: "11px 8px",
        textDecoration: "none",
        borderBottom: last ? "none" : "1px solid var(--border)",
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>
        {c.symbol?.toUpperCase()}
      </span>
      <span
        style={{
          fontFamily: mono,
          fontSize: 12.5,
          fontVariantNumeric: "tabular-nums",
          color: "var(--ink2)",
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        ₺{num(c.current_price)}
      </span>
      <span
        style={{
          minWidth: 62,
          textAlign: "right",
          fontFamily: mono,
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color: up ? "#15803d" : "#dc2626",
        }}
      >
        {up ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    </Link>
  );
}

function SkelGroup() {
  const bar: CSSProperties = {
    height: 14,
    borderRadius: 4,
    background: "var(--surface2)",
    display: "block",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 8px" }}>
      <span style={bar} />
      <span style={bar} />
      <span style={bar} />
    </div>
  );
}

const subLabel = (color: string): CSSProperties => ({
  fontFamily: mono,
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color,
  margin: "14px 8px 6px",
});

export default function MoversRail() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const go = async () => {
      controller = new AbortController();
      try {
        const response = await fetch("/api/kripto", { signal: controller.signal });
        if (!response.ok) throw new Error("Kripto fiyatı isteği başarısız");
        const data: unknown = await response.json();
        if (active && Array.isArray(data)) setCoins(data as Coin[]);
      } catch {
        // Son başarılı piyasa verisini koru ve hata sonrası tekrar dene.
      } finally {
        if (active) {
          setLoaded(true);
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

  const valid = coins.filter((c): c is MovingCoin =>
    typeof c.price_change_percentage_24h === "number" && Number.isFinite(c.price_change_percentage_24h)
  );
  const gainers = valid.filter((c) => c.price_change_percentage_24h > 0)
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 3);
  const losers = valid.filter((c) => c.price_change_percentage_24h < 0)
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 3);

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--paper)",
        boxShadow: "0 1px 2px rgba(15,23,42,.05)",
        padding: "16px 18px 12px",
      }}
    >
      <div
        style={{
          paddingBottom: 12,
          marginBottom: 4,
          borderBottom: "1px solid var(--border2)",
          fontFamily: mono,
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--accent)",
        }}
      >
        Piyasa Hareketleri
      </div>

      <div style={subLabel("#15803d")}>Yükselenler</div>
      {loaded && gainers.length ? (
        gainers.map((c, i) => <MoverRow key={c.id} c={c} last={i === gainers.length - 1} />)
      ) : loaded ? (
        <p role="status" style={{ margin: "8px", color: "var(--muted)", fontSize: 12 }}>Yükselen fiyat verisi yok.</p>
      ) : (
        <SkelGroup />
      )}

      <div style={subLabel("#dc2626")}>Düşenler</div>
      {loaded && losers.length ? (
        losers.map((c, i) => <MoverRow key={c.id} c={c} last={i === losers.length - 1} />)
      ) : loaded ? (
        <p role="status" style={{ margin: "8px", color: "var(--muted)", fontSize: 12 }}>Düşen fiyat verisi yok.</p>
      ) : (
        <SkelGroup />
      )}
      {loaded && coins.length > 0 && <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--border2)" }}><CoinGeckoAttribution /></div>}
    </div>
  );
}
