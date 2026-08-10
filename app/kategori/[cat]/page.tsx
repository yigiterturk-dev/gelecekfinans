import { getArticlesByCategory } from "@/lib/articles";
import { MedCard, CATS } from "@/components/ArticleCard";
import Newsletter from "@/components/Newsletter";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const PER_PAGE = 20;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata({params, searchParams}:{params:Promise<{cat:string}>; searchParams:Promise<{sayfa?:string}>}):Promise<Metadata>{
  const {cat}=await params; const c=CATS[cat]; if(!c)return{};
  const {sayfa}=await searchParams;
  const page = Math.max(1, parseInt(sayfa || "1"));
  const articleCount = (await getArticlesByCategory(cat)).length;
  const canonical = page > 1 ? `${BASE}/kategori/${cat}?sayfa=${page}` : `${BASE}/kategori/${cat}`;
  const title = page > 1 ? `${c.l} Haberleri — Sayfa ${page}` : `${c.l} Haberleri ve Son Dakika Gelişmeleri`;
  const description = `Güncel ${c.l.toLowerCase()} haberleri, analizleri ve son dakika gelişmeleri. GelecekFinans'tan tarafsız ${c.l.toLowerCase()} piyasası takibi.`;
  return{
    title,
    description,
    alternates: { canonical },
    robots: { index: articleCount > 0, follow: true },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "GelecekFinans",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CatPage({params, searchParams}:{params:Promise<{cat:string}>; searchParams:Promise<{sayfa?:string}>}){
  const {cat}=await params; const cfg=CATS[cat]; if(!cfg)notFound();
  const {sayfa}=await searchParams;
  const page = Math.max(1, parseInt(sayfa || "1"));
  const allArts = await getArticlesByCategory(cat);
  const totalPages = Math.ceil(allArts.length / PER_PAGE);
  const arts = allArts.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="cat-header" style={{borderColor:cfg.c}}>
        <span className="tag" style={{background:cfg.c,marginBottom:10,display:"inline-block"}}>{cfg.l}</span>
        <h1 className="page-header">{cfg.l} Haberleri</h1>
        <p className="cat-count">{allArts.length} haber</p>
      </div>

      <div className="resp-grid-4">
        {arts.map(a=><MedCard key={a.filename} article={a}/>)}
      </div>

      {!arts.length && <p className="cat-empty">Bu kategoride henüz haber yok.</p>}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="pagination">
          {page > 1 && (
            <Link href={`/kategori/${cat}?sayfa=${page-1}`} className="page-btn">
              ← Önceki
            </Link>
          )}
          {Array.from({length:Math.min(totalPages, 7)}, (_, i) => {
            const p = i + 1;
            return (
              <Link key={p} href={`/kategori/${cat}?sayfa=${p}`}
                className={`page-btn${p === page ? " active" : ""}`}>
                {p}
              </Link>
            );
          })}
          {page < totalPages && (
            <Link href={`/kategori/${cat}?sayfa=${page+1}`} className="page-btn">
              Sonraki →
            </Link>
          )}
        </nav>
      )}

      {/* Newsletter */}
      <section className="section">
        <Newsletter />
      </section>
    </div>
  );
}
