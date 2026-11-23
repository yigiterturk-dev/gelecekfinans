import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { getAllGold, GOLD_TYPES, tl, pctText, fmtUpdated, fmtGoldQuoteUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import { GOLD_HUB_FAQ } from "@/lib/market-faq";
import GoldCalculator from "@/components/calculators/GoldCalculator";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

export const revalidate = 600;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Altın Fiyatları — Gram, Çeyrek, Yarım, Cumhuriyet ve Ons Altın TL";
  const description =
    "Gram ve ons altın spot değerleri ile Darphane ziynet standartlarına göre türetilen çeyrek, yarım ve tam altın metal karşılığı, günlük değişim ve hesaplama aracı.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/altin` },
    openGraph: { type: "website", url: `${BASE}/altin`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AltinHub() {
  const [gold, related] = await Promise.all([getAllGold(), safeRelatedArticles("altin")]);
  const goldPrice = Object.values(gold).find((g) => g?.price);
  const updated = goldPrice?.updatedAt ?? null;
  const goldUpdated = goldPrice?.goldUpdatedAt ?? null;
  const goldSource = Object.values(gold).find((g) => g?.goldSource)?.goldSource ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Altın Fiyatları",
        description: "Gram, çeyrek, yarım, cumhuriyet ve ons altın TL metal karşılıkları.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Altın</span>
      </nav>
      <h1 className="page-header">Altın Fiyatları</h1>
      <p className="market-lede">
        Gram ve ons altının spot değerleri ile Darphane'nin 22 ayar ziynet altını standardına göre türetilen çeyrek, yarım ve tam altın metal karşılığı. Kuyumcu ve banka alış-satış fiyatları prim, makas ve marjlar nedeniyle farklılık gösterebilir.
        {goldUpdated && <> Altın kotasyon zamanı: {fmtGoldQuoteUpdated(goldUpdated)}.</>}
        {updated && <> USD/TRY referans tarihi: {fmtUpdated(updated)}.</>}
      </p>
      {goldSource === "CoinGecko" && (
        <p className="conv-note"><CoinGeckoAttribution /></p>
      )}
      {goldSource === "Yahoo Finance" && (
        <p className="market-updated">Altın kotasyon kaynağı: Yahoo Finance (GC=F)</p>
      )}

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

      <ToolsRail />

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
