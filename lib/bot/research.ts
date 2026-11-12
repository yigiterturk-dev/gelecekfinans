export interface EvidenceItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publisherKey: string;
  publishedAt: string | null;
  sourceScore: number;
  /** Haber sayfasındaki yapılandırılmış articleBody; RSS özetinden ayrıdır. */
  content?: string;
  contentMethod?: "JSON_LD" | "ARTICLE_HTML" | "PARAGRAPH_CLUSTER";
}

const ARTICLE_FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_EVIDENCE_CHARS = 6_000;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function cleanArticleText(value: string): string {
  return decodeHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EVIDENCE_CHARS);
}

function collectArticleBodies(value: unknown, output: string[]): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectArticleBodies(item, output);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.articleBody === "string") output.push(record.articleBody);
  for (const nested of Object.values(record)) collectArticleBodies(nested, output);
}

/**
 * ── ÜÇÜNCÜ STRATEJİ: EN YOĞUN PARAGRAF KÜMESİ ───────────────────────────────
 *
 * ÖLÇÜM (3 Eylül 2026, 80 canlı haber sayfası): sayfaların yalnızca %46'sından
 * kanıt metni çıkıyordu ve en yetkili iki kaynak TAMAMEN başarısızdı
 * (aa.com.tr 0/8, trthaber.com 0/8; kripto şeridinin iki yayıncısı da 0/4).
 * 7 günde 29 konu "Kanıt metni kısa" diyerek buradan öldü.
 *
 * Sebep yapısal: AA'da JSON-LD `articleBody` yalnızca 175 karakterlik spot
 * metnini taşıyor (eşik 180) ve gövde `<article>` etiketinde değil, sınıf
 * adıyla verilmiş bir `div` içinde. İki strateji de kavramıyor.
 *
 * Bu strateji etiket adına değil METNİN YOĞUNLUĞUNA bakar: sayfadaki tüm
 * paragraflar sırayla gezilir, aralarındaki HTML boşluğu küçük kalanlar aynı
 * kümeye yazılır, en çok metin taşıyan küme gövde kabul edilir. Menü, footer
 * ve bağlantı listeleri hem kısa paragraflardan oluştuğu hem de gövdeden uzak
 * durduğu için ayrı ve zayıf kümeler halinde kalır.
 */
const PARAGRAPH_MIN_LENGTH = 35;
const CLUSTER_MAX_GAP = 1500;
const CLUSTER_MIN_LENGTH = 400;
const CLUSTER_MIN_PARAGRAPHS = 3;

function densestParagraphCluster(html: string): string | null {
  // Gövdeyle karışmaması gereken kabuk bölümleri baştan düşürülür.
  const body = html.replace(
    /<(nav|header|footer|aside|form|figure|figcaption)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  type Cluster = { texts: string[]; length: number };
  const clusters: Cluster[] = [];
  let current: Cluster | null = null;
  let previousEnd = -1;

  for (const match of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = cleanArticleText(match[1]);
    if (text.length < PARAGRAPH_MIN_LENGTH) continue;
    const start = match.index;
    if (!current || previousEnd < 0 || start - previousEnd > CLUSTER_MAX_GAP) {
      current = { texts: [], length: 0 };
      clusters.push(current);
    }
    current.texts.push(text);
    current.length += text.length;
    previousEnd = start + match[0].length;
  }

  const best = clusters
    .filter((item) => item.texts.length >= CLUSTER_MIN_PARAGRAPHS && item.length >= CLUSTER_MIN_LENGTH)
    .sort((a, b) => b.length - a.length)[0];
  return best ? best.texts.join(" ").slice(0, MAX_EVIDENCE_CHARS) : null;
}

/** Saf HTML ayrıştırıcı. Testlerde ağ çağrısı olmadan doğrulanabilir. */
export function extractArticleTextFromHtml(html: string): {
  content: string;
  method: "JSON_LD" | "ARTICLE_HTML" | "PARAGRAPH_CLUSTER";
} | null {
  const bodies: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectArticleBodies(JSON.parse(decodeHtmlEntities(match[1]).trim()), bodies);
    } catch {
      // Bozuk bir JSON-LD bloğu diğer yapılandırılmış veri bloklarını etkilemez.
    }
  }
  /**
   * Üç strateji de denenir ve EN UZUN sonuç kazanır; ilk tutan kabul edilmez.
   *
   * Neden: AA'nın JSON-LD `articleBody` alanı yalnızca 236-244 karakterlik
   * spot metnini taşıyor. Eşiği (180) geçtiği için erken dönüş yapılıyor ve
   * sayfanın tam gövdesi hiç aranmıyordu — ölçümde aa.com.tr'nin 8 sayfasının
   * 5'i böyle "kısa" kalıyordu. Kısa bir yapılandırılmış alan, dolu bir
   * gövdeden daha güvenilir değildir.
   */
  const candidates: Array<{ content: string; method: "JSON_LD" | "ARTICLE_HTML" | "PARAGRAPH_CLUSTER" }> = [];

  const jsonLd = bodies.map(cleanArticleText).sort((a, b) => b.length - a.length)[0];
  if (jsonLd && jsonLd.length >= 180) candidates.push({ content: jsonLd, method: "JSON_LD" });

  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (article) {
    const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => cleanArticleText(match[1]))
      .filter((text) => text.length >= PARAGRAPH_MIN_LENGTH)
      .join(" ");
    if (paragraphs.length >= 220) {
      candidates.push({ content: paragraphs.slice(0, MAX_EVIDENCE_CHARS), method: "ARTICLE_HTML" });
    }
  }

  const cluster = densestParagraphCluster(html);
  if (cluster) candidates.push({ content: cluster, method: "PARAGRAPH_CLUSTER" });

  return candidates.sort((a, b) => b.content.length - a.content.length)[0] ?? null;
}

async function fetchEvidenceContent(item: EvidenceItem): Promise<EvidenceItem> {
  const domain = domainFromUrl(item.sourceUrl);
  if (!domain) return item;
  try {
    const response = await fetch(item.sourceUrl, {
      headers: { "User-Agent": ARTICLE_FETCH_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return item;
    const extracted = extractArticleTextFromHtml(await response.text());
    if (!extracted || extracted.content.length <= item.summary.length + 80) return item;
    return { ...item, content: extracted.content, contentMethod: extracted.method };
  } catch {
    return item;
  }
}

export async function enrichEvidencePacket(packet: EvidencePacket): Promise<EvidencePacket> {
  const evidence = await Promise.all(packet.evidence.map(fetchEvidenceContent));
  const enriched = evidence.filter((item) => item.content).length;
  return {
    ...packet,
    evidence,
    reasons: enriched
      ? [...packet.reasons, `${enriched} kaynak sayfasından ayrıntılı kanıt metni çıkarıldı`]
      : packet.reasons,
  };
}

/**
 * Bir haberi kanıta dayanarak yazdırmak için gereken en az ham metin.
 * Bunun altındaki paketlerde elimizde yalnızca RSS özeti vardır ve model
 * boşlukları uydurmak zorunda kalır. Eşik hem yazarda hem de bütçe ayrılmadan
 * önce planlayıcıda kullanılır; iki yerde ayrı sayı tutulmaz.
 */
export const MIN_EVIDENCE_MATERIAL_CHARS = 800;

export function evidenceMaterialCharacterCount(packet: EvidencePacket): number {
  const unique = new Set(packet.evidence.map((item) => item.content || item.summary).filter(Boolean));
  return [...unique].join(" ").length;
}

export interface EvidencePacket {
  storyKey: string;
  status: "VERIFIED" | "INSUFFICIENT" | "ATTRIBUTED";
  independentSourceCount: number;
  evidence: EvidenceItem[];
  reasons: string[];
}

export interface ResearchCandidate {
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  pubDate: number;
  sourcePriority: number;
  category: string;
}

const STOP_WORDS = new Set([
  "aciklandi", "acikladi", "ardindan", "bugun", "dair", "daha", "icin", "ile",
  "ilgili", "karsi", "son", "sonra", "olan", "olarak", "oldu", "uzere", "ve", "veya",
  "yeni", "gore", "iste", "dedi", "geldi", "etti", "haber", "dakika", "turkiye",
  "ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos",
  "eylul", "ekim", "kasim", "aralik", "pazartesi", "sali", "carsamba", "persembe",
  "cuma", "cumartesi", "pazar",
]);

function ascii(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
}

function stripPublisherSuffix(title: string): string {
  const parts = title.split(/\s+-\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" - ") : title;
}

export function storyTokens(title: string): string[] {
  return ascii(stripPublisherSuffix(title))
    .split(/\s+/)
    .flatMap((token) => token === "tcmb" ? ["merkez", "bankasi"] : [token])
    .map((token) => token.length > 6 && token.endsWith("ini") ? token.slice(0, -3) : token)
    .map((token) => token.length > 5 && /(?:da|de|ta|te)$/.test(token) ? token.slice(0, -2) : token)
    .filter((token) => {
      if (STOP_WORDS.has(token)) return false;
      if (/^\d+$/.test(token)) {
        const numeric = Number(token);
        // Gün ve yıl değerleri olay benzerliğini yapay biçimde yükseltmesin.
        return !((numeric >= 1 && numeric <= 31) || (numeric >= 1900 && numeric <= 2100));
      }
      return token.length >= 3;
    });
}

function numericTokens(value: string): Set<string> {
  return new Set(ascii(value).match(/\d+(?:[.,]\d+)?%?/g) || []);
}

export function storySimilarity(a: string, b: string): number {
  const left = new Set(storyTokens(a));
  const right = new Set(storyTokens(b));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(left.size, right.size);

  const leftNumbers = numericTokens(a);
  const rightNumbers = numericTokens(b);
  const sameNumber = [...leftNumbers].some((token) => rightNumbers.has(token));
  const numberBoost = sameNumber ? 0.12 : 0;
  const samePhase = hasSameStoryPhase(a, b);
  const phaseBoost = samePhase ? 0.12 : 0;
  const phaseFloor = samePhase && intersection >= 1 ? 0.48 : 0;
  return Math.min(1, Math.max(jaccard, containment * 0.82, phaseFloor) + numberBoost + phaseBoost);
}

function hasStoryPhase(value: string, phase: "OPEN" | "CLOSE"): boolean {
  const normalized = ` ${ascii(value)} `;
  const patterns = phase === "OPEN"
    ? [" acildi ", " acilis ", " acilista ", " gune basladi "]
    : [" kapandi ", " kapanis ", " kapanisi ", " kapatti ", " kapadi ", " tamamladi ", " noktaladi "];
  return patterns.some((pattern) => normalized.includes(pattern));
}

function hasSameStoryPhase(a: string, b: string): boolean {
  return (
    (hasStoryPhase(a, "OPEN") && hasStoryPhase(b, "OPEN")) ||
    (hasStoryPhase(a, "CLOSE") && hasStoryPhase(b, "CLOSE"))
  );
}

export function hasConflictingStoryPhase(a: string, b: string): boolean {
  return (
    (hasStoryPhase(a, "OPEN") && hasStoryPhase(b, "CLOSE")) ||
    (hasStoryPhase(a, "CLOSE") && hasStoryPhase(b, "OPEN"))
  );
}

function domainFromUrl(url?: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

function publisherFromGoogleTitle(title: string): string | null {
  const parts = title.split(/\s+-\s+/);
  return parts.length > 1 ? ascii(parts.at(-1) || "") : null;
}

const DOMAIN_PUBLISHERS: Record<string, string> = {
  "aa.com.tr": "anadolu-ajansi",
  "bloomberght.com": "bloomberg-ht",
  "btchaber.com": "btc-haber",
  "dunya.com": "dunya",
  "haberturk.com": "haberturk",
  "koinmedya.com": "koin-medya",
  "ntv.com.tr": "ntv",
  "sozcu.com.tr": "sozcu",
  "trthaber.com": "trt-haber",
  "ekonomim.com": "ekonomim",
  "investing.com": "investing",
  "uzmancoin.com": "uzmancoin",
  "kriptohaber.com.tr": "kripto-haber",
  "yenisafak.com": "yeni-safak",
  "sabah.com.tr": "sabah",
  "tgrthaber.com": "tgrt-haber",
  "indyturk.com": "independent-turkce",
};

const LABEL_PUBLISHERS: Array<[RegExp, string]> = [
  [/anadolu ajansi|\baa\b/i, "anadolu-ajansi"],
  [/bloomberg ht/i, "bloomberg-ht"],
  [/btc haber/i, "btc-haber"],
  [/\bdunya\b/i, "dunya"],
  [/haberturk/i, "haberturk"],
  [/koin medya/i, "koin-medya"],
  [/\bntv\b/i, "ntv"],
  [/sozcu/i, "sozcu"],
];

function canonicalPublisherLabel(value: string): string {
  const normalized = ascii(value);
  return LABEL_PUBLISHERS.find(([pattern]) => pattern.test(normalized))?.[1] || normalized;
}

export function publisherKey(candidate: Pick<ResearchCandidate, "source" | "sourceUrl" | "title">): string {
  const domain = domainFromUrl(candidate.sourceUrl);
  if (domain && domain !== "news.google.com") {
    return `publisher:${DOMAIN_PUBLISHERS[domain] || domain}`;
  }
  if (domain === "news.google.com") {
    const publisher = publisherFromGoogleTitle(candidate.title);
    if (publisher) return `publisher:${canonicalPublisherLabel(publisher)}`;
  }
  return `publisher:${canonicalPublisherLabel(candidate.source).slice(0, 80) || "unknown"}`;
}

function evidenceSourceName(candidate: ResearchCandidate): string {
  return domainFromUrl(candidate.sourceUrl) === "news.google.com"
    ? candidate.title.split(/\s+-\s+/).at(-1)?.trim() || candidate.source
    : candidate.source;
}

function evidenceId(candidate: ResearchCandidate, index: number): string {
  const key = `${publisherKey(candidate)}-${ascii(stripPublisherSuffix(candidate.title)).slice(0, 48)}`;
  return `ev-${index + 1}-${key.replace(/\s+/g, "-")}`;
}

export const STORY_MATCH_THRESHOLD = 0.44;
/**
 * Hakeme sorulacak adayın taşıması gereken en az metin örtüşmesi. Bu eşik
 * KARAR eşiği değil, yalnızca ucuz bir ön elemedir: kararı model verir, o
 * yüzden burada isabet değil kapsama önemlidir. Ölçüm: aynı olayın iki
 * manşeti arasında BAŞLIK benzerliği 0 olabiliyor, özetler katılınca 0.29'a
 * çıkıyor — bu yüzden ön eleme başlık+özet üzerinden yapılır.
 */
export const STORY_GRAY_BAND_MIN = Number(process.env.STORY_GRAY_BAND_MIN) || 0.2;

function storyText(candidate: ResearchCandidate): string {
  return `${candidate.title} ${candidate.summary}`;
}

/**
 * Kategori, olay evresi ve zaman penceresi elemelerinden geçen adaylar.
 * Hem kanıt paketi hem de hakeme sorulacak gri bant aynı elemeyi kullanır ki
 * iki yer birbirinden ayrı düşmesin.
 */
function eligibleCandidates(
  primary: ResearchCandidate,
  candidates: ResearchCandidate[],
): Array<{ candidate: ResearchCandidate; similarity: number }> {
  const eventWindowMs = 14 * 24 * 60 * 60 * 1000;
  const marketSessionWindowMs = 36 * 60 * 60 * 1000;
  /**
   * KATEGORI ESITLIGI ARANMAZ.
   *
   * NEDEN (olcum, 2026-09-02, 74 konuluk canli havuz):
   * Kategori, konunun KENDI siniflandiricimizdan gelen bir etiket; ayni olayi
   * iki yayinci farkli kovaya dusurebiliyor ("TCMB faiz karari" birinde
   * ekonomi, digerinde doviz). Esitlik sart kosulunca gercek ikinci yayinci
   * hakeme hic ulasamadan eleniyordu:
   *   hakeme gidebilen konu    48/74 -> 57/74
   *   hakemsiz dogrulanan konu 12/74 -> 18/74  (+%50)
   * Kapinin katiligi DEGISMEDI: hala iki bagimsiz yayinci ve ya baslik
   * benzerligi esigi ya da hakemin "ayni olay" onayi gerekiyor. Kategori
   * yalnizca bir vekil olcuttu; olay kimligini benzerlik ve hakem belirliyor.
   */
  return candidates
    .filter((candidate) => candidate === primary || !hasConflictingStoryPhase(primary.title, candidate.title))
    .filter((candidate) => {
      if (candidate === primary || !primary.pubDate || !candidate.pubDate) return true;
      const window = hasSameStoryPhase(primary.title, candidate.title)
        ? marketSessionWindowMs
        : eventWindowMs;
      return Math.abs(primary.pubDate - candidate.pubDate) <= window;
    })
    .map((candidate) => ({ candidate, similarity: storySimilarity(primary.title, candidate.title) }));
}

/**
 * Başlık benzerliği eşiği tutturamayan ama aynı olayı anlatıyor olabilecek
 * adaylar. Aynı olayın manşetleri gazeteden gazeteye çok değiştiği için
 * (ölçüm: aynı olay 0.296, farklı olay 0.269 — sadece metinle ayrılamıyor)
 * bu adaylar hakeme sorulur. Kendi yayıncısı ve zaten eşleşenler hariç.
 */
export function grayBandCandidates(
  primary: ResearchCandidate,
  candidates: ResearchCandidate[],
  limit = 3,
): ResearchCandidate[] {
  const primaryPublisher = publisherKey(primary);
  const seen = new Set<string>([primaryPublisher]);
  const output: ResearchCandidate[] = [];
  const primaryText = storyText(primary);
  const ranked = eligibleCandidates(primary, candidates)
    .filter(({ candidate, similarity }) =>
      candidate !== primary &&
      Boolean(candidate.sourceUrl) &&
      similarity < STORY_MATCH_THRESHOLD)
    .map(({ candidate }) => ({ candidate, textSimilarity: storySimilarity(primaryText, storyText(candidate)) }))
    .filter(({ textSimilarity }) => textSimilarity >= STORY_GRAY_BAND_MIN)
    .sort((a, b) => b.textSimilarity - a.textSimilarity || b.candidate.sourcePriority - a.candidate.sourcePriority);
  for (const { candidate } of ranked) {
    const key = publisherKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
    if (output.length >= limit) break;
  }
  return output;
}

export function buildEvidencePacket(
  primary: ResearchCandidate,
  candidates: ResearchCandidate[],
  /**
   * Hakem tarafından "aynı olay" onayı almış adaylar. Yalnızca bu küme
   * benzerlik eşiğini atlayabilir; boş bırakılırsa davranış eskisiyle aynıdır.
   */
  judgedSameStory?: ReadonlySet<ResearchCandidate>,
): EvidencePacket {
  const matches = eligibleCandidates(primary, candidates)
    .filter(({ candidate, similarity }) =>
      candidate === primary ||
      similarity >= STORY_MATCH_THRESHOLD ||
      judgedSameStory?.has(candidate) === true)
    .sort((a, b) =>
      b.candidate.sourcePriority - a.candidate.sourcePriority ||
      b.similarity - a.similarity ||
      b.candidate.pubDate - a.candidate.pubDate,
    );

  const seenPublishers = new Set<string>();
  const evidence: EvidenceItem[] = [];
  for (const { candidate } of matches) {
    const key = publisherKey(candidate);
    if (seenPublishers.has(key) || !candidate.sourceUrl) continue;
    seenPublishers.add(key);
    evidence.push({
      id: evidenceId(candidate, evidence.length),
      title: stripPublisherSuffix(candidate.title),
      summary: candidate.summary,
      source: evidenceSourceName(candidate),
      sourceUrl: candidate.sourceUrl,
      publisherKey: key,
      publishedAt: candidate.pubDate ? new Date(candidate.pubDate).toISOString() : null,
      sourceScore: Math.min(100, 35 + candidate.sourcePriority * 20 + (candidate.summary.length >= 100 ? 5 : 0)),
    });
    if (evidence.length >= 6) break;
  }

  const independentSourceCount = evidence.length;
  const status = independentSourceCount >= 2 ? "VERIFIED" : "INSUFFICIENT";
  return {
    storyKey: storyTokens(primary.title).slice(0, 8).join("-"),
    status,
    independentSourceCount,
    evidence,
    reasons: status === "VERIFIED"
      ? [`${independentSourceCount} bağımsız yayıncı aynı olayı destekliyor`]
      : ["İkinci bağımsız yayıncı bulunamadı; içerik üretimi durduruldu"],
  };
}


/**
 * KULİS / TEK KAYNAK ATIFLI ŞERİT
 *
 * Normal kural: iki bağımsız yayıncı. İstisna: tek, bilinen bir ana akım
 * yayıncıdan gelen ve kulis/iddia/beklenti niteliği taşıyan haber, ancak
 * metinde kaynağa AÇIKÇA atıf yapılarak ("X'e göre") yazılabilir. Paket
 * "ATTRIBUTED" olur; "VERIFIED" ile karıştırılmaz, kalite kapısı atıfı ayrıca arar.
 */
const ATTRIBUTION_DOMAINS = new Set([
  "sozcu.com.tr", "hurriyet.com.tr", "milliyet.com.tr", "dunya.com",
  "bloomberght.com", "haberturk.com", "ntv.com.tr", "aa.com.tr", "cnnturk.com",
]);
const ATTRIBUTION_MARKERS = /kulis|kaynaklara göre|öğrenildi|öğrenildiğine|iddia|bekleniyor|değerlendiriliyor|masada|planlanıyor|hazırlık/i;
const ATTRIBUTION_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function toAttributedPacket(packet: EvidencePacket | undefined, now = Date.now()): EvidencePacket | null {
  if (!packet || packet.status === "VERIFIED" || packet.independentSourceCount !== 1) return null;
  const item = packet.evidence[0];
  if (!item?.sourceUrl) return null;
  const domain = domainFromUrl(item.sourceUrl).replace(/^www\./, "");
  if (!ATTRIBUTION_DOMAINS.has(domain)) return null;
  if (!ATTRIBUTION_MARKERS.test(`${item.title} ${item.summary}`)) return null;
  const published = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
  if (!isFinite(published) || now - published > ATTRIBUTION_MAX_AGE_MS) return null;
  return {
    ...packet,
    status: "ATTRIBUTED",
    reasons: [`Tek kaynak (${item.source}); metin kaynağa atıfla yazılmalı`],
  };
}
