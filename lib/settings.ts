import { prisma } from "./db";

export interface Settings {
  ga4Id?: string;
  adsenseId?: string;
  // Google Search Console doğrulama meta etiketi (google-site-verification içeriği).
  // Admin panelden girilir; layout metadata'sı buradan okur.
  searchConsoleVerification?: string;
  adSlots?: {
    headerBanner?: boolean;
    inArticle?: boolean;
    sidebar?: boolean;
    afterArticle?: boolean;
  };
  breakingNewsEnabled?: boolean;
  autonomy?: {
    enabled?: boolean;
    dailyArticleCount?: number;
    targetWords?: number;
  };
}

const DEFAULT_SETTINGS: Settings = {
  ga4Id: "",
  adsenseId: "",
  // Mevcut (commit f204b4f ile eklenen) doğrulama kodu default olarak korunur;
  // admin panelden değiştirilince DB'deki değer bunu ezer.
  searchConsoleVerification: "4aVBJpoKMchlL_iSElublDYdFr8BMugU2qMg3zU32D8",
  adSlots: { headerBanner: false, inArticle: false, sidebar: false, afterArticle: false },
  breakingNewsEnabled: true,
  autonomy: { enabled: true, dailyArticleCount: 3, targetWords: 1000 },
};

export async function getSettings(): Promise<Settings> {
  // Savunmacı: DB geçici olarak erişilemezse (ör. Neon uyku/kesinti, build anı)
  // tüm sayfaların metadata'sı `generateMetadata` -> getSettings üzerinden buraya
  // dayandığı için hatayı yutup DEFAULT_SETTINGS döndürürüz. Aksi halde tek bir
  // bağlantı hatası tüm prerender/build'i çökertir.
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!row) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(row.value as object) };
  } catch (err) {
    console.error("[getSettings] sorgu başarısız, default ayarlar kullanılıyor:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const merged = {
    ...current,
    ...data,
    autonomy: { ...current.autonomy, ...data.autonomy },
    adSlots: { ...current.adSlots, ...data.adSlots },
  };
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { value: merged as object },
    create: { id: "singleton", value: merged as object },
  });
  return merged;
}
