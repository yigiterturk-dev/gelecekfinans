/**
 * Görsel URL normalizasyonu — SEO için görseller kendi alan adımızdan servis edilir.
 *
 * Bot ürettiği kapak görsellerini Vercel Blob'a yazıyor; ham URL
 * `https://<store>.public.blob.vercel-storage.com/gorseller/<slug>.png` biçiminde.
 * Bu URL Google Görseller'de gelecekfinans.com'a değil blob alt alan adına
 * atfediliyor. `next.config` içindeki `/gorseller/:path*` rewrite'ı sayesinde aynı
 * dosya kendi alan adımızdan da servis ediliyor; burada URL'i o yola çeviriyoruz.
 */

/** Bot üretimi kapak görsellerinin sabit boyutu (lib/bot/images.ts ImageResponse). */
export const GENERATED_IMAGE_WIDTH = 1200;
export const GENERATED_IMAGE_HEIGHT = 675;

const BLOB_URL = /^https?:\/\/[^/]*\.public\.blob\.vercel-storage\.com\/(.+)$/;

/** Blob URL'ini kendi alan adımızdaki köke çevirir; diğer URL'lere dokunmaz. */
export function publicImageUrl(url: string): string;
export function publicImageUrl(url: string | null | undefined): string | null;
export function publicImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = BLOB_URL.exec(url);
  return match ? `/${match[1]}` : url;
}

/** Sitemap ve JSON-LD için mutlak URL — göreli yolu alan adıyla birleştirir. */
export function absoluteImageUrl(url: string | null | undefined, base: string): string | null {
  const normalized = publicImageUrl(url);
  if (!normalized) return null;
  return normalized.startsWith("/") ? `${base}${normalized}` : normalized;
}

/** Bizim ürettiğimiz görsel mi? (boyutu bilindiği için schema'ya width/height yazılabilir) */
export function isGeneratedImage(url: string | null | undefined): boolean {
  return !!url && (BLOB_URL.test(url) || url.startsWith("/gorseller/"));
}

/** JSON-LD ImageObject düğümü — bilinen boyutlarda width/height de ekler. */
export function imageObjectLd(
  url: string | null | undefined,
  base: string,
  caption: string,
  id?: string,
) {
  const absolute = absoluteImageUrl(url, base);
  if (!absolute) return null;
  return {
    "@type": "ImageObject" as const,
    ...(id ? { "@id": id } : {}),
    url: absolute,
    caption,
    ...(isGeneratedImage(url)
      ? { width: GENERATED_IMAGE_WIDTH, height: GENERATED_IMAGE_HEIGHT }
      : {}),
  };
}
