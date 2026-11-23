import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { REFERENCE_RATES, safeRelatedArticles } from "@/lib/market";
import { fetchTcmbRates } from "@/lib/tcmb-faiz";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import { FAIZ_FAQ } from "@/lib/market-faq";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import DepositCalculator from "@/components/calculators/DepositCalculator";

export const revalidate = 3600;
const BASE = "https://gelecekfinans.com";
const TCMB_REPO_RATES_URL = "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo";
const TCMB_OVERNIGHT_RATES_URL = "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/faiz-oranlari";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Faiz Oranları — TCMB Politika Faizi ve Güncel Faizler";
  const description =
    "Güncel faiz oranları: TCMB politika faizi, gecelik borçlanma ve borç verme faizleri. Mevduat faizi hesaplayıcı ve faiz haberleri.";
  return {
    title,
    description,
    alternates: { canonical: `${BASE}/faiz` },
    openGraph: { type: "website", url: `${BASE}/faiz`, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FaizPage() {
  // Yalnızca TCMB tablosundan birlikte doğrulanan oranlar canlı gösterilir.
  const [tcmb, related] = await Promise.all([
    fetchTcmbRates(),
    safeRelatedArticles("ekonomi"),
  ]);
  const liveValues = [tcmb?.policy, tcmb?.borrow, tcmb?.lend];
  const kartlar = REFERENCE_RATES.rates.map((r, i) => ({
    ...r,
    value: liveValues[i] ?? r.value,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Faiz Oranları",
        description: "TCMB politika faizi ve güncel faiz oranları.",
        url: `${BASE}/faiz`,
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Faiz Oranları", item: `${BASE}/faiz` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Faiz</span>
      </nav>
      <h1 className="page-header">Faiz Oranları</h1>
      <p className="market-lede">
        TCMB politika faizi ve referans faiz oranları ile mevduat getirisi hesaplayıcı.
      </p>

      {tcmb ? (
        <div className="market-hero">
          <div className="market-hero-head">
            <span className="market-flag market-flag-lg" aria-hidden>🏦</span>
            <div>
              <h2 className="market-hero-title">TCMB Politika Faizi</h2>
              <p className="market-hero-sub">Bir hafta vadeli repo ihale faiz oranı</p>
            </div>
          </div>
          <div className="market-headline"><strong>%{tcmb.policy.toLocaleString("tr-TR")}</strong></div>
          <div className="market-updated">
            Kaynak: <a href={TCMB_REPO_RATES_URL} target="_blank" rel="noopener noreferrer">TCMB bir hafta repo tablosu</a>
            {" "}· yürürlük tarihi {tcmb.date}
          </div>
        </div>
      ) : null}

      {!tcmb && (
        <div className="market-na">
          Faiz verileri otomatik alınamadı. Aşağıdaki oranlar <strong>{REFERENCE_RATES.decisionDate}</strong> tarihli statik referanslardır.{" "}
          Güncel ve bağlayıcı oran için{" "}
          <a href={REFERENCE_RATES.sourceUrl} target="_blank" rel="noopener noreferrer">
            TCMB faiz duyurusunu
          </a>{" "}
          esas alın.
        </div>
      )}

      <div className="market-grid">
        {kartlar.map((r, index) => (
          <div key={r.label} className="market-card market-card-static">
            <div className="market-card-name">{r.label}</div>
            <div className="market-card-price">%{r.value.toLocaleString("tr-TR")}</div>
            <p className="market-card-desc">{r.desc}</p>
            {tcmb && (
              <a className="market-card-source"
                href={index === 0 ? TCMB_REPO_RATES_URL : TCMB_OVERNIGHT_RATES_URL}
                target="_blank" rel="noopener noreferrer">
                TCMB kaynağı ↗
              </a>
            )}
          </div>
        ))}
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Mevduat Faizi Hesaplayıcı</h2>
        <DepositCalculator />
      </section>

      <MarketFaq items={FAIZ_FAQ} />

      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/doviz" className="market-chip">Döviz Kurları</Link>
          <Link href="/altin" className="market-chip">Altın Fiyatları</Link>
          <Link href="/araclar/kredi-faiz-hesaplama" className="market-chip">Kredi Faiz Hesaplama</Link>
          <Link href="/araclar/enflasyon-hesaplama" className="market-chip">Enflasyon Hesaplama</Link>
          <Link href="/kategori/ekonomi" className="market-chip">Ekonomi Haberleri</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <h2 className="market-h2">Ekonomi Haberleri</h2>
          <div className="resp-grid-4">
            {related.map((a) => <MedCard key={a.filename} article={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}
