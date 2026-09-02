// Doğrulanmış çalışan Türkçe finans feed'leri. Hepsi doğrudan yayıncıdan gelir:
// item linki gerçek habere çıkar, dolayısıyla kanıt metni sayfadan çıkarılabilir
// ve kaynak skoru gerçek domain üzerinden hesaplanır.
//
// ── GOOGLE HABERLER TAMAMEN ÇIKARILDI (2026-08-31) ─────────────────────────
// Google News item'ları gerçek habere değil şifreli yönlendirme adresine
// bağlanır. Asıl adres yalnızca Google'ın belgelenmemiş `batchexecute` uç
// noktasından alınabiliyor; bu her an sessizce bozulabilecek bir bağımlılık
// olduğu için besleme de, ikinci kaynak araması da doğrudan yayıncılara
// taşındı. Yerine aşağıdaki liste genişletildi.
//
// Liste 2026-08-31'de canlı ölçüldü; ölü veya bayat olanlar çıkarıldı:
//   ntv.com.tr/ekonomi.rss        → 0 item (ölü)
//   koinmedya.com/feed            → son haber 12 Mayıs 2026 (bayat)
//   hurriyet.com.tr/rss/ekonomi   → son haber 7 Haziran 2026 (bayat)
//   patronlardunyasi / bigpara / milliyet / mynet / cumhuriyet / kriptokoin
//                                 → 0 item
export const RSS_FEEDS = [
  // Genel ekonomi / finans
  "https://www.aa.com.tr/tr/rss/default?cat=ekonomi",
  "https://www.aa.com.tr/tr/rss/default?cat=analiz",
  "https://www.dunya.com/rss/ekonomi.xml",
  "https://www.dunya.com/rss/finans.xml",
  "https://www.dunya.com/rss/gundem.xml",
  "https://www.ekonomim.com/rss",
  "https://www.trthaber.com/ekonomi_articles.rss",
  "https://www.sozcu.com.tr/feeds-rss-category-ekonomi",
  "https://www.haberturk.com/rss/ekonomi.xml",
  "https://www.bloomberght.com/rss",
  "https://tr.investing.com/rss/news_25.rss",
  "https://www.yenisafak.com/rss?xml=ekonomi",
  "https://www.sabah.com.tr/rss/ekonomi.xml",
  "https://www.tgrthaber.com/rss/ekonomi",
  "https://www.indyturk.com/rss.xml",
  "https://www.dunya.com/rss/sirketler.xml",
  "https://www.trthaber.com/sondakika.rss",
  // Kripto
  //
  // btchaber.com ve coin-turk.com 2026-09-02'de listeden CIKARILDI: ikisi de
  // Cloudflare arkasindan baglantiyi resetliyor (curl 35, "Connection reset by
  // peer"), bot her kosuda "2/20 RSS feed hata verdi" diyordu. Geriye tek bir
  // kripto yayincisi (uzmancoin) kaliyordu ve iki bagimsiz yayinci sarti
  // kripto haberlerinde matematiksel olarak saglanamiyordu.
  "https://uzmancoin.com/feed/",
  "https://kriptohaber.com.tr/feed/",
  "https://tr.investing.com/rss/news_301.rss",
];

export const CATEGORIES: Record<string, string[]> = {
  kripto: ["bitcoin", "ethereum", "kripto", "btc", "eth", "altcoin", "blockchain"],
  borsa: ["bist", "hisse", "endeks", "borsa", "pay", "temettü"],
  doviz: ["dolar", "euro", "kur", "forex", "sterlin", "yen"],
  altin: ["altın", "gram altın", "ons", "çeyrek"],
  ekonomi: ["faiz", "enflasyon", "merkez bankası", "tcmb", "büyüme", "fed"],
};

export const ARTICLE_WORDS = 600;
export const ARTICLE_MIN_WORDS = 400;

export const CATEGORY_PROMPTS: Record<string, { system_extra: string; structure: string }> = {
  kripto: {
    system_extra: "Kripto para piyasalarında blockchain teknolojisi, DeFi ve regülasyon konularında uzmansın. Güncel piyasa değeri ve hacim verisi kullan. Türk yatırımcının perspektifinden yaz. Fiyat tahmini veya hedef verme.",
    structure: "Piyasa Durumu → Güncel Gelişmeler → Temel Sürücüler → Türkiye'deki Etkiler → Değerlendirme",
  },
  borsa: {
    system_extra: "BIST ve küresel borsalarda sektör analizi, bilanço okuma ve makro değerlendirmede uzmansın. Endeks seviyelerini ve yabancı yatırımcı hareketlerini aktar ama al-sat tavsiyesi verme.",
    structure: "Borsa Görünümü → Sektörel Değerlendirme → Yabancı Yatırımcı Hareketi → Makro Etkenler → Genel Değerlendirme",
  },
  doviz: {
    system_extra: "Merkez bankası politikaları ve TL kur dinamiklerinde uzmansın. TCMB kararları, cari açık, rezerv ve faiz farkını birlikte değerlendir. Kur tahmini veya hedef seviye verme.",
    structure: "Güncel Kur Tablosu → TCMB Politikası → Küresel Gelişmeler → TL Üzerindeki Etkiler → Değerlendirme",
  },
  altin: {
    system_extra: "Kıymetli madenler piyasasında gram altın, ons altın ve TL bazlı fiyatlama konusunda uzmansın. Fed faiz beklentisi, jeopolitik risk ve enflasyonu birlikte değerlendir. Fiyat hedefi verme.",
    structure: "Güncel Altın Fiyatı → Küresel Sürücüler → Fed & Enflasyon Bağlantısı → Gram Altın TL Değerlendirmesi → Genel Bakış",
  },
  ekonomi: {
    system_extra: "Türkiye ve küresel makroekonomide enflasyon, faiz, büyüme ve işsizlik verilerini yorumlamada uzmansın. TÜİK ve TCMB verilerini, IMF ve Dünya Bankası projeksiyonlarıyla karşılaştır.",
    structure: "Mevcut Ekonomik Tablo → Veri Analizi → Politika Değerlendirmesi → Küresel Karşılaştırma → Değerlendirme",
  },
};
