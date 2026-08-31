/**
 * Şerit B'nin başlangıç anahtar kelime havuzu.
 *
 * Liste "arama hacmi" tahminine değil, Türk bireysel yatırımcının gerçekten
 * yazdığı soru kalıplarına göre kuruldu: "nedir", "nasıl", "ne kadar",
 * "hangisi", "vergisi". Bu kalıplar hem klasik aramada hem de AI cevaplarında
 * (AI Overviews / ChatGPT) alıntılanmaya en uygun olanlar.
 *
 * Her küme (cluster) tek bir hub sayfası ve ona bağlanan spoke sayfalardan
 * oluşur. Hub geniş ve kapsayıcı, spoke dar ve tek soruya cevap verir;
 * iç linkleme bu ilişkiyi otomatik kurar (bkz. linker.ts).
 *
 * priority: 1-100. Yükseği önce yazılır. Hub sayfaları bilerek yüksek
 * önceliklidir — spoke'ların bağlanacağı hedef önce var olmalı.
 */

export interface SeedKeyword {
  term: string;
  category: string;
  cluster: string;
  isHub?: boolean;
  intent?: "INFORMATIONAL" | "COMMERCIAL" | "TRANSACTIONAL" | "NAVIGATIONAL";
  priority?: number;
}

export const KEYWORD_SEED: SeedKeyword[] = [
  // ── Altın ────────────────────────────────────────────────────────────────
  { term: "altın yatırımı nasıl yapılır", category: "altin", cluster: "altin-yatirimi", isHub: true, priority: 95 },
  { term: "gram altın nasıl alınır", category: "altin", cluster: "altin-yatirimi", intent: "TRANSACTIONAL", priority: 85 },
  { term: "çeyrek altın kaç gram", category: "altin", cluster: "altin-yatirimi", priority: 80 },
  { term: "ons altın nedir", category: "altin", cluster: "altin-yatirimi", priority: 70 },
  { term: "altın alım satım makası nedir", category: "altin", cluster: "altin-yatirimi", priority: 65 },
  { term: "fiziki altın mı bankada altın mı", category: "altin", cluster: "altin-yatirimi", intent: "COMMERCIAL", priority: 75 },
  { term: "altın fiyatını ne etkiler", category: "altin", cluster: "altin-yatirimi", priority: 72 },
  { term: "altın vergisi var mı", category: "altin", cluster: "altin-yatirimi", priority: 68 },

  // ── Döviz ────────────────────────────────────────────────────────────────
  { term: "döviz yatırımı nedir", category: "doviz", cluster: "doviz-temel", isHub: true, priority: 95 },
  { term: "dolar kuru neye göre belirlenir", category: "doviz", cluster: "doviz-temel", priority: 85 },
  { term: "alış ve satış kuru arasındaki fark", category: "doviz", cluster: "doviz-temel", priority: 75 },
  { term: "serbest piyasa kuru nedir", category: "doviz", cluster: "doviz-temel", priority: 70 },
  { term: "efektif kur nedir", category: "doviz", cluster: "doviz-temel", priority: 65 },
  { term: "döviz alımında vergi var mı", category: "doviz", cluster: "doviz-temel", priority: 78 },
  { term: "dövizli mevduat nedir", category: "doviz", cluster: "doviz-temel", intent: "COMMERCIAL", priority: 72 },
  { term: "reel efektif döviz kuru nedir", category: "doviz", cluster: "doviz-temel", priority: 60 },

  // ── Borsa ────────────────────────────────────────────────────────────────
  { term: "borsaya nasıl başlanır", category: "borsa", cluster: "borsa-baslangic", isHub: true, priority: 95 },
  { term: "bist 100 nedir", category: "borsa", cluster: "borsa-baslangic", priority: 88 },
  { term: "hisse senedi nasıl alınır", category: "borsa", cluster: "borsa-baslangic", intent: "TRANSACTIONAL", priority: 86 },
  { term: "aracı kurum nasıl seçilir", category: "borsa", cluster: "borsa-baslangic", intent: "COMMERCIAL", priority: 80 },
  { term: "temettü nedir nasıl alınır", category: "borsa", cluster: "borsa-baslangic", priority: 82 },
  { term: "halka arz nedir nasıl katılınır", category: "borsa", cluster: "borsa-baslangic", priority: 84 },
  { term: "borsada emir türleri nelerdir", category: "borsa", cluster: "borsa-baslangic", priority: 70 },
  { term: "viop nedir", category: "borsa", cluster: "borsa-baslangic", priority: 68 },
  { term: "borsa kaçta açılır kaçta kapanır", category: "borsa", cluster: "borsa-baslangic", priority: 74 },
  { term: "hisse senedi vergisi nasıl hesaplanır", category: "borsa", cluster: "borsa-baslangic", priority: 76 },

  // ── Kripto ───────────────────────────────────────────────────────────────
  { term: "kripto para nedir", category: "kripto", cluster: "kripto-temel", isHub: true, priority: 95 },
  { term: "bitcoin nasıl alınır", category: "kripto", cluster: "kripto-temel", intent: "TRANSACTIONAL", priority: 88 },
  { term: "kripto borsası nasıl seçilir", category: "kripto", cluster: "kripto-temel", intent: "COMMERCIAL", priority: 82 },
  { term: "kripto cüzdanı nedir", category: "kripto", cluster: "kripto-temel", priority: 78 },
  { term: "stablecoin nedir", category: "kripto", cluster: "kripto-temel", priority: 72 },
  { term: "kripto para vergisi türkiye", category: "kripto", cluster: "kripto-temel", priority: 85 },
  { term: "blockchain nasıl çalışır", category: "kripto", cluster: "kripto-temel", priority: 66 },
  { term: "bitcoin halving nedir", category: "kripto", cluster: "kripto-temel", priority: 70 },

  // ── Ekonomi / makro ──────────────────────────────────────────────────────
  { term: "enflasyon nedir nasıl hesaplanır", category: "ekonomi", cluster: "makro-temel", isHub: true, priority: 95 },
  { term: "tüfe ve üfe arasındaki fark", category: "ekonomi", cluster: "makro-temel", priority: 84 },
  { term: "politika faizi nedir", category: "ekonomi", cluster: "makro-temel", priority: 86 },
  { term: "merkez bankası ne iş yapar", category: "ekonomi", cluster: "makro-temel", priority: 74 },
  { term: "resesyon nedir", category: "ekonomi", cluster: "makro-temel", priority: 68 },
  { term: "cari açık nedir", category: "ekonomi", cluster: "makro-temel", priority: 70 },
  { term: "reel getiri nasıl hesaplanır", category: "ekonomi", cluster: "makro-temel", priority: 76 },
  { term: "faiz artışı ne anlama gelir", category: "ekonomi", cluster: "makro-temel", priority: 78 },

  // ── Tasarruf araçları (dönüşüm niyeti yüksek) ────────────────────────────
  { term: "birikim nasıl değerlendirilir", category: "ekonomi", cluster: "tasarruf-araclari", isHub: true, priority: 92 },
  { term: "vadeli mevduat nedir", category: "ekonomi", cluster: "tasarruf-araclari", intent: "COMMERCIAL", priority: 82 },
  { term: "yatırım fonu nedir nasıl alınır", category: "ekonomi", cluster: "tasarruf-araclari", intent: "COMMERCIAL", priority: 84 },
  { term: "bes nedir avantajları nelerdir", category: "ekonomi", cluster: "tasarruf-araclari", intent: "COMMERCIAL", priority: 80 },
  { term: "eurobond nedir", category: "ekonomi", cluster: "tasarruf-araclari", priority: 66 },
  { term: "hazine bonosu nedir", category: "ekonomi", cluster: "tasarruf-araclari", priority: 68 },
  { term: "portföy çeşitlendirmesi nedir", category: "ekonomi", cluster: "tasarruf-araclari", priority: 74 },
];

/** Küme adı → o kümenin hub anahtar kelimesi. */
export function hubOfCluster(cluster: string): SeedKeyword | undefined {
  return KEYWORD_SEED.find((item) => item.cluster === cluster && item.isHub);
}
