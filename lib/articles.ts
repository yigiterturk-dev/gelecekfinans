import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import type { Article, ArticleListItem, ArticleExtras, ArticleFaq, ImageCredit } from "./types";
import { stripEvidenceMarkers } from "./bot/quality";

export type { Article } from "./types";

export type { ArticleListItem } from "./types";

/**
 * Veritabanina ULASILAMADI — "kayit yok" ile ayni sey DEGIL.
 *
 * Onceden `getArticleBySlug` her hatada `null` donuyordu ve makale sayfasi bunu
 * `notFound()` ile 404'e ceviriyordu. 2026-09-09'da Neon ag kotasi dolup DB
 * kilitlenince yayindaki 54 makalenin TAMAMI Googlebot'a 404 dondu — yani
 * "bu sayfalar silindi" sinyali. Gecici bir altyapi arizasi kalici bir SEO
 * kaybina donusuyordu.
 *
 * Artik DB arizasi bu hatayla yukari firlar; sayfa 5xx doner, Google URL'i
 * indeksten dusurmez, sonra tekrar dener.
 */
export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Veritabanina ulasilamadi");
    this.name = "DatabaseUnavailableError";
    this.cause = cause;
  }
}

/**
 * DB'den gelen `aiExtras` JSON değerini güvenle `ArticleExtras`'a dönüştürür.
 * LLM/DB kaynaklı olduğu için biçimi doğrular; geçersiz/eksikse null döner,
 * böylece sayfa kutuyu ve FAQ schema'yı gösterMEZ (graceful).
 */
export function coerceExtras(value: unknown): ArticleExtras | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const clean = (text: string) => stripEvidenceMarkers(text);

  const summary = Array.isArray(v.summary)
    ? v.summary
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map(clean)
        .filter((s) => s.length > 0)
        .slice(0, 5)
    : [];

  const impact = typeof v.impact === "string" ? clean(v.impact.trim()) : "";

  const faq: ArticleFaq[] = Array.isArray(v.faq)
    ? v.faq
        .map((f) => {
          if (!f || typeof f !== "object") return null;
          const q = (f as Record<string, unknown>).q;
          const a = (f as Record<string, unknown>).a;
          if (typeof q !== "string" || typeof a !== "string") return null;
          const qt = clean(q.trim());
          const at = clean(a.trim());
          if (!qt || !at) return null;
          return { q: qt, a: at };
        })
        .filter((x): x is ArticleFaq => x !== null)
        .slice(0, 6)
    : [];

  if (summary.length === 0 && !impact && faq.length === 0) return null;
  return {
    ...(summary.length ? { summary } : {}),
    ...(impact ? { impact } : {}),
    ...(faq.length ? { faq } : {}),
  };
}

/**
 * Bazı sonradan eklenen nullable/varsayılan kolonlar canlı veritabanında
 * `prisma db push` tamamlanana kadar eksik olabilir. Bu kontrol, Prisma'nın
 * eksik kolon hatasını tanır; ilgili okuyucu destekleyebildiği alanları
 * çıkartıp sorguyu yeniden deneyebilir.
 */
function isMissingOptionalColumn(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err);
  // Prisma P2022 (column does not exist) veya adı geçen opsiyonel kolon hatası.
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "P2022" ||
    (/premium|aiextras/i.test(msg) &&
      /(column|does not exist|undefined column|no such column|unknown column)/i.test(
        msg
      ))
  );
}

// React cache(): aynı render içinde aynı argümanlarla tekrarlı çağrılarda DB
// sorgusunu tek sefere indirir (request-level dedupe). Davranış değişmez —
// sonuçlar birebir aynı kalır, yalnızca tekrar eden sorgu önlenir.
// `includeViews=false`, arama gibi görüntülenme sıralaması göstermeyen listelerin
// gereksiz pageView agregasyonu yapmasını önler.
export const getAllArticles = cache(async function getAllArticles(
  limit = 200,
  includeViews = true,
): Promise<ArticleListItem[]> {
  let rows: Array<{
    title: string;
    meta: string;
    keyword: string | null;
    category: string;
    source: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    slug: string;
    id: string;
    imageUrl: string | null;
    updatedAt: Date;
    premium?: boolean;
  }>;
  // `content` BİLEREK seçilmiyor — bkz. ArticleListItem.
  const listSelect = {
    title: true,
    meta: true,
    keyword: true,
    category: true,
    source: true,
    publishedAt: true,
    createdAt: true,
    slug: true,
    id: true,
    imageUrl: true,
    updatedAt: true,
    premium: true,
  } as const;
  const baseQuery = {
    where: { status: "PUBLISHED" as const },
    orderBy: [{ publishedAt: "desc" as const }, { id: "desc" as const }],
    take: limit,
    select: listSelect,
  };
  try {
    rows = await prisma.article.findMany(baseQuery);
  } catch (err) {
    if (!isMissingOptionalColumn(err)) {
      // Kesintiyi boş arşiv diye önbelleğe alma. ISR bu hata sırasında
      // son başarılı sayfayı korur; soğuk istekte ise gerçek 5xx döner.
      console.error("[getAllArticles] sorgu başarısız:", err);
      throw new DatabaseUnavailableError(err);
    }
    // `premium` kolonu yok: kolonu hariç tutarak yeniden dene.
    const { premium: _premium, ...selectWithoutPremium } = listSelect;
    rows = await prisma.article.findMany({
      ...baseQuery,
      select: selectWithoutPremium,
    });
  }

  const viewMap = new Map<string, number>();
  if (includeViews && rows.length > 0) {
    try {
      const viewCounts = await prisma.pageView.groupBy({
        by: ["path"],
        where: { path: { in: rows.map((row) => `/${row.slug}`) } },
        _count: { path: true },
      });
      for (const v of viewCounts) viewMap.set(v.path, v._count.path);
    } catch (err) {
      // Sayaç yardımcı veridir; arızası haber sunumunu durdurmamalı.
      console.error("[getAllArticles] görüntülenme sayacı okunamadı:", err);
    }
  }

  return rows.map((r) => ({
    title: r.title,
    meta: r.meta,
    keyword: r.keyword || "",
    category: r.category,
    image_path: null,
    source: r.source || "",
    created_at: (r.publishedAt || r.createdAt).toISOString(),
    slug: r.slug,
    filename: r.id,
    imageUrl: r.imageUrl,
    views: viewMap.get(`/${r.slug}`) || 0,
    updatedAt: r.updatedAt.toISOString(),
    // Kolon yokken `premium` undefined gelir; default(false) semantiğiyle uyumlu.
    premium: r.premium ?? false,
  }));
});

// React cache(): generateMetadata + sayfa render'ı aynı slug'ı iki kez sorgular;
// cache() ile tek istekte tek DB sorgusu yapılır. Sonuç birebir aynı.
/**
 * `automationMeta.visual.licensedAsset` içinden sayfada basılacak künyeyi
 * çıkarır. Yalnızca https kaynak kabul edilir; künye yoksa (markalı kart,
 * grafik) null döner.
 */
export function coerceImageCredit(value: unknown): ImageCredit | null {
  if (!value || typeof value !== "object") return null;
  const visual = (value as { visual?: unknown }).visual;
  if (!visual || typeof visual !== "object") return null;
  const asset = (visual as { licensedAsset?: unknown }).licensedAsset;
  if (!asset || typeof asset !== "object") return null;
  const fields = asset as { attribution?: unknown; licenseName?: unknown; sourceUrl?: unknown };
  const text = [fields.attribution, fields.licenseName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" · ")
    .slice(0, 220);
  const url = fields.sourceUrl;
  if (!text || typeof url !== "string") return null;
  try {
    if (new URL(url).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { text, url };
}

export const getArticleBySlug = cache(async function getArticleBySlug(
  slug: string
): Promise<Article | null> {
  const baseQuery = { where: { slug, status: "PUBLISHED" as const } };
  let r:
    | {
        title: string;
        meta: string;
        keyword: string | null;
        category: string;
        content: string;
        source: string | null;
        publishedAt: Date | null;
        createdAt: Date;
        slug: string;
        id: string;
        imageUrl: string | null;
        updatedAt: Date;
        premium?: boolean;
        aiExtras?: unknown;
        automationMeta?: unknown;
      }
    | null;
  try {
    r = await prisma.article.findFirst(baseQuery);
  } catch (err) {
    if (!isMissingOptionalColumn(err)) {
      console.error("[getArticleBySlug] sorgu başarısız:", err);
      // DB arızası ≠ makale yok. Bkz. DatabaseUnavailableError.
      throw new DatabaseUnavailableError(err);
    }
    // `premium`/`aiExtras` kolonu yok: opsiyonel kolonları hariç tutarak yeniden dene.
    r = await prisma.article.findFirst({
      ...baseQuery,
      select: {
        title: true,
        meta: true,
        keyword: true,
        category: true,
        content: true,
        source: true,
        publishedAt: true,
        createdAt: true,
        slug: true,
        id: true,
        imageUrl: true,
        updatedAt: true,
        automationMeta: true,
      },
    });
  }
  if (!r) return null;
  return {
    title: r.title,
    meta: r.meta,
    keyword: r.keyword || "",
    category: r.category,
    content: r.content,
    image_path: null,
    source: r.source || "",
    created_at: (r.publishedAt || r.createdAt).toISOString(),
    slug: r.slug,
    filename: r.id,
    imageUrl: r.imageUrl,
    updatedAt: r.updatedAt.toISOString(),
    // Kolon yokken `premium` undefined gelir; default(false) semantiğiyle uyumlu.
    premium: r.premium ?? false,
    // Kolon yoksa / değer geçersizse coerceExtras null döner → kutu gizlenir.
    aiExtras: coerceExtras(r.aiExtras),
    // Stok görselin lisans künyesi (CC BY/BY-SA'da görünmesi zorunlu).
    imageCredit: coerceImageCredit(r.automationMeta),
    noindex: isSeoNoindex(r.automationMeta),
  };
});

const getCachedPublishedArticleCount = unstable_cache(async (category: string | null) => {
  return prisma.article.count({ where: { status: "PUBLISHED", ...(category ? { category } : {}) } });
}, ["published-article-count-v1"], { revalidate: 300, tags: ["category-articles"] });

export const getCategoryArticleCount = cache(async function getCategoryArticleCount(cat: string): Promise<number> {
  try {
    return await getCachedPublishedArticleCount(cat);
  } catch (err) {
    console.error("[getCategoryArticleCount] sorgu başarısız:", err);
    throw new DatabaseUnavailableError(err);
  }
});

export const getArchiveArticleCount = cache(async function getArchiveArticleCount(category?: string): Promise<number> {
  try {
    return await getCachedPublishedArticleCount(category || null);
  } catch (err) {
    console.error("[getArchiveArticleCount] sorgu başarısız:", err);
    throw new DatabaseUnavailableError(err);
  }
});

const getCachedPublishedArticleRows = unstable_cache(async (category: string | null, take: number, skip: number) => {
  return prisma.article.findMany({
    where: { status: "PUBLISHED", ...(category ? { category } : {}) },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
    skip,
    select: {
      title: true,
      meta: true,
      keyword: true,
      category: true,
      source: true,
      publishedAt: true,
      createdAt: true,
      slug: true,
      id: true,
      imageUrl: true,
      updatedAt: true,
    },
  });
}, ["published-article-rows-v1"], { revalidate: 300, tags: ["category-articles"] });

const getCachedPublishedSearchRows = unstable_cache(async (category: string | null) => {
  return prisma.article.findMany({
    where: { status: "PUBLISHED", ...(category ? { category } : {}) },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: {
      title: true,
      meta: true,
      keyword: true,
      category: true,
      source: true,
      publishedAt: true,
      createdAt: true,
      slug: true,
      id: true,
      imageUrl: true,
      updatedAt: true,
    },
  });
}, ["published-article-search-v1"], { revalidate: 300, tags: ["category-articles"] });

const getPublishedArticlePage = cache(async function getPublishedArticlePage(
  category: string | null,
  limit = 200,
  offset = 0,
): Promise<ArticleListItem[]> {
  const take = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 200) : 200;
  const skip = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  let rows: Array<{
    title: string;
    meta: string;
    keyword: string | null;
    category: string;
    source: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    slug: string;
    id: string;
    imageUrl: string | null;
    updatedAt: Date;
  }>;
  try {
    rows = await getCachedPublishedArticleRows(category, take, skip);
  } catch (err) {
    console.error("[getPublishedArticlePage] sorgu başarısız:", err);
    throw new DatabaseUnavailableError(err);
  }
  if (rows.length === 0) return [];

  const paths = rows.map((row) => `/${row.slug}`);
  const viewMap = new Map<string, number>();
  try {
    const viewCounts = await prisma.pageView.groupBy({
      by: ["path"],
      where: { path: { in: paths } },
      _count: { path: true },
    });
    for (const view of viewCounts) viewMap.set(view.path, view._count.path);
  } catch (err) {
    console.error("[getPublishedArticlePage] görüntülenme sayacı okunamadı:", err);
  }

  return rows.map((row) => ({
    title: row.title,
    meta: row.meta,
    keyword: row.keyword || "",
    category: row.category,
    image_path: null,
    source: row.source || "",
    created_at: (row.publishedAt || row.createdAt).toISOString(),
    slug: row.slug,
    filename: row.id,
    imageUrl: row.imageUrl,
    views: viewMap.get(`/${row.slug}`) || 0,
    updatedAt: row.updatedAt.toISOString(),
  }));
});

export function getArticlesByCategory(cat: string, limit = 200, offset = 0): Promise<ArticleListItem[]> {
  return getPublishedArticlePage(cat, limit, offset);
}

export function getArticlesForArchive(limit = 24, offset = 0, category?: string): Promise<ArticleListItem[]> {
  return getPublishedArticlePage(category || null, limit, offset);
}

function normalizeArticleSearch(value: string): string {
  return value.toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i").replace(/İ/g, "i")
    .replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
}

export const searchPublishedArticles = cache(async function searchPublishedArticles(
  query: string,
  category: string | undefined,
  limit = 24,
  offset = 0,
  includeViews = true,
): Promise<{ total: number; articles: ArticleListItem[] }> {
  const needle = normalizeArticleSearch(query.trim());
  if (!needle || needle.length > 200) return { total: 0, articles: [] };
  const take = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 200) : 24;
  const skip = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  let matches: Awaited<ReturnType<typeof getCachedPublishedSearchRows>>;
  try {
    const rows = await getCachedPublishedSearchRows(category || null);
    matches = rows.filter((row) =>
      normalizeArticleSearch(row.title).includes(needle)
      || normalizeArticleSearch(row.meta).includes(needle)
      || normalizeArticleSearch(row.keyword || "").includes(needle)
      || normalizeArticleSearch(row.category || "").includes(needle),
    );
  } catch (err) {
    console.error("[searchPublishedArticles] sorgu başarısız:", err);
    throw new DatabaseUnavailableError(err);
  }

  const pageRows = matches.slice(skip, skip + take);
  const viewMap = new Map<string, number>();
  if (includeViews && pageRows.length) {
    try {
      const views = await prisma.pageView.groupBy({
        by: ["path"],
        where: { path: { in: pageRows.map((row) => `/${row.slug}`) } },
        _count: { path: true },
      });
      for (const view of views) viewMap.set(view.path, view._count.path);
    } catch (err) {
      console.error("[searchPublishedArticles] görüntülenme sayacı okunamadı:", err);
    }
  }
  const articles = pageRows.map((row) => ({
    title: row.title,
    meta: row.meta,
    keyword: row.keyword || "",
    category: row.category,
    image_path: null,
    source: row.source || "",
    created_at: (row.publishedAt || row.createdAt).toISOString(),
    slug: row.slug,
    filename: row.id,
    imageUrl: row.imageUrl,
    views: viewMap.get(`/${row.slug}`) || 0,
    updatedAt: row.updatedAt.toISOString(),
  }));
  return { total: matches.length, articles };
});

/**
 * Rehber (evergreen) şeridinde yayınlanmış makaleler — en yenisi başta.
 *
 * Neden ayrı: rehberler haber akışında kaybolan ama yıllarca arama trafiği
 * getiren içerikler. `/rehber` toplayıcısı olmadan yalnızca kategori
 * listelerinde, haberlerin arasında görünüyorlardı; ne okur bir arada
 * bulabiliyordu ne de tarayıcı küme olarak görebiliyordu.
 *
 * Bağlantı hatası boş liste değildir; ISR'nin son başarılı arşivi koruması
 * için veritabanı hatası yukarı taşınır.
 */
export const getGuides = cache(async function getGuides(limit = 100, category?: string): Promise<ArticleListItem[]> {
  let rows: Array<{
    title: string;
    meta: string;
    keyword: string | null;
    category: string;
    source: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    slug: string;
    id: string;
    imageUrl: string | null;
    updatedAt: Date;
    cluster: string | null;
  }>;
  try {
    const where = { status: "PUBLISHED" as const, track: "GUIDE" as const, ...(category ? { category } : {}) };
    const baseSelect = {
      title: true,
      meta: true,
      keyword: true,
      category: true,
      source: true,
      publishedAt: true,
      createdAt: true,
      slug: true,
      id: true,
      imageUrl: true,
      updatedAt: true,
    } as const;
    try {
      rows = await prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: limit,
        select: { ...baseSelect, cluster: true },
      });
    } catch (err) {
      if (!isMissingOptionalColumn(err)) throw err;
      // `cluster` sonradan eklendi: DB şeması gerideyse rehberleri yine listele.
      const legacyRows = await prisma.article.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: limit,
        select: baseSelect,
      });
      rows = legacyRows.map((row) => ({ ...row, cluster: null }));
    }
  } catch (err) {
    console.error("[getGuides] sorgu başarısız:", err);
    throw new DatabaseUnavailableError(err);
  }
  if (rows.length === 0) return [];

  const paths = rows.map((r) => `/${r.slug}`);
  const viewMap = new Map<string, number>();
  try {
    const viewCounts = await prisma.pageView.groupBy({
      by: ["path"],
      where: { path: { in: paths } },
      _count: { path: true },
    });
    for (const view of viewCounts) viewMap.set(view.path, view._count.path);
  } catch (err) {
    // Görüntülenme sayacı yardımcı veridir; rehber listesini durdurmamalı.
    console.error("[getGuides] görüntülenme sayacı okunamadı:", err);
  }

  return rows.map((r) => ({
    title: r.title,
    meta: r.meta,
    keyword: r.keyword || "",
    category: r.category,
    image_path: null,
    source: r.source || "",
    created_at: (r.publishedAt || r.createdAt).toISOString(),
    slug: r.slug,
    filename: r.id,
    imageUrl: r.imageUrl,
    views: viewMap.get(`/${r.slug}`) || 0,
    updatedAt: r.updatedAt.toISOString(),
    cluster: r.cluster,
  }));
});

/**
 * Premium içerik için ilk ~N kelimelik HTML teaser üretir. HTML etiketlerini
 * kabaca kelime sınırında keser ve açık kalan blok etiketlerini güvenli
 * şekilde sonlandırır (dangerouslySetInnerHTML ile kullanılır).
 */
export function buildTeaser(html: string, maxWords = 200): string {
  const tokens = html.split(/(<[^>]+>)/);
  let words = 0;
  const out: string[] = [];
  const openTags: string[] = [];
  const VOID = new Set(["br", "img", "hr", "input", "meta", "link"]);

  for (const tok of tokens) {
    if (words >= maxWords) break;
    if (tok.startsWith("<")) {
      out.push(tok);
      const m = tok.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)/);
      if (m) {
        const tag = m[2].toLowerCase();
        if (!VOID.has(tag) && !tok.endsWith("/>")) {
          if (m[1] === "/") openTags.pop();
          else openTags.push(tag);
        }
      }
    } else {
      const w = tok.split(/\s+/).filter(Boolean);
      if (words + w.length <= maxWords) {
        out.push(tok);
        words += w.length;
      } else {
        out.push(w.slice(0, maxWords - words).join(" ") + " …");
        words = maxWords;
      }
    }
  }
  // Açık kalan etiketleri kapat
  while (openTags.length) out.push(`</${openTags.pop()}>`);
  return out.join("");
}

/**
 * İnce sayfa işareti: automationMeta.seoNoindex === true. Envanter kuralı
 * (2026-11-21): haber + ≥21 gün + GSC 90 günde 0 gösterim. Sayfa yayında
 * kalır (iç linkler, okur), yalnız indeks dışı ve sitemap dışı olur.
 * Geri almak için alanı silmek yeter.
 */
export function isSeoNoindex(meta: unknown): boolean {
  return !!meta && typeof meta === "object" && (meta as Record<string, unknown>).seoNoindex === true;
}
