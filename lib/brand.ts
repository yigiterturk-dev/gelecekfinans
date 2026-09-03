/**
 * Marka adının tek kaynağı.
 *
 * Neden ayrı bir dosya: marka üç ayrı yazımla dolaşıyordu — görünür logo
 * "Gelecek Finans", şema "GelecekFinans", alan adı "gelecekfinans.com" — ve
 * anasayfa başlığında HİÇ geçmiyordu. Google'da "gelecekfinans" arandığında
 * site çıkmıyordu; GSC'deki 256 sorgunun hiçbiri marka sorgusu değildi ve
 * anasayfa (indeksli olmasına rağmen) 0 gösterim alıyordu.
 *
 * Sebep belgelenmiş bir Next tuzağıydı: `title.template` yalnızca ALT
 * segmentlere uygulanır, aynı segmentteki `page.tsx`'e uygulanmaz. Bu yüzden
 * her sayfa markayı taşırken anasayfa taşımıyordu. Sabitler burada durur ve
 * `tests/brand.test.ts` başlıkta markanın varlığını bağlar.
 */

export const BRAND = "GelecekFinans";

/** Görünür logoda kullanılan boşluklu yazım. */
export const BRAND_SPACED = "Gelecek Finans";

/** Alt sayfa başlık şablonu — `app/layout.tsx` içindeki `title.template`. */
export const TITLE_TEMPLATE = `%s | ${BRAND}`;

/** Anasayfa başlığı: marka ÖNDE. Marka sorgusunu kazanan tek sayfa burasıdır. */
export const HOME_TITLE = `${BRAND} — Finans ve Ekonomi Haberleri`;

/** Şemada aynı varlığa bağlanan yazım biçimleri. */
export const BRAND_ALIASES = [BRAND_SPACED, "gelecekfinans", "gelecekfinans.com"];
