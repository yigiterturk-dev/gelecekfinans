import type { ArticleDraft } from "./article-schema";
import type { EvidencePacket } from "./research";

export interface QualityReport {
  passed: boolean;
  score: number;
  wordCount: number;
  issues: string[];
  /**
   * `issues` içinden mekanik olarak düzeltilebilir, metnin doğruluğuyla
   * ilgisi olmayanlar (uzunluklar, odak kelimenin yerleşimi). Yalnızca bunlar
   * kaldıysa makale silinmez, `DRAFT` olarak incelemeye alınır.
   */
  cosmeticIssues: string[];
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

/**
 * ── Bileşik Türkçe büyüklük yazımı ─────────────────────────────────────────
 *
 * CANLI ARIZA (3 Eylül 2026, koşu cmtlpfilu0000i804lebplv7k): TCMB rezerv
 * haberi ARKA ARKAYA İKİ KEZ "Kaynaklarda bulunmayan rakamlar: 3.1, 71.1,
 * 2.9, 117.1" ile bloklandı ve koşu tek makaleyle kapandı.
 *
 * Model uydurmamıştı. Türk finans basını ve resmî bültenler sayıyı
 * "117 milyar 100 milyon dolar" diye yazar; okunabilir haber metni ise
 * "117,1 milyar dolar" der. `numbersIn` bileşik yazımı iki AYRI sayı olarak
 * (117 ve 100) topladığı için doğru yazılmış makaleyi kaynaksız sayıyordu.
 * Bu, TCMB rezerv/TÜİK/ihracat gibi bülten haberlerinin TAMAMINDA tekrarlar.
 *
 * Çözüm: kanıt metnindeki bileşik ifadeler açılır ve BAŞ BİRİMİN ondalığı
 * (117,1) ile mutlak değeri (117.100.000.000; "4 bin 500" için 4500) desteklenen
 * sayılar kümesine eklenir. Kapı körleşmez: yalnızca kaynakta GERÇEKTEN yazan
 * bir büyüklüğün ikinci yazımı serbest kalır, model hâlâ yeni sayı icat edemez.
 */
const MAGNITUDES: Record<string, number> = {
  trilyon: 1e12,
  milyar: 1e9,
  milyon: 1e6,
  bin: 1e3,
};

interface MagnitudeTerm {
  value: number;
  unit: number;
  start: number;
  end: number;
}

function magnitudeTerms(value: string): MagnitudeTerm[] {
  const pattern = /(\d+(?:[. ]\d+)*(?:,\d+)?)\s*(trilyon|milyar|milyon|bin)?/giu;
  const terms: MagnitudeTerm[] = [];
  for (const match of value.matchAll(pattern)) {
    const numeric = Number(normalizeNumber(match[1]));
    if (!Number.isFinite(numeric)) continue;
    const word = match[2]?.toLocaleLowerCase("tr-TR");
    terms.push({
      value: numeric,
      unit: word ? MAGNITUDES[word] : 1,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return terms;
}

/** Kayan nokta artığını ("117.10000000000001") sayı kümesine sokmaz. */
function cleanNumber(value: number): string {
  return String(Number(value.toFixed(6)));
}

function compositeNumbers(value: string): Set<string> {
  const output = new Set<string>();
  const terms = magnitudeTerms(value);
  for (let index = 0; index < terms.length; index++) {
    const head = terms[index];
    // Zincir yalnızca birimli bir baştan başlar: "2026 3 milyar" gibi rastgele
    // komşulukların birleşmesini engeller.
    if (head.unit <= 1) continue;
    let total = head.value * head.unit;
    let previous = head;
    for (let next = index + 1; next < terms.length; next++) {
      const term = terms[next];
      // Terimler arasında boşluktan başka bir şey varsa bu tek bir büyüklük
      // değildir ("100 milyon dolar, altın rezervi 71 milyar").
      if (!/^\s*$/.test(value.slice(previous.end, term.start))) break;
      if (term.unit >= previous.unit) break;
      // Birimsiz kuyruk yalnızca "bin"den sonra anlamlıdır ("4 bin 500").
      // Aksi hâlde "10 milyar 2026 yılında" birleşirdi.
      if (term.unit === 1 && previous.unit !== MAGNITUDES.bin) break;
      if (term.value >= previous.unit / term.unit) break;
      total += term.value * term.unit;
      output.add(cleanNumber(total));
      output.add(cleanNumber(total / head.unit));
      previous = term;
    }
  }
  return output;
}

/**
 * Kanıt tarafının kabul ettiği sayılar: ham eşleşmeler + güvenli yuvarlama +
 * bileşik büyüklüklerin ondalık/mutlak karşılıkları.
 */
function supportedNumbersIn(value: string): Set<string> {
  const output = numbersIn(value, true);
  for (const composite of compositeNumbers(value)) {
    output.add(composite);
    if (composite.includes(".")) output.add(String(Math.trunc(Number(composite))));
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
    ...draft.sections.flatMap((section) => [
      ...section.paragraphs,
      ...section.bullets,
      ...((section as { subsections?: Array<{ heading: string; paragraphs: string[] }> }).subsections ?? [])
        .flatMap((sub) => [sub.heading, ...sub.paragraphs]),
    ]),
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
  /**
   * Kanıt paketi zorunlu mu?
   *
   * Haberde zorunlu: haber "ne oldu" anlatır, olay kanıtla doğrulanmalıdır.
   * Rehberde değil: rehber "nasıl işler" anlatır ve dış kaynağa bağlı olmayan
   * bir sistem, kaynağın HTML'i değiştiği gün susmaz. Bunun bedeli aşağıdaki
   * `forbidSpecificFigures` kuralıyla ödenir — kanıt yoksa somut rakam da yok.
   */
  requireEvidence: boolean;
  /**
   * Somut rakam yasağı (yalnızca kanıtsız şeritte).
   *
   * Kanıtsız üretimin tek gerçek tehlikesi uydurma SAYIdır: yanlış vergi
   * oranı, uydurma faiz yüzdesi, hayali fiyat. Kavramsal anlatımda bunlara
   * ihtiyaç yoktur; kapı hepsini reddeder. Böylece rehber hem dış kaynağa
   * bağımsız hem de uydurmaya kapalı olur.
   */
  forbidSpecificFigures: boolean;
  /**
   * Künye ledesi doğrudan TANIM cümlesiyle mi başlamalı?
   *
   * "X kimdir" sorgusunda Google (ve okur) ilk cümlede cevabı arar. Canlı
   * örnek: Midas/Egem Eraslan sayfası "Egem Eraslan'ın liderliği, Midas'ın
   * … evrilme sürecini hızlandırmakta" diye açıyordu — kelime ledede geçiyor
   * ama CEVAP yok, özne "liderlik". Sayfa buna rağmen 12-29. sıradaydı;
   * doğrudan tanımla açmak bu şeritteki en ucuz sıralama hamlesi.
   *
   * Kural Türkçe'de deterministik olarak ölçülebilir: tanım cümlesi adı
   * yalın hâlde kullanır ve virgülle devam eder ("Egem Eraslan, Midas'ın
   * kurucusudur."). İyelik eki aldıysa ("Egem Eraslan'ın …") cümle artık
   * varlığı değil, onun bir özelliğini anlatıyordur.
   */
  requireDefinitionLede?: boolean;
}

export const NEWS_QUALITY_PRESET: QualityPreset = {
  minWords: 280,
  maxWords: 800,
  minIndependentSources: 2,
  label: "haber",
  requireEvidence: true,
  forbidSpecificFigures: false,
};

export const GUIDE_QUALITY_PRESET: QualityPreset = {
  minWords: 850,
  maxWords: 2000,
  minIndependentSources: 0,
  label: "rehber",
  requireEvidence: false,
  forbidSpecificFigures: true,
};

/**
 * Varlık ("X kimdir") şeridi.
 *
 * Rehberin tersine kanıt ZORUNLU ve somut rakam SERBEST — çünkü malzeme
 * arşivdeki doğrulanmış haberlerin kanıt paketinden geliyor, uydurmadan
 * değil. Gerçek bir kişi ya da şirket hakkında kanıtsız cümle kurmak bu
 * şeritte en büyük risk; bu yüzden koruma rakam yasağında değil, iddia-kanıt
 * eşlemesinde (claims + evidenceIds) ve kaynakta bulunmayan rakam kapısında.
 *
 * Kelime alt sınırı rehberden düşük: arşiv malzemesi sınırlıdır ve 850
 * kelimeye zorlamak modeli tam olarak yapmasını istemediğimiz şeye,
 * doldurmaya iter.
 */
export const ENTITY_QUALITY_PRESET: QualityPreset = {
  minWords: 600,
  maxWords: 1400,
  minIndependentSources: 2,
  label: "varlık",
  requireEvidence: true,
  forbidSpecificFigures: false,
  requireDefinitionLede: true,
};

/**
 * Kanıtsız rehberde yasak sayı kalıpları.
 *
 * Ölçüt "sayı geçmesin" değil — "3 adım", "18 yaş", "2 farklı yöntem" gibi
 * ifadeler zararsız ve metni okunur kılıyor. Yasaklanan, DOĞRULANMASI GEREKEN
 * sayı: yüzde oranı, ondalıklı değer, üç haneden büyük tutar ve para birimiyle
 * yazılmış miktar. Bunların hepsi zamanla değişir ve yanlış olduğunda okuru
 * doğrudan zarara uğratır.
 */
const SPECIFIC_FIGURE_PATTERNS: Array<[RegExp, string]> = [
  [/%\s?\d|\byüzde\s+\d/i, "Rehberde yüzde/oran yazılamaz"],
  [/\d+[.,]\d/, "Rehberde ondalıklı sayı yazılamaz"],
  [/\b(?!(?:19|20)\d{2}\b)\d{4,}\b/, "Rehberde dört haneli veya daha büyük sayı yazılamaz"],
  [/\b\d+\s?(?:tl|lira|dolar|euro|avro|usd|try|bin|milyon|milyar)\b/i, "Rehberde para tutarı yazılamaz"],
];

/**
 * Lede doğrudan tanımla mı açıyor?
 *
 * Kabul: "Egem Eraslan, Midas'ın kurucusu ve CEO'sudur." (ad yalın + virgül)
 * Ret  : "Egem Eraslan'ın liderliği, …"  (iyelik eki — özne artık ad değil)
 * Ret  : "Midas'ın kurucusu Egem Eraslan, …" (ad cümlenin başında değil)
 */
export function ledeOpensWithDefinition(lede: string, name: string): boolean {
  const trimmedName = name.trim();
  if (!trimmedName) return true;
  const text = lede.trim().replace(/^[«"'“]+/, "");
  const lower = text.toLocaleLowerCase("tr-TR");
  const lowerName = trimmedName.toLocaleLowerCase("tr-TR");
  if (!lower.startsWith(lowerName)) return false;
  // Addan hemen sonra gelen karakter virgül olmalı: ek almışsa ("'ın", "'nin")
  // cümle varlığı değil onun bir özelliğini tanımlıyordur.
  const rest = text.slice(trimmedName.length).trimStart();
  return rest.startsWith(",");
}

export function validateDraft(
  draft: ArticleDraft,
  packet: EvidencePacket,
  preset: QualityPreset = NEWS_QUALITY_PRESET,
): QualityReport {
  const issues: string[] = [];
  /**
   * Kozmetik sorunlar da `issues` içine girer (kapı davranışı değişmiyor),
   * ayrıca burada işaretlenir ki yazar tarafı "bu makale silinmeli mi yoksa
   * insana mı gitmeli" ayrımını yapabilsin.
   */
  const cosmeticIssues: string[] = [];
  const cosmetic = (issue: string) => {
    issues.push(issue);
    cosmeticIssues.push(issue);
  };
  const wordCount = countDraftWords(draft);
  const evidenceIds = new Set(packet.evidence.map((item) => item.id));
  const evidenceText = packet.evidence
    .map((item) => `${item.title} ${item.summary} ${item.content || ""}`)
    .join(" ");
  const supportedNumbers = supportedNumbersIn(evidenceText);
  const draftText = textParts(draft).join(" ");

  if (preset.requireEvidence
    && (packet.status !== "VERIFIED" || packet.independentSourceCount < preset.minIndependentSources)) {
    issues.push("İki bağımsız kaynak kapısı geçilmedi");
  }
  if (preset.forbidSpecificFigures) {
    for (const [pattern, label] of SPECIFIC_FIGURE_PATTERNS) {
      const hit = draftText.match(pattern);
      if (hit) issues.push(`${label}: "${hit[0]}"`);
    }
  }
  if (draft.title.length < 35 || draft.title.length > 85) cosmetic(`Başlık uzunluğu uygun değil: ${draft.title.length}`);
  // Alt sınır 2026-08-31'de 120 -> 110 indirildi. Kayıtlarda tamamlanmış
  // makalelerin çöpe gitme sebebi 115/118/119 karakterlik metalardı: arama
  // sonucunda meta zaten ~155 karakterde kesildiği için 118 ile 120 arasında
  // okur açısından hiçbir fark yok, ama kapı makalenin tamamını atıyordu.
  // Üst sınır aynı kalır; uzun meta gerçekten kırpılır.
  if (draft.meta.length < 110 || draft.meta.length > 180) cosmetic(`Meta uzunluğu uygun değil: ${draft.meta.length}`);
  if (wordCount < preset.minWords) {
    issues.push(`Metin fazla kısa: ${wordCount} kelime (${preset.label} alt sınırı ${preset.minWords})`);
  }
  if (wordCount > preset.maxWords) {
    issues.push(`Metin gereksiz uzun: ${wordCount} kelime (${preset.label} üst sınırı ${preset.maxWords})`);
  }
  if (!draft.lede.toLocaleLowerCase("tr-TR").includes(draft.keyword.toLocaleLowerCase("tr-TR"))) {
    cosmetic("Odak anahtar kelime giriş paragrafında yok");
  }
  if (!draft.meta.toLocaleLowerCase("tr-TR").includes(draft.keyword.toLocaleLowerCase("tr-TR"))) {
    cosmetic("Odak anahtar kelime metada yok");
  }
  if (preset.requireDefinitionLede && !ledeOpensWithDefinition(draft.lede, draft.keyword)) {
    cosmetic("Künye girişi tanım cümlesiyle başlamıyor (\"<Ad>, …dır.\" bekleniyor)");
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
    cosmetic("Metada etiket eki var (ör. \"Keyword: ...\"); kelime cümlenin içinde doğal geçmeli");
  }

  if (preset.requireEvidence) {
    for (const claim of draft.claims) {
      const unknown = claim.evidenceIds.filter((id) => !evidenceIds.has(id));
      if (unknown.length) issues.push(`İddiada bilinmeyen kanıt kimliği: ${unknown.join(", ")}`);
      if (!claim.evidenceIds.length) issues.push(`Kanıtsız iddia: ${claim.text.slice(0, 80)}`);
    }

    const unsupportedNumbers = [...numbersIn(draftText)].filter((number) => !supportedNumbers.has(number));
    if (unsupportedNumbers.length) issues.push(`Kaynaklarda bulunmayan rakamlar: ${unsupportedNumbers.join(", ")}`);
  }

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
    cosmeticIssues,
  };
}

/**
 * Kanıt kimliklerini OKURA GİDEN metinden söker.
 *
 * Kanıt paketi modele `[ev-1-publisher:tgrt-haber-...]` biçiminde gösteriliyor
 * ve model bunları atıf sanıp madde işaretlerinin sonuna yapıştırıyor. Kimlik
 * okur için tamamen anlamsız bir dizedir; kaynaklar zaten yazının sonunda
 * "Kaynaklar" listesinde linkli veriliyor. (1 Eylül 2026 canlı koşumunda BIST
 * haberinin üç maddesinin de sonunda göründü.)
 *
 * Kalite kapısı bu kimlikleri `claims.evidenceIds` alanından okuduğu için
 * gövdeden silinmeleri denetimi zayıflatmaz.
 */
export function stripEvidenceMarkers(value: string): string {
  return value
    .replace(/\[\s*(?:ev|ark)-\d+[a-z0-9:_-]*\s*\]/gi, "")
    .replace(/(?:ev|ark)-\d+-publisher:[a-z0-9-]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export function renderDraftHtml(draft: ArticleDraft, packet: EvidencePacket): string {
  const clean = (value: string) => escapeHtml(stripEvidenceMarkers(value));
  const output = [`<p>${clean(draft.lede)}</p>`];
  for (const section of draft.sections) {
    output.push(`<h2>${clean(section.heading)}</h2>`);
    for (const paragraph of section.paragraphs) output.push(`<p>${clean(paragraph)}</p>`);
    // Rehber şeridinde bölümler H3 alt başlık taşıyabilir; haber taslaklarında
    // bu alan yok ve döngü sessizce atlanır.
    for (const sub of (section as { subsections?: Array<{ heading: string; paragraphs: string[] }> }).subsections ?? []) {
      output.push(`<h3>${clean(sub.heading)}</h3>`);
      for (const paragraph of sub.paragraphs) output.push(`<p>${clean(paragraph)}</p>`);
    }
    if (section.bullets.length) {
      output.push("<ul>");
      for (const bullet of section.bullets) output.push(`<li>${clean(bullet)}</li>`);
      output.push("</ul>");
    }
  }
  output.push(`<p><em>${clean(draft.disclaimer)}</em></p>`);
  // Kanıtsız rehber şeridinde kaynak listesi yoktur; boş bir "Kaynaklar"
  // başlığı hem okuru yanıltır hem de içi boş bölüm olarak SEO'da zarar verir.
  if (!packet.evidence.length) return output.join("\n");
  output.push("<h2>Kaynaklar</h2>", "<ul>");
  for (const evidence of packet.evidence) {
    output.push(
      `<li><a href="${escapeHtml(evidence.sourceUrl)}" target="_blank" rel="nofollow noopener noreferrer">${escapeHtml(evidence.source)}: ${escapeHtml(evidence.title)}</a></li>`,
    );
  }
  output.push("</ul>");
  return output.join("\n");
}
