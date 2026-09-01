/**
 * Rehber şeridinde doğrulayıcı itirazlarının süzülmesi.
 *
 * Neden var: rehber şeridinde İKİ KAPI BİRBİRİYLE ÇELİŞİYORDU.
 * `GUIDE_QUALITY_PRESET.forbidSpecificFigures` rehberde somut rakamı
 * (oran, tutar, limit, süre) YASAKLIYOR — çünkü rehber kavramsal üretilir,
 * kazıma yoktur ve uydurulmuş bir rakam en büyük risktir. Doğrulayıcıya ise
 * "doğrulanması gereken oran, tutar, süre veya limit ara" deniyordu; model de
 * rakam bulamayınca RAKAM OLMAMASINI itiraz olarak yazıyordu:
 *   "Emirlerin geçerlilik süreleri sürekli gözden geçirilmeli, ancak kesin
 *    süre belirtilmemiş."
 *   "Borsada işlem yaparken kesin kazanç sağlanamayacağı bilgisi eksik."
 * Bu itirazlar KAZANILAMAZ: yazar rakamı eklerse kalite kapısı, eklemezse
 * doğrulayıcı düşürüyor. 1 Eylül 2026'da üç rehber koşumunun üçü de bu
 * kilitte öldü (08:00 / 12:00 / 20:00) ve onarım turu da tutmadı —
 * "kaldır" talimatı bir EKSİKLİK itirazını hiçbir zaman karşılayamaz.
 *
 * Çözüm iki katmanlı: (1) doğrulayıcı sistem talimatına eksiklik yasağı
 * yazıldı, (2) model yine de yazarsa diye burada mekanik süzgeç var. Süzgeç
 * yalnızca EKSİKLİK kalıbını atar; uydurma kurum, uydurma yasa, yatırım
 * tavsiyesi ve çelişki itirazları aynen geçer — kapı zayıflamıyor.
 */

/**
 * "Şu bilgi yok / belirtilmemiş / eksik" biçimindeki itirazlar.
 *
 * Hepsi bir OLUMSUZLAMA + eksiklik sözcüğü taşır. Olumlu bir uydurma
 * iddiasında ("EPDK 2019'da kaldırdı") bu kalıpların hiçbiri geçmez.
 */
/**
 * ⚠️ Türkçe için `\b` KULLANILMAZ: JavaScript'te `\w` yalnızca [A-Za-z0-9_],
 * yani "belirtilmemiş" sözcüğünün sonundaki 'ş' bir sözcük karakteri
 * sayılmıyor ve `\b` orada eşleşmiyor. Sınırlar Unicode harf sınıfıyla
 * kuruluyor.
 */
const ONCE = "(?<!\\p{L})";
const SONRA = "(?!\\p{L})";
const omission = (body: string) => new RegExp(ONCE + body + SONRA, "iu");

const OMISSION_PATTERNS: RegExp[] = [
  omission("belirtilme(miş|di)"),
  omission("(bilgi|ayrıntı|detay|açıklama|veri|kaynak|uyarı|ibare)\\p{L}*\\s+(eksik|yok|verilmemiş|yer almıyor)"),
  omission("eksik(tir)?"),
  omission("(yer verilmemiş|değinilmemiş|açıklanmamış|belirsiz bırakılmış|net değil|paylaşılmamış|paylaşılmadı)"),
  omission("(sınır|süre|oran|tutar|limit|gün|saat|rakam|bilgi)\\p{L}*(\\s+\\S+){0,3}\\s+(yok|belirtilmemiş|verilmemiş|paylaşılmadı|paylaşılmamış)"),
  omission("(daha fazla|ek)\\s+(bilgi|ayrıntı|detay)"),
  omission("(belirtilmeli|eklenmeli|açıklanmalı|verilmeli|geçirilmeli)"),
];

/** Tek bir itiraz eksiklik şikâyeti mi? */
export function isOmissionObjection(objection: string): boolean {
  const text = objection.trim();
  if (!text) return false;
  return OMISSION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Rehber şeridinde ret gerekçesi sayılacak itirazlar.
 *
 * Haber ve varlık şeritlerinde ÇAĞRILMAZ: orada kanıt paketi vardır, "kanıtta
 * yok" demek gerçek bir ihlaldir.
 */
export function guideBlockingObjections(objections: string[]): string[] {
  return objections.filter((objection) => !isOmissionObjection(objection));
}
