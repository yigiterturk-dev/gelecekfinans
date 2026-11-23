import { publicImageUrl } from "@/lib/image-url";

type ArticleCoverInput = {
  slug: string;
  title?: string;
  imageUrl?: string | null;
  category: string;
};

const HIGGSFIELD_COVERS: Record<string, string> = {
  "altin-yedi-haftanin-zirvesinde-ons-4277-dolar": "/gorseller/altin-yedi-haftanin-zirvesinde-ons-4277-dolar.webp",
  "viop-nedir-turkiye-vadeli-islem-ve-opsiyon-piyasasi-rehberi": "/gorseller/viop-nedir-turkiye-vadeli-islem-ve-opsiyon-piyasasi-rehberi.webp",
  "dolar-ve-euro-kurlari-10-kasim-2026-doviz-fiyatlari": "/gorseller/dolar-ve-euro-kurlari-10-kasim-2026-doviz-fiyatlari.webp",
  "tuketici-guven-endeksi-kasimda-yukseldi": "/gorseller/tuketici-guven-endeksi-kasimda-yukseldi.webp",
  "blockchain-nasil-calisir-merkeziyetsiz-teknolojinin-temelleri": "/gorseller/blockchain-nasil-calisir-merkeziyetsiz-teknolojinin-temelleri.webp",
};

const CATEGORY_COVERS: Record<string, string> = {
  borsa: HIGGSFIELD_COVERS["viop-nedir-turkiye-vadeli-islem-ve-opsiyon-piyasasi-rehberi"],
  doviz: HIGGSFIELD_COVERS["dolar-ve-euro-kurlari-10-kasim-2026-doviz-fiyatlari"],
  altin: HIGGSFIELD_COVERS["altin-yedi-haftanin-zirvesinde-ons-4277-dolar"],
  ekonomi: "/visuals/financial-literacy-editorial.webp",
  kripto: HIGGSFIELD_COVERS["blockchain-nasil-calisir-merkeziyetsiz-teknolojinin-temelleri"],
};

/** A matching generated visual for a missing or failed article image. */
export function articleCoverFallbackUrl(article: Pick<ArticleCoverInput, "slug" | "category">): string | null {
  return HIGGSFIELD_COVERS[article.slug] ?? CATEGORY_COVERS[article.category] ?? null;
}

/** Prefer the article's own cover; use a matching generated visual only when it is missing. */
export function articleCoverUrl(article: ArticleCoverInput): string | null {
  return publicImageUrl(article.imageUrl) ?? articleCoverFallbackUrl(article);
}

/** True when the visible cover comes from a generic editorial illustration. */
export function isIllustrativeCover(article: ArticleCoverInput): boolean {
  return !publicImageUrl(article.imageUrl) && articleCoverFallbackUrl(article) !== null;
}

export function articleCoverAlt(article: ArticleCoverInput): string {
  if (!isIllustrativeCover(article)) return article.title ?? article.slug;
  const descriptions: Record<string, string> = {
    altin: "Temsili altın külçeleri",
    borsa: "İstanbul finans bölgesi, temsili borsa görseli",
    doviz: "Banknotlar ve hesap makinesi, temsili döviz görseli",
    ekonomi: "Alışveriş yapan tüketici, temsili ekonomi görseli",
    kripto: "Dijital işlemci ve kripto para temsili",
  };
  return descriptions[article.category] ?? "Temsili finans görseli";
}
