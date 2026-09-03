import { prisma } from "@/lib/db";

interface LinkableArticle {
  slug: string;
  title: string;
  category: string;
  keyword: string | null;
}

const CATEGORY_HUBS: Record<string, Array<{ href: string; label: string }>> = {
  borsa: [
    { href: "/kategori/borsa", label: "borsa haberleri" },
    { href: "/faiz", label: "güncel faiz oranları" },
  ],
  doviz: [
    { href: "/doviz", label: "canlı döviz kurları" },
    { href: "/kategori/doviz", label: "döviz haberleri" },
  ],
  altin: [
    { href: "/altin", label: "güncel altın fiyatları" },
    { href: "/kategori/altin", label: "altın haberleri" },
  ],
  kripto: [
    { href: "/kripto", label: "kripto para fiyatları" },
    { href: "/kategori/kripto", label: "kripto para haberleri" },
  ],
  ekonomi: [
    { href: "/kategori/ekonomi", label: "ekonomi haberleri" },
    { href: "/araclar", label: "finans hesaplama araçları" },
  ],
};

export async function autoLink(
  content: string,
  category: string,
  currentSlug: string
): Promise<string> {
  const candidates = await prisma.article.findMany({
    where: { status: "PUBLISHED", slug: { not: currentSlug } },
    select: { slug: true, title: true, category: true, keyword: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  let html = content;

  // Replace [DAHILI_LINK] placeholders with relevant internal links
  const sameCat = candidates.filter(a => a.category === category);
  const otherCat = candidates.filter(a => a.category !== category);
  const pool = [...sameCat, ...otherCat];

  let placeholderIdx = 0;
  html = html.replace(/\[DAHILI_LINK\]/gi, () => {
    const target = pool[placeholderIdx % pool.length];
    if (!target) return "";
    placeholderIdx++;
    return `<a href="/${target.slug}">${target.title}</a>`;
  });

  // Also inject contextual internal links by matching keywords in content
  const internalLinksAdded = countInternalLinks(html);
  if (internalLinksAdded < 2 && pool.length > 0) {
    html = injectInternalLinks(html, pool, currentSlug, 3 - internalLinksAdded);
  }

  // Yayının ilk günlerinde bağlantı verilecek eski makale olmayabilir. Bu
  // durumda da her haber, kalıcı kategori/veri merkezlerine bağlanır; ilk
  // içerikten itibaren kopuk (orphan) sayfa oluşmaz.
  const remaining = Math.max(0, 2 - countInternalLinks(html));
  if (remaining > 0) {
    const hubs = CATEGORY_HUBS[category] || CATEGORY_HUBS.ekonomi;
    const links = hubs.slice(0, remaining)
      .map((hub) => `<a href="${hub.href}">${hub.label}</a>`)
      .join(" ve ");
    html = `${html.trimEnd()}\n<p>Konunun güncel görünümü için ${links} sayfalarını inceleyebilirsiniz.</p>`;
  }

  return html;
}

function countInternalLinks(html: string): number {
  return (html.match(/href=["']\/[^"']*["']/gi) || []).length;
}

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
]);

const MIN_SINGLE_WORD_ANCHOR = 7;

export function isGenericAnchor(word: string): boolean {
  return GENERIC_ANCHOR_WORDS.has(word.toLocaleLowerCase("tr-TR"));
}

/** Bir makaleye bağlanırken kullanılabilecek çapa metinleri, önem sırasıyla. */
export function linkableTerms(article: { title: string; keyword?: string | null }): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const trimmed = value.trim();
    const key = trimmed.toLocaleLowerCase("tr-TR");
    if (!trimmed || seen.has(key)) return;
    seen.add(key);
    terms.push(trimmed);
  };

  if (article.keyword && article.keyword.trim().length >= 6) push(article.keyword);

  const words = article.title
    .split(/[\s:,;.!?—–-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  // 3 ve 2 kelimelik öbekler: en az biri anlamlı olmalı, hepsi jenerikse atla.
  for (const size of [3, 2]) {
    for (let index = 0; index + size <= words.length; index++) {
      const phrase = words.slice(index, index + size);
      if (phrase.every(isGenericAnchor)) continue;
      if (!phrase.some((word) => !isGenericAnchor(word) && word.length >= 5)) continue;
      push(phrase.join(" "));
    }
  }

  for (const word of words) {
    if (word.length >= MIN_SINGLE_WORD_ANCHOR && !isGenericAnchor(word)) push(word);
  }

  return terms;
}

/**
 * Giriş paragrafı (lede) otomatik bağlantıdan MUAFTIR.
 *
 * 4 Eylül 2026: bağlantı, makalenin kendi odak anahtar kelimesinin ortasına
 * giriyordu — "<a …>Enflasyon</a> nedir nasıl hesaplanır". Öbek bölününce SEO
 * çözümlemesi kelimeyi bulamıyor ve makale kendi hedef sorgusunda zayıflıyor.
 * Lede, okurun ve arama motorunun konuyu belirlediği yerdir; oraya başka bir
 * sayfaya çıkan çapa koymak hem odağı hem bağlantıyı değersizleştirir.
 */
function ledeEndIndex(html: string): number {
  const end = html.indexOf("</p>");
  return end < 0 ? 0 : end + 4;
}

export function injectInternalLinks(
  html: string,
  articles: LinkableArticle[],
  currentSlug: string,
  maxLinks: number
): string {
  let added = 0;
  const ledeEnd = ledeEndIndex(html);

  for (const article of articles) {
    if (added >= maxLinks) break;
    if (article.slug === currentSlug) continue;

    const terms = linkableTerms(article);

    for (const term of terms) {
      if (added >= maxLinks) break;
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Only match text NOT already inside an <a> tag
      const regex = new RegExp(
        `(?<![/"'>])\\b(${escaped})\\b(?![^<]*<\\/a>)`,
        "i"
      );
      const match = html.match(regex);
      if (match && match.index !== undefined) {
        if (match.index < ledeEnd) continue;
        const before = html.slice(0, match.index);
        const after = html.slice(match.index + match[0].length);
        // Don't link inside headings
        const lastTag = before.lastIndexOf("<");
        const tagSnippet = before.slice(lastTag).toLowerCase();
        if (tagSnippet.startsWith("<h2") || tagSnippet.startsWith("<h3")) continue;

        html = `${before}<a href="/${article.slug}">${match[0]}</a>${after}`;
        added++;
        break;
      }
    }
  }

  return html;
}

/**
 * Rehber kümesi (hub & spoke) iç linklemesi.
 *
 * Kategori linkleri her makaleye aynı yerlere bağlanır ve tek başına konu
 * otoritesi kurmaz. Küme linklemesi farklı iş yapar: aynı konuyu işleyen
 * sayfaları birbirine bağlar, böylece arama motoru "bu site altın yatırımı
 * konusunu bütün olarak ele almış" sinyalini alır.
 *
 * Yön kasıtlı olarak asimetrik:
 *  - Spoke → hub: metnin İÇİNDE, ana rehbere tek bir güçlü bağlantı.
 *  - Hub → spoke: metnin SONUNDA liste; hub sayfası kümenin dağıtım noktasıdır.
 *
 * Zaten var olan bir bağlantı tekrarlanmaz; aynı hedefe iki kez link vermek
 * ikinci linki değersizleştirir.
 */
export async function linkGuideCluster(
  content: string,
  cluster: string,
  currentSlug: string,
  isHub: boolean,
): Promise<string> {
  const siblings = await prisma.article.findMany({
    where: { status: "PUBLISHED", cluster, slug: { not: currentSlug } },
    select: { slug: true, title: true, keyword: true, track: true },
    orderBy: { publishedAt: "desc" },
    take: 12,
  });
  if (!siblings.length) return content;

  const hub = await prisma.keyword.findFirst({
    where: { cluster, isHub: true, status: "PUBLISHED" },
    select: { articleId: true, term: true },
  });

  let html = content;

  if (!isHub && hub?.articleId) {
    const hubArticle = await prisma.article.findUnique({
      where: { id: hub.articleId },
      select: { slug: true, title: true },
    });
    if (hubArticle && !html.includes(`href="/${hubArticle.slug}"`)) {
      html = `${html.trimEnd()}\n<p>Konunun tamamı için ana rehberimize göz atın: <a href="/${hubArticle.slug}">${hubArticle.title}</a>.</p>`;
    }
  }

  if (isHub) {
    const items = siblings
      .filter((item) => !html.includes(`href="/${item.slug}"`))
      .slice(0, 8)
      .map((item) => `<li><a href="/${item.slug}">${item.title}</a></li>`);
    if (items.length) {
      html = `${html.trimEnd()}\n<h2>Bu konudaki diğer rehberler</h2>\n<ul>\n${items.join("\n")}\n</ul>`;
    }
  }

  return html;
}

/**
 * Varlık makalesini, o varlığın çıktığı haberlere bağlar.
 *
 * Varlık sayfası kendi kümesinde yalnız kalır (küme `varlik-<ad>`, içinde tek
 * makale var), dolayısıyla `linkGuideCluster` ona hiçbir bağ kuramaz. Oysa bu
 * şeridin bütün mantığı arşivi bir varlık etrafında toplamak: "X kimdir"
 * sayfası X'in geçtiği haberlere link vermezse, ne okur ne de tarayıcı ikisinin
 * aynı konu olduğunu görür.
 *
 * DB'ye gitmez — kaynak listesi konuyu kuran taraftan gelir, çünkü orada zaten
 * yayımlanmışlık filtresinden geçmiştir.
 */
export function linkEntitySources(
  content: string,
  sources: Array<{ title: string; slug: string }>,
  currentSlug: string,
): string {
  const items = sources
    .filter((item) => item.slug !== currentSlug && !content.includes(`href="/${item.slug}"`))
    .slice(0, 6)
    .map((item) => `<li><a href="/${item.slug}">${item.title}</a></li>`);
  if (!items.length) return content;
  return `${content.trimEnd()}\n<h2>İlgili haberler</h2>\n<ul>\n${items.join("\n")}\n</ul>`;
}
