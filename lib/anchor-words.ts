/**
 * ÇAPA KELİMESİ İLKELLERİ — tek kaynak.
 *
 * İki ayrı iç bağlantı üreticisi var (bot yazarken `lib/bot/linker.ts`, sayfa
 * render ederken `lib/internal-links.ts`) ve 5 Eylül 2026'da yalnızca birincisi
 * düzeltilmişti: canlı sayfa hâlâ kendi süzgeçsiz linkini ekliyordu. Kural
 * kopyalanınca biri sessizce bozuk kalır; bu yüzden tek dosyada durur.
 */

/**
 * ── ÇAPA METNİ SEÇİMİ ───────────────────────────────────────────────────────
 *
 * CANLI ARIZA (4 Eylül 2026): eski kural `title.split(...).filter(w =>
 * w.length > 4)` idi ve "nasıl" 5 harf olduğu için geçiyordu. Yayındaki
 * "Enflasyon nedir nasıl hesaplanır" makalesinin GİRİŞ CÜMLESİNDE, "nasıl"
 * kelimesi iki ayrı ve konuyla ilgisiz makaleye bağlanmıştı:
 *   "Enflasyon nedir <a href="/birikim-nasil-degerlendirilir">nasıl</a> …"
 *
 * Alakasız çapa metni iki yönlü zarar verir: okur tıkladığında beklediği
 * sayfayı bulamaz, arama motoru da çapa metnini hedef sayfanın konusu sanar.
 * Bağlantının değeri ÇAPA METNİNDEDİR; anlamsız çapa, bağlantıyı değersiz
 * kılmakla kalmaz, hedef sayfayı yanlış konuyla ilişkilendirir.
 *
 * Yeni kural, önem sırasıyla:
 *   1. Makalenin tam anahtar kelime öbeği (en iyi çapa: hedefin konusu).
 *   2. Başlıktan çıkarılan 2-3 kelimelik öbekler; en az biri jenerik olmayan.
 *   3. Tek kelime yalnızca 7+ harfse ve jenerik değilse.
 */
const GENERIC_ANCHOR_WORDS = new Set([
  // soru ve yönerge kalıpları
  "nasıl", "nedir", "neden", "hangi", "kimdir", "kaçtır", "mıdır", "nerede",
  "yapılır", "hesaplanır", "değerlendirilir", "başlanır", "alınır", "olur",
  "oldu", "belli", "açıklandı", "gerekenler", "gerekir", "dikkat", "edilmesi",
  // içerik pazarlaması dolgusu
  "kapsamlı", "kalıcı", "temel", "güncel", "detaylı", "eksiksiz", "adımlar",
  "adım", "kurallar", "yollar", "rehber", "rehberi", "haritası", "ipuçları",
  "önemli", "bilinmesi", "hakkında", "üzerine", "için", "ile", "olarak",
  "sonrası", "öncesi", "arasında", "birlikte", "şunlar", "işte",
  // Çok kelimeli bir kavramdan koparılmış parçalar tek başına çapa olamaz:
  // "doğal gaz" -> "doğal", "çalışma prensipleri" -> "çalışma".
  "doğal", "çalışma", "prensipleri", "süreci", "süreç", "tanım", "yöntem",
  "türleri", "çeşitleri", "örnekleri", "listesi", "tablosu", "durumu",
  // Yardımcı fiil öbeğinin isim yarısı ("devam edecek", "dikkat çekti") tek
  // başına konu adlandırmaz; 5 Eylül 2026 arızasında "devam" 5 harf olduğu
  // için içerik kelimesi sayılmıştı.
  "devam", "kapsamında", "konusunda", "durumunda", "yönünde", "sonucunda",
  // Ay adları ve zaman ifadeleri kapalı bir kümedir ve hiçbiri konu değildir;
  // "ağustosta sınırlı" gibi bir çapa hedefin ne hakkında olduğunu söylemez.
  "ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos",
  "eylül", "ekim", "kasım", "aralık", "ocakta", "şubatta", "martta", "nisanda",
  "mayısta", "haziranda", "temmuzda", "ağustosta", "eylülde", "ekimde",
  "kasımda", "aralıkta", "bugün", "dün", "yarın", "hafta", "haftalık", "aylık",
  "günlük", "yıllık", "çeyrek", "sabah", "akşam",
]);

export const MIN_SINGLE_WORD_ANCHOR = 7;

/**
 * KAPALI SINIF KELİMELER (bağlaç, zarf, edat, belirteç).
 *
 * Bu küme jenerik kelime listesi gibi büyümez — Türkçede sayısı sabittir.
 * Hiçbiri bir sayfanın KONUSU olamaz, dolayısıyla hiçbiri çapa metni olamaz.
 * 5 Eylül 2026 arızasında "yalnızca" tek kelime eşiğini (7 harf) geçtiği için
 * çapa olmuş ve DASK haberini altcoin haberine bağlamıştı.
 */
const FUNCTION_WORDS = new Set([
  "yalnızca", "sadece", "ayrıca", "özellikle", "böylece", "ancak", "fakat",
  "ama", "çünkü", "dolayısıyla", "nitekim", "hatta", "yine", "yeniden",
  "ardından", "sonra", "önce", "şimdi", "artık", "henüz", "halen", "hâlen",
  "kadar", "beri", "göre", "rağmen", "karşın", "üzere", "üzerinden", "itibaren",
  "tarafından", "boyunca", "gibi", "yaklaşık", "toplam", "tüm", "bütün", "her",
  "bazı", "birçok", "çeşitli", "diğer", "aynı", "kendi", "böyle", "şöyle",
  "daha", "çok", "az", "en", "hem", "veya", "ya", "ise", "ki", "de", "da",
  "hızla", "birden", "giderek", "ağırlıklı", "büyük", "küçük", "yeni", "eski",
]);

/**
 * ÇEKİMLİ FİİL BİÇİMLERİ yapısal olarak elenir.
 *
 * "edecek", "sattı", "kaldı", "geriledi", "yükseldi" — hepsi bir OLAYI anlatır,
 * bir KONUYU adlandırmaz. Liste tutmak yerine eki tanımak gerekir; yoksa her
 * yeni haber fiili aynı arızayı tekrar üretir (5 Eylül 2026: "devam edecek"
 * çapası e-ihracat haberine bağlanmıştı).
 */
const FINITE_VERB_SUFFIX =
  /(ecek|acak|ıyor|iyor|uyor|üyor|mış|miş|muş|müş|dı|di|du|dü|tı|ti|tu|tü|mekte|makta|meye|maya)$/;

export function isFiniteVerbForm(word: string): boolean {
  const lower = word.toLocaleLowerCase("tr-TR");
  // Özel ad (Bitcoin, Gültepe) ya da kısaltma fiil sayılmaz.
  if (/^[A-ZÇĞİÖŞÜ]/.test(word) && word.length > 1) return false;
  return FINITE_VERB_SUFFIX.test(lower);
}

export function isGenericAnchor(word: string): boolean {
  const lower = word.toLocaleLowerCase("tr-TR");
  return GENERIC_ANCHOR_WORDS.has(lower) || FUNCTION_WORDS.has(lower);
}

/**
 * İÇERİK KELİMESİ: hedef sayfanın konusunu taşıyabilecek kelime.
 *
 * Çapa metninde en az bir tanesi olmak ZORUNDA. Bu kural aynı zamanda konu
 * alakasını da sağlar: makale hedefin konu kelimesini gerçekten geçmiyorsa
 * eşleşme olmaz, bağlantı hiç kurulmaz ve kategori/veri merkezine düşülür.
 */
/**
 * AYIRT EDİCİ kelime: tek başına bir sayfanın konusunu gösterebilir.
 *
 * 5 Eylül 2026 (üçüncü tur): yapısal süzgeç "yalnızca"yı elemişti ama sıfat
 * geçiyordu — DASK haberi "sınırlı" çapasıyla bir TCMB haberine bağlandı.
 * Sıfat/zarf bir konu adlandırmaz. Ayırt edici olan: hedefin ANAHTAR
 * KELİMESİNDE geçen kelime, özel ad, ya da uzun (8+ harf) bir terim.
 */
export function isDistinctiveWord(word: string, keyword?: string | null): boolean {
  if (!isContentWord(word)) return false;
  const lower = word.toLocaleLowerCase("tr-TR");
  if (keyword && keyword.toLocaleLowerCase("tr-TR").includes(lower)) return true;
  if (/^[A-ZÇĞİÖŞÜ]/.test(word)) return true;   // özel ad: Remixpoint, TCMB
  return word.length >= 8;
}

export function isContentWord(word: string): boolean {
  if (word.length < 5) return false;
  if (isGenericAnchor(word)) return false;
  if (isFiniteVerbForm(word)) return false;
  return true;
}


/**
 * TÜRKÇE-GÜVENLİ KELİME SINIRI.
 *
 * JS'te `\b` yalnızca ASCII `\w` üzerinden çalışır: "sigortası" sonundaki `ı`
 * kelime karakteri SAYILMAZ, dolayısıyla `\bdeprem sigortası\b` HİÇ eşleşmez.
 * 5 Eylül 2026'da bulundu ve sinsi tarafı şu: iç bağlantı üreticisi bu yüzden
 * Türkçe ekle biten (yani anlamlı) çapaları sessizce atlıyor, ASCII ile biten
 * jenerik kelimelere ("yalnızca", "devam edecek") düşüyordu. Yani çapa
 * kalitesizliğinin bir nedeni de bu sınır hatasıydı.
 */
export function turkceSinirliDesen(escaped: string, ekstra = ""): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_/"'>])(${escaped})(?![\\p{L}\\p{N}_])${ekstra}`,
    "iu",
  );
}
