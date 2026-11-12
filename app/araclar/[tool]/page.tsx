import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import { toolFaq } from "@/lib/market-faq";
import CurrencyConverter from "@/components/CurrencyConverter";
import GoldCalculator from "@/components/calculators/GoldCalculator";
import LoanCalculator from "@/components/calculators/LoanCalculator";
import DepositCalculator from "@/components/calculators/DepositCalculator";
import InflationCalculator from "@/components/calculators/InflationCalculator";
import CompoundCalculator from "@/components/calculators/CompoundCalculator";
import StockPnlCalculator from "@/components/calculators/StockPnlCalculator";
import RentIncreaseCalculator from "@/components/calculators/RentIncreaseCalculator";
import PensionRaiseCalculator from "@/components/calculators/PensionRaiseCalculator";
import DividendCalculator from "@/components/calculators/DividendCalculator";

export const revalidate = 86400;
const BASE = "https://gelecekfinans.com";

interface ToolDef {
  title: string;
  h1: string;
  metaTitle: string;
  desc: string;
  intro: string;
  component: "doviz" | "altin" | "kredi" | "mevduat" | "enflasyon" | "bilesik" | "hissekz" | "kira" | "emekli" | "temettu";
  related: { href: string; label: string }[];
}

const TOOLS: Record<string, ToolDef> = {
  "doviz-cevirici": {
    title: "Döviz Çevirici",
    h1: "Döviz Çevirici",
    metaTitle: "Döviz Çevirici — Dolar, Euro, Sterlin TL Çevirme (Canlı Kur)",
    desc: "Canlı kurlarla dolar, euro, sterlin ve TL arasında ücretsiz döviz çevirici. Anlık döviz hesaplama aracı.",
    intro:
      "Bu araç, güncel piyasa kurlarını kullanarak dolar, euro, sterlin ve Türk Lirası arasında çeviri yapmanızı sağlar. Kurlar yaklaşık 10 dakikada bir güncellenir; banka ve döviz bürosu kurlarından farklılık gösterebilir.",
    component: "doviz",
    related: [
      { href: "/doviz/usd-try", label: "Dolar Kuru" },
      { href: "/doviz/eur-try", label: "Euro Kuru" },
      { href: "/doviz", label: "Tüm Döviz Kurları" },
    ],
  },
  "altin-hesaplama": {
    title: "Altın Hesaplama",
    h1: "Altın Hesaplama Aracı",
    metaTitle: "Altın Hesaplama — Gram, Çeyrek, Cumhuriyet Altını TL Değeri",
    desc: "Gram, çeyrek ve cumhuriyet altınının güncel TL değerini hesaplayın. Canlı altın fiyatıyla ücretsiz altın hesaplama.",
    intro:
      "Elinizdeki altının türünü ve miktarını girerek güncel Türk Lirası karşılığını hesaplayın. Fiyatlar uluslararası ons altından türetilir; kapalıçarşı işçilik ve marjları nedeniyle farklılık gösterebilir.",
    component: "altin",
    related: [
      { href: "/altin/gram-altin", label: "Gram Altın" },
      { href: "/altin/ceyrek-altin", label: "Çeyrek Altın" },
      { href: "/altin", label: "Tüm Altın Fiyatları" },
    ],
  },
  "kredi-faiz-hesaplama": {
    title: "Kredi Faizi Hesaplama",
    h1: "Kredi Faizi Hesaplama",
    metaTitle: "Kredi Hesaplama — Aylık Taksit ve Faiz Hesaplayıcı",
    desc: "Kredi tutarı, faiz oranı ve vadeye göre aylık taksit, toplam geri ödeme ve toplam faizi hesaplayın.",
    intro:
      "Kredi tutarını, aylık faiz oranını ve vadeyi girerek anüite (eşit taksit) yöntemiyle aylık taksitinizi ve toplam geri ödeme tutarınızı hesaplayın. KKDF, BSMV ve dosya masrafları dahil değildir.",
    component: "kredi",
    related: [
      { href: "/faiz", label: "Faiz Oranları" },
      { href: "/araclar/mevduat-faiz-hesaplama", label: "Mevduat Faizi" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "mevduat-faiz-hesaplama": {
    title: "Mevduat Faizi Hesaplama",
    h1: "Mevduat Faizi Hesaplama",
    metaTitle: "Mevduat Faizi Hesaplama — Vadeli Hesap Net Getiri Hesaplayıcı",
    desc: "Vadeli mevduatın brüt ve stopaj sonrası net getirisini hesaplayın. Ücretsiz mevduat faizi hesaplayıcı.",
    intro:
      "Anapara, yıllık faiz oranı, vade ve stopaj oranını girerek vadeli mevduatınızın brüt faizini, stopaj kesintisini ve net getirisini hesaplayın. Basit faiz yöntemi (yıllık 365 gün) kullanılır.",
    component: "mevduat",
    related: [
      { href: "/faiz", label: "Faiz Oranları" },
      { href: "/araclar/kredi-faiz-hesaplama", label: "Kredi Faizi" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "enflasyon-hesaplama": {
    title: "Enflasyon Hesaplama",
    h1: "Enflasyon Hesaplama",
    metaTitle: "Enflasyon Hesaplama — Para Alım Gücü Hesaplayıcı",
    desc: "Bir tutarın enflasyon karşısındaki alım gücünü ve güncel karşılığını hesaplayın. Ücretsiz enflasyon hesaplayıcı.",
    intro:
      "Tutar ve dönem enflasyon oranını girerek paranızın güncel karşılığını ve bugünkü alım gücünü hesaplayın. Resmi veriler için TÜİK yayınlarını esas alın.",
    component: "enflasyon",
    related: [
      { href: "/faiz", label: "Faiz Oranları" },
      { href: "/kategori/ekonomi", label: "Ekonomi Haberleri" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "bilesik-faiz-hesaplama": {
    title: "Bileşik Faiz Hesaplama",
    h1: "Bileşik Faiz Hesaplama",
    metaTitle: "Bileşik Faiz Hesaplama — Aylık Ek Yatırımlı Getiri Hesaplayıcı",
    desc: "Başlangıç tutarı, aylık ek yatırım, yıllık getiri ve süreye göre bileşik faizle paranızın dönem sonu değerini hesaplayın.",
    intro:
      "Bileşik faizde kazanılan getiri anaparaya eklenir ve sonraki dönemlerde onun üzerinden de getiri kazanılır. Başlangıç tutarını, isterseniz aylık ek yatırımı, yıllık getiriyi ve süreyi girerek dönem sonundaki değeri görün.",
    component: "bilesik",
    related: [
      { href: "/araclar/mevduat-faiz-hesaplama", label: "Mevduat Faizi" },
      { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon Hesaplama" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "hisse-kar-zarar-hesaplama": {
    title: "Hisse Kâr/Zarar Hesaplama",
    h1: "Hisse Kâr Zarar Hesaplama",
    metaTitle: "Hisse Kâr Zarar Hesaplama — Komisyon Dahil Net Getiri (BIST)",
    desc: "Alış ve satış fiyatı, adet ve komisyona göre hisse işleminin net kâr/zararını ve yüzde getirisini hesaplayın.",
    intro:
      "Hisse alış ve satış fiyatını, adedi ve komisyon oranınızı girerek işlemin komisyon sonrası net kâr veya zararını ve yüzde getirisini hesaplayın. Komisyon oranı için aracı kurumunuzun tarifesine bakın.",
    component: "hissekz",
    related: [
      { href: "/borsa", label: "Borsa İstanbul" },
      { href: "/araclar/bilesik-faiz-hesaplama", label: "Bileşik Faiz" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "kira-artis-hesaplama": {
    title: "Kira Artışı Hesaplama",
    h1: "Kira Artış Oranı Hesaplama",
    metaTitle: "Kira Artış Oranı Hesaplama — Yeni Kira Bedeli",
    desc: "Mevcut kiranız ve TÜFE 12 aylık ortalama oranına göre yeni kira bedelini ve artış tutarını hesaplayın.",
    intro:
      "Mevcut aylık kiranızı ve TÜİK’in açıkladığı TÜFE 12 aylık ortalama artış oranını girerek yeni kira bedelini ve artış tutarını görün.",
    component: "kira",
    related: [
      { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon Hesaplama" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "emekli-zammi-hesaplama": {
    title: "Emekli Zammı Hesaplama",
    h1: "Emekli Maaşı Zam Hesaplama",
    metaTitle: "Emekli Maaşı Zam Hesaplama — Yeni Aylık Tutarı",
    desc: "Mevcut emekli aylığınız ve zam oranına göre yeni maaşınızı ve yıllık farkı hesaplayın.",
    intro:
      "Mevcut aylığınızı ve beklediğiniz ya da açıklanan zam oranını girerek zam tutarını, yeni aylığı ve yıllık farkı görün.",
    component: "emekli",
    related: [
      { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon Hesaplama" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "temettu-hesaplama": {
    title: "Temettü Hesaplama",
    h1: "Temettü Hesaplama",
    metaTitle: "Temettü Hesaplama — Net Temettü ve Verim",
    desc: "Hisse adedi, hisse başına brüt temettü ve stopaja göre net temettü gelirini ve temettü verimini hesaplayın.",
    intro:
      "Sahip olduğunuz hisse adedini ve hisse başına brüt temettüyü girerek stopaj sonrası net temettü gelirinizi ve temettü verimini hesaplayın.",
    component: "temettu",
    related: [
      { href: "/borsa", label: "Borsa İstanbul" },
      { href: "/araclar/hisse-kar-zarar-hesaplama", label: "Hisse Kâr/Zarar" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(TOOLS).map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = TOOLS[tool];
  if (!t) return {};
  return {
    title: t.metaTitle,
    description: t.desc,
    alternates: { canonical: `${BASE}/araclar/${tool}` },
    openGraph: { type: "website", url: `${BASE}/araclar/${tool}`, title: t.metaTitle, description: t.desc, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title: t.metaTitle, description: t.desc },
  };
}

function Calculator({ kind }: { kind: ToolDef["component"] }) {
  switch (kind) {
    case "doviz": return <CurrencyConverter defaultFrom="USD" />;
    case "altin": return <GoldCalculator />;
    case "kredi": return <LoanCalculator />;
    case "mevduat": return <DepositCalculator />;
    case "enflasyon": return <InflationCalculator />;
    case "bilesik": return <CompoundCalculator />;
    case "hissekz": return <StockPnlCalculator />;
    case "kira": return <RentIncreaseCalculator />;
    case "emekli": return <PensionRaiseCalculator />;
    case "temettu": return <DividendCalculator />;
  }
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = TOOLS[tool];
  if (!t) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: t.title,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: `${BASE}/araclar/${tool}`,
        description: t.desc,
        offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Araçlar", item: `${BASE}/araclar` },
          { "@type": "ListItem", position: 3, name: t.title, item: `${BASE}/araclar/${tool}` },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/araclar">Araçlar</Link> <span>/</span> <span>{t.title}</span>
      </nav>
      <h1 className="page-header">{t.h1}</h1>
      <p className="market-lede">{t.intro}</p>

      <section className="section">
        <Calculator kind={t.component} />
      </section>

      <AdSlot position="inArticle" />

      <MarketFaq items={toolFaq(tool)} />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          {t.related.map((r) => (
            <Link key={r.href} href={r.href} className="market-chip">{r.label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
