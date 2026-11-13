/**
 * Lisanslı görsel varlığının ortak sözleşmesi.
 *
 * Ayrı dosyada duruyor: hem ajans portu (`licensed-media.ts`) hem stok
 * sağlayıcıları (`stock-media.ts`) aynı şekli döndürür ve iki modülün
 * birbirini import etmesi gerekmez. Lisans kimliği, kaynak sayfası veya atıf
 * eksik varlık hiçbir zaman indirilmez; bu yüzden alanların hepsi zorunlu.
 */
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
