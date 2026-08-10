import type { Topic } from "./topics";

export type RiskLevel = "GREEN" | "YELLOW" | "RED";
export type Decision = "AUTO_PUBLISH" | "REVIEW" | "BLOCK";
export type ImageStrategy = "MARKET_CHART" | "LICENSED_MEDIA" | "BRANDED_EDITORIAL";

const FIRST_PARTY = [
  "tcmb.gov.tr", "tuik.gov.tr", "resmigazete.gov.tr", "spk.gov.tr",
  "borsaistanbul.com", "hmb.gov.tr", "imf.org", "worldbank.org", "ecb.europa.eu",
  "federalreserve.gov", "sec.gov", "aa.com.tr",
];
const REPUTABLE = [
  "reuters.com", "bloomberg.com", "bloomberght.com", "dunya.com",
  "haberturk.com", "ntv.com.tr", "sozcu.com.tr",
];
const RED_TERMS = [
  "savaş", "çatışma", "terör", "saldırı", "ölüm", "deprem", "seçim",
  "cumhurbaşkanı", "bakan istifa", "yaptırım", "darbe", "manipülasyon",
];
const SPECULATIVE_TERMS = [
  "alınır mı", "satılır mı", "yükselecek", "düşecek", "fiyat hedefi",
  "kazandıracak", "kaç olacak", "al sinyali", "sat sinyali", "yükselir mi",
  "düşer mi", "fiyat öngörüsü", "fiyat tahmini", "uçuyor", "o tarihe işaret",
  "kritik seviye",
];

function hostname(url?: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

function domainMatches(domain: string, entries: string[]) {
  return entries.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

export function scoreSource(topic: Topic): { score: number; domain: string; reasons: string[] } {
  const domain = hostname(topic.sourceUrl);
  const reasons: string[] = [];
  let score = 35;

  if (domainMatches(domain, FIRST_PARTY)) {
    score = 95;
    reasons.push("Birincil veya resmi kaynak");
  } else if (domainMatches(domain, REPUTABLE)) {
    score = 82;
    reasons.push("Yerleşik haber kaynağı");
  } else if (domain === "news.google.com") {
    score = 58;
    reasons.push("Google News yönlendirmesi; asıl kaynak doğrulaması sınırlı");
  } else if (domain) {
    score = 50;
    reasons.push("Tanımlanmamış yayıncı");
  } else {
    reasons.push("Kaynak URL'si yok");
  }

  if (topic.summary.trim().length >= 100) {
    score += 5;
    reasons.push("Yeterli kaynak özeti");
  }
  return { score: Math.min(100, score), domain, reasons };
}

export function classifyRisk(topic: Topic): { level: RiskLevel; reasons: string[] } {
  const text = `${topic.title} ${topic.summary}`.toLocaleLowerCase("tr-TR");
  const red = RED_TERMS.find((term) => text.includes(term));
  if (red) return { level: "RED", reasons: [`Hassas konu: ${red}`] };
  const speculative = SPECULATIVE_TERMS.find((term) => text.includes(term));
  if (speculative) return { level: "YELLOW", reasons: [`Spekülatif ifade: ${speculative}`] };
  return { level: "GREEN", reasons: ["Rutin finans/ekonomi haberi"] };
}

export function chooseImageStrategy(category: string, risk: RiskLevel): ImageStrategy {
  if (["kripto", "doviz", "altin"].includes(category)) return "MARKET_CHART";
  if (risk === "RED") return "BRANDED_EDITORIAL";
  return process.env.LICENSED_MEDIA_SEARCH_ENDPOINT ? "LICENSED_MEDIA" : "BRANDED_EDITORIAL";
}

export function decidePublication(input: {
  risk: RiskLevel;
  sourceScore: number;
  seoScore: number;
  hasImage: boolean;
  autoPublishEnabled: boolean;
  verifiedEvidence: boolean;
}): { decision: Decision; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.autoPublishEnabled) return { decision: "REVIEW", reasons: ["Otomatik yayın kapalı"] };
  if (input.risk === "RED") return { decision: "REVIEW", reasons: ["Hassas konu insan kontrolü gerektiriyor"] };
  if (!input.verifiedEvidence) {
    return { decision: "REVIEW", reasons: ["İkinci bağımsız kaynak doğrulaması tamamlanmadı"] };
  }
  if (input.sourceScore < 75) reasons.push(`Kaynak skoru düşük: ${input.sourceScore}/100`);
  if (input.seoScore < 70) reasons.push(`SEO skoru düşük: ${input.seoScore}/100`);
  if (!input.hasImage) reasons.push("Kalıcı kapak görseli yok");
  if (reasons.length) return { decision: "REVIEW", reasons };
  return { decision: "AUTO_PUBLISH", reasons: ["Kaynak doğrulaması, SEO, risk ve görsel eşikleri geçti"] };
}
