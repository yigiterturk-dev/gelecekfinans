import type { Metadata } from "next";
import Link from "next/link";
import { getGuides } from "@/lib/articles";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";

export const revalidate = 900;
const BASE = "https://gelecekfinans.com";

const KUME_ADI: Record<string, string> = {
  enflasyon: "Enflasyon",
  doviz: "Döviz",
  altin: "Altın",
  borsa: "Borsa",
  kripto: "Kripto Para",
  faiz: "Faiz",
  birikim: "Birikim ve Tasarruf",
  vergi: "Vergi",
};

export async function generateMetadata(): Promise<Metadata> {
  const title = "Finans Rehberleri — Yatırım ve Ekonomi Kavramları";
  const description =
    "Enflasyon, döviz, altın, borsa ve kripto para başta olmak üzere temel finans kavramlarını adım adım anlatan rehberler.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/rehber` },
    openGraph: { type: "website", url: `${BASE}/rehber`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RehberHub() {
  const guides = await getGuides();

  // Kümeye göre grupla; kümesizler "Diğer Rehberler" altında toplanır.
  const gruplar = new Map<string, typeof guides>();
  for (const g of guides) {
    const k = g.cluster && KUME_ADI[g.cluster] ? g.cluster : "diger";
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k)!.push(g);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Finans Rehberleri",
        description: "Temel finans ve yatırım kavramlarını anlatan rehber içerikler.",
        url: `${BASE}/rehber`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "ItemList",
        itemListElement: guides.slice(0, 30).map((g, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: g.title,
          url: `${BASE}/${g.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Rehberler", item: `${BASE}/rehber` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Rehberler</span>
      </nav>
      <h1 className="page-header">Finans Rehberleri</h1>
      <p className="market-lede">
        Enflasyondan dövize, borsadan kripto paraya temel kavramları sıfırdan anlatan rehberler. Haber akışından
        bağımsız, güncel tutulan içerikler.
      </p>

      {guides.length === 0 ? (
        <div className="market-na market-na-lg">Rehber içerikleri hazırlanıyor. Kısa süre içinde burada olacak.</div>
      ) : (
        <>
          {[...gruplar.entries()].map(([k, list]) => (
            <section className="section" key={k}>
              <h2 className="market-h2">{KUME_ADI[k] ?? "Diğer Rehberler"}</h2>
              <div className="resp-grid-4">
                {list.map((a) => <MedCard key={a.filename} article={a} />)}
              </div>
            </section>
          ))}
          <AdSlot position="inArticle" />
        </>
      )}

      <section className="section market-links">
        <h2 className="market-h2">Canlı Veriler</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/borsa" className="market-chip">Borsa (BIST 100)</Link>
          <Link href="/kripto" className="market-chip">Kripto Fiyatları</Link>
          <Link href="/araclar" className="market-chip">Finans Araçları</Link>
        </div>
      </section>
    </div>
  );
}
