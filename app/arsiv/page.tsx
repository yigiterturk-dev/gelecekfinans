import { getArchiveArticleCount, getArticlesForArchive, searchPublishedArticles } from "@/lib/articles";
import { MedCard, CATS } from "@/components/ArticleCard";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const BASE = "https://gelecekfinans.com";
const PER_PAGE = 24;
const MAX_QUERY_LENGTH = 200;

const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const ARCHIVE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "numeric",
});

type SP = { q?: string | string[]; kategori?: string | string[]; sayfa?: string | string[] };

function paramValue(value?: string | string[]): string {
  return typeof value === "string" ? value : "";
}

function queryValue(value?: string | string[]): string {
  return paramValue(value).trim().slice(0, MAX_QUERY_LENGTH);
}

function parsePage(value?: string | string[]): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const { q, kategori, sayfa } = await searchParams;
  const query = queryValue(q);
  const category = paramValue(kategori);
  const page = parsePage(sayfa);
  const catCfg = category ? CATS[category] : undefined;

  let title = "Haber Arşivi";
  if (catCfg) title = `${catCfg.l} Arşivi`;
  if (query) title = `"${query}" Arama Sonuçları`;
  if (page > 1) title += ` — Sayfa ${page}`;

  // Arama/filtre sonuçları thin/duplicate olabilir → canonical her zaman temel arşive,
  // Gerçek bir arama sorgusu veya derin sayfalama varsa noindex.
  const canonical = `${BASE}/arsiv`;
  const shouldIndex = !query && page === 1;

  return {
    title,
    description: "GelecekFinans haber arşivi — tarih ve kategoriye göre tüm finans, borsa, kripto, döviz, altın ve ekonomi haberleri.",
    alternates: { canonical: catCfg ? `${BASE}/arsiv?kategori=${encodeURIComponent(category)}` : canonical },
    robots: { index: shouldIndex, follow: true },
  };
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<SP> }) {
  const { q, kategori, sayfa } = await searchParams;
  const page = parsePage(sayfa);
  const query = queryValue(q);
  const requestedCategory = paramValue(kategori);
  const activeCat = requestedCategory && CATS[requestedCategory] ? requestedCategory : "";

  let total: number;
  let pageArts: Awaited<ReturnType<typeof getArticlesForArchive>>;
  if (query) {
    const result = await searchPublishedArticles(query, activeCat || undefined, PER_PAGE, (page - 1) * PER_PAGE);
    total = result.total;
    pageArts = result.articles;
  } else {
    total = await getArchiveArticleCount(activeCat || undefined);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    if (page > totalPages) notFound();
    pageArts = await getArticlesForArchive(PER_PAGE, (page - 1) * PER_PAGE, activeCat || undefined);
  }

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (query && page > totalPages) notFound();
  const current = page;
  const pageWindowStart = Math.max(1, Math.min(current - 3, totalPages - 6));
  const visiblePages = Array.from(
    { length: Math.min(totalPages, 7) },
    (_, i) => pageWindowStart + i,
  );
  // Tarihe göre grupla (Yıl Ay) — sadece arama yokken kronolojik blok göster.
  const groups: { label: string; items: typeof pageArts }[] = [];
  if (!query) {
    const map = new Map<string, typeof pageArts>();
    for (const a of pageArts) {
      const d = new Date(a.created_at);
      const parts = Number.isFinite(d.getTime()) ? ARCHIVE_DATE_FORMAT.formatToParts(d) : null;
      const year = parts?.find((part) => part.type === "year")?.value;
      const month = Number(parts?.find((part) => part.type === "month")?.value ?? "0") - 1;
      const key = year ? `${year}-${month}` : "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    for (const [key, items] of map) {
      if (key === "unknown") {
        groups.push({ label: "Tarih bilinmiyor", items });
        continue;
      }
      const [y, m] = key.split("-").map(Number);
      groups.push({ label: `${MONTHS_TR[m]} ${y}`, items });
    }
  }

  function buildHref(overrides: Partial<SP>) {
    const params = new URLSearchParams();
    const qVal = paramValue(overrides.q !== undefined ? overrides.q : query);
    const catVal = paramValue(overrides.kategori !== undefined ? overrides.kategori : activeCat);
    const pVal = paramValue(overrides.sayfa);
    if (qVal) params.set("q", qVal);
    if (catVal) params.set("kategori", catVal);
    if (pVal && pVal !== "1") params.set("sayfa", pVal);
    const s = params.toString();
    return `/arsiv${s ? `?${s}` : ""}`;
  }

  return (
    <div className="container page-cat">
      <div className="cat-header">
        <span className="tag" style={{ marginBottom: 10, display: "inline-block" }}>ARŞİV</span>
        <h1 className="page-header">Haber Arşivi</h1>
        <p className="cat-count">{total} haber{activeCat ? ` · ${CATS[activeCat].l}` : ""}{query ? ` · "${query}"` : ""}</p>
      </div>

      {/* Arama */}
      <form action="/arsiv" method="get" style={{ display: "flex", gap: 8, margin: "20px 0", flexWrap: "wrap" }}>
        <input
          type="search"
          name="q"
          defaultValue={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Arşivde ara..."
          aria-label="Arşivde ara"
          style={{ flex: "1 1 240px", minWidth: 0, padding: "10px 14px", border: "1px solid var(--border, #ddd)", borderRadius: 8, fontSize: 14, background: "var(--surface, #fff)", color: "inherit" }}
        />
        {activeCat && <input type="hidden" name="kategori" value={activeCat} />}
        <button type="submit" className="page-btn" style={{ cursor: "pointer" }}>Ara</button>
      </form>

      {/* Kategori filtreleri */}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }} aria-label="Kategori filtreleri">
        <Link href={buildHref({ kategori: "", sayfa: "1" })} className={`page-btn${!activeCat ? " active" : ""}`} aria-current={!activeCat ? "page" : undefined}>Tümü</Link>
        {Object.entries(CATS).map(([key, c]) => (
          <Link key={key} href={buildHref({ kategori: key, sayfa: "1" })} className={`page-btn${activeCat === key ? " active" : ""}`} aria-current={activeCat === key ? "page" : undefined}>
            {c.l}
          </Link>
        ))}
      </nav>

      {!pageArts.length && (
        <p className="cat-empty">
          {query ? `"${query}" için sonuç bulunamadı.` : "Bu arşivde henüz haber yok."}
        </p>
      )}

      {/* Arama varsa düz grid, yoksa tarihe göre gruplu */}
      {query || groups.length === 0 ? (
        <div className="resp-grid-4">
          {pageArts.map((a) => <MedCard key={a.filename} article={a} />)}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.label} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--muted, #888)", marginBottom: 14, borderBottom: "1px solid var(--border, #eee)", paddingBottom: 8 }}>
              {g.label}
            </h2>
            <div className="resp-grid-4">
              {g.items.map((a) => <MedCard key={a.filename} article={a} />)}
            </div>
          </section>
        ))
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Sayfalama">
          {current > 1 && (
            <Link href={buildHref({ sayfa: String(current - 1) })} className="page-btn">← Önceki</Link>
          )}
          {visiblePages.map((p) => (
            <Link key={p} href={buildHref({ sayfa: String(p) })} className={`page-btn${p === current ? " active" : ""}`} aria-current={p === current ? "page" : undefined}>
              {p}
            </Link>
          ))}
          {current < totalPages && (
            <Link href={buildHref({ sayfa: String(current + 1) })} className="page-btn">Sonraki →</Link>
          )}
        </nav>
      )}
    </div>
  );
}
