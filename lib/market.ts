/**
 * Piyasa verisi katmanı — ücretsiz / anahtarsız kaynaklar.
 *
 * Tüm fetch'ler savunmacı: timeout, try/catch, Next `revalidate` ile önbellek,
 * dürüst "veri alınamadı" geri dönüşü. Hiçbir fonksiyon throw etmez; başarısızlıkta
 * `null` döner. Sayfalar bu null'a göre CLS-güvenli "veri alınamadı" gösterir.
 *
 * Kaynaklar:
 *  - Döviz: open.er-api.com (anahtarsız, USD bazlı kurlar)
 *  - Kripto: CoinGecko public API (TL fiyatları + 7g sparkline)
 *  - Altın: ons altın USD (Yahoo GC=F) × USDTRY → gram/çeyrek/cumhuriyet TL
 *  - Faiz: TCMB politika faizi (statik, manuel güncellenir — sadece bilgi amaçlı)
 */

const TROY_OUNCE_GRAMS = 31.1035;

/** Verilen URL'i timeout + savunmacı şekilde fetch eder. Hata/timeout → null. */
async function safeFetch<T>(
  url: string,
  revalidate: number,
  timeoutMs = 6000,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      next: { revalidate },
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------------------------
 * DÖVİZ
 * ------------------------------------------------------------------------- */

export interface FxRate {
  rate: number; // 1 birim yabancı para = X TL
  prevRate: number | null; // önceki kapanış (değişim hesabı için)
  changeAbs: number | null;
  changePct: number | null;
  base: string; // "USD"
  quote: string; // "TRY"
  updatedAt: string | null;
}

export const FX_PAIRS: Record<
  string,
  { base: string; label: string; symbol: string; flag: string; long: string }
> = {
  "usd-try": { base: "USD", label: "Dolar", symbol: "$", flag: "🇺🇸", long: "Amerikan Doları" },
  "eur-try": { base: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺", long: "Euro" },
  "gbp-try": { base: "GBP", label: "Sterlin", symbol: "£", flag: "🇬🇧", long: "İngiliz Sterlini" },
};

interface ErApiResp {
  result?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
}

/**
 * Tek bir kaynakla (open.er-api.com) tüm pariteleri çeker.
 * USD bazlı tablodan TRY ve hedef para birimini türetir.
 */
async function getFxTable(): Promise<{
  rates: Record<string, number>;
  updatedAt: string | null;
} | null> {
  const data = await safeFetch<ErApiResp>(
    "https://open.er-api.com/v6/latest/USD",
    600, // 10 dk önbellek — ücretsiz API'yi yormamak için
  );
  if (!data || data.result !== "success" || !data.rates?.TRY) return null;
  return { rates: data.rates, updatedAt: data.time_last_update_utc ?? null };
}

/** Bir önceki günün kapanışını (open.er-api ücretsiz uçta yok) yaklaşık olarak
 *  exchangerate.host timeseries üzerinden dener. Başarısızsa null (değişim gizlenir). */
async function getFxPrevRate(base: string): Promise<number | null> {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const d = yesterday.toISOString().slice(0, 10);
  const data = await safeFetch<{ rates?: Record<string, number> }>(
    `https://api.exchangerate.host/${d}?base=${base}&symbols=TRY`,
    3600,
  );
  const r = data?.rates?.TRY;
  return typeof r === "number" && r > 0 ? r : null;
}

export async function getFx(pair: string): Promise<FxRate | null> {
  const cfg = FX_PAIRS[pair];
  if (!cfg) return null;
  const table = await getFxTable();
  if (!table) return null;

  const tryPerUsd = table.rates.TRY;
  let rate: number;
  if (cfg.base === "USD") {
    rate = tryPerUsd;
  } else {
    const basePerUsd = table.rates[cfg.base];
    if (!basePerUsd || basePerUsd <= 0) return null;
    // 1 BASE = (TRY/USD) / (BASE/USD) TL
    rate = tryPerUsd / basePerUsd;
  }
  rate = Math.round(rate * 10000) / 10000;

  const prevRate = await getFxPrevRate(cfg.base);
  const changeAbs = prevRate ? Math.round((rate - prevRate) * 10000) / 10000 : null;
  const changePct =
    prevRate && prevRate > 0 ? Math.round(((rate - prevRate) / prevRate) * 10000) / 100 : null;

  return {
    rate,
    prevRate,
    changeAbs,
    changePct,
    base: cfg.base,
    quote: "TRY",
    updatedAt: table.updatedAt,
  };
}

/** Tüm pariteleri tek tabloyla çeker (hub sayfası + çevirici için verimli). */
export async function getAllFx(): Promise<Record<string, FxRate | null>> {
  const table = await getFxTable();
  const out: Record<string, FxRate | null> = {};
  for (const key of Object.keys(FX_PAIRS)) {
    if (!table) {
      out[key] = null;
      continue;
    }
    const cfg = FX_PAIRS[key];
    const tryPerUsd = table.rates.TRY;
    let rate: number | null = null;
    if (cfg.base === "USD") rate = tryPerUsd;
    else {
      const basePerUsd = table.rates[cfg.base];
      if (basePerUsd && basePerUsd > 0) rate = tryPerUsd / basePerUsd;
    }
    if (rate == null) {
      out[key] = null;
      continue;
    }
    rate = Math.round(rate * 10000) / 10000;
    const prevRate = await getFxPrevRate(cfg.base);
    const changeAbs = prevRate ? Math.round((rate - prevRate) * 10000) / 10000 : null;
    const changePct =
      prevRate && prevRate > 0 ? Math.round(((rate - prevRate) / prevRate) * 10000) / 100 : null;
    out[key] = {
      rate,
      prevRate,
      changeAbs,
      changePct,
      base: cfg.base,
      quote: "TRY",
      updatedAt: table.updatedAt,
    };
  }
  return out;
}

/** Son ~30 günün kur geçmişini (sparkline için) exchangerate.host'tan çeker.
 *  Başarısız olursa null (grafik gizlenir, sayfa çalışır). */
export async function getFxHistory(base: string): Promise<number[] | null> {
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  const data = await safeFetch<{ rates?: Record<string, { TRY?: number }> }>(
    `https://api.exchangerate.host/timeseries?start_date=${s}&end_date=${e}&base=${base}&symbols=TRY`,
    3600,
  );
  if (!data?.rates) return null;
  const points = Object.keys(data.rates)
    .sort()
    .map((day) => data.rates![day]?.TRY)
    .filter((v): v is number => typeof v === "number" && v > 0);
  return points.length > 1 ? points : null;
}

/**
 * Yahoo Finance grafik uç noktasından günlük kapanış serisi.
 *
 * Neden Yahoo: BIST 100 için ücretsiz ve kimlik istemeyen tarihsel seri veren
 * başka kaynak bulunamadı — Borsa İstanbul'un kendi sitesi bağlantı reddediyor
 * (1 Eylül 2026 ölçümü). Uç nokta belgelenmiş değil; bu yüzden BOZULABİLİR ve
 * bozulduğunda `null` dönüp çağıran taraf markalı karta düşer, sayfa çalışmaya
 * devam eder. Sessiz yanlış veri riski yok: kapanış dizisi boşsa null.
 *
 * ⚠️ Tarayıcı kimliği ZORUNLU; User-Agent gönderilmezse Yahoo 429 döndürüyor.
 */
export async function getYahooCloseSeries(
  symbol: string,
  range = "1mo",
): Promise<number[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d`,
      {
        next: { revalidate: 3600 },
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; GelecekFinansBot/1.0)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
    };
    const closes = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes)) return null;
    const points = closes.filter((value): value is number => typeof value === "number" && value > 0);
    return points.length > 4 ? points : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** BIST 100 endeksinin son ~1 aylık günlük kapanışları. */
export async function getBistHistory(): Promise<number[] | null> {
  return getYahooCloseSeries("XU100.IS");
}

/** Ons altının (USD) son ~1 aylık günlük kapanışları. */
export async function getGoldUsdHistory(): Promise<number[] | null> {
  return getYahooCloseSeries("GC=F");
}

/* ----------------------------------------------------------------------------
 * ALTIN
 * ------------------------------------------------------------------------- */

export interface GoldPrice {
  type: string;
  price: number; // TL
  changePct: number | null;
  updatedAt: string | null;
}

export const GOLD_TYPES: Record<
  string,
  { label: string; long: string; grams: number | "ons"; desc: string }
> = {
  "gram-altin": {
    label: "Gram Altın",
    long: "Gram Altın",
    grams: 1,
    desc: "24 ayar 1 gram saf altının güncel Türk Lirası fiyatı.",
  },
  "ceyrek-altin": {
    label: "Çeyrek Altın",
    long: "Çeyrek Altın",
    grams: 1.75, // ~1.75 g saf altın içeriği (yaklaşık piyasa standardı)
    desc: "Çeyrek altının güncel Türk Lirası fiyatı (yaklaşık saf altın içeriğine göre).",
  },
  "cumhuriyet-altini": {
    label: "Cumhuriyet Altını",
    long: "Cumhuriyet Altını (Tam)",
    grams: 7.016, // tam cumhuriyet altını saf altın içeriği
    desc: "Tam Cumhuriyet altınının güncel Türk Lirası fiyatı.",
  },
  ons: {
    label: "Ons Altın",
    long: "Ons Altın",
    grams: "ons",
    desc: "Uluslararası piyasada 1 ons (31.1 gram) altının Türk Lirası karşılığı.",
  },
};

/** Ons altın USD fiyatını Yahoo'dan (GC=F), olmazsa CoinGecko tether-gold'dan çeker. */
async function getGoldUsd(): Promise<{ price: number; prev: number | null } | null> {
  const yahoo = await safeFetch<{
    chart?: { result?: { meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }[] };
  }>(
    "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d",
    600,
  );
  const meta = yahoo?.chart?.result?.[0]?.meta;
  if (meta?.regularMarketPrice) {
    return { price: meta.regularMarketPrice, prev: meta.chartPreviousClose ?? null };
  }
  // Fallback: CoinGecko tether-gold (≈ 1 ons altın)
  const cg = await safeFetch<{
    "tether-gold"?: { usd?: number; usd_24h_change?: number };
  }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true",
    600,
  );
  const xaut = cg?.["tether-gold"];
  if (xaut?.usd) {
    const pct = xaut.usd_24h_change ?? 0;
    const prev = pct ? xaut.usd / (1 + pct / 100) : null;
    return { price: xaut.usd, prev };
  }
  return null;
}

export async function getGold(type: string): Promise<GoldPrice | null> {
  const cfg = GOLD_TYPES[type];
  if (!cfg) return null;
  const usdTry = await getFx("usd-try");
  const goldUsd = await getGoldUsd();
  if (!usdTry || !goldUsd) return null;

  const onsTry = goldUsd.price * usdTry.rate;
  const prevOnsTry = goldUsd.prev != null ? goldUsd.prev * usdTry.rate : null;

  let price: number;
  let prev: number | null;
  if (cfg.grams === "ons") {
    price = onsTry;
    prev = prevOnsTry;
  } else {
    const gramTry = onsTry / TROY_OUNCE_GRAMS;
    const prevGramTry = prevOnsTry != null ? prevOnsTry / TROY_OUNCE_GRAMS : null;
    price = gramTry * cfg.grams;
    prev = prevGramTry != null ? prevGramTry * cfg.grams : null;
  }
  price = Math.round(price * 100) / 100;
  const changePct =
    prev && prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : null;

  return { type, price, changePct, updatedAt: usdTry.updatedAt };
}

export async function getAllGold(): Promise<Record<string, GoldPrice | null>> {
  const usdTry = await getFx("usd-try");
  const goldUsd = await getGoldUsd();
  const out: Record<string, GoldPrice | null> = {};
  for (const type of Object.keys(GOLD_TYPES)) {
    if (!usdTry || !goldUsd) {
      out[type] = null;
      continue;
    }
    const cfg = GOLD_TYPES[type];
    const onsTry = goldUsd.price * usdTry.rate;
    const prevOnsTry = goldUsd.prev != null ? goldUsd.prev * usdTry.rate : null;
    let price: number;
    let prev: number | null;
    if (cfg.grams === "ons") {
      price = onsTry;
      prev = prevOnsTry;
    } else {
      const gramTry = onsTry / TROY_OUNCE_GRAMS;
      const prevGramTry = prevOnsTry != null ? prevOnsTry / TROY_OUNCE_GRAMS : null;
      price = gramTry * cfg.grams;
      prev = prevGramTry != null ? prevGramTry * cfg.grams : null;
    }
    price = Math.round(price * 100) / 100;
    const changePct = prev && prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : null;
    out[type] = { type, price, changePct, updatedAt: usdTry.updatedAt };
  }
  return out;
}

/* ----------------------------------------------------------------------------
 * KRİPTO
 * ------------------------------------------------------------------------- */

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  price: number; // TL
  changePct: number | null;
  marketCap: number | null;
  high24h: number | null;
  low24h: number | null;
  sparkline: number[] | null;
  updatedAt: string | null;
}

export const CRYPTO_COINS: Record<
  string,
  { id: string; label: string; symbol: string }
> = {
  bitcoin: { id: "bitcoin", label: "Bitcoin", symbol: "BTC" },
  ethereum: { id: "ethereum", label: "Ethereum", symbol: "ETH" },
  tether: { id: "tether", label: "Tether", symbol: "USDT" },
  bnb: { id: "binancecoin", label: "BNB", symbol: "BNB" },
  solana: { id: "solana", label: "Solana", symbol: "SOL" },
  xrp: { id: "ripple", label: "XRP", symbol: "XRP" },
  cardano: { id: "cardano", label: "Cardano", symbol: "ADA" },
  dogecoin: { id: "dogecoin", label: "Dogecoin", symbol: "DOGE" },
};

interface CgMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number | null;
  high_24h: number | null;
  low_24h: number | null;
  last_updated?: string;
  sparkline_in_7d?: { price?: number[] };
}

export async function getCrypto(slug: string): Promise<CryptoPrice | null> {
  const cfg = CRYPTO_COINS[slug];
  if (!cfg) return null;
  const data = await safeFetch<CgMarket[]>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&ids=${cfg.id}&sparkline=true&price_change_percentage=24h`,
    300,
  );
  const m = data?.[0];
  if (!m || typeof m.current_price !== "number") return null;
  const spark = m.sparkline_in_7d?.price;
  return {
    id: cfg.id,
    symbol: cfg.symbol,
    name: cfg.label,
    price: m.current_price,
    changePct: m.price_change_percentage_24h ?? null,
    marketCap: m.market_cap ?? null,
    high24h: m.high_24h ?? null,
    low24h: m.low_24h ?? null,
    sparkline: Array.isArray(spark) && spark.length ? spark : null,
    updatedAt: m.last_updated ?? null,
  };
}

/** Hub için piyasa değeri sıralı ilk N kripto. */
export async function getCryptoMarkets(): Promise<CryptoPrice[]> {
  const data = await safeFetch<CgMarket[]>(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=24h",
    300,
  );
  if (!data || !Array.isArray(data)) return [];
  return data.map((m) => ({
    id: m.id,
    symbol: (m.symbol || "").toUpperCase(),
    name: m.name,
    price: m.current_price,
    changePct: m.price_change_percentage_24h ?? null,
    marketCap: m.market_cap ?? null,
    high24h: m.high_24h ?? null,
    low24h: m.low_24h ?? null,
    sparkline: null,
    updatedAt: m.last_updated ?? null,
  }));
}

/* ----------------------------------------------------------------------------
 * FAİZ (bilgi amaçlı, statik referans — manuel güncellenir)
 * ------------------------------------------------------------------------- */

export interface RateInfo {
  label: string;
  value: number;
  unit: string;
  desc: string;
}

/** TCMB politika faizi vb. — ücretsiz canlı uç güvenilir olmadığından statik referans.
 *  Tarih ile birlikte gösterilir; yatırım tavsiyesi değildir. */
export const REFERENCE_RATES: { asOf: string; rates: RateInfo[] } = {
  asOf: "2026-06",
  rates: [
    {
      label: "TCMB Politika Faizi (1 Hafta Repo)",
      value: 42.5,
      unit: "%",
      desc: "Türkiye Cumhuriyet Merkez Bankası bir hafta vadeli repo ihale faiz oranı.",
    },
    {
      label: "Gecelik Borçlanma Faizi",
      value: 41.0,
      unit: "%",
      desc: "TCMB gecelik borçlanma faiz oranı (alt bant).",
    },
    {
      label: "Gecelik Borç Verme Faizi",
      value: 46.0,
      unit: "%",
      desc: "TCMB gecelik borç verme faiz oranı (üst bant / marjinal fonlama).",
    },
  ],
};

/* ----------------------------------------------------------------------------
 * İlgili haberler (savunmacı) — DB erişilemese bile sayfa çökmesin.
 * ------------------------------------------------------------------------- */

import type { Article } from "@/lib/types";

/** Kategoriye göre ilgili haberleri güvenli getirir. DB hatasında boş dizi döner. */
export async function safeRelatedArticles(cat: string, limit = 4): Promise<Article[]> {
  try {
    const { getArticlesByCategory } = await import("@/lib/articles");
    const arts = await getArticlesByCategory(cat);
    return arts.slice(0, limit);
  } catch {
    return [];
  }
}

/* ----------------------------------------------------------------------------
 * Biçimlendirme yardımcıları
 * ------------------------------------------------------------------------- */

/* ----------------------------------------------------------------------------
 * BORSA (BIST)
 *
 * Neden var: sitenin gösteriminin %90'ı canlı veri sayfalarından geliyor
 * (döviz/kripto/altın) ama borsa tarafında tek sayfa yoktu — menüde "Borsa"
 * yalnızca haber kategorisiydi. BIST 100 ve tekil hisse sorguları Türkiye'de
 * döviz/altın ile aynı ligde arama hacmine sahip; ray zaten duruyordu
 * (`getYahooCloseSeries` XU100.IS için çalışıyor), eksik olan sayfalardı.
 *
 * Kaynak: Yahoo Finance chart ucu (anahtarsız). Fiyat + önceki kapanış meta'dan
 * gelir; ayrıca aynı çağrıda 1 aylık kapanış serisi de döndüğü için sparkline
 * için İKİNCİ bir istek atılmaz.
 *
 * ⚠️ User-Agent zorunlu (yoksa Yahoo 429 döner) — `getYahooCloseSeries`
 * yorumunda ölçülmüş, aynı kural burada da geçerli.
 * ------------------------------------------------------------------------- */

export interface StockQuote {
  slug: string;
  symbol: string;   // Yahoo sembolü (THYAO.IS)
  ticker: string;   // BIST kodu (THYAO)
  name: string;
  price: number;
  prevClose: number | null;
  changePct: number | null;
  series: number[] | null;
  updatedAt: string | null;
}

export const BIST_INDEX_SLUG = "bist-100";

/**
 * Sayfası açılan enstrümanlar. Endeks + BIST 30'un işlem hacmi yüksek
 * isimleri. Liste bilerek kısa tutuldu: her hisse bir sayfa demek ve içeriği
 * olmayan yüzlerce ince sayfa açmak tarama bütçesini bölerdi.
 */
export const BIST_STOCKS: Record<string, { ticker: string; name: string; index?: boolean; about: string }> = {
  "bist-100": { ticker: "XU100", name: "BIST 100", index: true, about: "Borsa İstanbul'da işlem gören en yüksek piyasa değerli ve likit 100 şirketin ağırlıklı ortalamasını ölçen ana endeks." },
  thyao: { ticker: "THYAO", name: "Türk Hava Yolları", about: "Türkiye'nin bayrak taşıyıcı havayolu şirketi; BIST 100'ün en yüksek işlem hacimli hisselerinden biri." },
  asels: { ticker: "ASELS", name: "Aselsan", about: "Savunma sanayii elektroniği üreticisi; ağırlıklı olarak kamu siparişleriyle çalışan teknoloji şirketi." },
  garan: { ticker: "GARAN", name: "Garanti BBVA", about: "Türkiye'nin en büyük özel bankalarından biri; BBVA çoğunluk hissedarı." },
  akbnk: { ticker: "AKBNK", name: "Akbank", about: "Sabancı Holding grubunun bankacılık kolu." },
  isctr: { ticker: "ISCTR", name: "İş Bankası (C)", about: "Türkiye İş Bankası'nın borsada işlem gören C grubu hissesi." },
  ykbnk: { ticker: "YKBNK", name: "Yapı Kredi", about: "Koç Holding grubunun bankacılık iştiraki." },
  kchol: { ticker: "KCHOL", name: "Koç Holding", about: "Türkiye'nin en büyük sanayi topluluğu; otomotiv, dayanıklı tüketim, enerji ve finans." },
  sahol: { ticker: "SAHOL", name: "Sabancı Holding", about: "Bankacılık, enerji, çimento ve perakende alanlarında faaliyet gösteren holding." },
  bimas: { ticker: "BIMAS", name: "BİM", about: "İndirim marketi zinciri; gıda perakendesinin en büyük halka açık oyuncusu." },
  tuprs: { ticker: "TUPRS", name: "Tüpraş", about: "Türkiye'nin en büyük petrol rafinericisi; Koç Holding iştiraki." },
  eregl: { ticker: "EREGL", name: "Ereğli Demir Çelik", about: "Yassı çelik üreticisi; OYAK grubuna bağlı." },
  froto: { ticker: "FROTO", name: "Ford Otosan", about: "Ford ile Koç Holding ortaklığı; ticari araç üretimi ve ihracatı." },
  toaso: { ticker: "TOASO", name: "Tofaş", about: "Stellantis ile Koç Holding ortaklığı; binek ve hafif ticari araç üretimi." },
  sise: { ticker: "SISE", name: "Şişecam", about: "Düz cam, cam ambalaj ve kimyasallar üreticisi." },
  pgsus: { ticker: "PGSUS", name: "Pegasus", about: "Düşük maliyetli havayolu şirketi." },
  tcell: { ticker: "TCELL", name: "Turkcell", about: "Türkiye'nin en büyük mobil operatörü." },
  arclk: { ticker: "ARCLK", name: "Arçelik", about: "Beyaz eşya ve dayanıklı tüketim üreticisi; Koç Holding iştiraki." },
  sasa: { ticker: "SASA", name: "Sasa Polyester", about: "Polyester elyaf ve polimer üreticisi." },
  ekgyo: { ticker: "EKGYO", name: "Emlak Konut GYO", about: "Konut geliştirme odaklı gayrimenkul yatırım ortaklığı." },
};

/** Yahoo chart ucundan tek sembol için fiyat + önceki kapanış + seri. */
async function getYahooQuote(symbol: string): Promise<{
  price: number;
  prevClose: number | null;
  series: number[] | null;
  updatedAt: string | null;
} | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d`,
      {
        next: { revalidate: 300 },
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; GelecekFinansBot/1.0)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; chartPreviousClose?: number; regularMarketTime?: number };
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const r = data.chart?.result?.[0];
    const price = r?.meta?.regularMarketPrice;
    if (typeof price !== "number" || !(price > 0)) return null;
    const closes = (r?.indicators?.quote?.[0]?.close ?? []).filter(
      (v): v is number => typeof v === "number" && v > 0,
    );
    const prev = typeof r?.meta?.chartPreviousClose === "number" ? r.meta.chartPreviousClose : null;
    const t = r?.meta?.regularMarketTime;
    return {
      price,
      prevClose: prev,
      series: closes.length > 4 ? closes : null,
      updatedAt: typeof t === "number" ? new Date(t * 1000).toISOString() : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Tek enstrümanı döner. Bilinmeyen slug veya veri yoksa null. */
export async function getStock(slug: string): Promise<StockQuote | null> {
  const cfg = BIST_STOCKS[slug];
  if (!cfg) return null;
  const symbol = `${cfg.ticker}.IS`;
  const q = await getYahooQuote(symbol);
  if (!q) return null;
  const changePct =
    q.prevClose && q.prevClose > 0 ? ((q.price - q.prevClose) / q.prevClose) * 100 : null;
  return {
    slug,
    symbol,
    ticker: cfg.ticker,
    name: cfg.name,
    price: q.price,
    prevClose: q.prevClose,
    changePct,
    series: q.series,
    updatedAt: q.updatedAt,
  };
}

/**
 * Hub tablosu için tüm enstrümanlar. Tek tek istek atılır ama hepsi PARALEL
 * ve her biri kendi başına null'a düşebilir: bir sembol cevap vermezse tablo
 * eksik satırla değil, o satır olmadan render edilir.
 */
export async function getBistAll(): Promise<StockQuote[]> {
  const slugs = Object.keys(BIST_STOCKS);
  const rows = await Promise.all(slugs.map((s) => getStock(s)));
  return rows.filter((r): r is StockQuote => r !== null);
}

export function tl(n: number, frac = 2): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: frac, maximumFractionDigits: frac });
}

export function pctText(p: number | null): string {
  if (p == null) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
}

export function fmtUpdated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
