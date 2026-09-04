import { cache } from "react";
import { prisma } from "./db";
import type { Article, ArticleExtras, ArticleFaq } from "./types";

export type { Article } from "./types";

/**
 * DB'den gelen `aiExtras` JSON değerini güvenle `ArticleExtras`'a dönüştürür.
 * LLM/DB kaynaklı olduğu için biçimi doğrular; geçersiz/eksikse null döner,
 * böylece sayfa kutuyu ve FAQ schema'yı gösterMEZ (graceful).
 */
export function coerceExtras(value: unknown): ArticleExtras | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const summary = Array.isArray(v.summary)
    ? v.summary.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 5)
    : [];

  const impact = typeof v.impact === "string" ? v.impact.trim() : "";

  const faq: ArticleFaq[] = Array.isArray(v.faq)
    ? v.faq
        .map((f) => {
          if (!f || typeof f !== "object") return null;
          const q = (f as Record<string, unknown>).q;
          const a = (f as Record<string, unknown>).a;
          if (typeof q !== "string" || typeof a !== "string") return null;
          const qt = q.trim();
          const at = a.trim();
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
 * `premium` kolonu henüz veritabanına eklenmemiş olabilir (owner `prisma db push`
 * çalıştırmadan önce). Bu durumda Prisma "column does not exist" hatası fırlatır.
 * Bu kontrol, hatanın eksik `premium` kolonundan kaynaklanıp kaynaklanmadığını
 * tespit eder; öyleyse sorguyu `premium` olmadan tekrar deneriz (premium:false).
 * Kolon mevcutsa davranış hiç değişmez.
 */
function isMissingOptionalColumn(err: unknown): boolean {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message ?? "")
      : String(err);
  // Prisma P2022 (column does not exist) veya `premium`/`aiExtras` sütun hatası.
  // Owner `prisma db push` çalıştırana kadar bu opsiyonel kolonlar yok olabilir.
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
export const getAllArticles = cache(async function getAllArticles(
  limit = 200
): Promise<Article[]> {
  let rows: Array<{
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
  }>;
  const baseQuery = {
    where: { status: "PUBLISHED" as const },
    orderBy: { publishedAt: "desc" as const },
    take: limit,
  };
  try {
    rows = await prisma.article.findMany(baseQuery);
  } catch (err) {
    if (!isMissingOptionalColumn(err)) {
      // `premium`/`aiExtras` ile ilgisiz gerçek bir hata: sayfayı çökertmek
      // yerine degrade ederek boş liste döndür (homepage temiz boş durum gösterir).
      console.error("[getAllArticles] sorgu başarısız:", err);
      return [];
    }
    // `premium` kolonu yok: kolonu hariç tutarak yeniden dene.
    rows = await prisma.article.findMany({
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
      },
    });
  }

  const slugs = rows.map((r) => `/${r.slug}`);
  const viewCounts = slugs.length > 0
    ? await prisma.pageView.groupBy({
        by: ["path"],
        where: { path: { in: slugs } },
        _count: { path: true },
      })
    : [];
  const viewMap = new Map(viewCounts.map((v) => [v.path, v._count.path]));

  return rows.map((r) => ({
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
    views: viewMap.get(`/${r.slug}`) || 0,
    updatedAt: r.updatedAt.toISOString(),
    // Kolon yokken `premium` undefined gelir; default(false) semantiğiyle uyumlu.
    premium: r.premium ?? false,
  }));
});

// React cache(): generateMetadata + sayfa render'ı aynı slug'ı iki kez sorgular;
// cache() ile tek istekte tek DB sorgusu yapılır. Sonuç birebir aynı.
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
      }
    | null;
  try {
    r = await prisma.article.findFirst(baseQuery);
  } catch (err) {
    if (!isMissingOptionalColumn(err)) {
      console.error("[getArticleBySlug] sorgu başarısız:", err);
      return null;
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
  };
});

export async function getArticlesByCategory(cat: string): Promise<Article[]> {
  const all = await getAllArticles();
  return all.filter((a) => a.category === cat);
}

/**
 * Rehber (evergreen) şeridinde yayınlanmış makaleler — en yenisi başta.
 *
 * Neden ayrı: rehberler haber akışında kaybolan ama yıllarca arama trafiği
 * getiren içerikler. `/rehber` toplayıcısı olmadan yalnızca kategori
 * listelerinde, haberlerin arasında görünüyorlardı; ne okur bir arada
 * bulabiliyordu ne de tarayıcı küme olarak görebiliyordu.
 *
 * `track` kolonu eski kurulumlarda olmayabilir; kolon yoksa boş liste döner
 * ve sayfa dürüst boş durum gösterir (getAllArticles ile aynı degrade davranışı).
 */
export async function getGuides(limit = 100): Promise<Article[]> {
  let rows: Array<{ slug: string; cluster: string | null }>;
  try {
    rows = await prisma.article.findMany({
      where: { status: "PUBLISHED", track: "GUIDE" },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { slug: true, cluster: true },
    });
  } catch (err) {
    console.error("[getGuides] sorgu başarısız:", err);
    return [];
  }
  if (rows.length === 0) return [];
  const kume = new Map(rows.map((r) => [r.slug, r.cluster]));
  const all = await getAllArticles();
  return all
    .filter((a) => kume.has(a.slug))
    .map((a) => ({ ...a, cluster: kume.get(a.slug) ?? null }));
}

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
