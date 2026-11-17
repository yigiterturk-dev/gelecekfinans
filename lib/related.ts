import type { ArticleListItem } from "./types";

/**
 * Makale sayfasındaki iç linkler.
 *
 * 17 Kasım 2026 ölçümü: "İlgili Haberler" aynı kategorinin EN YENİ 4 yazısıydı.
 * 151 makalenin hepsi aynı 4 yazıya link veriyordu; 104 sayfa ≤3 iç link,
 * onlarcası 0 iç link alıyordu (yalnız sitemap + arşivin derin sayfaları).
 *
 * Artık iki kaynak:
 *  1. Konu benzerliği: başlık + anahtar kelimedeki anlamlı kelimelerin örtüşmesi
 *     (aynı kategori küçük bonus). Her yazı kendi konusuna bağlanır, link
 *     yükü en yenilere yığılmaz.
 *  2. Kronolojik komşu: aynı kategoride bir önceki / bir sonraki yazı. Zincir
 *     sayesinde HER yazı en az bir (çoğu iki) makaleden link alır; öksüz kalmaz.
 */

const STOP = new Set(
  ("ve ile için gibi bir bu şu da de mi mı ne nasıl neden nedir kaç hangi daha en çok son yeni " +
    "olan oldu olarak sonra önce göre karşı üzerinde ilk yüzde ise ya veya ama hem kadar " +
    "rehber rehberi kapsamlı adım adım temel güncel yıl ay gün hafta haftalık günün").split(" "),
);

function stem(word: string): string {
  // Kaba Türkçe kök: ek yığınını kesmeden 5 harfe kırp ("altında" ~ "altın", "faizi" ~ "faiz").
  return word.length > 5 ? word.slice(0, 5) : word;
}

export function topicTokens(a: Pick<ArticleListItem, "title" | "keyword">): Set<string> {
  const text = `${a.title} ${a.keyword || ""}`
    .toLocaleLowerCase("tr-TR")
    .replace(/[’'`"“”]/g, " ")
    .replace(/[^a-zçğıöşü0-9 ]/g, " ");
  const out = new Set<string>();
  for (const w of text.split(/\s+/)) {
    if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.add(stem(w));
  }
  return out;
}

export function pickRelated(
  current: ArticleListItem,
  all: ArticleListItem[],
  limit = 4,
): { related: ArticleListItem[]; prev: ArticleListItem | null; next: ArticleListItem | null } {
  // all: yayın tarihine göre yeni → eski.
  const sameCat = all.filter((r) => r.category === current.category);
  const idx = sameCat.findIndex((r) => r.slug === current.slug);
  const newer = idx > 0 ? sameCat[idx - 1] : null;
  const older = idx >= 0 && idx < sameCat.length - 1 ? sameCat[idx + 1] : null;

  const mine = topicTokens(current);
  const taken = new Set([current.slug, newer?.slug, older?.slug]);
  const scored = all
    .filter((r) => !taken.has(r.slug))
    .map((r) => {
      let overlap = 0;
      for (const t of topicTokens(r)) if (mine.has(t)) overlap++;
      return { r, score: overlap * 2 + (r.category === current.category ? 1 : 0) };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || b.r.created_at.localeCompare(a.r.created_at));

  const related = scored.slice(0, limit).map((x) => x.r);
  // Konu eşleşmesi az olan yazı boş kalmasın: aynı kategoriden yakın tarihli olanlarla doldur.
  for (const r of sameCat.slice(Math.max(0, idx - 4), idx + 6)) {
    if (related.length >= limit) break;
    if (!taken.has(r.slug) && !related.some((x) => x.slug === r.slug)) related.push(r);
  }
  return { related, prev: older, next: newer };
}
