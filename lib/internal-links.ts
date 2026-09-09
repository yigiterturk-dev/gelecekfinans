import type { ArticleListItem } from "./types";
import { isContentWord, turkceSinirliDesen } from "./anchor-words";

/**
 * Sayfa render'ında çalışan iç bağlantı üreticisi.
 *
 * 5 Eylül 2026: bot tarafındaki üretici (`lib/bot/linker.ts`) yapısal çapa
 * süzgeciyle düzeltildi ama BU dosya gözden kaçtı — canlı makale sayfası hâlâ
 * kendi süzgeçsiz bağlantısını ekliyordu (`filter(k => k.length > 3)`), yani
 * kaydedilmiş içerik temizlenmiş olsa bile okuduğunuz sayfa bozuk kalıyordu.
 * İki üreticinin de aynı kapıdan geçmesi şart: kural kopyalanınca biri sessizce
 * bozuk kalır.
 *
 * Ek olarak GİRİŞ PARAGRAFI muaftır: makalenin odak kelimesi lede'de bölünürse
 * sayfa kendi hedef sorgusunda zayıflar.
 */
export function injectInternalLinks(content: string, currentSlug: string, allArticles: ArticleListItem[]): string {
  const candidates = allArticles
    .filter(a => a.slug !== currentSlug && a.keyword)
    .slice(0, 50);

  let result = content;
  let linksAdded = 0;
  const maxLinks = 3;
  const ledeEnd = (() => {
    const end = content.indexOf("</p>");
    return end < 0 ? 0 : end + 4;
  })();

  for (const article of candidates) {
    if (linksAdded >= maxLinks) break;

    // Çapa, hedefin KONUSUNU söylemek zorunda: en az bir içerik kelimesi taşımayan
    // öbek (bağlaç, çekimli fiil, kısa parça) bağlantı çapası olamaz.
    const keywords = (article.keyword || "")
      .split(",")
      .map(k => k.trim())
      .filter(k => k.split(/\s+/).some(isContentWord));

    for (const kw of keywords) {
      if (linksAdded >= maxLinks) break;

      const regex = turkceSinirliDesen(escapeRegex(kw), "(?![^<]*<\\/a>)(?![^<]*>)");
      // Arama lede'den SONRA başlar: kelimenin ilk geçtiği yer giriş paragrafıysa
      // bağlantı iptal edilmez, gövdedeki sonraki geçişe kurulur.
      const govde = result.slice(ledeEnd);
      const match = govde.match(regex);
      if (match && match.index !== undefined) {
        const at = ledeEnd + match.index;
        result =
          result.slice(0, at) +
          `<a href="/${article.slug}" style="color:var(--accent);text-decoration:underline">${match[0]}</a>` +
          result.slice(at + match[0].length);
        linksAdded++;
      }
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
