import { BIST_STOCKS, BIST_INDEX_SLUG } from "./market";

/**
 * BIST temettü geçmişi (Yahoo chart ucu, events=div).
 *
 * Neden Yahoo: KAP'ın toplu kâr payı dosyası yok, Borsa İstanbul sitesi
 * bağlantıyı reddediyor (market.ts notu). Yahoo tutarları bedelsiz sermaye
 * artırımı/bölünmeye göre GERİYE DÖNÜK DÜZELTİLMİŞ verir: sayfa bunu açıkça
 * yazar, kesin brüt/net tutar için KAP'a yönlendirir. Tahmin YOK — yalnız
 * hak kullanım tarihi geçmiş dağıtımlar.
 *
 * Veri gelmezse hisse listeden düşer; sayfa boş satır basmaz.
 */
export interface Dividend { date: string; amount: number }
export interface StockDividends {
  slug: string;
  ticker: string;
  name: string;
  price: number;
  dividends: Dividend[];
  /** Son 365 günde dağıtılan toplam (düzeltilmiş, hisse başı TL). */
  trailing12: number;
  /** trailing12 / güncel fiyat * 100. Dağıtım yoksa 0. */
  yieldPct: number;
}

async function fetchDividends(ticker: string): Promise<{ price: number; dividends: Dividend[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(`${ticker}.IS`)}?range=3y&interval=1d&events=div`,
      {
        next: { revalidate: 43200 },
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; GelecekFinansBot/1.0)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: Array<{
        meta?: { regularMarketPrice?: number };
        events?: { dividends?: Record<string, { amount?: number; date?: number }> };
      }> };
    };
    const r = data.chart?.result?.[0];
    const price = r?.meta?.regularMarketPrice;
    if (typeof price !== "number" || !(price > 0)) return null;
    const dividends = Object.values(r?.events?.dividends ?? {})
      .filter((d): d is { amount: number; date: number } => typeof d.amount === "number" && d.amount > 0 && typeof d.date === "number")
      .map((d) => ({ date: new Date(d.date * 1000).toISOString().slice(0, 10), amount: d.amount }))
      .sort((a, b) => b.date.localeCompare(a.date));
    return { price, dividends };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAllDividends(now = new Date()): Promise<StockDividends[]> {
  const cutoff = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);
  const slugs = Object.keys(BIST_STOCKS).filter((s) => s !== BIST_INDEX_SLUG);
  const rows = await Promise.all(slugs.map(async (slug) => {
    const cfg = BIST_STOCKS[slug];
    const d = await fetchDividends(cfg.ticker);
    if (!d) return null;
    const trailing12 = d.dividends.filter((x) => x.date > cutoff).reduce((s, x) => s + x.amount, 0);
    return {
      slug,
      ticker: cfg.ticker,
      name: cfg.name,
      price: d.price,
      dividends: d.dividends,
      trailing12,
      yieldPct: trailing12 > 0 ? (trailing12 / d.price) * 100 : 0,
    } satisfies StockDividends;
  }));
  return rows.filter((r): r is StockDividends => r !== null);
}
