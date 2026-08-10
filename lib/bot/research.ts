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
  contentMethod?: "JSON_LD" | "ARTICLE_HTML";
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

/** Saf HTML ayrıştırıcı. Testlerde ağ çağrısı olmadan doğrulanabilir. */
export function extractArticleTextFromHtml(html: string): {
  content: string;
  method: "JSON_LD" | "ARTICLE_HTML";
} | null {
  const bodies: string[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      collectArticleBodies(JSON.parse(decodeHtmlEntities(match[1]).trim()), bodies);
    } catch {
      // Bozuk bir JSON-LD bloğu diğer yapılandırılmış veri bloklarını etkilemez.
    }
  }
  const jsonLd = bodies.map(cleanArticleText).sort((a, b) => b.length - a.length)[0];
  if (jsonLd && jsonLd.length >= 180) return { content: jsonLd, method: "JSON_LD" };

  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (article) {
    const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => cleanArticleText(match[1]))
      .filter((text) => text.length >= 35)
      .join(" ");
    if (paragraphs.length >= 220) return { content: paragraphs.slice(0, MAX_EVIDENCE_CHARS), method: "ARTICLE_HTML" };
  }
  return null;
}

async function fetchEvidenceContent(item: EvidenceItem): Promise<EvidenceItem> {
  const domain = domainFromUrl(item.sourceUrl);
  if (!domain || domain === "news.google.com") return item;
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

export function evidenceMaterialCharacterCount(packet: EvidencePacket): number {
  const unique = new Set(packet.evidence.map((item) => item.content || item.summary).filter(Boolean));
  return [...unique].join(" ").length;
}

export interface EvidencePacket {
  storyKey: string;
  status: "VERIFIED" | "INSUFFICIENT";
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

export function buildEvidencePacket(
  primary: ResearchCandidate,
  candidates: ResearchCandidate[],
): EvidencePacket {
  const eventWindowMs = 14 * 24 * 60 * 60 * 1000;
  const marketSessionWindowMs = 36 * 60 * 60 * 1000;
  const matches = candidates
    .filter((candidate) => candidate.category === primary.category)
    .filter((candidate) => candidate === primary || !hasConflictingStoryPhase(primary.title, candidate.title))
    .filter((candidate) => {
      if (candidate === primary || !primary.pubDate || !candidate.pubDate) return true;
      const window = hasSameStoryPhase(primary.title, candidate.title)
        ? marketSessionWindowMs
        : eventWindowMs;
      return Math.abs(primary.pubDate - candidate.pubDate) <= window;
    })
    .map((candidate) => ({ candidate, similarity: storySimilarity(primary.title, candidate.title) }))
    .filter(({ candidate, similarity }) => candidate === primary || similarity >= 0.44)
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
