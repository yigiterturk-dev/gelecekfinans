/**
 * Piyasa verisi katmanı — ücretsiz / anahtarsız kaynaklar.
 *
 * Tüm fetch'ler savunmacı: timeout, try/catch, Next `revalidate` ile önbellek,
 * dürüst "veri alınamadı" geri dönüşü. Hiçbir fonksiyon throw etmez; başarısızlıkta
 * `null` döner. Sayfalar bu null'a göre CLS-güvenli "veri alınamadı" gösterir.
 *
 * Kaynaklar:
 *  - Döviz: Frankfurter v2 (anahtarsız referans kurları ve tarihçe)
 *  - Kripto: CoinGecko public API (TL fiyatları + 7g sparkline)
 *  - Altın: ons altın USD (Yahoo GC=F) × USDTRY → gram/çeyrek/cumhuriyet TL
 *  - Faiz: TCMB politika faizi (statik, manuel güncellenir — sadece bilgi amaçlı)
 */

import { TROY_OUNCE_GRAMS, ziynetGoldFineGrams } from "@/lib/gold-standards";

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

/** XML/düz metin fetch'i — JSON olmayan uçlar (TCMB kurları) için. Hata → null. */
async function safeFetchText(url: string, revalidate: number, timeoutMs = 6000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      next: { revalidate },
      signal: controller.signal,
      headers: { Accept: "application/xml,text/xml,*/*" },
    });
    if (!res.ok) return null;
    return await res.text();
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
  "chf-try": { base: "CHF", label: "İsviçre Frangı", symbol: "Fr", flag: "🇨🇭", long: "İsviçre Frangı" },
  "sar-try": { base: "SAR", label: "Riyal", symbol: "﷼", flag: "🇸🇦", long: "Suudi Arabistan Riyali" },
  "aed-try": { base: "AED", label: "Dirhem", symbol: "د.إ", flag: "🇦🇪", long: "Birleşik Arap Emirlikleri Dirhemi" },
  "rub-try": { base: "RUB", label: "Ruble", symbol: "₽", flag: "🇷🇺", long: "Rus Rublesi" },
  "azn-try": { base: "AZN", label: "Manat", symbol: "₼", flag: "🇦🇿", long: "Azerbaycan Manatı" },
  "jpy-try": { base: "JPY", label: "Japon Yeni", symbol: "¥", flag: "🇯🇵", long: "Japon Yeni" },
  "cny-try": { base: "CNY", label: "Yuan", symbol: "¥", flag: "🇨🇳", long: "Çin Yuanı" },
  "cad-try": { base: "CAD", label: "Kanada Doları", symbol: "C$", flag: "🇨🇦", long: "Kanada Doları" },
};

interface FrankfurterRate {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

function inverseFxRate(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const inverse = 1 / value;
  return Number.isFinite(inverse) && inverse > 0 ? inverse : null;
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function roundFxRate(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const rounded = Math.round(value * 10000) / 10000;
  return Number.isFinite(rounded) && rounded > 0 ? rounded : null;
}

function fxPercentChange(current: number, previous: number | null): number | null {
  if (!Number.isFinite(current) || current <= 0 || previous === null || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) return null;
  const rounded = Math.round(change * 100) / 100;
  return Number.isFinite(rounded) ? rounded : null;
}

function fxAbsoluteChange(current: number, previous: number | null): number | null {
  if (!Number.isFinite(current) || previous === null || !Number.isFinite(previous)) return null;
  const change = Math.round((current - previous) * 10000) / 10000;
  return Number.isFinite(change) ? change : null;
}

/**
 * TRY bazlı tek istekle tüm pariteleri çeker; gün alanı her para birimi için saklanır.
 */
async function getFxTable(): Promise<{
  rates: Record<string, number>;
  updatedAt: Record<string, string>;
} | null> {
  const quotes = [...new Set(Object.values(FX_PAIRS).map((pair) => pair.base))].join(",");
  const data = await safeFetch<FrankfurterRate[]>(
    `https://api.frankfurter.dev/v2/rates?base=TRY&quotes=${quotes}`,
    3600,
  );
  if (!data?.length) return null;
  const rates: Record<string, number> = {};
  const updatedAt: Record<string, string> = {};
  for (const row of data) {
    if (!row || typeof row.quote !== "string" || !isValidIsoDate(row.date)) continue;
    const rate = inverseFxRate(row.rate);
    if (rate === null) continue;
    rates[row.quote] = rate;
    updatedAt[row.quote] = row.date;
  }
  return Object.keys(rates).length ? { rates, updatedAt } : null;
}

/** En son yayınlanan referans gününden önceki son iş günü kurunu bulur. */
async function getFxPrevRate(base: string, currentDate: string | null): Promise<number | null> {
  if (!isValidIsoDate(currentDate)) return null;
  const end = new Date(`${currentDate}T00:00:00Z`);
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const from = start.toISOString().slice(0, 10);
  const data = await safeFetch<FrankfurterRate[]>(
    `https://api.frankfurter.dev/v2/rates?from=${from}&to=${currentDate}&base=${base}&quotes=TRY`,
    3600,
  );
  const previous = data
    ?.filter((row) => row && isValidIsoDate(row.date) && row.date < currentDate
      && Number.isFinite(row.rate) && row.rate > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return previous?.rate ?? null;
}

export async function getFx(pair: string): Promise<FxRate | null> {
  const cfg = FX_PAIRS[pair];
  if (!cfg) return null;
  const table = await getFxTable();
  if (!table) return null;

  const rawRate = table.rates[cfg.base];
  const rate = rawRate ? roundFxRate(rawRate) : null;
  if (rate === null) return null;

  const updatedAt = table.updatedAt[cfg.base] ?? null;
  const rawPrevRate = await getFxPrevRate(cfg.base, updatedAt);
  const prevRate = rawPrevRate !== null && Number.isFinite(rawPrevRate) && rawPrevRate > 0 ? rawPrevRate : null;
  const changeAbs = fxAbsoluteChange(rate, prevRate);
  const changePct = fxPercentChange(rate, prevRate);

  return {
    rate,
    prevRate,
    changeAbs,
    changePct,
    base: cfg.base,
    quote: "TRY",
    updatedAt,
  };
}

/** Tüm pariteleri tek tabloyla çeker (hub sayfası + çevirici için verimli). */
export async function getAllFx(): Promise<Record<string, FxRate | null>> {
  const quotes = [...new Set(Object.values(FX_PAIRS).map((pair) => pair.base))].join(",");
  const end = new Date();
  const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
  const series = await safeFetch<FrankfurterRate[]>(
    `https://api.frankfurter.dev/v2/rates?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}&base=TRY&quotes=${quotes}`,
    3600,
  );
  const byQuote = new Map<string, FrankfurterRate[]>();
  for (const row of series || []) {
    if (
      !row || typeof row.quote !== "string"
      || !isValidIsoDate(row.date)
      || !Number.isFinite(row.rate) || row.rate <= 0
    ) continue;
    const rows = byQuote.get(row.quote) || [];
    rows.push(row);
    byQuote.set(row.quote, rows);
  }

  const rows = Object.entries(FX_PAIRS).map(([key, cfg]) => {
    const observations = byQuote.get(cfg.base)?.sort((a, b) => b.date.localeCompare(a.date)) || [];
    const current = observations[0];
    if (!current) return [key, null] as const;
    const previous = observations.find((row) => row.date < current.date);
    const inverseRate = inverseFxRate(current.rate);
    const rate = inverseRate === null ? null : roundFxRate(inverseRate);
    if (rate === null) return [key, null] as const;
    const prevInverse = previous ? inverseFxRate(previous.rate) : null;
    const prevRate = prevInverse === null ? null : prevInverse;
    const changeAbs = fxAbsoluteChange(rate, prevRate);
    const changePct = fxPercentChange(rate, prevRate);
    return [key, { rate, prevRate, changeAbs, changePct, base: cfg.base, quote: "TRY", updatedAt: current.date }] as const;
  });
  return Object.fromEntries(rows) as Record<string, FxRate | null>;
}

/** Tekil parite sayfası için güncel kur, önceki iş günü ve grafiği tek çağrıda al. */
export async function getFxWithHistory(base: string): Promise<{
  rate: FxRate | null;
  history: number[] | null;
}> {
  const pair = Object.entries(FX_PAIRS).find(([, config]) => config.base === base)?.[0];
  if (!pair) {
    return { rate: null, history: null };
  }
  const end = new Date();
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const series = await safeFetch<FrankfurterRate[]>(
    `https://api.frankfurter.dev/v2/rates?from=${start.toISOString().slice(0, 10)}&to=${end.toISOString().slice(0, 10)}&base=TRY&quotes=${base}`,
    3600,
  );
  const observations = (series || [])
    .filter((row) => row && row.quote === base && isValidIsoDate(row.date)
      && Number.isFinite(row.rate) && row.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const current = observations.at(-1);
  if (!current) {
    // Tarihçe ucu geçici olarak boşsa, eski tekli uçtan en az güncel kuru koru.
    return { rate: await getFx(pair), history: null };
  }

  const previous = [...observations].reverse().find((row) => row.date < current.date);
  const currentInverse = inverseFxRate(current.rate);
  const normalizedRate = currentInverse === null ? null : roundFxRate(currentInverse);
  if (normalizedRate === null) return { rate: await getFx(pair), history: null };
  const previousInverse = previous ? inverseFxRate(previous.rate) : null;
  const prevRate = previousInverse === null ? null : previousInverse;
  const changeAbs = fxAbsoluteChange(normalizedRate, prevRate);
  const changePct = fxPercentChange(normalizedRate, prevRate);
  const history = observations
    .map((row) => inverseFxRate(row.rate))
    .filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  return {
    rate: {
      rate: normalizedRate, prevRate, changeAbs, changePct, base, quote: "TRY", updatedAt: current.date,
    },
    history: history.length > 1 ? history : null,
  };
}

export interface TcmbFx {
  code: string;
  unit: number;
  forexBuying: number | null;
  forexSelling: number | null;
  banknoteBuying: number | null;
  banknoteSelling: number | null;
  date: string | null;
}

function xmlTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

function xmlNum(v: string | null, unit = 1): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n / unit : null;
}

/** TCMB günlük döviz bülteninden (today.xml) bir para biriminin döviz/efektif
 *  alış-satış değerlerini çeker. Bülten iş günleri yayımlanır; hafta sonu son
 *  iş günü değeri döner. Ulaşılamazsa null (sayfa serbest piyasa kuruyla çalışır). */
export async function getTcmbFx(code: string): Promise<TcmbFx | null> {
  const xml = await safeFetchText("https://www.tcmb.gov.tr/kurlar/today.xml", 1800);
  if (!xml) return null;
  const date = xml.match(/<Tarih_Date[^>]*Tarih="([^"]+)"/)?.[1] ?? null;
  const blockRe = /<Currency[^>]*CurrencyCode="([^"]+)"[^>]*>([\s\S]*?)<\/Currency>/g;
  for (let m = blockRe.exec(xml); m; m = blockRe.exec(xml)) {
    if (m[1] !== code) continue;
    const unit = Number(xmlTag(m[2], "Unit")) || 1;
    return {
      code,
      unit,
      forexBuying: xmlNum(xmlTag(m[2], "ForexBuying"), unit),
      forexSelling: xmlNum(xmlTag(m[2], "ForexSelling"), unit),
      banknoteBuying: xmlNum(xmlTag(m[2], "BanknoteBuying"), unit),
      banknoteSelling: xmlNum(xmlTag(m[2], "BanknoteSelling"), unit),
      date,
    };
  }
  return null;
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

export interface DatedPoint { date: string; close: number }

/**
 * Belirli bir tarihte BİTEN günlük kapanış serisi (Yahoo period1/period2).
 *
 * Neden: kapak grafiği eskiden "bugünün son 1 ayı" ile çiziliyordu; aynı gün
 * yenilenen her borsa makalesi birebir aynı görseli alıyordu ve 3 Eylül
 * makalesinin kapağında Kasım verisi duruyordu. Artık seri makalenin yayın
 * gününde biter: görsel hem makaleye özgü hem o güne doğru.
 */
export async function getYahooSeriesUntil(
  symbol: string,
  end: Date,
  days = 45,
): Promise<DatedPoint[] | null> {
  const period2 = Math.floor(end.getTime() / 1000) + 86400;
  const period1 = period2 - days * 86400;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d`,
      {
        next: { revalidate: 3600 },
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; GelecekFinansBot/1.0)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
    };
    const result = data.chart?.result?.[0];
    const stamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(stamps) || !Array.isArray(closes)) return null;
    const points: DatedPoint[] = [];
    stamps.forEach((ts, index) => {
      const close = closes[index];
      if (typeof close === "number" && close > 0) {
        points.push({ date: new Date(ts * 1000).toISOString().slice(0, 10), close });
      }
    });
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
  /** Quote provider selected by getGoldUsd; carried through for attribution. */
  goldSource?: "Yahoo Finance" | "CoinGecko";
  /** Altın kotasyonunun kaynağında görülen son güncelleme zamanı. */
  goldUpdatedAt?: string | null;
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
    long: "Çeyrek Cumhuriyet Ziynet Altını",
    grams: ziynetGoldFineGrams("quarter"),
    desc: "Darphane'nin 22 ayar çeyrek ziynet altını standardına göre yaklaşık metal karşılığı.",
  },
  "yarim-altin": {
    label: "Yarım Altın",
    long: "Yarım Cumhuriyet Ziynet Altını",
    grams: ziynetGoldFineGrams("half"),
    desc: "Darphane'nin 22 ayar yarım ziynet altını standardına göre yaklaşık metal karşılığı.",
  },
  "cumhuriyet-altini": {
    label: "Cumhuriyet Altını",
    long: "Cumhuriyet Ziynet Altını (Tam)",
    grams: ziynetGoldFineGrams("full"),
    desc: "Darphane'nin 22 ayar tam ziynet altını standardına göre yaklaşık metal karşılığı.",
  },
  ons: {
    label: "Ons Altın",
    long: "Ons Altın",
    grams: "ons",
    desc: "Uluslararası piyasada 1 ons (31.1 gram) altının Türk Lirası karşılığı.",
  },
};

/** Ons altın USD fiyatını Yahoo'dan (GC=F), olmazsa CoinGecko tether-gold'dan çeker. */
function validUnixTimestampIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function goldChangePercent(current: number, previous: number | null): number | null {
  if (!Number.isFinite(current) || current <= 0 || previous === null || !Number.isFinite(previous) || previous <= 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  if (!Number.isFinite(change)) return null;
  const rounded = Math.round(change * 100) / 100;
  return Number.isFinite(rounded) ? rounded : null;
}

async function getGoldUsd(): Promise<{
  price: number;
  prev: number | null;
  updatedAt: string | null;
  source: "Yahoo Finance" | "CoinGecko";
} | null> {
  const yahoo = await safeFetch<{
    chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number; fulldayChange?: number } }[] };
  }>(
    "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=2d",
    600,
  );
  const meta = yahoo?.chart?.result?.[0]?.meta;
  const yahooPrice = meta?.regularMarketPrice;
  if (typeof yahooPrice === "number" && Number.isFinite(yahooPrice) && yahooPrice > 0) {
    const previous = yahooDailyPrev(meta);
    return {
      price: yahooPrice,
      prev: previous !== null && Number.isFinite(previous) && previous > 0 ? previous : null,
      updatedAt: validUnixTimestampIso(meta?.regularMarketTime),
      source: "Yahoo Finance",
    };
  }
  // Fallback: CoinGecko tether-gold (≈ 1 ons altın)
  const cg = await safeFetch<{
    "tether-gold"?: { usd?: number; usd_24h_change?: number; last_updated_at?: number };
  }>(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true",
    600,
  );
  const xaut = cg?.["tether-gold"];
  if (typeof xaut?.usd === "number" && Number.isFinite(xaut.usd) && xaut.usd > 0) {
    const pct = typeof xaut.usd_24h_change === "number" && Number.isFinite(xaut.usd_24h_change)
      ? xaut.usd_24h_change
      : null;
    const previous = pct !== null && pct > -100 ? xaut.usd / (1 + pct / 100) : null;
    return {
      price: xaut.usd,
      prev: previous !== null && Number.isFinite(previous) && previous > 0 ? previous : null,
      updatedAt: validUnixTimestampIso(xaut.last_updated_at),
      source: "CoinGecko",
    };
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
  const prevOnsTry = goldUsd.prev != null
    ? goldUsd.prev * (usdTry.prevRate ?? usdTry.rate)
    : null;

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
  if (!Number.isFinite(price) || price <= 0) return null;
  if (prev !== null && (!Number.isFinite(prev) || prev <= 0)) prev = null;
  const changePct = goldChangePercent(price, prev);

  return {
    type,
    price,
    changePct,
    goldSource: goldUsd.source,
    goldUpdatedAt: goldUsd.updatedAt,
    updatedAt: usdTry.updatedAt,
  };
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
    const prevOnsTry = goldUsd.prev != null
      ? goldUsd.prev * (usdTry.prevRate ?? usdTry.rate)
      : null;
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
    if (!Number.isFinite(price) || price <= 0) {
      out[type] = null;
      continue;
    }
    if (prev !== null && (!Number.isFinite(prev) || prev <= 0)) prev = null;
    const changePct = goldChangePercent(price, prev);
    out[type] = {
      type,
      price,
      changePct,
      goldSource: goldUsd.source,
      goldUpdatedAt: goldUsd.updatedAt,
      updatedAt: usdTry.updatedAt,
    };
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

function normalizeCoinGeckoMarket(value: unknown): CryptoPrice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const symbol = typeof row.symbol === "string" ? row.symbol.trim().slice(0, 20).toUpperCase() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const price = row.current_price;
  if (!/^[a-z0-9_-]{1,80}$/i.test(id) || !symbol
    || typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;

  const finiteValue = (candidate: unknown, positive = false): number | null =>
    typeof candidate === "number" && Number.isFinite(candidate) && (!positive || candidate > 0)
      ? candidate
      : null;
  const sparkRow = row.sparkline_in_7d;
  const sparkValues = sparkRow && typeof sparkRow === "object" && !Array.isArray(sparkRow)
    ? (sparkRow as Record<string, unknown>).price
    : null;
  const sparkline = Array.isArray(sparkValues)
    ? sparkValues.filter((point): point is number => typeof point === "number" && Number.isFinite(point) && point > 0).slice(-168)
    : null;
  const updatedAt = typeof row.last_updated === "string" && Number.isFinite(Date.parse(row.last_updated))
    ? row.last_updated
    : null;

  return {
    id,
    symbol,
    name: name ? name.slice(0, 100) : symbol,
    price,
    changePct: finiteValue(row.price_change_percentage_24h),
    marketCap: finiteValue(row.market_cap, true),
    high24h: finiteValue(row.high_24h, true),
    low24h: finiteValue(row.low_24h, true),
    sparkline: sparkline?.length ? sparkline : null,
    updatedAt,
  };
}

export async function getCrypto(slug: string): Promise<CryptoPrice | null> {
  const cfg = CRYPTO_COINS[slug];
  if (!cfg) return null;
  const data = await safeFetch<unknown>(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&ids=${cfg.id}&sparkline=true&price_change_percentage=24h`,
    300,
  );
  const rows = Array.isArray(data) ? data : [];
  const market = normalizeCoinGeckoMarket(rows[0]);
  if (!market || market.id !== cfg.id) return null;
  return {
    ...market,
    id: cfg.id,
    symbol: cfg.symbol,
    name: cfg.label,
  };
}

/** Hub için piyasa değeri sıralı ilk N kripto. */
export async function getCryptoMarkets(): Promise<CryptoPrice[]> {
  const data = await safeFetch<unknown>(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=try&order=market_cap_desc&per_page=20&sparkline=false&price_change_percentage=24h",
    300,
  );
  if (!data || !Array.isArray(data)) return [];
  return data.map(normalizeCoinGeckoMarket)
    .filter((market): market is CryptoPrice => market !== null)
    .slice(0, 20);
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
export const REFERENCE_RATES: { decisionDate: string; sourceUrl: string; rates: RateInfo[] } = {
  decisionDate: "22 Ekim 2026",
  sourceUrl: "https://www.tcmb.gov.tr/wps/wcm/connect/tr/tcmb%2Btr/main%2Bmenu/duyurular/basin/2026/duy2026-45",
  rates: [
    {
      label: "TCMB Politika Faizi (1 Hafta Repo)",
      value: 36.0,
      unit: "%",
      desc: "Türkiye Cumhuriyet Merkez Bankası bir hafta vadeli repo ihale faiz oranı.",
    },
    {
      label: "Gecelik Borçlanma Faizi",
      value: 34.5,
      unit: "%",
      desc: "TCMB gecelik borçlanma faiz oranı (alt bant).",
    },
    {
      label: "Gecelik Borç Verme Faizi",
      value: 39.0,
      unit: "%",
      desc: "TCMB gecelik borç verme faiz oranı (üst bant / marjinal fonlama).",
    },
  ],
};

/* ----------------------------------------------------------------------------
 * İlgili haberler (savunmacı) — DB erişilemese bile sayfa çökmesin.
 * ------------------------------------------------------------------------- */

import type { ArticleListItem } from "@/lib/types";

/** Kategoriye göre ilgili haberleri güvenli getirir. DB hatasında boş dizi döner. */
export async function safeRelatedArticles(cat: string, limit = 4): Promise<ArticleListItem[]> {
  try {
    const { getArticlesByCategory } = await import("@/lib/articles");
    return await getArticlesByCategory(cat, limit);
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
  stats: StockStats | null;
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

/**
 * Yahoo chart ucunda `chartPreviousClose`, istenen ARALIĞIN başından önceki
 * kapanıştır (range=1mo → bir ay önceki kapanış). Günlük değişim için
 * `fulldayChange` kullanılır; yoksa serinin sondan ikinci kapanışı.
 */
export function yahooDailyPrev(
  meta: { regularMarketPrice?: number; fulldayChange?: number } | undefined,
  closes: number[] = [],
): number | null {
  const p = meta?.regularMarketPrice;
  if (typeof p === "number" && Number.isFinite(p) && p > 0
    && typeof meta?.fulldayChange === "number" && Number.isFinite(meta.fulldayChange)) {
    const prev = p - meta.fulldayChange;
    if (Number.isFinite(prev) && prev > 0) return prev;
  }
  const previousClose = closes.length >= 2 ? closes[closes.length - 2] : null;
  return typeof previousClose === "number" && Number.isFinite(previousClose) && previousClose > 0
    ? previousClose
    : null;
}

export interface StockStats {
  dayHigh: number | null;
  dayLow: number | null;
  w52High: number | null;
  w52Low: number | null;
  volume: number | null;
  /** Dönemsel getiri (%), veri yetmeyen dönem null. */
  returns: { label: string; pct: number | null }[];
}

/** Yahoo chart ucundan tek sembol için fiyat + önceki kapanış + seri + istatistik. */
async function getYahooQuote(symbol: string): Promise<{
  price: number;
  prevClose: number | null;
  series: number[] | null;
  updatedAt: string | null;
  stats: StockStats | null;
} | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
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
          meta?: {
            regularMarketPrice?: number;
            fulldayChange?: number;
            regularMarketTime?: number;
            regularMarketDayHigh?: number;
            regularMarketDayLow?: number;
            fiftyTwoWeekHigh?: number;
            fiftyTwoWeekLow?: number;
            regularMarketVolume?: number;
          };
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        }>;
      };
    };
    const r = data.chart?.result?.[0];
    const m = r?.meta;
    const price = m?.regularMarketPrice;
    if (typeof price !== "number" || !(price > 0)) return null;
    const rawCloses = r?.indicators?.quote?.[0]?.close ?? [];
    const ts = r?.timestamp ?? [];
    const pts: { t: number; c: number }[] = [];
    rawCloses.forEach((v, i) => {
      if (typeof v === "number" && v > 0 && typeof ts[i] === "number") pts.push({ t: ts[i], c: v });
    });
    const closes = pts.map((x) => x.c);
    const monthly = closes.slice(-22);
    const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);

    // Getiri: bugünkü fiyat ↔ N seans önceki kapanış. Son çubuk bugünün seansıdır.
    const back = (n: number) => {
      const i = closes.length - 1 - n;
      return i >= 0 ? ((price - closes[i]) / closes[i]) * 100 : null;
    };
    const year = new Date((m?.regularMarketTime ?? Date.now() / 1000) * 1000).getUTCFullYear();
    const jan1 = Date.UTC(year, 0, 1) / 1000;
    const lastPrevYear = [...pts].reverse().find((x) => x.t < jan1);
    const returns = [
      { label: "1 hafta", pct: back(5) },
      { label: "1 ay", pct: back(21) },
      { label: "3 ay", pct: back(63) },
      { label: "6 ay", pct: back(126) },
      { label: "Yılbaşından beri", pct: lastPrevYear ? ((price - lastPrevYear.c) / lastPrevYear.c) * 100 : null },
      { label: "1 yıl", pct: closes.length >= 240 ? ((price - closes[0]) / closes[0]) * 100 : null },
    ];
    const t = m?.regularMarketTime;
    return {
      price,
      prevClose: yahooDailyPrev(m, closes),
      series: monthly.length > 4 ? monthly : null,
      updatedAt: typeof t === "number" ? new Date(t * 1000).toISOString() : null,
      stats: {
        dayHigh: num(m?.regularMarketDayHigh),
        dayLow: num(m?.regularMarketDayLow),
        w52High: num(m?.fiftyTwoWeekHigh),
        w52Low: num(m?.fiftyTwoWeekLow),
        volume: num(m?.regularMarketVolume),
        returns,
      },
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
    stats: q.stats,
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", timeZone: "Europe/Istanbul" });
  }
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

export function fmtGoldQuoteUpdated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(d);
}
