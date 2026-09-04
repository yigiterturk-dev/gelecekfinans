import type { Metadata } from "next";
import Link from "next/link";
import { getAllFx, FX_PAIRS, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { FX_HUB_FAQ } from "@/lib/market-faq";
import CurrencyConverter from "@/components/CurrencyConverter";

export const revalidate = 600;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Döviz Kurları — Dolar, Euro, Sterlin Canlı TL Fiyatları";
  const description =
    "Güncel döviz kurları: Dolar (USD/TRY), Euro (EUR/TRY) ve Sterlin (GBP/TRY) canlı Türk Lirası fiyatları, günlük değişim ve döviz çevirici.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/doviz` },
    openGraph: { type: "website", url: `${BASE}/doviz`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DovizHub() {
  const fx = await getAllFx();
  const related = await safeRelatedArticles("doviz");
  const updated = Object.values(fx).find((f) => f?.updatedAt)?.updatedAt ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Döviz Kurları",
        description: "Dolar, Euro ve Sterlin canlı TL kurları.",
        url: `${BASE}/doviz`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Döviz Kurları", item: `${BASE}/doviz` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Döviz</span>
      </nav>
      <h1 className="page-header">Döviz Kurları</h1>
      <p className="market-lede">
        Dolar, Euro ve Sterlin için canlı Türk Lirası kurları, günlük değişim ve döviz çevirici.
        {updated && <> Son güncelleme: {fmtUpdated(updated)}.</>}
      </p>

      <div className="market-grid">
        {Object.entries(FX_PAIRS).map(([pair, cfg]) => {
          const d = fx[pair];
          const up = (d?.changePct ?? 0) >= 0;
          return (
            <Link key={pair} href={`/doviz/${pair}`} className="market-card">
              <div className="market-card-top">
                <span className="market-flag" aria-hidden>{cfg.flag}</span>
                <span className="market-card-name">{cfg.label}</span>
                <span className="market-card-sub">{cfg.base}/TRY</span>
              </div>
              <div className="market-card-price">
                {d ? `₺${tl(d.rate, 4)}` : <span className="market-na">veri alınamadı</span>}
              </div>
              {d?.changePct != null && (
                <div className={up ? "market-up" : "market-dn"}>{up ? "▲" : "▼"} {pctText(d.changePct)}</div>
              )}
            </Link>
          );
        })}
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Döviz Çevirici</h2>
        <CurrencyConverter defaultFrom="USD" />
      </section>

      <MarketFaq items={FX_HUB_FAQ} />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/kripto" className="market-chip">Kripto Para</Link>
          <Link href="/faiz" className="market-chip">Faiz Oranları</Link>
          <Link href="/araclar" className="market-chip">Finans Araçları</Link>
          <Link href="/kategori/doviz" className="market-chip">Döviz Haberleri</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">Döviz Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
