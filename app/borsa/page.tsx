import type { Metadata } from "next";
import Link from "next/link";
import { getBistAll, BIST_INDEX_SLUG, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import Sparkline from "@/components/Sparkline";
import MarketFaq from "@/components/MarketFaq";
import { BIST_HUB_FAQ } from "@/lib/market-faq";

export const revalidate = 300;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata(): Promise<Metadata> {
  const title = "BIST 100 Canlı — Borsa İstanbul Endeks ve Hisse Fiyatları";
  const description =
    "BIST 100 endeksi canlı değeri ve Borsa İstanbul'un en çok işlem gören hisselerinin güncel fiyatları, günlük değişim oranları ve bir aylık seyri.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/borsa` },
    openGraph: { type: "website", url: `${BASE}/borsa`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BorsaHub() {
  const [rows, related] = await Promise.all([getBistAll(), safeRelatedArticles("borsa")]);
  const index = rows.find((r) => r.slug === BIST_INDEX_SLUG) ?? null;
  const stocks = rows.filter((r) => r.slug !== BIST_INDEX_SLUG);
  const indexUp = (index?.changePct ?? 0) >= 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Borsa İstanbul — BIST 100 ve Hisse Fiyatları",
        description: "BIST 100 endeksi ve Borsa İstanbul hisselerinin güncel fiyatları.",
        url: `${BASE}/borsa`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Borsa</span>
      </nav>
      <h1 className="page-header">Borsa İstanbul — BIST 100 ve Hisse Fiyatları</h1>
      <p className="market-lede">
        BIST 100 endeksinin güncel değeri ve Borsa İstanbul&apos;da en çok işlem gören hisselerin fiyatları,
        günlük değişim oranlarıyla birlikte.
      </p>

      {index ? (
        <div className="market-hero">
          <div className="market-hero-head">
            <span className="market-flag market-flag-lg" aria-hidden>📈</span>
            <div>
              <h2 className="market-hero-title">BIST 100 Endeksi</h2>
              <p className="market-hero-sub">Borsa İstanbul ana endeksi (XU100)</p>
            </div>
          </div>
          <div className="market-headline"><strong>{tl(index.price, 2)}</strong> puan</div>
          {index.changePct != null ? (
            <div className={indexUp ? "market-up market-change-lg" : "market-dn market-change-lg"}>
              {indexUp ? "▲" : "▼"} {pctText(index.changePct)}{" "}
              <span className="market-change-abs">(önceki kapanışa göre)</span>
            </div>
          ) : (
            <div className="market-muted">Günlük değişim verisi alınamadı.</div>
          )}
          {index.updatedAt && <div className="market-updated">Son güncelleme: {fmtUpdated(index.updatedAt)}</div>}
          <Sparkline data={index.series} up={indexUp} label="BIST 100 bir aylık seyir grafiği" />
          <p className="market-spark-cap">Son bir aylık BIST 100 kapanış seyri</p>
          <p className="market-hero-link">
            <Link href={`/borsa/${BIST_INDEX_SLUG}`}>BIST 100 detay sayfası →</Link>
          </p>
        </div>
      ) : (
        <div className="market-na market-na-lg">BIST 100 verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
      )}

      {stocks.length > 0 ? (
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <thead>
              <tr><th>#</th><th>Hisse</th><th className="num">Fiyat (₺)</th><th className="num">Değişim</th></tr>
            </thead>
            <tbody>
              {stocks.map((s, i) => {
                const up = (s.changePct ?? 0) >= 0;
                return (
                  <tr key={s.slug}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <Link href={`/borsa/${s.slug}`} className="crypto-link">
                        <span className="crypto-sym">{s.ticker}</span>
                        <span className="crypto-name">{s.name}</span>
                      </Link>
                    </td>
                    <td className="num">₺{tl(s.price, 2)}</td>
                    <td className={`num ${up ? "market-up" : "market-dn"}`}>{pctText(s.changePct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="market-na market-na-lg">Hisse verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
      )}

      <AdSlot position="inArticle" />

      <MarketFaq items={BIST_HUB_FAQ} />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/kripto" className="market-chip">Kripto Fiyatları</Link>
          <Link href="/faiz" className="market-chip">Faiz Oranları</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">Borsa Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
