import type { Metadata } from "next";
import Link from "next/link";
import { REFERENCE_RATES, safeRelatedArticles } from "@/lib/market";
import { fetchPolicyRate } from "@/lib/tcmb-evds";
import { fetchTcmbRates } from "@/lib/tcmb-faiz";
import MarketFaq from "@/components/MarketFaq";
import { FAIZ_FAQ } from "@/lib/market-faq";
import { MedCard } from "@/components/ArticleCard";
import AdSlot from "@/components/AdSlot";
import DepositCalculator from "@/components/calculators/DepositCalculator";

export const revalidate = 3600;
const BASE = "https://gelecekfinans.com";

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
  // Anahtar varsa canlı politika faizi; yoksa null → sabit tabloya düşer.
  const [canli, tcmb] = await Promise.all([fetchPolicyRate(), fetchTcmbRates()]);
  const kartlar = tcmb
    ? REFERENCE_RATES.rates.map((r, i) => ({ ...r, value: [tcmb.policy, tcmb.borrow, tcmb.lend][i] ?? r.value }))
    : REFERENCE_RATES.rates;
  const [yil, ay] = REFERENCE_RATES.asOf.split("-");
  const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const donemAdi = `${AYLAR[Number(ay) - 1] ?? ay} ${yil}`;

  const related = await safeRelatedArticles("ekonomi");

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Faiz</span>
      </nav>
      <h1 className="page-header">Faiz Oranları</h1>
      <p className="market-lede">
        TCMB politika faizi ve referans faiz oranları ile mevduat getirisi hesaplayıcı.
      </p>

      {canli || tcmb ? (
        <div className="market-hero">
          <div className="market-hero-head">
            <span className="market-flag market-flag-lg" aria-hidden>🏦</span>
            <div>
              <h2 className="market-hero-title">TCMB Politika Faizi</h2>
              <p className="market-hero-sub">Bir hafta vadeli repo ihale faiz oranı</p>
            </div>
          </div>
          <div className="market-headline"><strong>%{(canli?.value ?? tcmb!.policy).toLocaleString("tr-TR")}</strong></div>
          <div className="market-updated">Kaynak: TCMB · yürürlük tarihi {canli ? canli.date : tcmb!.date}</div>
        </div>
      ) : (
        /* Canlı kaynak bağlı değilken bayatlığı GİZLEMİYORUZ: kullanıcı hangi
           döneme ait rakama baktığını üstte, gri bir dipnotta değil kutunun
           içinde görüyor. Yanlış rakamı güncelmiş gibi göstermektense eski
           olduğunu söylemek yeğdir. */
        <div className="market-na">
          Aşağıdaki oranlar <strong>{donemAdi}</strong> dönemine ait referans değerlerdir ve otomatik
          güncellenmemektedir. Bağlayıcı ve güncel oran için TCMB duyurularını esas alın.
        </div>
      )}

      <div className="market-grid">
        {kartlar.map((r) => (
          <div key={r.label} className="market-card market-card-static">
            <div className="market-card-name">{r.label}</div>
            <div className="market-card-price">%{r.value.toLocaleString("tr-TR")}</div>
            <p className="market-card-desc">{r.desc}</p>
          </div>
        ))}
      </div>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Mevduat Faizi Hesaplayıcı</h2>
        <DepositCalculator />
      </section>

      <MarketFaq items={FAIZ_FAQ} />

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
