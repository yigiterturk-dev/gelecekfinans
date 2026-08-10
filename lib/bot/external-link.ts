// Makale içeriğine en az bir harici (resmi kaynak) link garanti eder.
// SEO checker (lib/seo.ts) "Dış link yok" sorununu işaretliyor; yazar bazen harici link
// eklemediği için bu yardımcı, kategoriye uygun GERÇEK bir resmi kurum linkini doğal
// şekilde içeriğe gömer. AI maliyeti yoktur — saf metin işlemi.

interface ExternalSource {
  name: string;
  url: string;
  // İçerikte bu terimlerden biri geçerse, link o terime bağlanır (doğal yerleştirme).
  terms: string[];
}

// Kategori → resmi kaynak eşlemesi. İlk eleman birincil (fallback için kullanılır).
const CATEGORY_SOURCES: Record<string, ExternalSource[]> = {
  ekonomi: [
    { name: "TCMB", url: "https://www.tcmb.gov.tr", terms: ["TCMB", "Merkez Bankası", "merkez bankası", "faiz"] },
    { name: "TÜİK", url: "https://www.tuik.gov.tr", terms: ["TÜİK", "enflasyon", "TÜFE", "tüfe"] },
  ],
  doviz: [
    { name: "TCMB", url: "https://www.tcmb.gov.tr", terms: ["TCMB", "Merkez Bankası", "merkez bankası", "kur", "döviz", "dolar"] },
    { name: "TÜİK", url: "https://www.tuik.gov.tr", terms: ["TÜİK", "enflasyon"] },
  ],
  borsa: [
    { name: "Borsa İstanbul", url: "https://www.borsaistanbul.com", terms: ["Borsa İstanbul", "BIST", "bist", "borsa", "endeks", "hisse"] },
  ],
  altin: [
    { name: "TCMB", url: "https://www.tcmb.gov.tr", terms: ["TCMB", "Merkez Bankası", "merkez bankası", "altın", "rezerv"] },
  ],
  kripto: [
    { name: "TÜİK", url: "https://www.tuik.gov.tr", terms: ["TÜİK", "ekonomi"] },
    { name: "TCMB", url: "https://www.tcmb.gov.tr", terms: ["TCMB", "Merkez Bankası", "merkez bankası"] },
  ],
};

// Hiçbir kategori eşleşmezse kullanılacak genel güvenilir kaynak.
const DEFAULT_SOURCE: ExternalSource = {
  name: "TCMB",
  url: "https://www.tcmb.gov.tr",
  terms: ["TCMB", "Merkez Bankası", "merkez bankası", "faiz", "ekonomi"],
};

function hasExternalLink(content: string): boolean {
  return /href=["']https?:\/\/[^"']*["']/i.test(content);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Verilen terimi içerikte (bir <a> ya da başlık içinde DEĞİL) ilk geçtiği yerde link yapar.
function linkTerm(content: string, term: string, url: string): string | null {
  const escaped = escapeRegex(term);
  // Zaten <a> içinde olmayan ve heading içinde olmayan ilk eşleşme.
  const regex = new RegExp(`\\b(${escaped})\\b(?![^<]*<\\/a>)`, "i");
  const match = content.match(regex);
  if (!match || match.index === undefined) return null;

  const before = content.slice(0, match.index);
  const after = content.slice(match.index + match[0].length);

  // Başlık (h2/h3) içine link gömme — okunabilirlik ve SEO için.
  const lastTag = before.lastIndexOf("<");
  const tagSnippet = before.slice(lastTag).toLowerCase();
  if (tagSnippet.startsWith("<h2") || tagSnippet.startsWith("<h3")) return null;

  return `${before}<a href="${url}" target="_blank" rel="nofollow noopener noreferrer">${match[0]}</a>${after}`;
}

/**
 * İçerikte zaten harici link varsa dokunmaz. Yoksa kategoriye uygun resmi kaynağa
 * doğal bir bağlantı ekler ve en az 1 harici link garanti eder.
 */
export function ensureExternalLink(
  content: string,
  category: string,
  keyword?: string | null,
  preferredSourceUrl?: string,
): string {
  if (hasExternalLink(content)) return content;

  if (preferredSourceUrl) {
    try {
      const source = new URL(preferredSourceUrl);
      if (source.protocol === "https:" || source.protocol === "http:") {
        return `${content.trimEnd()}\n<p>Haberin çıkış noktası: <a href="${source.toString()}" target="_blank" rel="nofollow noopener noreferrer">orijinal kaynak</a>.</p>`;
      }
    } catch {
      // Geçersiz kaynak URL'sinde aşağıdaki kategori bazlı güvenli fallback kullanılır.
    }
  }

  const sources = CATEGORY_SOURCES[category] || [DEFAULT_SOURCE];

  // 1) İçerikteki uygun bir terime doğal link gömmeyi dene.
  for (const source of sources) {
    for (const term of source.terms) {
      const linked = linkTerm(content, term, source.url);
      if (linked) return linked;
    }
  }

  // 2) Terim bulunamadıysa: keyword'ü kaynağa bağlayan kısa bir cümle ekle.
  const primary = sources[0] || DEFAULT_SOURCE;
  const kw = (keyword || "konuyla ilgili güncel veriler").trim();
  const sentence =
    `<p>Konuyla ilgili resmi verilere <a href="${primary.url}" target="_blank" rel="nofollow noopener noreferrer">${primary.name}</a> üzerinden ulaşabilirsiniz.</p>`;
  void kw; // keyword şu an cümlede zorlanmıyor (doğallık için); imza uyumu korunur.

  return content.trimEnd() + "\n" + sentence;
}
