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
const PRICE_EVENT = /\b(?:fiyat|kur|parite|endeks|yüzde|oran|rekor|zirve|dip|arttı|azaldı|yükseldi|düştü|geriledi)\b/iu;

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
  const isMarketCategory = ["kripto", "doviz", "altin"].includes(article.category);
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
