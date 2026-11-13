import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LicensedMediaAsset } from "./media-types";

/**
 * Ücretsiz stok görsel sağlayıcıları — Pexels (birincil) ve Pixabay (yedek).
 *
 * NEDEN: `licensed-media.ts` bir ajans portu tanımlıyordu ama adaptör yoktu;
 * her makale markalı karta düşüyordu. Pexels/Pixabay lisansları ticari
 * kullanıma açık, atıf şartı yok ve dosyayı indirip kendi alan adından servis
 * etmeye izin veriyor — `/gorseller` + Google Görseller atıf stratejisine
 * uyan tek ikili bu. Unsplash API şartları hotlink istediği için elendi.
 *
 * KALİTE KONTROLÜ ELLE DEĞİL KURALLA: her makaleye tek tek bakmak
 * sürdürülebilir değil. Bu yüzden sorgu kara listesi (para yağmuru, kumbara,
 * el sıkışma...), oran/boyut eşiği ve deterministik puanlama var; eşiği
 * geçemeyen aday hiç indirilmez ve makale markalı karta düşer.
 */

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "stok-gorsel.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_SCORE = 4;
const MIN_WIDTH = 1200;

interface CacheShape {
  /** Sorgu başına aday listesi — aynı sorguya düşen makaleler arasında dönebiliriz. */
  queries?: Record<string, { assets: LicensedMediaAsset[]; at: number }>;
  /** Son 60 günde kullanılan varlıklar: aynı fotoğraf iki haberde görünmesin. */
  used?: Record<string, number>;
  rate?: Record<string, { start: number; count: number }>;
}

const USED_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/** Kısa, deterministik karma — aynı başlık her çalıştırmada aynı adayı seçsin. */
function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Kategori başına İngilizce taban sorgu.
 *
 * Türkçe başlıkla arama yapılmaz: iki sağlayıcının etiket dizini de ağırlıklı
 * İngilizce. Türkçe sorgu "altın" için altın rengi duvar, "faiz" için faiz
 * sembolü gibi alakasız sonuç döndürüyordu.
 */
const CATEGORY_QUERIES: Record<string, string> = {
  borsa: "stock market trading screen",
  kripto: "cryptocurrency blockchain technology",
  doviz: "currency exchange rates",
  altin: "gold bullion",
  ekonomi: "central bank economy",
  faiz: "bank interest rate finance",
  enflasyon: "supermarket price tags",
  konut: "apartment buildings city",
  kredi: "loan paperwork calculator",
  vergi: "tax form calculator",
  emeklilik: "retirement planning",
  issizlik: "job center office",
  maas: "salary payroll desk",
  petrol: "oil refinery energy",
  dogalgaz: "natural gas pipeline",
  turizm: "tourists city travel",
  tarim: "agriculture field farmer",
  otomotiv: "car factory production",
  teknoloji: "technology data center",
  yapayzeka: "artificial intelligence data",
  saglik: "hospital corridor",
  egitim: "classroom students",
  enerji: "solar panels wind turbines",
};

const DEFAULT_QUERY = "finance newspaper desk";

/**
 * Türkçe başlıktaki varlıkları İngilizce arama terimine çeviren sözlük.
 * Kategori taban sorgusunun önüne eklenir; eşleşme yoksa taban sorgu kalır.
 */
const ENTITIES: Array<{ pattern: RegExp; term: string }> = [
  { pattern: /\bbitcoin|btc\b/i, term: "bitcoin" },
  { pattern: /\bethereum|eth\b/i, term: "ethereum" },
  { pattern: /\bdolar|usd\b/i, term: "us dollar" },
  { pattern: /\beuro|eur\b/i, term: "euro banknotes" },
  { pattern: /\bsterlin|gbp\b/i, term: "pound sterling" },
  { pattern: /\baltın|gram altın|ons\b/i, term: "gold" },
  { pattern: /\bbist|borsa istanbul\b/i, term: "istanbul stock exchange" },
  { pattern: /\bfed|federal reserve\b/i, term: "federal reserve" },
  { pattern: /\btcmb|merkez bankası\b/i, term: "central bank" },
  { pattern: /\benflasyon\b/i, term: "inflation" },
  { pattern: /\bfaiz\b/i, term: "interest rate" },
  { pattern: /\bkonut|kira\b/i, term: "housing" },
  { pattern: /\bkredi\b/i, term: "loan" },
  { pattern: /\bvergi\b/i, term: "tax" },
  { pattern: /\bemekli\b/i, term: "retirement" },
  { pattern: /\bpetrol\b/i, term: "oil" },
  { pattern: /\bdoğalgaz\b/i, term: "natural gas" },
  { pattern: /\byapay zeka\b/i, term: "artificial intelligence" },
  { pattern: /\bbanka\b/i, term: "bank" },
];

/**
 * İçerik olarak yanlış sinyal veren etiketler. Finans haberinde para
 * yağmuru, kumbara, el sıkışma veya "success" görseli güveni düşürüyor;
 * bu etiketlerden biri geçen aday puanı ne olursa olsun reddedilir.
 */
const BLOCKED_TERMS = [
  "money rain",
  "cash rain",
  "piggy bank",
  "handshake",
  "jackpot",
  "casino",
  "gambling",
  "lottery",
  "rich man",
  "luxury car",
  "thief",
  "hacker",
  "gun",
  "crying",
  "despair",
  "bankruptcy",
  "success",
];

export function isBlockedCandidate(text: string): boolean {
  const hay = text.toLocaleLowerCase("tr-TR");
  return BLOCKED_TERMS.some((term) => hay.includes(term));
}

/** Türkçe başlık + kategori → İngilizce stok arama sorgusu. */
export function buildStockQuery(input: { title: string; keyword?: string | null; category: string }): string {
  const text = `${input.title} ${input.keyword || ""}`.toLocaleLowerCase("tr-TR");
  const categoryKey = input.category
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z]/g, "");
  const base = CATEGORY_QUERIES[categoryKey] || DEFAULT_QUERY;
  const entities = ENTITIES.filter((entity) => entity.pattern.test(text)).map((entity) => entity.term);
  const head = [...new Set(entities)].slice(0, 2).join(" ");
  return head ? `${head} ${base}` : base;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  alt?: string | null;
  src?: { original?: string; large2x?: string };
}

interface PixabayHit {
  id: number;
  pageURL: string;
  tags?: string;
  largeImageURL?: string;
  imageWidth?: number;
  imageHeight?: number;
  user?: string;
}

async function readCache(): Promise<CacheShape> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8")) as CacheShape;
  } catch {
    return {};
  }
}

async function writeCache(cache: CacheShape): Promise<void> {
  try {
    // Süresi dolmuş "kullanıldı" kayıtları dosyada büyümesin.
    if (cache.used) {
      const now = Date.now();
      cache.used = Object.fromEntries(Object.entries(cache.used).filter(([, at]) => now - at <= USED_TTL_MS));
    }
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache));
  } catch {
    // Önbellek yazılamazsa üretim durmaz; sadece kota koruması devre dışı kalır.
  }
}

/**
 * Saatlik kotayı yerelde sayar. Pexels 200 istek/saat; sınırı aşınca
 * sağlayıcı atlanır ve yedek sağlayıcı denenir — 429 yiyip görselsiz kalmak
 * yerine yavaş ama çalışan yol tercih edilir.
 */
function rateBudget(cache: CacheShape, provider: string, limitPerHour: number): boolean {
  const now = Date.now();
  const bucket = cache.rate?.[provider];
  if (!bucket || now - bucket.start > 60 * 60 * 1000) {
    cache.rate = { ...cache.rate, [provider]: { start: now, count: 0 } };
    return true;
  }
  return bucket.count < limitPerHour;
}

function spendRate(cache: CacheShape, provider: string): void {
  const bucket = cache.rate?.[provider];
  if (bucket) bucket.count += 1;
}

async function searchPexels(query: string): Promise<LicensedMediaAsset[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=15`,
    { headers: { Authorization: key }, signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) return [];
  const payload = await response.json() as { photos?: PexelsPhoto[] };
  return (payload.photos || []).map((photo) => ({
    provider: "pexels",
    assetId: String(photo.id),
    licenseId: "pexels-license",
    licenseName: "Pexels License",
    downloadUrl: photo.src?.large2x || photo.src?.original || "",
    sourceUrl: photo.url,
    attribution: `Fotoğraf: ${photo.photographer} / Pexels`,
    caption: (photo.alt || query).slice(0, 180),
    width: photo.width,
    height: photo.height,
  }));
}

async function searchPixabay(query: string): Promise<LicensedMediaAsset[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];
  const params = new URLSearchParams({
    key,
    q: query,
    image_type: "photo",
    orientation: "horizontal",
    min_width: String(MIN_WIDTH),
    per_page: "20",
    safesearch: "true",
  });
  const response = await fetch(`https://pixabay.com/api/?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = await response.json() as { hits?: PixabayHit[] };
  return (payload.hits || []).map((hit) => ({
    provider: "pixabay",
    assetId: String(hit.id),
    licenseId: "pixabay-content-license",
    licenseName: "Pixabay Content License",
    downloadUrl: hit.largeImageURL || "",
    sourceUrl: hit.pageURL,
    attribution: `Görsel: ${hit.user || "Pixabay"} / Pixabay`,
    caption: (hit.tags || query).slice(0, 180),
    width: Number(hit.imageWidth || 0),
    height: Number(hit.imageHeight || 0),
  }));
}

interface ScoredAsset extends LicensedMediaAsset {
  score: number;
}

/** Deterministik puanlama: boyut, oran ve sorgu terimi eşleşmesi. */
export function scoreCandidate(asset: LicensedMediaAsset, query: string): number {
  const hay = asset.caption.toLocaleLowerCase("tr-TR");
  if (isBlockedCandidate(hay)) return -1;
  if (!asset.downloadUrl || !asset.sourceUrl) return -1;
  if (asset.width < MIN_WIDTH || asset.height < 560) return -1;
  const ratio = asset.width / asset.height;
  if (ratio < 1.4 || ratio > 2.4) return -1;

  let score = 0;
  if (asset.width >= 1600) score += 2;
  else if (asset.width >= 1400) score += 1;
  if (ratio >= 1.5 && ratio <= 1.9) score += 3;
  else if (ratio >= 1.45) score += 1;
  const terms = query.split(/\s+/).filter((term) => term.length >= 4);
  for (const term of terms) {
    if (hay.includes(term)) score += 1;
  }
  return score;
}

export interface PickOptions {
  /** Adaylar arasında dönmek için tohum (makale başlığı). */
  seed?: string;
  /** Kullanılmış varlıklar: assetId → son kullanım zamanı. */
  used?: Record<string, number>;
}

export function pickBestCandidate(
  assets: LicensedMediaAsset[],
  query: string,
  options: PickOptions = {},
): LicensedMediaAsset | null {
  const now = Date.now();
  const used = options.used || {};
  const scored = assets
    .map<ScoredAsset>((asset) => ({ ...asset, score: scoreCandidate(asset, query) }))
    .filter((asset) => asset.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.assetId.localeCompare(b.assetId));
  if (!scored.length) return null;
  // Kullanılmışları ele; hepsi tükenmişse en iyiyi tekrar kullanmak,
  // görselsiz kalmaktan iyidir (havuz genelde 15-20 aday).
  const fresh = scored.filter((asset) => {
    const last = used[`${asset.provider}:${asset.assetId}`];
    return !last || now - last > USED_TTL_MS;
  });
  // En iyi üçten biri seçilir: kalite eşiğini geçen adaylar arasında dönmek
  // aynı kategoriye düşen iki haberin aynı fotoğrafı taşımasını engeller.
  const pool = (fresh.length ? fresh : scored).slice(0, 3);
  const index = options.seed ? stableHash(options.seed) % pool.length : 0;
  const { score: _score, ...asset } = pool[index];
  return asset;
}

export function stockMediaConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY);
}

export interface StockSearchResult {
  asset: LicensedMediaAsset | null;
  /** Denenen sağlayıcı ve bulunan aday sayısı — günlük raporda görünür. */
  attempts: Array<{ provider: string; candidates: number; picked: boolean }>;
}

/** Pexels → Pixabay sırasıyla arar; bulunan ilk geçerli adayı döndürür. */
export async function searchStockMedia(
  input: { query: string; category: string; headline: string },
): Promise<StockSearchResult> {
  const query = input.query || buildStockQuery({ title: input.headline, category: input.category });
  const attempts: StockSearchResult["attempts"] = [];
  if (!stockMediaConfigured()) return { asset: null, attempts };

  const cache = await readCache();
  const cacheKey = `query:${query.toLocaleLowerCase("tr-TR")}`;
  const cached = cache.queries?.[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    const picked = pickBestCandidate(cached.assets, query, { seed: input.headline, used: cache.used });
    if (picked) {
      cache.used = { ...cache.used, [`${picked.provider}:${picked.assetId}`]: Date.now() };
      await writeCache(cache);
      return { asset: picked, attempts: [{ provider: picked.provider, candidates: cached.assets.length, picked: true }] };
    }
  }

  const providers: Array<{ name: string; run: (q: string) => Promise<LicensedMediaAsset[]>; limit: number }> = [
    { name: "pexels", run: searchPexels, limit: 190 },
    { name: "pixabay", run: searchPixabay, limit: 900 },
  ];

  for (const provider of providers) {
    if (!rateBudget(cache, provider.name, provider.limit)) {
      attempts.push({ provider: provider.name, candidates: 0, picked: false });
      continue;
    }
    let candidates: LicensedMediaAsset[] = [];
    try {
      spendRate(cache, provider.name);
      candidates = await provider.run(query);
    } catch {
      candidates = [];
    }
    const picked = pickBestCandidate(candidates, query, { seed: input.headline, used: cache.used });
    attempts.push({ provider: provider.name, candidates: candidates.length, picked: Boolean(picked) });
    if (picked) {
      if (candidates.length) {
        cache.queries = { ...cache.queries, [cacheKey]: { assets: candidates, at: Date.now() } };
      }
      cache.used = { ...cache.used, [`${picked.provider}:${picked.assetId}`]: Date.now() };
      await writeCache(cache);
      return { asset: picked, attempts };
    }
  }

  await writeCache(cache);
  return { asset: null, attempts };
}
