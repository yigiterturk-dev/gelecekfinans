import type { Metadata } from "next";
import Link from "next/link";
import { getCryptoMarkets, CRYPTO_COINS, tl, pctText, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { CRYPTO_HUB_FAQ } from "@/lib/market-faq";

export const revalidate = 300;
const BASE = "https://gelecekfinans.com";

// CoinGecko id → site slug eşlemesi (detay linkleri için)
const ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CRYPTO_COINS).map(([slug, c]) => [c.id, slug]),
);

export async function generateMetadata(): Promise<Metadata> {
  const title = "Kripto Para Fiyatları — Bitcoin, Ethereum Canlı TL Fiyatları";
  const description =
    "Güncel kripto para fiyatları: Bitcoin (BTC), Ethereum (ETH) ve popüler altcoinlerin canlı Türk Lirası fiyatları, 24 saatlik değişim ve piyasa değeri.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/kripto` },
    openGraph: { type: "website", url: `${BASE}/kripto`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function KriptoHub() {
  const markets = await getCryptoMarkets();
  const related = await safeRelatedArticles("kripto");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Kripto Para Fiyatları",
        description: "Bitcoin, Ethereum ve popüler kripto paraların canlı TL fiyatları.",
        url: `${BASE}/kripto`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Kripto Para", item: `${BASE}/kripto` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Kripto Para</span>
      </nav>
      <h1 className="page-header">Kripto Para Fiyatları</h1>
      <p className="market-lede">
        Bitcoin, Ethereum ve en büyük kripto paraların canlı Türk Lirası fiyatları, 24 saatlik değişim ve piyasa değeri.
      </p>

      {markets.length > 0 ? (
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <thead>
              <tr><th>#</th><th>Kripto</th><th className="num">Fiyat (₺)</th><th className="num">24s</th></tr>
            </thead>
            <tbody>
              {markets.map((c, i) => {
                const up = (c.changePct ?? 0) >= 0;
                const slug = ID_TO_SLUG[c.id];
                const NameCell = (
                  <>
                    <span className="crypto-sym">{c.symbol}</span>
                    <span className="crypto-name">{c.name}</span>
                  </>
                );
                return (
                  <tr key={c.id}>
                    <td className="muted">{i + 1}</td>
                    <td>{slug ? <Link href={`/kripto/${slug}`} className="crypto-link">{NameCell}</Link> : NameCell}</td>
                    <td className="num">₺{tl(c.price, c.price >= 100 ? 0 : 4)}</td>
                    <td className={`num ${up ? "market-up" : "market-dn"}`}>{pctText(c.changePct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="market-na market-na-lg">Kripto verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
      )}

      <AdSlot position="inArticle" />

      <MarketFaq items={CRYPTO_HUB_FAQ} />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/faiz" className="market-chip">Faiz Oranları</Link>
          <Link href="/araclar" className="market-chip">Finans Araçları</Link>
          <Link href="/kategori/kripto" className="market-chip">Kripto Haberleri</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">Kripto Para Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
