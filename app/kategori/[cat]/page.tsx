import { serializeJsonLd } from "@/lib/json-ld";
import { getArticlesByCategory, getCategoryArticleCount } from "@/lib/articles";
import { MedCard, CATS } from "@/components/ArticleCard";
import Newsletter from "@/components/Newsletter";
import { mailEnabled } from "@/lib/mail";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import { getCategoryProfile } from "@/lib/category-profiles";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const PER_PAGE = 20;
const BASE = "https://gelecekfinans.com";

function parsePage(value?: string | string[]): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function categoryPageHref(cat: string, page: number): string {
  return page === 1 ? `/kategori/${cat}` : `/kategori/${cat}?sayfa=${page}`;
}

export async function generateMetadata({params, searchParams}:{params:Promise<{cat:string}>; searchParams:Promise<{sayfa?:string|string[]}>}):Promise<Metadata>{
  const {cat}=await params; const c=CATS[cat]; if(!c)return{};
  const {sayfa}=await searchParams;
  const page = parsePage(sayfa);
  const articleCount = await getCategoryArticleCount(cat);
  const totalPages = Math.ceil(articleCount / PER_PAGE);
  const canonical = page > 1 ? `${BASE}/kategori/${cat}?sayfa=${page}` : `${BASE}/kategori/${cat}`;
  const title = page > 1 ? `${c.l} Haberleri — Sayfa ${page}` : `${c.l} Haberleri ve Son Dakika Gelişmeleri`;
  const profile = getCategoryProfile(cat);
  const description = profile
    ? profile.paragraphs[0].slice(0, 155).replace(/\s+\S*$/, "")
    : `Güncel ${c.l.toLowerCase()} haberleri, analizleri ve son dakika gelişmeleri.`;
  return{
    title,
    description,
    alternates: { canonical },
    robots: { index: articleCount > 0 && page <= totalPages, follow: true },
    ...paylasimMeta({ url: canonical, title, description }),
  };
}

export default async function CatPage({params, searchParams}:{params:Promise<{cat:string}>; searchParams:Promise<{sayfa?:string|string[]}>}){
  const {cat}=await params; const cfg=CATS[cat]; if(!cfg)notFound();
  const {sayfa}=await searchParams;
  const page = parsePage(sayfa);
  const [articleCount, arts] = await Promise.all([
    getCategoryArticleCount(cat),
    getArticlesByCategory(cat, PER_PAGE, (page - 1) * PER_PAGE),
  ]);
  const totalPages = Math.ceil(articleCount / PER_PAGE);
  if (page > Math.max(1, totalPages)) notFound();
  const pageWindowStart = Math.max(1, Math.min(page - 3, totalPages - 6));
  const visiblePages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => pageWindowStart + i);
  // Kategoriye özgü metin YALNIZCA ilk sayfada: ?sayfa=2 ve sonrasında
  // tekrarlanırsa aynı metin birden çok adreste görünür (kanibalizasyon).
  const profile = page === 1 ? getCategoryProfile(cat) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${cfg.l} Haberleri`,
        description: `Güncel ${cfg.l.toLowerCase()} haberleri ve son dakika gelişmeleri.`,
        url: `${BASE}/kategori/${cat}`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: cfg.l, item: `${BASE}/kategori/${cat}` },
        ],
      },
    ],
  };

  return(
    <div className="container page-cat">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <div className="cat-header" style={{borderColor:cfg.c}}>
        <span className="tag" style={{background:cfg.c,marginBottom:10,display:"inline-block"}}>{cfg.l}</span>
        <h1 className="page-header">{cfg.l} Haberleri</h1>
        <p className="cat-count">{articleCount} haber</p>
      </div>

      <div className="resp-grid-4">
        {arts.map(a=><MedCard key={a.filename} article={a}/>)}
      </div>

      {!arts.length && <p className="cat-empty">Bu kategoride henüz haber yok.</p>}

      {profile && (
        <section className="section">
          <h2 className="market-h2">{cfg.l.charAt(0) + cfg.l.slice(1).toLowerCase()} Haberleri Hakkında</h2>
          {profile.paragraphs.map((t) => (
            <p key={t.slice(0, 40)} className="market-prose">{t}</p>
          ))}
        </section>
      )}

      {profile && <MarketFaq items={profile.faq} />}

      <ToolsRail title="Hesaplama Araçları" />

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Kategori sayfaları">
          {page > 1 && (
            <Link href={categoryPageHref(cat, page - 1)} className="page-btn">
              ← Önceki
            </Link>
          )}
          {visiblePages.map((p) => {
            return (
              <Link key={p} href={categoryPageHref(cat, p)}
                className={`page-btn${p === page ? " active" : ""}`}
                aria-current={p === page ? "page" : undefined}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={categoryPageHref(cat, page + 1)} className="page-btn">
              Sonraki →
            </Link>
          )}
        </nav>
      )}

      {/* Newsletter */}
      <section className="section">
        <Newsletter enabled={mailEnabled()} />
      </section>
    </div>
  );
}
