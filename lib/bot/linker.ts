import { prisma } from "@/lib/db";

interface LinkableArticle {
  slug: string;
  title: string;
  category: string;
  keyword: string | null;
}

const CATEGORY_HUBS: Record<string, Array<{ href: string; label: string }>> = {
  borsa: [
    { href: "/borsa", label: "BIST 100 ve canlı hisse fiyatları" },
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
    { href: "/rehber", label: "finans rehberleri" },
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

  // [DAHILI_LINK] yer tutucuları KONUYA GÖRE doldurulur.
  //
  // 5 Eylül 2026'ya kadar sıradan doldurulıyordu (`pool[idx % pool.length]`):
  // aynı kategoride olmak "ilgili" sayılıyordu, o da yoksa havuzdaki ilk
  // makale konuluyordu. Böylece DASK haberinin gövdesine altcoin haberi
  // girebiliyordu. Alakasız bağlantı okuru yanıltır ve arama motoruna yanlış
  // konu ilişkisi bildirir; hiç bağlantı vermemek bundan iyidir — o durumda
  // aşağıdaki kategori/veri merkezi bağlantıları devreye girer.
  const used = new Set<string>();
  const hubs = CATEGORY_HUBS[category] || CATEGORY_HUBS.ekonomi;
  let hubIdx = 0;
  html = html.replace(/\[DAHILI_LINK\]/gi, () => {
    const target = pickPlaceholderTarget(html, pool, used);
    if (target) {
      used.add(target.slug);
      return `<a href="/${target.slug}">${target.title}</a>`;
    }
    const hub = hubs[hubIdx % hubs.length];
    hubIdx++;
    return hub ? `<a href="${hub.href}">${hub.label}</a>` : "";
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

/** Yer tutucu için konu örtüşmesi en yüksek aday; alakalı aday yoksa null. */
export function pickPlaceholderTarget(
  html: string,
  pool: LinkableArticle[],
  used: Set<string>,
): LinkableArticle | null {
  return (
    pool
      .filter((item) => !used.has(item.slug))
      .map((item) => ({ item, score: relevanceScore(html, item) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.item ?? null
  );
}

function countInternalLinks(html: string): number {
  return (html.match(/href=["']\/[^"']*["']/gi) || []).length;
}

/**
 * Hedef makalenin konu kelimelerinden kaçı bu metinde geçiyor?
 *
 * 0 ise iki sayfa aynı konudan söz etmiyor demektir; bağlantı kurulmaz.
 */
export function relevanceScore(
  html: string,
  article: { title: string; keyword?: string | null },
): number {
  const text = html.toLocaleLowerCase("tr-TR");
  const words = `${article.keyword ?? ""} ${article.title}`
    .split(/[\s:,;.!?—–-]+/)
    .filter((word) => isContentWord(word));
  const seen = new Set<string>();
  let score = 0;
  for (const word of words) {
    const lower = word.toLocaleLowerCase("tr-TR");
    if (seen.has(lower)) continue;
    seen.add(lower);
    if (text.includes(lower)) score++;
  }
  return score;
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
  // Yardımcı fiil öbeğinin isim yarısı ("devam edecek", "dikkat çekti") tek
  // başına konu adlandırmaz; 5 Eylül 2026 arızasında "devam" 5 harf olduğu
  // için içerik kelimesi sayılmıştı.
  "devam", "kapsamında", "konusunda", "durumunda", "yönünde", "sonucunda",
]);

const MIN_SINGLE_WORD_ANCHOR = 7;

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
export function isContentWord(word: string): boolean {
  if (word.length < 5) return false;
  if (isGenericAnchor(word)) return false;
  if (isFiniteVerbForm(word)) return false;
  return true;
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
      if (!phrase.some(isContentWord)) continue;
      push(phrase.join(" "));
    }
  }

  for (const word of words) {
    if (word.length >= MIN_SINGLE_WORD_ANCHOR && isContentWord(word)) push(word);
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
  // Konu örtüşmesi en yüksek adaydan başla: aynı metinde birden fazla aday
  // eşleşiyorsa, bağlantı en alakalı olana gitsin.
  const ordered = [...articles]
    .map((article) => ({ article, score: relevanceScore(html, article) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.article);

  for (const article of ordered) {
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
