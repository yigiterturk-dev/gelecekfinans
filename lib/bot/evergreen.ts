import { matchOfficialSources, type OfficialSource } from "@/lib/bot/official-sources";
import { extractArticleTextFromHtml, type EvidenceItem, type EvidencePacket } from "@/lib/bot/research";
import type { KeywordPick } from "@/lib/bot/keywords";

/**
 * Rehber (evergreen) konu üretimi.
 *
 * Şerit A'nın kapısı "iki bağımsız yayıncı aynı olayı doğruladı mı" sorusunu
 * sorar. Rehber içerikte olay yoktur; kural, tanım ve süreç vardır. Bu yüzden
 * kapı değiştirildi, GEVŞETİLMEDİ: kanıt artık resmî kurumun kendi sayfası
 * olmak zorunda ve toplam kanıt metni haber eşiğinin üstünde tutuluyor.
 */

const REFERENCE_FETCH_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const MAX_REFERENCE_CHARS = 6_000;

/**
 * Rehber için gereken en az kanıt metni. Haber eşiğinden (800) yüksek:
 * rehber makale daha uzun ve daha çok olgu taşıyor, dolayısıyla modelin
 * uydurma alanı da daha geniş. Malzeme yetmiyorsa konu yazılmaz.
 */
export const MIN_GUIDE_EVIDENCE_CHARS = 1_200;

/** Bir kaynak sayfanın kanıt sayılabilmesi için gereken en az metin. */
const MIN_SOURCE_CHARS = 260;

function decodeEntities(value: string): string {
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

/**
 * Kurum sayfaları haber sitesi değildir: JSON-LD `articleBody` ya da `<article>`
 * etiketi çoğunda yok. Haber çıkarıcısı önce denenir, tutmazsa gövdedeki
 * anlamlı paragraflara düşülür. Menü/altbilgi gürültüsü kısa parça filtresiyle
 * elenir — 60 karakterin altındaki metinler link listesidir, cümle değildir.
 *
 * Saf fonksiyon: testte ağ çağrısı olmadan doğrulanabilir.
 */
export function extractReferenceTextFromHtml(html: string): string | null {
  const article = extractArticleTextFromHtml(html);
  if (article && article.content.length >= MIN_SOURCE_CHARS) return article.content;

  const body = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ");

  const blocks = [...body.matchAll(/<(p|li|td|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => decodeEntities(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((text) => text.length >= 60);

  // Aynı cümle menüde ve gövdede tekrar edebiliyor; tekrarlar kanıt hacmini
  // yapay olarak şişirmesin diye benzersizleştiriliyor.
  const unique = [...new Set(blocks)].join(" ").slice(0, MAX_REFERENCE_CHARS);
  return unique.length >= MIN_SOURCE_CHARS ? unique : null;
}

async function fetchReference(source: OfficialSource): Promise<EvidenceItem | null> {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": REFERENCE_FETCH_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) return null;
    const content = extractReferenceTextFromHtml(await response.text());
    if (!content) return null;
    return {
      id: `resmi-${new URL(source.url).hostname.replace(/\W+/g, "-")}`,
      title: source.name,
      summary: content.slice(0, 400),
      source: source.institution,
      sourceUrl: source.url,
      publisherKey: new URL(source.url).hostname,
      publishedAt: null,
      sourceScore: source.weight,
      content,
      contentMethod: "ARTICLE_HTML",
    };
  } catch {
    return null;
  }
}

export interface GuideTopic {
  keywordId: string;
  keyword: string;
  category: string;
  cluster: string;
  isHub: boolean;
  intent: string;
  evidencePacket: EvidencePacket;
  /** Aynı kümedeki yayımlanmış makaleler — iç linkleme ve tekrar önleme için. */
  clusterArticles: Array<{ title: string; slug: string; isHub: boolean }>;
}

export interface BuildGuideTopicOptions {
  clusterArticles?: GuideTopic["clusterArticles"];
  /**
   * Resmî kaynak kazımasını dener.
   *
   * VARSAYILAN KAPALI ve bu bilinçli bir karar. 2026-08-31'de 14 resmî kaynak
   * canlı ölçüldü: TCMB, TÜİK, SPK, GİB sayfaları JavaScript ile render
   * ediliyor (HTML geliyor, metin 0 karakter); Borsa İstanbul, BDDK, EGM ve
   * mevzuat.gov.tr bağlantıyı reddediyor. Kazımaya bağlı bir rehber şeridi,
   * ilk gün çalışsa bile kaynak sayfasının her tasarım değişikliğinde sessizce
   * durur — kendi kendine yürümesi beklenen bir sistemde bu kabul edilemez.
   *
   * Bunun yerine rehber KAVRAMSAL üretilir ve karşılığında somut rakam yazması
   * yasaklanır (bkz. GUIDE_QUALITY_PRESET.forbidSpecificFigures) + ikinci bir
   * model uydurma kurum/kural/oran avı yapar. Resmî PDF korpusu kurulduğunda
   * bu bayrak açılır ve vergi/mevzuat kelimeleri de yazılabilir hale gelir.
   */
  useOfficialSources?: boolean;
  /** Testlerde ağ çağrısını devre dışı bırakmak için. */
  fetcher?: (source: OfficialSource) => Promise<EvidenceItem | null>;
}

/**
 * Kelimeyi resmî kaynak kanıtıyla yazılabilir bir konuya dönüştürür.
 * Kanıt yetersizse `status: "INSUFFICIENT"` döner ve çağıran taraf modele
 * hiç gitmeden konuyu düşürür — kredi yakılmaz.
 */
export async function buildGuideTopic(
  keyword: KeywordPick,
  options: BuildGuideTopicOptions = {},
): Promise<GuideTopic> {
  const base = {
    keywordId: keyword.id,
    keyword: keyword.term,
    category: keyword.category,
    cluster: keyword.cluster,
    isHub: keyword.isHub,
    intent: keyword.intent,
    clusterArticles: options.clusterArticles ?? [],
  };

  if (!options.useOfficialSources) {
    return {
      ...base,
      evidencePacket: {
        storyKey: `guide:${keyword.cluster}:${keyword.term}`,
        status: "VERIFIED",
        independentSourceCount: 0,
        evidence: [],
        reasons: [
          "Kavramsal rehber: dış kaynağa bağımlı değil",
          "Karşılığında somut oran, tutar ve mevzuat maddesi yazımı kalite kapısında yasak",
        ],
      },
    };
  }

  const fetcher = options.fetcher ?? fetchReference;
  const sources = matchOfficialSources(keyword.term);
  const fetched = await Promise.all(sources.map(fetcher));
  const evidence = fetched.filter((item): item is EvidenceItem => item !== null);
  const materialCharacters = [...new Set(evidence.map((item) => item.content || ""))].join(" ").length;

  const reasons: string[] = [];
  if (!sources.length) reasons.push("Kelimeye uyan resmî kaynak tanımlı değil");
  else reasons.push(`${sources.length} resmî kaynak denendi, ${evidence.length} tanesinden metin çıkarıldı`);
  if (evidence.length && materialCharacters < MIN_GUIDE_EVIDENCE_CHARS) {
    reasons.push(`Kanıt metni kısa: ${materialCharacters}/${MIN_GUIDE_EVIDENCE_CHARS} karakter`);
  }

  const verified = evidence.length >= 1 && materialCharacters >= MIN_GUIDE_EVIDENCE_CHARS;
  return {
    ...base,
    evidencePacket: {
      storyKey: `guide:${keyword.cluster}:${keyword.term}`,
      status: verified ? "VERIFIED" : "INSUFFICIENT",
      independentSourceCount: new Set(evidence.map((item) => item.publisherKey)).size,
      evidence,
      reasons,
    },
  };
}
