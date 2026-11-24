import { NextResponse } from "next/server";
const CACHE_HEADERS = { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" };
const ERROR_HEADERS = { "Cache-Control": "no-store" };
const STALE_CACHE_MAX_AGE_MS = 6 * 60_000;

interface CachedCoin {
  id: string;
  source: "CoinGecko";
  last_updated: string | null;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  sparkline_in_7d: { price: number[] };
}

let lastGood: { coins: CachedCoin[]; fetchedAt: number } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function safeImageUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function staleResponse(): NextResponse | null {
  if (!lastGood || Date.now() - lastGood.fetchedAt > STALE_CACHE_MAX_AGE_MS) return null;
  const ageSeconds = Math.floor((Date.now() - lastGood.fetchedAt) / 1000);
  return NextResponse.json(lastGood.coins, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15",
      "X-Data-Stale": "true",
      "X-Data-Age-Seconds": String(ageSeconds),
    },
  });
}

function unavailable(status: 502 | 503, retryAfter?: string | null): NextResponse {
  const stale = staleResponse();
  if (stale) return stale;
  const retrySeconds = retryAfter && /^\d{1,4}$/.test(retryAfter) ? Number(retryAfter) : 0;
  return NextResponse.json([], {
    status,
    headers: {
      ...ERROR_HEADERS,
      ...(retrySeconds > 0 && retrySeconds <= 3600 ? { "Retry-After": String(retrySeconds) } : {}),
    },
  });
}

export async function GET() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&order=market_cap_desc&per_page=20&sparkline=true&price_change_percentage=24h", {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return unavailable(res.status === 429 ? 503 : 502, res.headers.get("retry-after"));
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return unavailable(502);
    const seenIds = new Set<string>();
    const coins = data.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const id = typeof entry.id === "string" ? entry.id.trim().slice(0, 80) : "";
      const symbol = typeof entry.symbol === "string" ? entry.symbol.trim().slice(0, 20) : "";
      const currentPrice = entry.current_price;
      if (!/^[a-z0-9_-]{1,80}$/i.test(id) || seenIds.has(id) || !symbol || typeof currentPrice !== "number" || !Number.isFinite(currentPrice) || currentPrice <= 0) return [];
      seenIds.add(id);
      const rawPct = entry.price_change_percentage_24h;
      const pct = typeof rawPct === "number" && Number.isFinite(rawPct) ? rawPct : null;
      const lastUpdated = typeof entry.last_updated === "string" && Number.isFinite(Date.parse(entry.last_updated))
        ? entry.last_updated
        : null;
      const sparkline = isRecord(entry.sparkline_in_7d) && Array.isArray(entry.sparkline_in_7d.price)
        ? entry.sparkline_in_7d.price.filter((price): price is number => typeof price === "number" && Number.isFinite(price) && price > 0).slice(-168)
        : [];
      return [{
        id,
        source: "CoinGecko",
        last_updated: lastUpdated,
        symbol,
        name: typeof entry.name === "string" ? entry.name.slice(0, 100) : symbol.toUpperCase(),
        image: safeImageUrl(entry.image),
        current_price: currentPrice,
        price_change_percentage_24h: pct,
        sparkline_in_7d: { price: sparkline },
      }];
    }).slice(0, 20) as CachedCoin[];
    if (!coins.length) return unavailable(502);
    lastGood = { coins, fetchedAt: Date.now() };
    return NextResponse.json(coins, { headers: CACHE_HEADERS });
  } catch {
    return unavailable(503);
  }
}
