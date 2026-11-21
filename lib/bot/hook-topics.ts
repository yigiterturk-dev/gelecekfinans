/**
 * Haber = KANCA (Yiğit, 2026-11-21).
 *
 * GSC ölçümü: bot haberleri 28 günde 0 tık getirdi, gösterimin %98'i araç ve
 * piyasa sayfalarında. Haber hattı artık yalnız okurun bir araca/veri
 * sayfasına geçebileceği gündemi yazar (TÜFE, TCMB faizi, asgari ücret,
 * emekli/memur zammı, kira, altın, dolar/euro). Fed, Çin, şirket kulisi gibi
 * genel haber girmez. Her yayımlanan habere ilk paragraftan sonra ilgili
 * araca giden kutu eklenir.
 *
 * Eşleme yalnız BAŞLIKTA yapılır: özetteki geçici bir "enflasyon" kelimesi
 * Çin ihracat haberini kanca yapmasın.
 */
import { includesPhrase, normalizeForMatching } from "@/lib/bot/topics";

export interface HookTopic {
  id: string;
  toolPath: string;
  ctaText: string;
  signals: string[];
  /** Başlıkta bunlardan biri varsa konu Türkiye gündemi değildir. */
  exclude?: string[];
}

const FOREIGN = [
  "fed", "ecb", "abd", "amerika", "avrupa merkez bankası", "euro bölgesi",
  "almanya", "ingiltere", "japonya", "boj", "çin", "rusya", "arjantin",
  "powell", "lagarde",
];

export const HOOK_TOPICS: HookTopic[] = [
  {
    id: "kira",
    toolPath: "/araclar/kira-artis-hesaplama",
    ctaText: "Kira artış hesaplama aracıyla yeni kiranızı TÜİK oranına göre hesaplayın",
    signals: ["kira artış", "kira zammı", "kira artışı", "kira", "kiracı", "ev sahibi"],
    exclude: [...FOREIGN, "kiraz", "kiralama", "kiralık"],
  },
  {
    id: "emekli",
    toolPath: "/araclar/emekli-zammi-hesaplama",
    ctaText: "Emekli zammı hesaplama aracıyla yeni maaşınızı görün",
    signals: [
      "emekli zammı", "emekli maaşı", "emekli aylığı", "emekliye zam", "en düşük emekli",
      "ssk bağkur", "ssk ve bağkur", "emekli", "emekliler",
    ],
    exclude: FOREIGN,
  },
  {
    id: "memur",
    toolPath: "/araclar/memur-zammi-hesaplama",
    ctaText: "Memur zammı hesaplama aracıyla enflasyon farkını hesaplayın",
    signals: ["memur zammı", "memur maaşı", "memura zam", "toplu sözleşme", "memur", "memurlar"],
    exclude: FOREIGN,
  },
  {
    id: "asgari-ucret",
    toolPath: "/araclar/enflasyon-hesaplama",
    ctaText: "Enflasyon hesaplama aracıyla maaşınızın alım gücünü görün",
    signals: ["asgari ücret", "asgari ücrete", "asgari ücretli"],
    exclude: FOREIGN,
  },
  {
    id: "enflasyon",
    toolPath: "/araclar/enflasyon-hesaplama",
    ctaText: "Enflasyon hesaplama aracıyla paranızın alım gücünü hesaplayın",
    signals: ["enflasyon", "tüfe", "üfe", "tüketici fiyat", "tüketici fiyatları", "tüik"],
    exclude: FOREIGN,
  },
  {
    id: "altin",
    toolPath: "/araclar/altin-hesaplama",
    ctaText: "Altın hesaplama aracıyla elinizdeki altının bugünkü TL değerini bulun",
    signals: ["gram altın", "çeyrek altın", "ons altın", "cumhuriyet altını", "altın fiyatları", "altın"],
    // "Bitcoin 60 bin doların altına", "sular altında", "Altınbaş" altın haberi değil.
    exclude: [
      "doların altı", "dolar altı", "sular altı", "altınbaş", "altınordu", "seviyenin altı",
      "seviyesinin altı", "beklentilerin altı", "bitcoin", "kripto",
    ],
  },
  {
    id: "faiz",
    toolPath: "/araclar/mevduat-faiz-hesaplama",
    ctaText: "Mevduat faizi hesaplama aracıyla birikiminizin getirisini hesaplayın",
    signals: [
      "politika faizi", "ppk", "faiz kararı", "faiz indirimi", "faiz artırımı",
      "tcmb faiz", "merkez bankası faiz", "mevduat faizi", "kredi faizi", "faizi",
      "faizler", "faiz",
    ],
    exclude: [...FOREIGN, "bitcoin", "kripto"],
  },
  {
    id: "doviz",
    toolPath: "/araclar/doviz-cevirici",
    ctaText: "Döviz çevirici ile güncel kurdan hesap yapın",
    signals: [
      "dolar kuru", "dolar tl", "dolar güne", "dolar haftaya", "dolar rekor", "dolar ne kadar",
      "euro kuru", "euro tl", "avro kuru", "euro güne", "döviz kuru", "döviz kurları",
      "kur rekor", "dolar euro",
    ],
  },
];

export function matchHookTopic(title: string): HookTopic | null {
  const normalized = normalizeForMatching(title);
  for (const topic of HOOK_TOPICS) {
    if (topic.exclude?.some((word) => includesPhrase(normalized, word))) continue;
    if (topic.signals.some((signal) => includesPhrase(normalized, signal))) return topic;
  }
  return null;
}

export function toolCtaHtml(topic: HookTopic): string {
  return `<div class="tool-cta"><p><strong>Hesaplayın:</strong> <a href="${topic.toolPath}">${topic.ctaText} →</a></p></div>`;
}

/** Kutuyu ilk paragraftan sonra ekler; aynı araç linki zaten kutu olarak varsa dokunmaz. */
export function insertToolCta(html: string, topic: HookTopic): string {
  if (html.includes('class="tool-cta"')) return html;
  const cta = toolCtaHtml(topic);
  const end = html.indexOf("</p>");
  return end === -1 ? cta + html : html.slice(0, end + 4) + cta + html.slice(end + 4);
}
