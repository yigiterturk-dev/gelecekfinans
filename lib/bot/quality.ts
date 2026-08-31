import type { ArticleDraft } from "./article-schema";
import type { EvidencePacket } from "./research";

export interface QualityReport {
  passed: boolean;
  score: number;
  wordCount: number;
  issues: string[];
}

const FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [/uzmanlara göre/iu, "Kaynağı belirsiz uzman atfı"],
  [/piyasa çevrelerine göre/iu, "Kaynağı belirsiz piyasa atfı"],
  [/destek (?:seviyesi|noktası)/iu, "Teknik analiz ifadesi"],
  [/direnç (?:seviyesi|noktası)/iu, "Teknik analiz ifadesi"],
  [/\b(?:al|sat) sinyali\b/iu, "Al-sat sinyali"],
  [/fiyat hedefi/iu, "Fiyat hedefi"],
  [/kesin (?:yükselecek|düşecek)/iu, "Kesin fiyat tahmini"],
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textParts(draft: ArticleDraft): string[] {
  return [
    draft.title,
    draft.meta,
    draft.lede,
    ...draft.sections.flatMap((section) => [section.heading, ...section.paragraphs, ...section.bullets]),
    ...draft.summary,
    draft.impact,
    ...draft.faq.flatMap((item) => [item.q, item.a]),
    ...draft.claims.map((claim) => claim.text),
  ];
}

function normalizeNumber(value: string): string {
  const percent = value.endsWith("%");
  let raw = value.toLocaleLowerCase("tr-TR").replace(/%$/, "").replace(/ /g, "");
  if (raw.includes(",")) {
    // Türkçe finans metinlerinde nokta binlik, virgül ondalık ayırıcıdır.
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    if (parts.slice(1).every((part) => part.length === 3)) {
      raw = parts.join("");
    } else if (parts.length > 2) {
      // Bazı piyasa kaynakları 22.184.999.685.75 gibi, binlik noktalarıyla
      // ondalık noktasını birlikte kullanıyor. Son grup ondalık kabul edilir.
      raw = `${parts.slice(0, -1).join("")}.${parts.at(-1)}`;
    }
  }
  const numeric = Number(raw);
  const normalized = Number.isFinite(numeric) ? String(numeric) : raw;
  return `${normalized}${percent ? "%" : ""}`;
}

function numbersIn(value: string, includeSafeRounding = false): Set<string> {
  const output = new Set<string>();
  // Tek kalıp tam sayıyı tüketir; önceki alternasyon 3.8'i "3" ve "8",
  // 13779.6800'ü ise kısmi parçalara ayırabiliyordu.
  const matches = value.match(/\b\d+(?:[. ]\d+)*(?:,\d+)?%?/g) || [];
  for (const match of matches) {
    const normalized = normalizeNumber(match);
    output.add(normalized);
    // Endeks/kur gibi ondalıklı mutlak değerlerin küsuratsız aktarımı yeni bir
    // sayı icat etmez. Yüzdelerde yuvarlama anlamı değiştirebileceği için açılmaz.
    if (includeSafeRounding && !normalized.endsWith("%") && normalized.includes(".")) {
      output.add(String(Math.trunc(Number(normalized))));
    }
  }
  return output;
}

function paragraphKey(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function countDraftWords(draft: ArticleDraft): number {
  const body = [
    draft.lede,
    ...draft.sections.flatMap((section) => [...section.paragraphs, ...section.bullets]),
    ...draft.summary,
    draft.impact,
    ...draft.faq.flatMap((item) => [item.q, item.a]),
  ].join(" ");
  return body.split(/\s+/).filter(Boolean).length;
}

/**
 * Kalite kapısının şerit ayarı.
 *
 * Haber ve rehber aynı kapıdan geçmez ama rehber kapısı GEVŞEK değildir:
 * yalnızca farklı ölçütlere bakar. Haberde "iki bağımsız yayıncı" ve 280-800
 * kelime doğru ölçüttür; rehberde doğru ölçüt tek bir resmî kaynak ve daha
 * uzun, daha derin metindir. Sayıların kanıtla desteklenmesi, uydurma yasağı,
 * yatırım tavsiyesi uyarısı gibi kurallar iki şeritte de aynen geçerlidir.
 */
export interface QualityPreset {
  minWords: number;
  maxWords: number;
  minIndependentSources: number;
  label: string;
}

export const NEWS_QUALITY_PRESET: QualityPreset = {
  minWords: 280,
  maxWords: 800,
  minIndependentSources: 2,
  label: "haber",
};

export const GUIDE_QUALITY_PRESET: QualityPreset = {
  minWords: 850,
  maxWords: 2000,
  // Rehberde ikinci gazete aranmaz; kuralı koyan kurumun kendi sayfası
  // ikinci bir haber kaynağından daha güçlü kanıttır.
  minIndependentSources: 1,
  label: "rehber",
};

export function validateDraft(
  draft: ArticleDraft,
  packet: EvidencePacket,
  preset: QualityPreset = NEWS_QUALITY_PRESET,
): QualityReport {
  const issues: string[] = [];
  const wordCount = countDraftWords(draft);
  const evidenceIds = new Set(packet.evidence.map((item) => item.id));
  const evidenceText = packet.evidence
    .map((item) => `${item.title} ${item.summary} ${item.content || ""}`)
    .join(" ");
  const supportedNumbers = numbersIn(evidenceText, true);
  const draftText = textParts(draft).join(" ");

  if (packet.status !== "VERIFIED" || packet.independentSourceCount < preset.minIndependentSources) {
    issues.push(
      preset.minIndependentSources >= 2
        ? "İki bağımsız kaynak kapısı geçilmedi"
        : "Resmî kaynak kanıt kapısı geçilmedi",
    );
  }
  if (draft.title.length < 35 || draft.title.length > 85) issues.push(`Başlık uzunluğu uygun değil: ${draft.title.length}`);
  // Alt sınır 2026-08-31'de 120 -> 110 indirildi. Kayıtlarda tamamlanmış
  // makalelerin çöpe gitme sebebi 115/118/119 karakterlik metalardı: arama
  // sonucunda meta zaten ~155 karakterde kesildiği için 118 ile 120 arasında
  // okur açısından hiçbir fark yok, ama kapı makalenin tamamını atıyordu.
  // Üst sınır aynı kalır; uzun meta gerçekten kırpılır.
  if (draft.meta.length < 110 || draft.meta.length > 180) issues.push(`Meta uzunluğu uygun değil: ${draft.meta.length}`);
  if (wordCount < preset.minWords) {
    issues.push(`Metin fazla kısa: ${wordCount} kelime (${preset.label} alt sınırı ${preset.minWords})`);
  }
  if (wordCount > preset.maxWords) {
    issues.push(`Metin gereksiz uzun: ${wordCount} kelime (${preset.label} üst sınırı ${preset.maxWords})`);
  }
  if (!draft.lede.toLocaleLowerCase("tr-TR").includes(draft.keyword.toLocaleLowerCase("tr-TR"))) {
    issues.push("Odak anahtar kelime giriş paragrafında yok");
  }
  if (!draft.meta.toLocaleLowerCase("tr-TR").includes(draft.keyword.toLocaleLowerCase("tr-TR"))) {
    issues.push("Odak anahtar kelime metada yok");
  }
  /**
   * "Keyword: EPDK düzenleme" gibi etiket ekleri.
   *
   * Kelimenin metada birebir geçmesi kuralını model kaba yoldan sağlıyordu:
   * cümleyi kurmak yerine metanın sonuna "Keyword: ..." yapıştırıyordu
   * (canlı örnek: EPDK tarife haberi). Bu ek arama sonucunda OKURA GÖRÜNÜR
   * ve siteyi otomatik üretilmiş gösterir. Kapı bunu reddeder; onarım turunda
   * modele kelimeyi cümlenin içine yedirmesi söylenir.
   */
  if (/\b(keyword|anahtar kelime|odak kelime)\s*[:=]/i.test(draft.meta)) {
    issues.push("Metada etiket eki var (ör. \"Keyword: ...\"); kelime cümlenin içinde doğal geçmeli");
  }

  for (const claim of draft.claims) {
    const unknown = claim.evidenceIds.filter((id) => !evidenceIds.has(id));
    if (unknown.length) issues.push(`İddiada bilinmeyen kanıt kimliği: ${unknown.join(", ")}`);
    if (!claim.evidenceIds.length) issues.push(`Kanıtsız iddia: ${claim.text.slice(0, 80)}`);
  }

  const unsupportedNumbers = [...numbersIn(draftText)].filter((number) => !supportedNumbers.has(number));
  if (unsupportedNumbers.length) issues.push(`Kaynaklarda bulunmayan rakamlar: ${unsupportedNumbers.join(", ")}`);

  for (const [pattern, label] of FORBIDDEN_PATTERNS) {
    if (pattern.test(draftText)) issues.push(label);
  }

  const paragraphs = [draft.lede, ...draft.sections.flatMap((section) => section.paragraphs)]
    .map(paragraphKey)
    .filter(Boolean);
  if (new Set(paragraphs).size !== paragraphs.length) issues.push("Yinelenen paragraf bulundu");
  if (/[<>]/.test(draftText)) issues.push("Model çıktısında ham HTML karakteri bulundu");
  if (!draft.disclaimer.toLocaleLowerCase("tr-TR").includes("yatırım tavsiyesi değildir")) {
    issues.push("Standart yatırım tavsiyesi uyarısı eksik");
  }

  return {
    passed: issues.length === 0,
    score: Math.max(0, 100 - issues.length * 12),
    wordCount,
    issues,
  };
}

export function renderDraftHtml(draft: ArticleDraft, packet: EvidencePacket): string {
  const output = [`<p>${escapeHtml(draft.lede)}</p>`];
  for (const section of draft.sections) {
    output.push(`<h2>${escapeHtml(section.heading)}</h2>`);
    for (const paragraph of section.paragraphs) output.push(`<p>${escapeHtml(paragraph)}</p>`);
    if (section.bullets.length) {
      output.push("<ul>");
      for (const bullet of section.bullets) output.push(`<li>${escapeHtml(bullet)}</li>`);
      output.push("</ul>");
    }
  }
  output.push(`<p><em>${escapeHtml(draft.disclaimer)}</em></p>`);
  output.push("<h2>Kaynaklar</h2>", "<ul>");
  for (const evidence of packet.evidence) {
    output.push(
      `<li><a href="${escapeHtml(evidence.sourceUrl)}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(evidence.source)}: ${escapeHtml(evidence.title)}</a></li>`,
    );
  }
  output.push("</ul>");
  return output.join("\n");
}
