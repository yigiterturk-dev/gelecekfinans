import Parser from "rss-parser";
import { RSS_FEEDS } from "./config";
import { judgeSameStory, resetSameStoryJudgeBudget } from "./writer";
import {
  buildEvidencePacket,
  enrichEvidencePacket,
  grayBandCandidates,
  storySimilarity,
  type EvidencePacket,
  type ResearchCandidate,
} from "./research";

export interface Topic {
  title: string;
  summary: string;
  category: string;
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
  relevanceScore?: number;
  relevanceReasons?: string[];
  evidencePacket?: EvidencePacket;
}

const parser = new Parser({ timeout: 10000 });

// Bazı Türk siteleri User-Agent'sız isteği bloklar; gerçek tarayıcı UA ile çekiyoruz.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function extractImageFromContent(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

// Feed'i önce UA'lı fetch ile çek, parseString'e ver; olmazsa parser.parseURL fallback.
async function fetchFeed(url: string) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return await parser.parseString(xml);
  } catch {
    return await parser.parseURL(url);
  }
}

interface RawTopic extends Topic, ResearchCandidate {
  pubDate: number;
  sourcePriority: number;
}

/**
 * İkinci bağımsız kaynak yalnızca doğrudan yayıncı beslemelerinin ortak
 * havuzundan aranır. Eskiden havuz yetmediğinde Google Haberler'de hedefli
 * arama yapılıyordu; o linkler gerçek habere çıkmadığı için kanıt metni
 * çıkarılamıyor ve konu zaten eleniyordu. Havuzu genişletmek (bkz. RSS_FEEDS)
 * bu aramanın yerini alır.
 */
async function prepareEvidence(primary: RawTopic, candidates: RawTopic[]): Promise<EvidencePacket> {
  const pool: ResearchCandidate[] = candidates;
  let packet = buildEvidencePacket(primary, pool);

  // Başlık benzerliği tutmadığında konu doğrudan düşmez: aynı olayı farklı
  // manşetle veriyor olabilecek adaylar hakeme sorulur. Tek onay yeterli,
  // çünkü kapının istediği ikinci bağımsız yayıncıdır.
  if (packet.status !== "VERIFIED") {
    const confirmed = new Set<ResearchCandidate>();
    for (const candidate of grayBandCandidates(primary, pool)) {
      if (await judgeSameStory(primary, candidate)) {
        confirmed.add(candidate);
        break;
      }
    }
    if (confirmed.size) packet = buildEvidencePacket(primary, pool, confirmed);
  }
  return enrichEvidencePacket(packet);
}

function getSourcePriority(url?: string): number {
  try {
    const domain = url ? new URL(url).hostname.replace(/^www\./, "") : "";
    if (domain === "news.google.com") return 0;
    if ([
      "tcmb.gov.tr", "tuik.gov.tr", "spk.gov.tr", "borsaistanbul.com", "aa.com.tr",
      "bloomberght.com", "dunya.com", "haberturk.com", "ntv.com.tr", "sozcu.com.tr",
      "btchaber.com", "koinmedya.com",
      "trthaber.com", "ekonomim.com", "investing.com", "coin-turk.com", "uzmancoin.com",
      "yenisafak.com", "sabah.com.tr", "tgrthaber.com", "indyturk.com",
    ].some((trusted) => domain === trusted || domain.endsWith(`.${trusted}`))) return 3;
    return domain ? 1 : 0;
  } catch {
    return 0;
  }
}

type TopicCategory = "kripto" | "borsa" | "doviz" | "altin" | "ekonomi";

export interface TopicClassification {
  category: TopicCategory | null;
  score: number;
  reasons: string[];
}

const CATEGORY_SIGNALS: Record<TopicCategory, string[]> = {
  kripto: [
    "bitcoin", "ethereum", "kripto", "btc", "eth", "altcoin", "blockchain",
    "stablecoin", "defi",
  ],
  borsa: [
    "bist", "bıst", "bist 100", "bıst 100", "borsa", "hisse", "pay piyasası", "endeks", "temettü",
    "halka arz", "bilanço", "net kâr", "net kar",
  ],
  doviz: [
    "döviz", "döviz kuru", "kur piyasası", "dolar tl", "usd tl", "euro tl",
    "eur tl", "dolar kuru", "euro kuru", "sterlin", "parite",
  ],
  altin: [
    "altın", "gram altın", "ons altın", "çeyrek altın", "cumhuriyet altını",
  ],
  ekonomi: [
    "enflasyon", "tüfe", "üfe", "faiz", "politika faizi", "merkez bankası", "tcmb",
    "fed", "ecb", "büyüme", "gsyh", "gsyih", "işsizlik", "istihdam", "cari açık",
    "dış ticaret", "ihracat", "ithalat", "bütçe", "vergi", "kredi", "asgari ücret",
    "emekli aylığı", "sanayi üretimi", "kapasite kullanım", "güven endeksi", "akaryakıt",
    "motorin", "benzin", "doğal gaz", "doğalgaz", "petrol fiyatı", "e ticaret",
  ],
};

const BUSINESS_SIGNALS = [
  "kâr", "kar", "gelir", "ciro", "satış", "yatırım", "satın alma", "prim desteği",
  "teşvik", "konkordato", "iflas",
];

const BUSINESS_ENTITIES = [
  "şirket", "holding", "banka", "fabrika", "sektör", "sanayi", "işletme", "ihracatçı",
];

const NEGATIVE_SIGNALS = [
  "kaza", "yaralı", "hayatını kaybetti", "öldü", "cinayet", "meteoroloji", "hava durumu",
  "futbol", "transfer", "dünya kupası", "magazin", "tutuklama", "boşanma", "lgs", "kpss",
  "ekpss", "yer çekimi", "yangın", "deprem", "app store", "tiktok", "disney", "terörsüz türkiye",
];

function normalizeForMatching(value: string): string {
  return ` ${value
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[\p{L}\p{N}%]+/gu, (token) => token)
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function includesPhrase(normalizedText: string, phrase: string): boolean {
  const normalizedPhrase = normalizeForMatching(phrase).trim();
  return normalizedPhrase.length > 0 && normalizedText.includes(` ${normalizedPhrase} `);
}

function matchingSignals(normalizedText: string, signals: string[]): string[] {
  return signals.filter((signal) => includesPhrase(normalizedText, signal));
}

/**
 * Başlık/özet sınıflandırmasını tam kelime ve kelime öbekleriyle yapar.
 * Eski `text.includes("kur")` yaklaşımı "kuraklık", "kullanacak" ve hatta
 * KPSS haberlerini döviz/borsa içeriğine çevirebiliyordu.
 */
export function classifyTopicText(title: string, summary = ""): TopicClassification {
  const normalizedTitle = normalizeForMatching(title);
  const normalizedSummary = normalizeForMatching(summary);
  const reasons: string[] = [];
  const scored = (Object.keys(CATEGORY_SIGNALS) as TopicCategory[]).map((category) => {
    const titleHits = matchingSignals(normalizedTitle, CATEGORY_SIGNALS[category]);
    const summaryHits = matchingSignals(normalizedSummary, CATEGORY_SIGNALS[category]);
    const score = titleHits.length * 8 + summaryHits.length * 2;
    return { category, score, titleHits, summaryHits };
  });

  const businessHits = matchingSignals(normalizedTitle, BUSINESS_SIGNALS);
  const entityHits = matchingSignals(normalizedTitle, BUSINESS_ENTITIES);
  const economy = scored.find((item) => item.category === "ekonomi")!;
  if (businessHits.length && (entityHits.length || /\d/.test(title))) {
    economy.score += 6;
    economy.titleHits.push(...businessHits);
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const negativeHits = matchingSignals(normalizedTitle, NEGATIVE_SIGNALS);

  // Sadece özette geçen tek bir kelime konu seçmeye yetmez. Başlıkta açık bir
  // finans sinyali veya birden fazla destekleyici kanıt olmalı.
  const hasTitleEvidence = best.titleHits.length > 0;
  const hasEnoughSummaryEvidence = best.summaryHits.length >= 2 && best.score >= 4;
  if ((!hasTitleEvidence && !hasEnoughSummaryEvidence) || best.score < 4) {
    return { category: null, score: best.score, reasons: ["Başlıkta yeterli finans sinyali yok"] };
  }

  if (negativeHits.length && best.score < 12) {
    return {
      category: null,
      score: best.score,
      reasons: [`Finans dışı gündem sinyali: ${negativeHits.join(", ")}`],
    };
  }

  reasons.push(`Başlık sinyalleri: ${best.titleHits.join(", ") || "yok"}`);
  if (best.summaryHits.length) reasons.push(`Özet sinyalleri: ${best.summaryHits.join(", ")}`);
  return { category: best.category, score: best.score, reasons };
}

export async function getTopics(limit = 20, category?: string): Promise<Topic[]> {
  resetSameStoryJudgeBudget();
  const all: RawTopic[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const feed = await fetchFeed(url);
      // Havuz ne kadar genişse aynı olayı iki farklı yayıncıda yakalama şansı o
      // kadar yüksek; ikinci bağımsız kaynak kapısı doğrudan buna bağlı.
      for (const entry of (feed.items || []).slice(0, 40)) {
        const title = (entry.title || "").trim();
        if (!title) continue;

        const pubDate = entry.pubDate ? new Date(entry.pubDate).getTime() : 0;
        const summary = (entry.contentSnippet || entry.content || "").slice(0, 300);

        const e = entry as Record<string, unknown>;
        const enclosure = e.enclosure as Record<string, string> | undefined;
        const media = e["media:content"] as Record<string, Record<string, string>> | undefined;
        const imageUrl =
          enclosure?.url ||
          media?.["$"]?.url ||
          extractImageFromContent(entry.content || "") ||
          undefined;

        const classification = classifyTopicText(title, summary);
        if (!classification.category) continue;

        const sourceUrl = entry.link || url;
        all.push({
          title,
          summary,
          category: classification.category,
          source: feed.title || url,
          sourceUrl,
          imageUrl,
          relevanceScore: classification.score,
          relevanceReasons: classification.reasons,
          pubDate,
          sourcePriority: getSourcePriority(sourceUrl),
        });
      }
    })
  );

  const errors = results.filter((r) => r.status === "rejected").length;
  if (errors > 0) console.log(`[topics] ${errors}/${RSS_FEEDS.length} RSS feed hata verdi`);

  // Kademeli zaman penceresi: 48h yetmezse 96h, en kötü ihtimalde tümü.
  // Böylece "altın" gibi az haberli kategorilerde "konu bulunamadı" olmaz.
  const windows = [48, 96, 0]; // saat (0 = sınırsız)
  const now = Date.now();
  let unique: RawTopic[] = [];

  for (const hours of windows) {
    const cutoff = hours > 0 ? now - hours * 60 * 60 * 1000 : 0;
    const inWindow = all.filter((t) => !t.pubDate || t.pubDate >= cutoff);
    const filtered =
      category && category !== "otomatik"
        ? inWindow.filter((t) => t.category === category)
        : inWindow;
    filtered.sort((a, b) =>
      b.sourcePriority - a.sourcePriority ||
      (b.relevanceScore || 0) - (a.relevanceScore || 0) ||
      b.pubDate - a.pubDate
    );

    const seen: RawTopic[] = [];
    unique = [];
    for (const t of filtered) {
      const duplicate = seen.some((item) => storySimilarity(item.title, t.title) >= 0.72);
      if (!duplicate) {
        seen.push(t);
        unique.push({
          title: t.title,
          summary: t.summary,
          category: t.category,
          source: t.source,
          sourceUrl: t.sourceUrl,
          imageUrl: t.imageUrl,
          relevanceScore: t.relevanceScore,
          relevanceReasons: t.relevanceReasons,
          pubDate: t.pubDate,
          sourcePriority: t.sourcePriority,
        });
      }
    }
    if (unique.length >= 5) break; // yeterli konu bulundu, pencereyi genişletme
  }

  const shortlisted = unique.slice(0, limit);
  return Promise.all(shortlisted.map(async (topic) => ({
    ...topic,
    evidencePacket: await prepareEvidence(topic, all),
  })));
}

export async function findCorroboratedTopic(
  title: string,
  category?: string,
): Promise<Topic | null> {
  const candidates = await getTopics(80, category);
  const ranked = candidates
    .map((topic) => ({ topic, similarity: storySimilarity(title, topic.title) }))
    .sort((a, b) => b.similarity - a.similarity);
  const best = ranked[0];
  return best && best.similarity >= 0.44 ? best.topic : null;
}
