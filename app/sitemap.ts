import { prisma } from "@/lib/db";
import { FX_PAIRS, GOLD_TYPES, CRYPTO_COINS, BIST_STOCKS } from "@/lib/market";
import { absoluteImageUrl } from "@/lib/image-url";
import type { MetadataRoute } from "next";

// Haber sitesi için saatlik tazeleme yeterli; her istekte tüm makaleleri
// çekmek yerine sitemap saatte bir yeniden üretilir (revalidate = 3600 sn).
export const revalidate = 3600;

const BASE = "https://gelecekfinans.com";

/**
 * Editoryal metnin en son değiştiği tarihler.
 *
 * ⚠️ ÖLÇÜLDÜ (2026-09-09): sitemap'teki 112 adresin yalnızca 53'ünde
 * `lastmod` vardı (makaleler). Google `lastmod`'u tarama sıralaması için
 * ipucu olarak kullanıyor ve bu sitenin ana sorunu tam olarak tarama
 * bütçesiydi ("Discovered – currently not indexed").
 *
 * 🔑 Tarih UYDURULMAZ. Her zaman "şimdi" yazmak Google'ın `lastmod`'a
 * güvenmeyi bırakmasına yol açar — sinyal kazanmak yerine kaybedilir.
 * Aşağıdaki tarihler ilgili profil/SSS dosyasının gerçekten son
 * değiştirildiği gün; dosya değişirse BURASI da güncellenmeli.
 * Canlı fiyat rakamları sayfada değişse de sayfanın EDİTORYAL içeriği
 * değişmez, dolayısıyla saatlik lastmod iddiası dürüst olmazdı.
 */
const PROFIL_TARIHLERI = {
  hisse: new Date("2026-09-07"),   // lib/stock-profiles.ts
  varlik: new Date("2026-09-07"),  // lib/asset-profiles.ts (altın + döviz)
  kripto: new Date("2026-09-07"),  // lib/crypto-profiles.ts
  arac: new Date("2026-09-04"),    // lib/market-faq.ts (hesaplayıcı SSS'leri)
  kategori: new Date("2026-09-09"),// lib/category-profiles.ts
} as const;

/**
 * Kurumsal/hukuki sayfaların son değişim günü (git geçmişinden okundu).
 * ⚠️ Bu sayfaların metnini değiştiren HERKES burayı da güncellemeli;
 * yoksa Google eski tarihe bakıp yeniden taramayı erteler.
 * Kapsam: /hakkimizda · /yayincilik-ilkeleri · /iletisim ·
 *         /gizlilik-politikasi · /kullanim-kosullari
 */
const STATIK_SAYFA_TARIHI = new Date("2026-09-09");

const TOOL_SLUGS = [
  "doviz-cevirici",
  "altin-hesaplama",
  "kredi-faiz-hesaplama",
  "mevduat-faiz-hesaplama",
  "enflasyon-hesaplama",
  "bilesik-faiz-hesaplama",
  "hisse-kar-zarar-hesaplama",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Sitemap sorgusu sayfa görüntüleme istatistiklerine ihtiyaç duymaz. Doğrudan
  // makale tablosunu okumak hem daha ucuzdur hem yeni yayınların sitemap'e
  // başka bir sorgunun başarısına bağlı kalmadan girmesini sağlar.
  // DB erişilemezse (kota, bakım, ağ) sitemap boş makale listesiyle üretilir.
  // Öncesinde bu sorgu build'i tümden düşürüyordu: veritabanı kilitliyken
  // DEPLOY BİLE YAPILAMIYORDU — yani düzeltmeyi yayına almak imkânsızdı.
  let articles: Array<{
    slug: string;
    category: string;
    publishedAt: Date | null;
    updatedAt: Date;
    imageUrl: string | null;
  }> = [];
  try {
    articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5000,
      select: { slug: true, category: true, publishedAt: true, updatedAt: true, imageUrl: true },
    });
  } catch (err) {
    console.error("[sitemap] makale sorgusu başarısız, statik girdilerle devam:", err);
  }
  const articleEntries = articles.map((a) => ({
    url: `${BASE}/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
    // Görsel kendi alan adımızdan bildirilir (bkz. lib/image-url.ts); blob alt
    // alan adı Google Görseller'de siteye atıf kazandırmıyor.
    ...(a.imageUrl ? { images: [absoluteImageUrl(a.imageUrl, BASE)!] } : {}),
  }));

  // En yeni makale tarihi: anasayfa ve arşiv gerçekten o an tazeleniyor.
  const enYeniMakale = articles[0]?.updatedAt;

  const publishedCategories = new Set(articles.map((article) => article.category));
  const categories = ["kripto", "borsa", "doviz", "altin", "ekonomi"];
  // Kategori sayfasının lastmod'u = o kategorideki EN YENİ makale. Kategori
  // metni 9 Eylül'de yazıldı; ikisinden hangisi yeniyse o geçerli.
  const kategoriEnYeni = new Map<string, Date>();
  for (const a of articles) {
    const v = kategoriEnYeni.get(a.category);
    if (!v || a.updatedAt > v) kategoriEnYeni.set(a.category, a.updatedAt);
  }
  const catEntries = categories.filter((c) => publishedCategories.has(c)).map((c) => {
    const sonMakale = kategoriEnYeni.get(c);
    const metin = PROFIL_TARIHLERI.kategori;
    return {
      url: `${BASE}/kategori/${c}`,
      lastModified: sonMakale && sonMakale > metin ? sonMakale : metin,
      changeFrequency: "daily" as const,
      priority: 0.7,
    };
  });

  // Canlı piyasa verisi sayfaları (yüksek arama hacmi)
  const HUB_TARIHI: Record<string, Date> = {
    "/doviz": PROFIL_TARIHLERI.varlik,
    "/altin": PROFIL_TARIHLERI.varlik,
    "/borsa": PROFIL_TARIHLERI.hisse,
    "/kripto": PROFIL_TARIHLERI.kripto,
    "/faiz": PROFIL_TARIHLERI.arac,
    "/araclar": PROFIL_TARIHLERI.arac,
  };
  const marketHubs = Object.keys(HUB_TARIHI).map((u) => ({
    url: `${BASE}${u}`,
    lastModified: HUB_TARIHI[u],
    changeFrequency: "hourly" as const,
    priority: 0.9,
  }));
  const fxEntries = Object.keys(FX_PAIRS).map((p) => ({
    url: `${BASE}/doviz/${p}`,
    lastModified: PROFIL_TARIHLERI.varlik,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }));
  const goldEntries = Object.keys(GOLD_TYPES).map((t) => ({
    url: `${BASE}/altin/${t}`,
    lastModified: PROFIL_TARIHLERI.varlik,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }));
  const cryptoEntries = Object.keys(CRYPTO_COINS).map((c) => ({
    url: `${BASE}/kripto/${c}`,
    lastModified: PROFIL_TARIHLERI.kripto,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }));
  const bistEntries = Object.keys(BIST_STOCKS).map((h) => ({
    url: `${BASE}/borsa/${h}`,
    lastModified: PROFIL_TARIHLERI.hisse,
    changeFrequency: "hourly" as const,
    priority: 0.85,
  }));
  const toolEntries = TOOL_SLUGS.map((s) => ({
    url: `${BASE}/araclar/${s}`,
    lastModified: PROFIL_TARIHLERI.arac,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    // Anasayfa, arşiv ve rehber hub'ı gerçekten en yeni yayınla tazeleniyor.
    { url: BASE, lastModified: enYeniMakale, changeFrequency: "hourly", priority: 1 },
    { url: `${BASE}/arsiv`, lastModified: enYeniMakale, changeFrequency: "daily", priority: 0.6 },
    { url: `${BASE}/rehber`, lastModified: enYeniMakale, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/hakkimizda`, lastModified: STATIK_SAYFA_TARIHI, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/yayincilik-ilkeleri`, lastModified: STATIK_SAYFA_TARIHI, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/iletisim`, lastModified: STATIK_SAYFA_TARIHI, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/gizlilik-politikasi`, lastModified: STATIK_SAYFA_TARIHI, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/kullanim-kosullari`, lastModified: STATIK_SAYFA_TARIHI, changeFrequency: "yearly", priority: 0.2 },
    ...marketHubs,
    ...fxEntries,
    ...goldEntries,
    ...cryptoEntries,
    ...bistEntries,
    ...toolEntries,
    ...catEntries,
    ...articleEntries,
  ];
}
