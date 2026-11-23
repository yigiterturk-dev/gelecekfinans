import { serializeJsonLd } from "@/lib/json-ld";
import { datasetDescription } from "@/lib/dataset-desc";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGold, GOLD_TYPES, tl, pctText, fmtUpdated, fmtGoldQuoteUpdated, safeRelatedArticles } from "@/lib/market";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { goldFaq } from "@/lib/market-faq";
import { GOLD_PROFILES } from "@/lib/asset-profiles";
import { getGuides } from "@/lib/articles";
import GoldCalculator from "@/components/calculators/GoldCalculator";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";

export const revalidate = 600;
const BASE = "https://gelecekfinans.com";

export function generateStaticParams() {
  return Object.keys(GOLD_TYPES).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const cfg = GOLD_TYPES[type];
  if (!cfg) return {};
  const title = `${cfg.long} Fiyatı — Bugün Kaç TL? Canlı ${cfg.label}`;
  const description = `Güncel ${cfg.long.toLowerCase()} fiyatı. Bugün ${cfg.label.toLowerCase()} kaç TL, günlük değişim ve canlı altın fiyatı takibi. ${cfg.desc}`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/altin/${type}` },
    openGraph: { type: "website", url: `${BASE}/altin/${type}`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function AltinDetail({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const cfg = GOLD_TYPES[type];
  if (!cfg) notFound();

  const [d, related, guides] = await Promise.all([
    getGold(type),
    safeRelatedArticles("altin"),
    getGuides(3, "altin"),
  ]);
  const up = (d?.changePct ?? 0) >= 0;
  const others = Object.entries(GOLD_TYPES).filter(([k]) => k !== type);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: `${cfg.long} Fiyatı (TL)`,
        description: datasetDescription(cfg.desc),
        url: `${BASE}/altin/${type}`,
        creator: { "@type": "Organization", name: "GelecekFinans" },
        ...(d
          ? {
              variableMeasured: {
                "@type": "PropertyValue",
                name: cfg.long,
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
          { "@type": "ListItem", position: 2, name: "Altın", item: `${BASE}/altin` },
          { "@type": "ListItem", position: 3, name: cfg.label, item: `${BASE}/altin/${type}` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/altin">Altın</Link> <span>/</span> <span>{cfg.label}</span>
      </nav>

      <div className="market-hero">
        <div className="market-hero-head">
          <span className="market-flag market-flag-lg" aria-hidden>🥇</span>
          <div>
            <h1 className="market-hero-title">{cfg.long} Fiyatı</h1>
            <p className="market-hero-sub">Canlı {cfg.label.toLowerCase()} fiyatı ve günlük değişim</p>
          </div>
        </div>

        {d ? (
          <>
            <div className="market-headline">{cfg.label} = <strong>₺{tl(d.price)}</strong></div>
            {d.changePct != null ? (
              <div className={up ? "market-up market-change-lg" : "market-dn market-change-lg"}>
                {up ? "▲" : "▼"} {pctText(d.changePct)}
              </div>
            ) : (
              <div className="market-muted">Günlük değişim verisi alınamadı.</div>
            )}
            {d.goldSource === "CoinGecko" && (
              <div className="market-updated"><CoinGeckoAttribution /></div>
            )}
            {d.goldSource === "Yahoo Finance" && (
              <div className="market-updated">Altın kotasyon kaynağı: Yahoo Finance (GC=F)</div>
            )}
            {d.goldUpdatedAt && <div className="market-updated">Altın kotasyon zamanı: {fmtGoldQuoteUpdated(d.goldUpdatedAt)}</div>}
            {d.updatedAt && <div className="market-updated">USD/TRY referans tarihi: {fmtUpdated(d.updatedAt)}</div>}
          </>
        ) : (
          <div className="market-na market-na-lg">Altın fiyatı şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
        )}
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Altın Hesaplama</h2>
        <GoldCalculator />
      </section>

      <section className="section">
        <h2 className="market-h2">{cfg.long} Hakkında</h2>
        {GOLD_PROFILES[type]?.paragraphs.map((p, i) => (
          <p key={i} className="market-prose">{p}</p>
        ))}
        <p className="market-prose">
          Bu sayfadaki değer uluslararası ons altın fiyatı ve dolar/TL kurundan türetilir; çeyrek, yarım ve tam Cumhuriyet
          ziynet altınında Darphane'nin nominal ağırlığı ile 22 ayar saflık oranı uygulanır. Yaklaşık 10 dakikada bir
          güncellenir. Gösterilen değer tahmini metal karşılığıdır; sikke primi, işçilik, alış-satış makası ve kurum
          marjı dahil değildir. Kapalıçarşı ve banka fiyatları farklılık gösterebilir.
          Güncel gelişmeler için <Link href="/kategori/altin">altın haberleri</Link> sayfamızı takip edin.
        </p>
      </section>

      <MarketFaq items={[...(GOLD_PROFILES[type]?.faq ?? []), ...goldFaq(type)]} />

      <section className="section market-links">
        <h2 className="market-h2">Diğer Altın Türleri</h2>
        <div className="market-chips">
          {others.map(([k, c]) => (
            <Link key={k} href={`/altin/${k}`} className="market-chip">{c.label}</Link>
          ))}
          <Link href="/doviz/usd-try" className="market-chip">Dolar Kuru</Link>
          <Link href="/araclar/altin-hesaplama" className="market-chip">Altın Hesaplama</Link>
        </div>
      </section>

      {guides.length > 0 && (
        <section className="section market-links">
          <h2 className="market-h2">Altın Rehberleri</h2>
          <div className="market-chips">
            {guides.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="market-chip">{g.title}</Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">İlgili Altın Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
