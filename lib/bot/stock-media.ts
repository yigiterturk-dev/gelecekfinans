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
const MIN_WIDTH = 1024;

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
  // Özgül konular başta: ilk eşleşen varlık sorgunun başına geçer.
  { pattern: /gümrük/i, term: "customs cargo containers" },
  { pattern: /ihracat|ithalat|dış ticaret/i, term: "cargo containers port" },
  { pattern: /elektri/i, term: "electricity power lines" },
  { pattern: /resesyon|durgunluk/i, term: "recession economy" },
  { pattern: /\bbitcoin|btc\b/i, term: "bitcoin" },
  { pattern: /\bethereum|eth\b/i, term: "ethereum" },
  { pattern: /\bdolar|usd\b/i, term: "us dollar" },
  { pattern: /\beuro|eur\b/i, term: "euro banknotes" },
  { pattern: /\bsterlin|gbp\b/i, term: "pound sterling" },
  { pattern: /\baltın|gram altın|ons\b/i, term: "gold" },
  { pattern: /\bbist|borsa istanbul\b/i, term: "istanbul stock exchange" },
  { pattern: /\bfed|federal reserve\b/i, term: "federal reserve" },
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
  "mumbai",
  "bombay",
  "india",
];

export function isBlockedCandidate(text: string): boolean {
  // Pixabay etiketleri virgülle gelir ("piggy, bank"); ayırıcı boşluğa
  // çevrilmezse "piggy bank" engeli hiç tutmuyordu (11-17).
  const hay = text.toLocaleLowerCase("tr-TR").replace(/\s*,\s*/g, " ");
  return BLOCKED_TERMS.some((term) => hay.includes(term));
}

/**
 * Stok fotoğrafın kullanılabileceği SOMUT konular. Etiket içinde alt-dize
 * eşleşmesi güvenilmez çıktı (11-17: "federal reserve" → "nature reserve"
 * zürafa, "gold" → şarap kadehi, "central bank" → Mumbai binası). Bu yüzden
 * her konu kendi hassas sorgusuyla aranır ve aday ancak `tags` listesindeki
 * etiketlerden biri BİREBİR geçerse kabul edilir. Soyut konular (cari açık,
 * memur zammı, enflasyon) burada yok → markalı kart kalır.
 */
export const STOCK_SUBJECTS: Array<{ pattern: RegExp; query: string; tags: string[] }> = [
  { pattern: /gümrük|ihracat|ithalat|dış ticaret/i, query: "container ship port", tags: ["container ship", "container port", "cargo containers", "container terminal", "containers", "container"] },
  { pattern: /bitcoin|\bbtc\b/i, query: "bitcoin coin", tags: ["bitcoin", "btc"] },
  { pattern: /ethereum/i, query: "ethereum coin", tags: ["ethereum"] },
  { pattern: /kripto/i, query: "cryptocurrency coins", tags: ["cryptocurrency", "bitcoin", "crypto"] },
  { pattern: /(^|[^a-zçğıöşü])altın([^a-zçğıöşü]|$)|altına dayalı|altın(ı|ın) /i, query: "gold bars bullion", tags: ["gold bars", "gold bar", "bullion", "gold bullion"] },
  { pattern: /petrol|akaryakıt|motorin|benzin/i, query: "oil refinery", tags: ["refinery", "oil refinery", "oil rig", "oil industry", "petroleum"] },
  { pattern: /doğal ?gaz/i, query: "natural gas pipeline", tags: ["pipeline", "gas pipeline", "natural gas"] },
  { pattern: /elektri/i, query: "power lines electricity", tags: ["power lines", "power line", "power pole", "pylon", "high voltage"] },
  { pattern: /konut|kira\b|kira |emlak/i, query: "apartment buildings", tags: ["apartment", "apartments", "apartment building", "residential", "real estate"] },
  { pattern: /borsa|hisse|bist/i, query: "stock market chart", tags: ["stock market", "stock exchange", "stock trading", "stocks"] },
  { pattern: /yapay zeka/i, query: "artificial intelligence", tags: ["artificial intelligence"] },
  { pattern: /\bdolar|\busd\b/i, query: "us dollar banknotes", tags: ["us dollar", "us-dollar", "dollar bills", "dollars", "dollar"] },
  { pattern: /\beuro\b|\beur\b/i, query: "euro banknotes", tags: ["euro", "euro banknotes", "euros"] },
];

export function matchStockSubject(input: { title: string; keyword?: string | null }) {
  const text = `${input.title} ${input.keyword || ""}`.toLocaleLowerCase("tr-TR");
  return STOCK_SUBJECTS.find((subject) => subject.pattern.test(text)) || null;
}

export function hasRequiredTag(caption: string, tags: string[]): boolean {
  const have = new Set(caption.toLocaleLowerCase("en-US").split(",").map((t) => t.trim()));
  return tags.some((tag) => have.has(tag));
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
  const combined = `${head} ${base}`.trim();
  // "TCMB" hem varlık sözlüğünden hem kategori tabanından "central bank"
  // getiriyordu; tekrarlanan terim aramayı bozuyor.
  return [...new Set(combined.split(/\s+/))].join(" ");
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

interface OpenverseResult {
  id: string;
  title?: string | null;
  url?: string;
  width?: number;
  height?: number;
  creator?: string | null;
  foreign_landing_url?: string;
  license?: string;
  license_version?: string;
  source?: string;
}

/**
 * Anahtarsız sağlayıcı: Openverse (CC0 / kamu malı / CC BY / CC BY-SA).
 *
 * Pexels yeni anahtar vermeyi durdurduğunda sistemin tamamen görselsiz
 * kalmaması için eklendi. Ticari kullanıma kapalı lisanslar (NC/ND) ve
 * atıf gerektiren lisanslar kabul edilir, ama atıf zorunlu olanlar için
 * makale sayfasında künye basılır (bkz. imageCredit).
 */
const OPENVERSE_LICENSES: Record<string, string> = {
  cc0: "CC0",
  pdm: "Kamu Malı İşareti",
  by: "CC BY",
  "by-sa": "CC BY-SA",
};

function openverseLicense(result: OpenverseResult): { id: string; name: string } | null {
  const code = (result.license || "").toLocaleLowerCase("tr-TR");
  const name = OPENVERSE_LICENSES[code];
  if (!name) return null;
  const version = result.license_version ? ` ${result.license_version}` : "";
  return { id: `${code}${version ? `-${result.license_version}` : ""}`, name: `${name}${version}` };
}

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

/**
 * Wikimedia dosya URL'ini 1600px küçük resme çevirir.
 * Orijinal 4000px dosyayı indirmek disk ve bant genişliği israfı; küçük resim
 * yolu dosya adından türetilebiliyor. Türetilemezse orijinal kalır.
 */
export function wikimediaThumb(url: string, width = 1600): string {
  const match = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+)\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/.exec(url);
  if (!match || !IMAGE_EXTENSIONS.test(match[4])) return url;
  const [, root, first, second, file] = match;
  return `${root}/thumb/${first}/${second}/${file}/${width}px-${file}`;
}

async function searchOpenverse(query: string): Promise<LicensedMediaAsset[]> {
  // `size=large` BİLEREK yok: Openverse'te onu eklemek havuzu 20 sonuçtan
  // 2 sonuca düşürüyor ve genelde portre çıkıyor. Oran/boyut eşiğini zaten
  // puanlama uyguluyor.
  const params = new URLSearchParams({
    q: query,
    license: "cc0,pdm,by,by-sa",
    orientation: "landscape",
    page_size: "20",
  });
  const response = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`, {
    headers: { "User-Agent": "gelecekfinans/1.0 (+https://gelecekfinans.com)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return [];
  const payload = await response.json() as { results?: OpenverseResult[] };
  const terms = query.toLocaleLowerCase("tr-TR").split(/\s+/).filter((term) => term.length >= 4);
  const seen = new Set<string>();
  return (payload.results || []).flatMap((result) => {
    // Openverse aynı dosyayı farklı boyutlarda tekrar tekrar döndürüyor.
    const dedupeKey = result.foreign_landing_url || result.url || "";
    if (!dedupeKey || seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);
    const license = openverseLicense(result);
    const title = (result.title || "").trim();
    if (!license || !result.url || !result.foreign_landing_url || !title) return [];
    // Anahtarsız kaynakta alakasız görsel bol; sorgu terimlerinden en az biri
    // başlıkta geçmiyorsa aday hiç listeye girmesin.
    const hay = title.toLocaleLowerCase("tr-TR");
    if (terms.length && !terms.some((term) => hay.includes(term))) return [];
    return [{
      provider: "openverse",
      assetId: result.id,
      licenseId: license.id,
      licenseName: license.name,
      downloadUrl: wikimediaThumb(result.url),
      sourceUrl: result.foreign_landing_url,
      attribution: `Fotoğraf: ${result.creator || result.source || "Openverse"} / ${license.name}`,
      caption: title.slice(0, 180),
      width: Number(result.width || 0),
      height: Number(result.height || 0),
    }];
  });
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
    // Birebir etiket kuralından 20 adayın 3-5'i geçiyordu → aynı foto 4-6
    // yazıda tekrar ediyordu (11-17). Pixabay'in izin verdiği üst sınır 200.
    per_page: "200",
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
  /** Adayın başlığında geçmesi gereken en az sorgu terimi sayısı. */
  minTermMatches?: number;
  /** false: taze aday yoksa null döner (tekrar foto yerine kart). */
  allowReuse?: boolean;
}

function countTermMatches(text: string, query: string): number {
  const hay = text.toLocaleLowerCase("tr-TR");
  const terms = query.toLocaleLowerCase("tr-TR").split(/\s+/).filter((term) => term.length >= 4);
  return terms.filter((term) => hay.includes(term)).length;
}

export function pickBestCandidate(
  assets: LicensedMediaAsset[],
  query: string,
  options: PickOptions = {},
): LicensedMediaAsset | null {
  const now = Date.now();
  const used = options.used || {};
  const minMatches = options.minTermMatches ?? 0;
  const scored = assets
    .map<ScoredAsset>((asset) => ({ ...asset, score: scoreCandidate(asset, query) }))
    .filter((asset) => asset.score >= MIN_SCORE)
    .filter((asset) => countTermMatches(asset.caption, query) >= minMatches)
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
  if (!fresh.length && options.allowReuse === false) return null;
  const pool = (fresh.length ? fresh : scored).slice(0, 3);
  const index = options.seed ? stableHash(options.seed) % pool.length : 0;
  const { score: _score, ...asset } = pool[index];
  return asset;
}

/**
 * Anahtarsız Openverse VARSAYILAN OLARAK KAPALI.
 *
 * Ölçüldü (2026-11): "gold bullion" aramasının 20 sonucundan 18'i
 * "Johnnie Walker Gold Bullion Body painting" fotoğraflarıydı; kullanılabilir
 * tek kare 4:3 olduğu için eşiği geçmiyordu. Finans havuzu için güvenilir
 * değil. Anahtar yoksa markalı kart, alakasız fotoğraftan iyidir.
 */
export function openverseEnabled(): boolean {
  return process.env.STOCK_KEYLESS_OPENVERSE === "1";
}

export function stockMediaConfigured(): boolean {
  return Boolean(
    process.env.PEXELS_API_KEY || process.env.PIXABAY_API_KEY || openverseEnabled(),
  );
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
  // Brief sorgusu Türkçe ("sonradan kontrol denetimleri Gümrük ...") ve
  // stok sağlayıcılar İngilizce arıyor: "kontrol" → "control" eşleşip gümrük
  // yazısına ses mikseri geldi (11-17). Sorgu HER ZAMAN İngilizce sözlükten
  // kurulur; Türkçe metin yalnızca varlık yakalamak için anahtar kelimeye girer.
  const subject = matchStockSubject({ title: input.headline, keyword: input.query });
  const attempts: StockSearchResult["attempts"] = [];
  if (!subject || !stockMediaConfigured()) return { asset: null, attempts };
  const query = subject.query;
  const onTopic = (assets: LicensedMediaAsset[]) => assets.filter((a) => hasRequiredTag(a.caption, subject.tags));

  const cache = await readCache();
  const cacheKey = `query:${query.toLocaleLowerCase("tr-TR")}`;
  const cached = cache.queries?.[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    const minTermMatches = query.split(/\s+/).filter((term) => term.length >= 4).length >= 2 ? 2 : 1;
    const picked = pickBestCandidate(onTopic(cached.assets), query, {
      seed: input.headline, used: cache.used, minTermMatches, allowReuse: false,
    });
    if (picked) {
      cache.used = { ...cache.used, [`${picked.provider}:${picked.assetId}`]: Date.now() };
      await writeCache(cache);
      return { asset: picked, attempts: [{ provider: picked.provider, candidates: cached.assets.length, picked: true }] };
    }
  }

  const providers: Array<{ name: string; run: (q: string) => Promise<LicensedMediaAsset[]>; limit: number; minTermMatches: number }> = [
    { name: "pexels", run: searchPexels, limit: 190, minTermMatches: 0 },
    // Pixabay etiketleri İngilizce; en az bir sorgu terimi etikette geçmeli,
    // yoksa alakasız ama "yüksek puanlı" (boyut/oran) foto seçiliyor.
    { name: "pixabay", run: searchPixabay, limit: 900, minTermMatches: 1 },
  ];
  if (openverseEnabled()) {
    // Anahtarsız kaynakta sonuç havuzu gürültülü: "Spice Market Istanbul"
    // "stock market" sorgusuna düşebiliyor. Bu yüzden en az iki terim aranır.
    providers.push({ name: "openverse", run: searchOpenverse, limit: 150, minTermMatches: 2 });
  }

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
    const picked = pickBestCandidate(onTopic(candidates), query, {
      seed: input.headline, used: cache.used, minTermMatches: provider.minTermMatches, allowReuse: false,
    });
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
