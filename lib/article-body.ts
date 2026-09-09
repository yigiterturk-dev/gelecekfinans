/**
 * Makale gövdesinin TEK kaynağı.
 *
 * Neden ayrı dosya: 2026-09-09'da premium kapısı yeniden kuruldu ve gövde
 * artık İKİ yerden üretiliyor — ISR ile önbelleklenen sayfa (teaser) ve
 * kimlik doğrulamalı API ucu (tam metin). Bu depoda "ikinci yol, normal
 * yolun defter işini yapmıyor" hatası defalarca çıktı (iç bağlantı katmanı
 * atlanmıştı, arama motoru bildirimi atlanmıştı, kelime durumu atlanmıştı).
 * Bu yüzden iki yol da AYNI fonksiyonu çağırıyor; ayrışamazlar.
 *
 * ⚠️ Sıra önemli: önce makaleler arası iç bağlantı, sonra piyasa bağlantısı.
 * Piyasa linki en fazla 3 tane ekliyor ve mevcut bağlantıların metnine
 * dokunmuyor, bu yüzden ikinci çalışması güvenli. Ters sırada iç bağlantı
 * üreticisi piyasa linklerinin içine girebilir.
 *
 * ⚠️ Her iki çıktı da `sanitizeArticleHtml`'den geçer. Gövde LLM ve admin
 * editörü üretimi; ham basmak depolanan XSS demek.
 */
import { buildTeaser } from "@/lib/articles";
import type { ArticleListItem } from "@/lib/types";
import { injectInternalLinks } from "@/lib/internal-links";
import { injectMarketLinks } from "@/lib/market-links";
import { sanitizeArticleHtml } from "@/lib/sanitize";

/** Teaser uzunluğu (kelime). Premium kapısında gösterilen kısım. */
export const TEASER_KELIME = 200;

/**
 * Tam gövde: iç bağlantılar + piyasa bağlantıları + temizlik.
 * YALNIZCA erişim hakkı doğrulanmış çağrılarda kullanılır.
 */
export function tamGovde(
  content: string,
  slug: string,
  tumMakaleler: ArticleListItem[]
): string {
  return sanitizeArticleHtml(
    injectMarketLinks(injectInternalLinks(content, slug, tumMakaleler), `/${slug}`)
  );
}

/**
 * Kilitli gövde: yalnızca teaser.
 *
 * 🔑 Bu çıktı ÖNBELLEĞE giriyor. Premium metnin tamamı buraya ASLA
 * girmemeli — CDN'de duran HTML herkese açıktır.
 */
export function kilitliGovde(content: string): string {
  return sanitizeArticleHtml(buildTeaser(content, TEASER_KELIME));
}
