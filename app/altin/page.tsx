import type { Metadata } from "next";
import Link from "next/link";
import { getAllGold, GOLD_TYPES, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { GOLD_HUB_FAQ } from "@/lib/market-faq";
import GoldCalculator from "@/components/calculators/GoldCalculator";

export const revalidate = 600;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Altın Fiyatları — Gram, Çeyrek, Cumhuriyet ve Ons Altın Canlı TL";
  const description =
    "Güncel altın fiyatları: gram altın, çeyrek altın, cumhuriyet altını ve ons altın canlı Türk Lirası fiyatları, günlük değişim ve altın hesaplama aracı.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/altin` },
    openGraph: { type: "website", url: `${BASE}/altin`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AltinHub() {
  const gold = await getAllGold();
  const related = await safeRelatedArticles("altin");
  const updated = Object.values(gold).find((g) => g?.updatedAt)?.updatedAt ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Altın Fiyatları",
        description: "Gram, çeyrek, cumhuriyet ve ons altın canlı TL fiyatları.",
        url: `${BASE}/altin`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Altın Fiyatları", item: `${BASE}/altin` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Altın</span>
      </nav>
      <h1 className="page-header">Altın Fiyatları</h1>
      <p className="market-lede">
        Gram altın, çeyrek altın, cumhuriyet altını ve ons altın için canlı Türk Lirası fiyatları ve günlük değişim.
        {updated && <> Son güncelleme: {fmtUpdated(updated)}.</>}
      </p>

      <div className="market-grid">
        {Object.entries(GOLD_TYPES).map(([type, cfg]) => {
          const d = gold[type];
          const up = (d?.changePct ?? 0) >= 0;
          return (
            <Link key={type} href={`/altin/${type}`} className="market-card">
              <div className="market-card-top">
                <span className="market-flag" aria-hidden>🥇</span>
                <span className="market-card-name">{cfg.label}</span>
              </div>
              <div className="market-card-price">
                {d ? `₺${tl(d.price)}` : <span className="market-na">veri alınamadı</span>}
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
        <h2 className="market-h2">Altın Hesaplama</h2>
        <GoldCalculator />
      </section>

      <MarketFaq items={GOLD_HUB_FAQ} />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/kripto" className="market-chip">Kripto Para</Link>
          <Link href="/faiz" className="market-chip">Faiz Oranları</Link>
          <Link href="/araclar/altin-hesaplama" className="market-chip">Altın Hesaplama</Link>
          <Link href="/kategori/altin" className="market-chip">Altın Haberleri</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">Altın Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
