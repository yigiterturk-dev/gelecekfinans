import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFx, getFxHistory, FX_PAIRS, tl, pctText, fmtUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { fxFaq } from "@/lib/market-faq";
import { FX_PROFILES } from "@/lib/asset-profiles";
import Sparkline from "@/components/Sparkline";
import CurrencyConverter from "@/components/CurrencyConverter";

export const revalidate = 600;
const BASE = "https://gelecekfinans.com";

export function generateStaticParams() {
  return Object.keys(FX_PAIRS).map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const { pair } = await params;
  const cfg = FX_PAIRS[pair];
  if (!cfg) return {};
  const title = `${cfg.label} Kuru — 1 ${cfg.base} Kaç TL? Canlı ${cfg.base}/TRY`;
  const description = `Güncel ${cfg.long} kuru. 1 ${cfg.base} kaç TL, günlük değişim, 30 günlük grafik ve canlı ${cfg.base}/TRY fiyatı. ${cfg.label} alış satış takibi.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/doviz/${pair}` },
    openGraph: { type: "website", url: `${BASE}/doviz/${pair}`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DovizDetail({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const cfg = FX_PAIRS[pair];
  if (!cfg) notFound();

  const [d, history, related] = await Promise.all([
    getFx(pair),
    getFxHistory(cfg.base),
    safeRelatedArticles("doviz"),
  ]);
  const up = (d?.changePct ?? 0) >= 0;
  const others = Object.entries(FX_PAIRS).filter(([k]) => k !== pair);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: `${cfg.long} (${cfg.base}/TRY) Kuru`,
        description: `${cfg.long} için güncel Türk Lirası kuru ve geçmiş veri.`,
        url: `${BASE}/doviz/${pair}`,
        creator: { "@type": "Organization", name: "GelecekFinans" },
        ...(d
          ? {
              variableMeasured: {
                "@type": "PropertyValue",
                name: `1 ${cfg.base}`,
                value: d.rate,
                unitText: "TRY",
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Döviz", item: `${BASE}/doviz` },
          { "@type": "ListItem", position: 3, name: cfg.label, item: `${BASE}/doviz/${pair}` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/doviz">Döviz</Link> <span>/</span> <span>{cfg.label}</span>
      </nav>

      <div className="market-hero">
        <div className="market-hero-head">
          <span className="market-flag market-flag-lg" aria-hidden>{cfg.flag}</span>
          <div>
            <h1 className="market-hero-title">{cfg.long} ({cfg.base}/TRY)</h1>
            <p className="market-hero-sub">Canlı {cfg.label} kuru ve günlük değişim</p>
          </div>
        </div>

        {d ? (
          <>
            <div className="market-headline">1 {cfg.base} = <strong>₺{tl(d.rate, 4)}</strong></div>
            {d.changePct != null ? (
              <div className={up ? "market-up market-change-lg" : "market-dn market-change-lg"}>
                {up ? "▲" : "▼"} {pctText(d.changePct)}
                {d.changeAbs != null && <span className="market-change-abs"> ({up ? "+" : ""}{tl(d.changeAbs, 4)} TL)</span>}
              </div>
            ) : (
              <div className="market-muted">Günlük değişim verisi alınamadı.</div>
            )}
            {d.updatedAt && <div className="market-updated">Son güncelleme: {fmtUpdated(d.updatedAt)}</div>}
          </>
        ) : (
          <div className="market-na market-na-lg">Kur verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
        )}

        <Sparkline data={history} up={up} label={`${cfg.label} 30 günlük kur grafiği`} />
        <p className="market-spark-cap">Son 30 günlük {cfg.base}/TRY seyri</p>
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">{cfg.label} Çevirici</h2>
        <CurrencyConverter defaultFrom={cfg.base} />
      </section>

      <section className="section">
        <h2 className="market-h2">{cfg.label} Nedir?</h2>
        {FX_PROFILES[pair]?.paragraphs.map((p, i) => (
          <p key={i} className="market-prose">{p}</p>
        ))}
        <p className="market-prose">
          Bu sayfadaki
          1 {cfg.base} = TL kuru, ücretsiz ve güncel piyasa verilerinden derlenir ve yaklaşık 10 dakikada bir
          yenilenir. Gösterilen değerler bilgilendirme amaçlıdır; bankaların ve döviz bürolarının alış-satış
          kurları farklılık gösterebilir. {cfg.label} ile ilgili son dakika gelişmeleri için{" "}
          <Link href="/kategori/doviz">döviz haberleri</Link> sayfamızı takip edebilirsiniz.
        </p>
      </section>

      <MarketFaq items={[...(FX_PROFILES[pair]?.faq ?? []), ...fxFaq(pair)]} />

      <section className="section market-links">
        <h2 className="market-h2">Diğer Döviz Kurları</h2>
        <div className="market-chips">
          {others.map(([k, c]) => (
            <Link key={k} href={`/doviz/${k}`} className="market-chip">{c.label} ({c.base}/TRY)</Link>
          ))}
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/kripto" className="market-chip">Kripto Para</Link>
          <Link href="/araclar/doviz-cevirici" className="market-chip">Döviz Çevirici</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">İlgili Döviz Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
