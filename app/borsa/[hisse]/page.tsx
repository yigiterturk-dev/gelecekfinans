import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStock, BIST_STOCKS, BIST_INDEX_SLUG, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import Sparkline from "@/components/Sparkline";
import MarketFaq from "@/components/MarketFaq";
import { bistFaq } from "@/lib/market-faq";

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

  const [d, related] = await Promise.all([getStock(hisse), safeRelatedArticles("borsa")]);
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
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">{cfg.name} Hakkında</h2>
        <p className="market-prose">
          {cfg.about} Bu sayfadaki fiyat, borsa seans verisinden derlenir ve yaklaşık 5 dakikada bir güncellenir;
          seans dışında son kapanış değeri gösterilir. Veriler bilgilendirme amaçlıdır, yatırım tavsiyesi niteliği
          taşımaz. Güncel gelişmeler için <Link href="/kategori/borsa">borsa haberleri</Link> sayfamızı takip edin.
        </p>
      </section>

      <MarketFaq items={bistFaq(cfg.name, cfg.ticker, cfg.index === true)} />

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
