import { searchStockMedia } from "./stock-media";
import type { LicensedMediaAsset } from "./media-types";

export type { LicensedMediaAsset };

interface LicensedMediaResponse {
  assets?: Partial<LicensedMediaAsset>[];
}

function isHttps(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validAsset(asset: Partial<LicensedMediaAsset>): asset is LicensedMediaAsset {
  return Boolean(
    asset.provider && asset.assetId && asset.licenseId && asset.licenseName &&
    asset.attribution && asset.caption && isHttps(asset.downloadUrl) && isHttps(asset.sourceUrl) &&
    Number(asset.width) >= 1000 && Number(asset.height) >= 560 && Number(asset.width) / Number(asset.height) >= 1.4,
  );
}

/**
 * Anlaşmalı ajans adaptörü. Kurumsal lisans varsa stok sağlayıcılarından önce
 * denenir; sözleşme: `{ assets: LicensedMediaAsset[] }`.
 */
async function searchManagedAgency(input: {
  query: string;
  category: string;
  headline: string;
}): Promise<LicensedMediaAsset | null> {
  const endpoint = process.env.LICENSED_MEDIA_SEARCH_ENDPOINT;
  const apiKey = process.env.LICENSED_MEDIA_API_KEY;
  if (!endpoint || !apiKey || !isHttps(endpoint)) return null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: input.query,
        category: input.category,
        headline: input.headline,
        orientation: "landscape",
        minWidth: 1200,
        editorialUse: true,
        territory: "TR",
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as LicensedMediaResponse;
    return (payload.assets || []).find(validAsset) || null;
  } catch {
    return null;
  }
}

/**
 * Görsel arama portu: anlaşmalı ajans → Pexels → Pixabay.
 *
 * Ücretsiz sağlayıcılar lisans kimliğini ve kaynak sayfasını ürettiği için
 * `validAsset` kontrolünden geçer; indirme ve `/gorseller` altına yazma
 * `images.ts` içinde yapılır. Hiçbiri bulunamazsa `null` döner ve markalı
 * kart devreye girer — lisansı kanıtlanamayan fotoğraf asla kullanılmaz.
 */
export async function searchLicensedMedia(input: {
  query: string;
  category: string;
  headline: string;
}): Promise<LicensedMediaAsset | null> {
  const managed = await searchManagedAgency(input);
  if (managed) return managed;

  const stock = await searchStockMedia(input);
  return stock.asset;
}
