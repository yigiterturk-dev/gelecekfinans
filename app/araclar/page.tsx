import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { TOOL_CATALOG } from "@/lib/tool-catalog";

export const revalidate = 86400;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Finans Araçları — Döviz, Altın, Faiz, Enflasyon, BES ve OKS Hesaplama";
  const description =
    "Ücretsiz finans hesaplama araçları: canlı döviz çevirici, altın, kredi ve mevduat faizi, enflasyon, BES ve OKS devlet katkısı hesaplama.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/araclar` },
    openGraph: { type: "website", url: `${BASE}/araclar`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function AraclarHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Finans Araçları",
        description: "Döviz, altın, faiz, enflasyon, BES ve OKS için ücretsiz finans hesaplama araçları.",
        url: `${BASE}/araclar`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "ItemList",
        itemListElement: TOOL_CATALOG.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.title,
          url: `${BASE}/araclar/${t.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Araçlar", item: `${BASE}/araclar` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Araçlar</span>
      </nav>
      <h1 className="page-header">Finans Araçları</h1>
      <p className="market-lede">
        Ücretsiz finans hesaplama araçları: canlı döviz çevirici, altın değeri, kredi ve mevduat faizi,
        enflasyon, BES ve OKS devlet katkısı hesaplama.
      </p>

      <div className="market-grid">
        {TOOL_CATALOG.map((t) => (
          <Link key={t.slug} href={`/araclar/${t.slug}`} className="market-card tool-card">
            <span className="tool-icon" aria-hidden>{t.icon}</span>
            <span className="market-card-name">{t.title}</span>
            <p className="market-card-desc">{t.desc}</p>
          </Link>
        ))}
      </div>

      <AdSlot position="inArticle" />

      <section className="section market-links">
        <h2 className="market-h2">Canlı Piyasa Sayfaları</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/kripto" className="market-chip">Kripto Para</Link>
          <Link href="/faiz" className="market-chip">Faiz Oranları</Link>
        </div>
      </section>
    </div>
  );
}
