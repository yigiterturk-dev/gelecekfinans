/**
 * Makale metnindeki varlık adlarını ilgili canlı veri sayfasına bağlar.
 *
 * Neden: 2026-09-04 indeks taraması, canlı veri sayfalarının önemli
 * kısmının "Discovered - currently not indexed" kutusunda beklediğini
 * gösterdi. Bu sayfalara site içinden yalnızca menü ve altbilgi bağlantısı
 * gidiyordu; hiçbir makale metninden bağlam içinde link almıyorlardı.
 * Menü bağlantısı her sayfada tekrar ettiği için değeri düşüktür, metin
 * içindeki bağlam bağlantısı ise hem tarayıcıya hem okura sinyal verir.
 *
 * Yayın anında değil OKUMA anında uygulanır (app/[slug]/page.tsx). Sebep:
 * böylece geçmişteki 26 makale de geriye dönük olarak bu bağlantıları
 * kazanır, ayrıca yeni bir varlık sayfası açıldığında (bugün /borsa oldu)
 * eski içerikleri yeniden işlemek gerekmez.
 *
 * ⚠️ Sınırlar bilinçli: en fazla 3 bağlantı ve hedef sayfa başına 1 tane.
 * Metni link tarlasına çevirmek hem okumayı bozar hem spam sinyali üretir.
 */

interface MarketTerm {
  href: string;
  /** Metinde aranacak ifadeler. Uzun olan önce denenir ki "altın" ifadesi
   *  "gram altın"ın önüne geçip yanlış sayfaya bağlamasın. */
  terms: string[];
}

const MARKET_TERMS: MarketTerm[] = [
  { href: "/borsa/bist-100", terms: ["BIST 100", "BIST100", "BIST 100 endeksi"] },
  { href: "/borsa/thyao", terms: ["Türk Hava Yolları", "THYAO"] },
  { href: "/borsa/asels", terms: ["Aselsan", "ASELS"] },
  { href: "/borsa/kchol", terms: ["Koç Holding", "KCHOL"] },
  { href: "/borsa/sahol", terms: ["Sabancı Holding", "SAHOL"] },
  { href: "/borsa/tuprs", terms: ["Tüpraş", "TUPRS"] },
  { href: "/borsa/garan", terms: ["Garanti BBVA", "GARAN"] },
  { href: "/borsa/akbnk", terms: ["Akbank", "AKBNK"] },
  { href: "/borsa/froto", terms: ["Ford Otosan", "FROTO"] },
  { href: "/borsa/tcell", terms: ["Turkcell", "TCELL"] },
  { href: "/borsa", terms: ["Borsa İstanbul"] },
  { href: "/altin/gram-altin", terms: ["gram altın", "gram altin"] },
  { href: "/altin/ceyrek-altin", terms: ["çeyrek altın"] },
  { href: "/altin/cumhuriyet-altini", terms: ["Cumhuriyet altını"] },
  { href: "/altin/ons", terms: ["ons altın"] },
  { href: "/doviz/usd-try", terms: ["dolar kuru", "dolar/TL", "doların TL"] },
  { href: "/doviz/eur-try", terms: ["euro kuru", "euro/TL"] },
  { href: "/doviz/gbp-try", terms: ["sterlin kuru"] },
  { href: "/kripto/bitcoin", terms: ["Bitcoin"] },
  { href: "/kripto/ethereum", terms: ["Ethereum"] },
  { href: "/kripto/solana", terms: ["Solana"] },
  { href: "/kripto/cardano", terms: ["Cardano"] },
];

const MAX_LINKS = 3;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * @param content Makale gövdesi (HTML)
 * @param currentPath Makalenin kendi yolu — kendine link vermeyi engeller
 */
export function injectMarketLinks(content: string, currentPath?: string): string {
  let html = content;
  let eklenen = 0;

  for (const item of MARKET_TERMS) {
    if (eklenen >= MAX_LINKS) break;
    if (currentPath === item.href) continue;
    // Sayfaya zaten bağlantı varsa ikincisini ekleme.
    if (html.includes(`href="${item.href}"`)) continue;

    const siraliTerimler = [...item.terms].sort((a, b) => b.length - a.length);
    for (const term of siraliTerimler) {
      // Etiket içine, mevcut bir bağlantının metnine ya da bir özniteliğin
      // değerine dokunmamak için aynı korumalar (bkz. lib/internal-links.ts).
      const re = new RegExp(
        `(?<![<\\/a-zA-ZğüşıöçĞÜŞİÖÇ"=])(${escapeRegex(term)})(?![^<]*<\\/a>)(?![^<]*>)`,
      );
      if (re.test(html)) {
        html = html.replace(re, `<a href="${item.href}">$1</a>`);
        eklenen++;
        break;
      }
    }
  }

  return html;
}
