export interface LicensedMediaAsset {
  provider: string;
  assetId: string;
  licenseId: string;
  licenseName: string;
  downloadUrl: string;
  sourceUrl: string;
  attribution: string;
  caption: string;
  width: number;
  height: number;
}

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
 * Sağlayıcıdan bağımsız arama portu. Anlaşmalı ajans adaptörü şu sözleşmeyle
 * yanıt verir: { assets: LicensedMediaAsset[] }. Lisans kimliği veya kaynak
 * sayfası eksik hiçbir varlık indirilmez.
 */
export async function searchLicensedMedia(input: {
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

