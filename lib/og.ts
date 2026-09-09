/**
 * Paylaşım (Open Graph / Twitter) meta verisinin tek kaynağı.
 *
 * ÖLÇÜLEN HATA (2026-09-09): sitemap'teki 112 adres tarandı; başlık ve
 * açıklama tekrarı yoktu, kanoniklerin hepsi kendini gösteriyordu — ama
 * **6 sayfada `og:image` HİÇ YOKTU**: /rehber, /hakkimizda,
 * /yayincilik-ilkeleri, /iletisim, /gizlilik-politikasi, /kullanim-kosullari.
 * WhatsApp'ta, X'te, LinkedIn'de paylaşıldığında bu sayfalar görselsiz,
 * çıplak bağlantı olarak çıkıyordu.
 *
 * 🔑 SEBEP: `app/opengraph-image.tsx` dosya kuralı yalnızca sayfa KENDİ
 * `openGraph` nesnesini tanımlamadığında devreye giriyor. Bu altı sayfa
 * `openGraph: { type, url, title, description, siteName }` yazınca dosya
 * kuralının eklediği görsel düşüyordu. Sessiz bir kayıp: hiçbir test, hiçbir
 * derleme uyarısı bunu söylemiyor, yalnızca paylaşınca görülüyor.
 *
 * Bu yüzden openGraph elle yazılmıyor; bu yardımcıdan üretiliyor.
 * `tests/og.test.ts` openGraph'ı elle kuran sayfa kaldı mı diye bekliyor.
 */
import type { Metadata } from "next";

export const OG_GORSEL = "/opengraph-image";
export const OG_GENISLIK = 1200;
export const OG_YUKSEKLIK = 630;

/**
 * Bir sayfanın paylaşım meta verisini üretir — görsel HER ZAMAN dahil.
 *
 * @param url Sayfanın tam adresi (kanonikle aynı olmalı).
 */
export function paylasimMeta({
  url,
  title,
  description,
  type = "website",
}: {
  url: string;
  title: string;
  description: string;
  type?: "website" | "article";
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type,
      locale: "tr_TR",
      siteName: "GelecekFinans",
      url,
      title,
      description,
      images: [{ url: OG_GORSEL, width: OG_GENISLIK, height: OG_YUKSEKLIK, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_GORSEL],
    },
  };
}
