import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStock, BIST_STOCKS, BIST_INDEX_SLUG, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import Sparkline from "@/components/Sparkline";
import MarketFaq from "@/components/MarketFaq";
import { bistFaq } from "@/lib/market-faq";
import { STOCK_PROFILES } from "@/lib/stock-profiles";
import { getGuides } from "@/lib/articles";

export const revalidate = 300;
const BASE = "https://gelecekfinans.com";

export function generateStaticParams() {
  return Object.keys(BIST_STOCKS).map((hisse) => ({ hisse }));
}

export async function generateMetadata({ params }: { params: Promise<{ hisse: string }> }): Promise<Metadata> {
  const { hisse } = await params;
  const cfg = BIST_STOCKS[hisse];
  if (!cfg) return {};
  const title = cfg.index
    ? "BIST 100 Canlı — Endeks Kaç Puan? Güncel XU100 Değeri"
    : `${cfg.name} (${cfg.ticker}) Hisse Fiyatı — Canlı ${cfg.ticker} Grafiği`;
  const description = cfg.index
    ? "BIST 100 endeksi şu an kaç puan? Borsa İstanbul ana endeksinin canlı değeri, günlük değişimi ve bir aylık seyri."
    : `${cfg.name} (${cfg.ticker}) hisse senedi güncel fiyatı, günlük değişim oranı ve bir aylık fiyat grafiği.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/borsa/${hisse}` },
    openGraph: { type: "website", url: `${BASE}/borsa/${hisse}`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function HisseDetail({ params }: { params: Promise<{ hisse: string }> }) {
  const { hisse } = await params;
  const cfg = BIST_STOCKS[hisse];
  if (!cfg) notFound();

  const [d, related, guides] = await Promise.all([getStock(hisse), safeRelatedArticles("borsa"), getGuides(3, "borsa")]);
  const profile = STOCK_PROFILES[hisse];
  const series = d?.series ?? null;
  const stats = series && series.length >= 10
    ? (() => {
        const max = Math.max(...series);
        const min = Math.min(...series);
        const avg = series.reduce((a, b) => a + b, 0) / series.length;
        const chg = series[0] > 0 ? ((series[series.length - 1] - series[0]) / series[0]) * 100 : null;
        return { max, min, avg, chg, n: series.length };
      })()
    : null;
  const up = (d?.changePct ?? 0) >= 0;
  const others = Object.entries(BIST_STOCKS).filter(([k]) => k !== hisse).slice(0, 6);
  const baslik = cfg.index ? "BIST 100 Endeksi" : `${cfg.name} (${cfg.ticker}) Hisse Fiyatı`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: baslik,
        description: cfg.about,
        url: `${BASE}/borsa/${hisse}`,
        creator: { "@type": "Organization", name: "GelecekFinans" },
        ...(d
          ? {
              variableMeasured: {
                "@type": "PropertyValue",
                name: cfg.index ? "BIST 100 endeks değeri" : `1 ${cfg.ticker} hissesi`,
                value: d.price,
                unitText: cfg.index ? "puan" : "TRY",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
          { "@type": "ListItem", position: 3, name: cfg.name, item: `${BASE}/borsa/${hisse}` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span> <span>{cfg.name}</span>
      </nav>

      <div className="market-hero">
        <div className="market-hero-head">
          <span className="market-flag market-flag-lg" aria-hidden>{cfg.index ? "📈" : "🏢"}</span>
          <div>
            <h1 className="market-hero-title">{baslik}</h1>
            <p className="market-hero-sub">
              {cfg.index ? "Borsa İstanbul ana endeksi (XU100)" : `Borsa İstanbul · ${cfg.ticker}`}
            </p>
          </div>
        </div>

        {d ? (
          <>
            <div className="market-headline">
              {cfg.index ? <><strong>{tl(d.price, 2)}</strong> puan</> : <>1 {cfg.ticker} = <strong>₺{tl(d.price, 2)}</strong></>}
            </div>
            {d.changePct != null ? (
              <div className={up ? "market-up market-change-lg" : "market-dn market-change-lg"}>
                {up ? "▲" : "▼"} {pctText(d.changePct)} <span className="market-change-abs">(önceki kapanışa göre)</span>
              </div>
            ) : (
              <div className="market-muted">Günlük değişim verisi alınamadı.</div>
            )}
            {d.prevClose != null && (
              <div className="market-stats">
                <span>Önceki Kapanış: <strong>{cfg.index ? `${tl(d.prevClose, 2)} puan` : `₺${tl(d.prevClose, 2)}`}</strong></span>
              </div>
            )}
            {d.updatedAt && <div className="market-updated">Son güncelleme: {fmtUpdated(d.updatedAt)}</div>}
          </>
        ) : (
          <div className="market-na market-na-lg">
            {cfg.name} verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.
          </div>
        )}

        <Sparkline data={d?.series ?? null} up={up} label={`${cfg.name} bir aylık fiyat grafiği`} />
        <p className="market-spark-cap">Son bir aylık {cfg.ticker} kapanış seyri</p>

        {stats && (
          <div className="market-stats-block">
            <h3 className="market-h3">Son {stats.n} seans özeti</h3>
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <caption className="sr-only">{cfg.name} son {stats.n} seans kapanış özeti</caption>
                <thead>
                  <tr><th>Ölçü</th><th>Değer</th></tr>
                </thead>
                <tbody>
                  <tr><td>En yüksek kapanış</td><td>{cfg.index ? `${tl(stats.max, 2)} puan` : `₺${tl(stats.max, 2)}`}</td></tr>
                  <tr><td>En düşük kapanış</td><td>{cfg.index ? `${tl(stats.min, 2)} puan` : `₺${tl(stats.min, 2)}`}</td></tr>
                  <tr><td>Ortalama kapanış</td><td>{cfg.index ? `${tl(stats.avg, 2)} puan` : `₺${tl(stats.avg, 2)}`}</td></tr>
                  {stats.chg != null && (
                    <tr><td>Dönem değişimi</td><td>{pctText(stats.chg)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="market-muted">
              Tablo, bu sayfadaki bir aylık grafiğin kapanış verisinden hesaplanır; seans içi en yüksek/en düşük
              değerleri değil, günlük kapanışları gösterir.
            </p>
          </div>
        )}
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">{cfg.name} Hakkında</h2>
        {profile
          ? profile.paragraphs.map((p, i) => <p key={i} className="market-prose">{p}</p>)
          : <p className="market-prose">{cfg.about}</p>}
        <p className="market-prose">
          Bu sayfadaki fiyat, borsa seans verisinden derlenir ve yaklaşık 5 dakikada bir güncellenir;
          seans dışında son kapanış değeri gösterilir. Veriler bilgilendirme amaçlıdır, yatırım tavsiyesi niteliği
          taşımaz. Güncel gelişmeler için <Link href="/kategori/borsa">borsa haberleri</Link> sayfamızı takip edin.
        </p>
      </section>

      <MarketFaq items={[...(profile?.faq ?? []), ...bistFaq(cfg.name, cfg.ticker, cfg.index === true)]} />

      <section className="section market-links">
        <h2 className="market-h2">Diğer Hisseler</h2>
        <div className="market-chips">
          {others.map(([k, c]) => (
            <Link key={k} href={`/borsa/${k}`} className="market-chip">{c.name}{c.index ? "" : ` (${c.ticker})`}</Link>
          ))}
          {hisse !== BIST_INDEX_SLUG && <Link href={`/borsa/${BIST_INDEX_SLUG}`} className="market-chip">BIST 100</Link>}
          <Link href="/doviz/usd-try" className="market-chip">Dolar Kuru</Link>
        </div>
      </section>

      {guides.length > 0 && (
        <section className="section market-links">
          <h2 className="market-h2">Borsa Rehberleri</h2>
          <div className="market-chips">
            {guides.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="market-chip">{g.title}</Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">İlgili Borsa Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
