import type { ArticleImageInput } from "./images";

export type VisualMode = "DATA_CHART" | "LICENSED_MEDIA" | "BRANDED_CARD";

export interface VisualBrief {
  mode: VisualMode;
  storyType: string;
  subject: string;
  searchQuery: string;
  mustAvoid: string[];
  conceptKey: string;
  rationale: string;
}
/**
 * Başlığın bir FİYAT HAREKETİ anlattığını gösteren sözcükler.
 *
 * Piyasa kategorisinde olmak tek başına yetmez: "SPK kripto borsalarına yeni
 * kural getirdi" haberinde grafik yanıltıcı olur. Ama liste dar kalırsa tersi
 * olur — 1 Eylül 2026'da "BIST 100 güne kayıpla başladı" haberinde hiçbir
 * sözcük eşleşmedi ve gerçek endeks serisi varken markalı karta düşüldü.
 * Bu yüzden borsa dilinin günlük ifadeleri (kayıp, kazanç, açılış, kapanış,
 * satıcılı, ekside…) listeye eklendi.
 */
const PRICE_EVENT = /\b(?:fiyat|kur|parite|endeks|yüzde|oran|rekor|zirve|dip|arttı|azaldı|yükseldi|düştü|geriledi|kayıp|kayıpla|kazanç|kazançla|kapanış|kapattı|açılış|başladı|satıcılı|alıcılı|primli|ekside|artıda|ralli|sıçradı|çakıldı|tırmandı|değer kayb|değer kazan|yükseliş|düşüş|gerileme)\w*/iu;

function normalizedKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export function createVisualBrief(article: ArticleImageInput): VisualBrief {
  /**
   * "borsa" 1 Eylül 2026'da eklendi: BIST haberleri fiyat hareketi anlatmasına
   * rağmen listede olmadığı için markalı karta düşüyordu — oysa endeksin gerçek
   * kapanış serisi artık çekilebiliyor (`getBistHistory`). Altın da listedeydi
   * ama grafik yolu `null` dönüyordu; ons/USD serisi bağlandı.
   */
  const isMarketCategory = ["kripto", "doviz", "altin", "borsa"].includes(article.category);
  if (isMarketCategory && PRICE_EVENT.test(`${article.title} ${article.keyword || ""}`)) {
    return {
      mode: "DATA_CHART",
      storyType: "market-data",
      subject: article.title,
      searchQuery: "",
      mustAvoid: ["sentetik haber fotoğrafı", "uydurma fiyat", "yanlış tarihsel eksen"],
      conceptKey: `chart-${article.category}`,
      rationale: "Başlık doğrudan fiyat veya oran hareketi anlatıyor; gerçek veri grafiği kullanılır.",
    };
  }

  const licensedConfigured = Boolean(
    process.env.LICENSED_MEDIA_SEARCH_ENDPOINT && process.env.LICENSED_MEDIA_API_KEY,
  );
  return {
    mode: licensedConfigured ? "LICENSED_MEDIA" : "BRANDED_CARD",
    storyType: "finance-news",
    subject: article.title,
    searchQuery: `${article.keyword || article.category} ${article.title}`.slice(0, 180),
    mustAvoid: [
      "lisans kimliği olmayan fotoğraf",
      "başlıkla ilgisiz stok görsel",
      "sentetik kişi, bina veya olay fotoğrafı",
      "okunamayan yapay metin ve logo",
    ],
    conceptKey: `editorial-${normalizedKey(article.keyword || article.category)}`,
    rationale: licensedConfigured
      ? "Önce lisansı kanıtlanabilir editoryal medya aranır; bulunamazsa markalı kart üretilir."
      : "Lisanslı medya sağlayıcısı bağlı değil; güvenli markalı editoryal kart üretilir.",
  };
}
