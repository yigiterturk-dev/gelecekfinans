import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCrypto, CRYPTO_COINS, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { cryptoFaq } from "@/lib/market-faq";
import { CRYPTO_PROFILES } from "@/lib/crypto-profiles";
import Sparkline from "@/components/Sparkline";

export const revalidate = 300;
const BASE = "https://gelecekfinans.com";

export function generateStaticParams() {
  return Object.keys(CRYPTO_COINS).map((coin) => ({ coin }));
}

export async function generateMetadata({ params }: { params: Promise<{ coin: string }> }): Promise<Metadata> {
  const { coin } = await params;
  const cfg = CRYPTO_COINS[coin];
  if (!cfg) return {};
  const title = `${cfg.label} Fiyatı — 1 ${cfg.symbol} Kaç TL? Canlı ${cfg.symbol}/TRY`;
  const description = `Güncel ${cfg.label} (${cfg.symbol}) fiyatı. 1 ${cfg.symbol} kaç TL, 24 saatlik değişim, 7 günlük grafik ve canlı Türk Lirası fiyatı takibi.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/kripto/${coin}` },
    openGraph: { type: "website", url: `${BASE}/kripto/${coin}`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function KriptoDetail({ params }: { params: Promise<{ coin: string }> }) {
  const { coin } = await params;
  const cfg = CRYPTO_COINS[coin];
  if (!cfg) notFound();

  const [d, related] = await Promise.all([
    getCrypto(coin),
    safeRelatedArticles("kripto"),
  ]);
  const up = (d?.changePct ?? 0) >= 0;
  const others = Object.entries(CRYPTO_COINS).filter(([k]) => k !== coin).slice(0, 6);
  const priceFrac = d && d.price >= 100 ? 2 : 4;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: `${cfg.label} (${cfg.symbol}/TRY) Fiyatı`,
        description: `${cfg.label} için güncel Türk Lirası fiyatı ve piyasa verisi.`,
        url: `${BASE}/kripto/${coin}`,
        creator: { "@type": "Organization", name: "GelecekFinans" },
        ...(d
          ? {
              variableMeasured: {
                "@type": "PropertyValue",
                name: `1 ${cfg.symbol}`,
                value: d.price,
                unitText: "TRY",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Kripto Para", item: `${BASE}/kripto` },
          { "@type": "ListItem", position: 3, name: cfg.label, item: `${BASE}/kripto/${coin}` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/kripto">Kripto Para</Link> <span>/</span> <span>{cfg.label}</span>
      </nav>

      <div className="market-hero">
        <div className="market-hero-head">
          <span className="market-flag market-flag-lg" aria-hidden>🪙</span>
          <div>
            <h1 className="market-hero-title">{cfg.label} ({cfg.symbol}) Fiyatı</h1>
            <p className="market-hero-sub">Canlı {cfg.symbol}/TRY fiyatı ve 24 saatlik değişim</p>
          </div>
        </div>

        {d ? (
          <>
            <div className="market-headline">1 {cfg.symbol} = <strong>₺{tl(d.price, priceFrac)}</strong></div>
            {d.changePct != null ? (
              <div className={up ? "market-up market-change-lg" : "market-dn market-change-lg"}>
                {up ? "▲" : "▼"} {pctText(d.changePct)} <span className="market-change-abs">(24 saat)</span>
              </div>
            ) : (
              <div className="market-muted">24 saatlik değişim verisi alınamadı.</div>
            )}
            <div className="market-stats">
              {d.high24h != null && <span>24s En Yüksek: <strong>₺{tl(d.high24h, priceFrac)}</strong></span>}
              {d.low24h != null && <span>24s En Düşük: <strong>₺{tl(d.low24h, priceFrac)}</strong></span>}
              {d.marketCap != null && <span>Piyasa Değeri: <strong>₺{tl(d.marketCap, 0)}</strong></span>}
            </div>
            {d.updatedAt && <div className="market-updated">Son güncelleme: {fmtUpdated(d.updatedAt)}</div>}
          </>
        ) : (
          <div className="market-na market-na-lg">{cfg.label} fiyatı şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
        )}

        <Sparkline data={d?.sparkline ?? null} up={up} label={`${cfg.label} 7 günlük fiyat grafiği`} />
        <p className="market-spark-cap">Son 7 günlük {cfg.symbol}/TRY seyri</p>
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">{cfg.label} Hakkında</h2>
        {CRYPTO_PROFILES[coin]?.paragraphs.map((p, i) => (
          <p key={i} className="market-prose">{p}</p>
        ))}
        <p className="market-prose">
          Bu sayfadaki
          {" "}1 {cfg.symbol} = TL fiyatı, CoinGecko genel API verilerinden derlenir ve yaklaşık 5 dakikada bir
          güncellenir. Kripto varlıklar yüksek oynaklığa sahiptir; gösterilen veriler bilgilendirme amaçlıdır ve
          yatırım tavsiyesi niteliği taşımaz. Güncel gelişmeler için{" "}
          <Link href="/kategori/kripto">kripto para haberleri</Link> sayfamızı takip edin.
        </p>
      </section>

      <MarketFaq items={[...(CRYPTO_PROFILES[coin]?.faq ?? []), ...cryptoFaq(cfg.label, cfg.symbol)]} />

      <section className="section market-links">
        <h2 className="market-h2">Diğer Kripto Paralar</h2>
        <div className="market-chips">
          {others.map(([k, c]) => (
            <Link key={k} href={`/kripto/${k}`} className="market-chip">{c.label} ({c.symbol})</Link>
          ))}
          <Link href="/doviz/usd-try" className="market-chip">Dolar Kuru</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">İlgili Kripto Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
