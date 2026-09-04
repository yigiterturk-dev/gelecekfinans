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
  /**
   * Pozisyon başına AdSense reklam birimi kimliği (data-ad-slot).
   *
   * ⚠️ Neden eklendi: AdSlot bileşeni `data-ad-slot=""` basıyordu. Publisher
   * ID girilse bile AdSense boş birim kimliğiyle display reklamı SUNMAZ —
   * yani gelir rayı sessizce ölü kalırdı. Kimlik girilmemişse bileşen artık
   * Otomatik Reklam (Auto ads) moduna düşüyor: yalnızca AdSense betiği
   * yüklenir, boş <ins> basılmaz. Böylece sadece publisher ID ile de reklam
   * yayınlanabiliyor, birim kimlikleri girilince manuel yerleşime geçiliyor.
   */
  adSlotIds?: {
    headerBanner?: string;
    inArticle?: string;
    sidebar?: string;
    afterArticle?: string;
  };
  breakingNewsEnabled?: boolean;
  autonomy?: {
    cronEnabled?: boolean;
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
  adSlotIds: { headerBanner: "", inArticle: "", sidebar: "", afterArticle: "" },
  breakingNewsEnabled: true,
  // enabled=false iken decidePublication her makaleyi REVIEW'a atar ve kimse
  // kuyruğu boşaltmazsa site hiç güncellenmez. Kalite kapıları (RED konu,
  // ikinci bağımsız kaynak, kaynak/SEO skoru, kapak görseli) zaten ayrı
  // çalıştığı için otomatik yayın varsayılan olarak açıktır.
  autonomy: { cronEnabled: true, enabled: true, dailyArticleCount: 2, targetWords: 650 },
};

export async function getSettings(): Promise<Settings> {
  // Savunmacı: DB geçici olarak erişilemezse (ör. Neon uyku/kesinti, build anı)
  // tüm sayfaların metadata'sı `generateMetadata` -> getSettings üzerinden buraya
  // dayandığı için hatayı yutup DEFAULT_SETTINGS döndürürüz. Aksi halde tek bir
  // bağlantı hatası tüm prerender/build'i çökertir.
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (!row) return DEFAULT_SETTINGS;
    const stored = row.value as Settings;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      autonomy: { ...DEFAULT_SETTINGS.autonomy, ...stored.autonomy },
      adSlots: { ...DEFAULT_SETTINGS.adSlots, ...stored.adSlots },
    };
  } catch (err) {
    console.error("[getSettings] sorgu başarısız, default ayarlar kullanılıyor:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(data: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const requestedCount = data.autonomy?.dailyArticleCount;
  const requestedWords = data.autonomy?.targetWords;
  const merged = {
    ...current,
    ...data,
    autonomy: {
      ...current.autonomy,
      ...data.autonomy,
      ...(requestedCount != null
        ? { dailyArticleCount: Math.max(1, Math.min(2, Math.round(requestedCount))) }
        : {}),
      ...(requestedWords != null
        ? { targetWords: Math.max(450, Math.min(900, Math.round(requestedWords))) }
        : {}),
    },
    adSlots: { ...current.adSlots, ...data.adSlots },
    // Birim kimlikleri de iç içe nesne: sığ yayılım tek alan gönderildiğinde
    // diğerlerini siler, o yüzden adSlots ile aynı biçimde birleştirilir.
    adSlotIds: { ...current.adSlotIds, ...data.adSlotIds },
  };
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: { value: merged as object },
    create: { id: "singleton", value: merged as object },
  });
  return merged;
}
