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
    html = injectKeywordLinks(html, pool, currentSlug, 3 - internalLinksAdded);
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

function injectKeywordLinks(
  html: string,
  articles: LinkableArticle[],
  currentSlug: string,
  maxLinks: number
): string {
  let added = 0;

  for (const article of articles) {
    if (added >= maxLinks) break;
    if (article.slug === currentSlug) continue;

    const terms = [
      article.keyword,
      ...article.title.split(/[\s:,—–-]+/).filter(w => w.length > 4),
    ].filter(Boolean) as string[];

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
