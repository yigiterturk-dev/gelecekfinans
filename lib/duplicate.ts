function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-zçğıöşü0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function bigrams(text: string): Set<string> {
  const words = normalize(text).split(" ");
  const set = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    set.add(words[i] + " " + words[i + 1]);
  }
  return set;
}

export function similarity(a: string, b: string): number {
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  return (2 * intersection) / (setA.size + setB.size);
}

// ── Türkçe stopword'ler (anlam taşımayan bağlaç/edat/ek sözcükler). Token
// örtüşmesi hesaplanırken çıkarılır; böylece "Rusya/Merkez/Bankası/Faiz" gibi
// çekirdek varlıklar öne çıkar, "ve/ile/için" gibi dolgu kelimeler şişirmez.
const STOPWORDS = new Set([
  "ve", "ile", "için", "de", "da", "ki", "mi", "mı", "mu", "mü",
  "bir", "bu", "şu", "o", "the", "a", "an", "of", "to", "in", "on",
  "ama", "fakat", "ancak", "veya", "ya", "yada", "hem", "ne",
  "daha", "çok", "az", "en", "gibi", "kadar", "göre", "sonra", "önce",
  "olarak", "oldu", "olan", "ise", "her", "bütün", "tüm", "yine",
  "üzerinde", "üzerine", "karşı", "doğru", "altında", "üstünde",
]);

// Başlığı anlamlı token kümesine çevirir (normalize + stopword + kısa token at).
function meaningfulTokens(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(" ")
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

/**
 * İki başlık arasındaki anlamlı token örtüşmesini ölçer.
 * Döner: { overlap: ortak anlamlı kelime sayısı, jaccard: Jaccard benzerliği }.
 */
function titleTokenOverlap(a: string, b: string): { overlap: number; jaccard: number } {
  const setA = meaningfulTokens(a);
  const setB = meaningfulTokens(b);
  if (setA.size === 0 || setB.size === 0) return { overlap: 0, jaccard: 0 };
  let overlap = 0;
  for (const t of setA) if (setB.has(t)) overlap++;
  const union = new Set([...setA, ...setB]).size;
  return { overlap, jaccard: union === 0 ? 0 : overlap / union };
}

export function isDuplicate(
  newTitle: string,
  newContent: string,
  existingArticles: { title: string; content: string; id: string }[]
): { duplicate: boolean; matchId?: string; score: number } {
  for (const existing of existingArticles) {
    // 1) Bigram benzerliği (eski yöntem, kelime sırasına duyarlı) — yüksek
    //    örtüşmede güvenli sinyal.
    const titleSim = similarity(newTitle, existing.title);
    if (titleSim > 0.8) return { duplicate: true, matchId: existing.id, score: titleSim };

    // 2) Anlamlı token örtüşmesi (sıralamadan bağımsız). Aynı olayı farklı
    //    cümleyle anlatan başlıkları yakalar:
    //    "Rusya Merkez Bankası Faiz İndirimine Gitti" vs
    //    "Rusya Merkez Bankası Faiz Oranını Beklentilerin Altında İndirdi"
    //    → ortak: rusya, merkez, bankası, faiz (4 token).
    //    Eşik (dengeli, fazla agresif değil):
    //      • 3+ ortak anlamlı kelime  VEYA
    //      • Jaccard ≥ 0.60 (token kümelerinin %60+ örtüşmesi)
    //    "3 ortak kelime" eşiği, kısa başlıklarda tek ortak konunun (ör. sadece
    //    "Merkez Bankası") yanlış eşleşmesini önler; 3+ varlık çakışması gerçek
    //    bir aynı-olay sinyalidir.
    const { overlap, jaccard } = titleTokenOverlap(newTitle, existing.title);
    if (overlap >= 3 || jaccard >= 0.6) {
      return { duplicate: true, matchId: existing.id, score: Math.max(jaccard, titleSim) };
    }

    // 3) İçerik baş kısmı benzerliği (gövde kopyası/çok yakın yeniden yazım).
    const contentSim = similarity(
      newContent.slice(0, 500),
      existing.content.slice(0, 500)
    );
    if (contentSim > 0.7) return { duplicate: true, matchId: existing.id, score: contentSim };
  }
  return { duplicate: false, score: 0 };
}

// ── Kaynak kimliği tekrarı ─────────────────────────────────────────────────
// Başlık benzerliği aynı olayı her zaman yakalamıyor: "…gün düşüşle kapandı"
// ile "…satıcılı kapanış" yalnızca 2 anlamlı kelime paylaşır ve eşik 3'tür.
// Ama ikisi de AYNI kaynak haberden yazılmıştı (aynı haberturk URL'i, aynı 3
// kanıt kimliği). Kaynak kimliği kesin sinyaldir: yanlış pozitifi yoktur ve
// yazar bütçesi harcanmadan önce bakılabilir.

export function normalizeSourceUrl(url?: string | null): string {
  if (!url) return "";
  const raw = url.trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return host + path;
  } catch {
    return raw.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

// "ev-1-publisher:haberturk-borsa-gunu-dususle-tamamladi" → kanıt kimliğinin
// sıradan bağımsız hâli. Aynı kanıt farklı sırada gelirse de eşleşsin.
function evidenceKey(id?: string | null): string {
  if (!id) return "";
  return id.trim().toLowerCase().replace(/^ev-\d+-/, "");
}

type AutomationMetaLike = {
  sourceUrl?: string | null;
  evidencePacket?: { evidence?: Array<{ id?: string | null; sourceUrl?: string | null }> | null } | null;
} | null | undefined;

/** Bir makalenin/konunun kaynak parmak izleri: normalize URL'ler + kanıt kimlikleri. */
export function sourceFingerprints(meta: AutomationMetaLike): { primary: string; keys: Set<string> } {
  const keys = new Set<string>();
  const primary = normalizeSourceUrl(meta?.sourceUrl);
  if (primary) keys.add(primary);
  for (const evidence of meta?.evidencePacket?.evidence || []) {
    const url = normalizeSourceUrl(evidence?.sourceUrl);
    if (url) keys.add(url);
    const key = evidenceKey(evidence?.id);
    if (key) keys.add(key);
  }
  return { primary, keys };
}

/**
 * Aday konu/makale, arşivdeki bir haberle AYNI kaynaktan mı yazılıyor?
 * Tekrar sayılma kuralı:
 *   • birincil kaynak URL'i daha önce kullanılmışsa (kesin), VEYA
 *   • 2+ kanıt kimliği/kanıt URL'i örtüşüyorsa (aynı olay kümesi).
 */
export function findSourceRepeat(
  candidate: AutomationMetaLike,
  existingArticles: { id: string; title: string; automationMeta?: unknown }[],
): { matchId: string; matchTitle: string; reason: "primary-url" | "evidence-overlap"; key: string } | null {
  const candidateFp = sourceFingerprints(candidate);
  if (!candidateFp.keys.size) return null;
  for (const existing of existingArticles) {
    const existingFp = sourceFingerprints(existing.automationMeta as AutomationMetaLike);
    if (!existingFp.keys.size) continue;
    if (candidateFp.primary && existingFp.keys.has(candidateFp.primary)) {
      return { matchId: existing.id, matchTitle: existing.title, reason: "primary-url", key: candidateFp.primary };
    }
    if (existingFp.primary && candidateFp.keys.has(existingFp.primary)) {
      return { matchId: existing.id, matchTitle: existing.title, reason: "primary-url", key: existingFp.primary };
    }
    const shared = [...candidateFp.keys].filter((key) => existingFp.keys.has(key));
    if (shared.length >= 2) {
      return { matchId: existing.id, matchTitle: existing.title, reason: "evidence-overlap", key: shared.slice(0, 3).join(" | ") };
    }
  }
  return null;
}
