import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import { toolGuide } from "@/lib/tool-guides";
import { toolFaq } from "@/lib/market-faq";
import { TOOL_CATALOG, type ToolSlug } from "@/lib/tool-catalog";
import CurrencyConverter from "@/components/CurrencyConverter";
import GoldCalculator from "@/components/calculators/GoldCalculator";
import LoanCalculator from "@/components/calculators/LoanCalculator";
import DepositCalculator from "@/components/calculators/DepositCalculator";
import InflationCalculator from "@/components/calculators/InflationCalculator";
import CompoundCalculator from "@/components/calculators/CompoundCalculator";
import StockPnlCalculator from "@/components/calculators/StockPnlCalculator";
import RentIncreaseCalculator from "@/components/calculators/RentIncreaseCalculator";
import PensionRaiseCalculator from "@/components/calculators/PensionRaiseCalculator";
import MemurRaiseCalculator from "@/components/calculators/MemurRaiseCalculator";
import CpiTable from "@/components/CpiTable";
import { cpiToolMeta, getCpiSnapshot, monthLabel, nextMonth } from "@/lib/tufe";
import DividendCalculator from "@/components/calculators/DividendCalculator";
import SalaryCalculator from "@/components/calculators/SalaryCalculator";
import BesStateContributionCalculator from "@/components/calculators/BesStateContributionCalculator";
import OksContributionCalculator from "@/components/calculators/OksContributionCalculator";

// 1 saat: TÜİK açıklama günü (her ayın 3'ü 10:00) yeni oran en geç 1 saatte görünür.
export const revalidate = 3600;
const BASE = "https://gelecekfinans.com";

interface ToolDef {
  title: string;
  h1: string;
  metaTitle: string;
  desc: string;
  intro: string;
  component: "doviz" | "altin" | "kredi" | "mevduat" | "enflasyon" | "bilesik" | "hissekz" | "kira" | "emekli" | "memur" | "temettu" | "maas" | "bes" | "oks";
  related: { href: string; label: string }[];
}

const TOOLS: Record<ToolSlug, ToolDef> = {
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
    metaTitle: "Altın Hesaplama — Gram, Çeyrek, Cumhuriyet Altını Metal Değeri",
    desc: "Gram, çeyrek ve tam Cumhuriyet ziynet altınının yaklaşık TL metal karşılığını hesaplayın.",
    intro:
      "Elinizdeki altının türü ve miktarıyla yaklaşık metal karşılığını hesaplayın. Çeyrek ve tam Cumhuriyet ziynet altını Darphane'nin 22 ayar standardına göre hesaplanır; sikke primi, işçilik, alış-satış makası ve kurum marjı dahil değildir.",
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
    metaTitle: "Enflasyon Hesaplama — Geçmiş ve Bugünkü Tutar Dönüşümü",
    desc: "Enflasyon oranının yönünü seçerek geçmiş tutarın bugünkü karşılığını veya bugünkü tutarın geçmiş dönemdeki alım gücünü hesaplayın.",
    intro:
      "Hesap yönünü seçin, tutarı ve dönem enflasyon oranını girin. Araç, geçmiş tutarın bugünkü karşılığını veya bugünkü tutarın geçmiş dönemdeki alım gücünü hesaplar.",
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
    metaTitle: "Hisse Kâr Zarar Hesaplama — Komisyon ve BSMV Dahil (BIST)",
    desc: "Alış ve satış fiyatı, adet, komisyon ve komisyon BSMV'sine göre hisse işleminin net kâr/zararını hesaplayın.",
    intro:
      "Hisse alış ve satış fiyatını, adedi, komisyon oranını ve komisyon üzerinden BSMV oranını girerek net kâr veya zararı hesaplayın. BSMV varsayılanı %5'tir; güncel oranlar ve komisyon için aracı kurumunuzun tarifesine bakın.",
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
    desc: "Mevcut emekli aylığınız ve zam oranına göre yeni maaşınızı ve yıllıklandırılmış farkı hesaplayın.",
    intro:
      "Mevcut aylığınızı ve beklediğiniz ya da açıklanan zam oranını girerek zam tutarını, yeni aylığı ve 12 aylık yıllıklandırılmış farkı görün.",
    component: "emekli",
    related: [
      { href: "/araclar/memur-zammi-hesaplama", label: "Memur Zammı Hesaplama" },
      { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon Hesaplama" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "brut-net-maas-hesaplama": {
    title: "Brüt Net Maaş Hesaplama",
    h1: "Brüt Net Maaş Hesaplama 2026 — Brütten Nete, Netten Brüte",
    metaTitle: "Brüt Net Maaş Hesaplama 2026 — Aylık Net, Vergi Dilimi, İşveren Maliyeti",
    desc: "2026 vergi dilimleri ve asgari ücret istisnasıyla brütten nete ve netten brüte maaş hesaplayın; 12 aylık net, gelir vergisi, SGK kesintisi ve işveren maliyeti.",
    intro:
      "Brüt ya da net maaşınızı girin; araç 2026 gelir vergisi tarifesi, asgari ücret istisnası, SGK ve işsizlik primi ile damga vergisini uygulayarak her ayın netini, vergi dilimini ve işverene maliyeti gösterir. Kümülatif matrah yükseldikçe yılın son aylarında netin neden düştüğünü tablodan görebilirsiniz.",
    component: "maas",
    related: [
      { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon Hesaplama" },
      { href: "/araclar/memur-zammi-hesaplama", label: "Memur Zammı Hesaplama" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "memur-zammi-hesaplama": {
    title: "Memur Zammı Hesaplama",
    h1: "Memur Zammı Hesaplama — Ocak 2027 Memur ve Memur Emeklisi Zammı",
    metaTitle: "Memur Zammı Hesaplama 2027 — Ocak Zammı ve Enflasyon Farkı",
    desc: "Toplu sözleşme oranı ve TÜİK'in 6 aylık enflasyonuyla memur ve memur emeklisi zammını, enflasyon farkını ve yeni maaşı hesaplayın.",
    intro:
      "Maaşınızı girin; araç 8. Dönem Toplu Sözleşme oranını ve TÜİK'in şimdiye kadar açıkladığı 6 aylık enflasyonu kullanarak enflasyon farkını, toplam zam oranını ve yeni maaşınızı hesaplar. SSK ve Bağ-Kur emeklilerinin aynı dönem zammını da gösterir.",
    component: "memur",
    related: [
      { href: "/araclar/emekli-zammi-hesaplama", label: "Emekli Zammı Hesaplama" },
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
      { href: "/borsa/temettu-takvimi", label: "Temettü Takvimi" },
      { href: "/borsa/tatil-gunleri", label: "Borsa Tatil Günleri" },
      { href: "/borsa", label: "Borsa İstanbul" },
      { href: "/araclar/hisse-kar-zarar-hesaplama", label: "Hisse Kâr/Zarar" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "bes-devlet-katkisi-hesaplama": {
    title: "BES Devlet Katkısı Hesaplama",
    h1: "BES Devlet Katkısı Hesaplama 2026",
    metaTitle: "BES Devlet Katkısı Hesaplama 2026 — Yıllık Tavan ve Katkı",
    desc: "2026 BES katkı payınıza göre devlet katkısı tahminini, yıllık tavanı ve devreden tutarı hesaplayın.",
    intro: "2026’da katılımcı adına ödenen gönüllü BES katkı paylarını girerek devlet katkısı tahminini ve yıllık üst sınıra kalan tutarı görün. Hesap, EGM’nin 2026 oranı ve tavanına dayanır.",
    component: "bes",
    related: [
      { href: "/araclar/oks-devlet-katkisi-hesaplama", label: "OKS Devlet Katkısı" },
      { href: "/araclar/bilesik-faiz-hesaplama", label: "Bileşik Faiz" },
      { href: "/araclar/mevduat-faiz-hesaplama", label: "Mevduat Faizi" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
  "oks-devlet-katkisi-hesaplama": {
    title: "OKS Devlet Katkısı Hesaplama",
    h1: "OKS Devlet Katkısı Hesaplama 2026",
    metaTitle: "OKS Devlet Katkısı Hesaplama 2026 — %20 Katkı ve 500 TL Başlangıç Tutarı",
    desc: "2026 OKS katkı payınıza göre devlet katkısı taahhüdünü, yıllık tavanı ve koşullu başlangıç katkısını hesaplayın.",
    intro: "2026’da aynı katılımcının tüm Otomatik Katılım Sistemi sözleşmelerindeki katkıları ve varsa önceki yıllardan devreden tutarı girin. İki aylık başlangıç dönemi sonunda sistemde kalma durumuna göre tek seferlik ilave katkıyı ayrıca görün.",
    component: "oks",
    related: [
      { href: "/araclar/bes-devlet-katkisi-hesaplama", label: "BES Devlet Katkısı" },
      { href: "/araclar", label: "Tüm Araçlar" },
    ],
  },
};

export function generateStaticParams() {
  return TOOL_CATALOG.map(({ slug }) => ({ tool: slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = TOOLS[tool];
  if (!t) return {};
  const cpiKind = t.component === "kira" || t.component === "emekli" || t.component === "memur" ? t.component : null;
  const dyn = cpiKind ? cpiToolMeta(cpiKind, await getCpiSnapshot()) : null;
  const metaTitle = dyn?.title ?? t.metaTitle;
  const desc = dyn?.desc ?? t.desc;
  return {
    title: metaTitle,
    description: desc,
    alternates: { canonical: `${BASE}/araclar/${tool}` },
    openGraph: { type: "website", url: `${BASE}/araclar/${tool}`, title: metaTitle, description: desc, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title: metaTitle, description: desc },
  };
}

type Cpi = Awaited<ReturnType<typeof getCpiSnapshot>>;

function Calculator({ kind, cpi }: { kind: ToolDef["component"]; cpi: Cpi }) {
  switch (kind) {
    case "doviz": return <CurrencyConverter defaultFrom="USD" />;
    case "altin": return <GoldCalculator />;
    case "kredi": return <LoanCalculator />;
    case "mevduat": return <DepositCalculator />;
    case "enflasyon": return <InflationCalculator />;
    case "bilesik": return <CompoundCalculator />;
    case "hissekz": return <StockPnlCalculator />;
    case "kira": return <RentIncreaseCalculator rates={cpi ? cpi.rows.filter((r) => r.avg12 !== null).slice(-12).reverse()
      .map((r) => ({ renewal: monthLabel(nextMonth(r.ym)), source: r.label, avg12: r.avg12! })) : undefined} />;
    case "emekli": return <PensionRaiseCalculator half={cpi?.half ?? null} />;
    case "memur": return <MemurRaiseCalculator half={cpi?.half ?? null} />;
    case "temettu": return <DividendCalculator />;
    case "maas": return <SalaryCalculator />;
    case "bes": return <BesStateContributionCalculator />;
    case "oks": return <OksContributionCalculator />;
  }
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = TOOLS[tool];
  if (!t) notFound();
  const cpi = t.component === "kira" || t.component === "emekli" || t.component === "memur" ? await getCpiSnapshot() : null;

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/araclar">Araçlar</Link> <span>/</span> <span>{t.title}</span>
      </nav>
      <h1 className="page-header">{t.h1}</h1>
      <p className="market-lede">{t.intro}</p>

      <section className="section">
        <Calculator kind={t.component} cpi={cpi} />
      </section>

      {cpi && (t.component === "kira" || t.component === "emekli" || t.component === "memur") && (
        <CpiTable rows={cpi.rows} mode={t.component === "kira" ? "kira" : "emekli"} />
      )}

      <AdSlot position="inArticle" />

      {toolGuide(tool)}

      <MarketFaq items={toolFaq(tool)} />

      <ToolsRail title="Diğer Hesaplama Araçları" current={`/araclar/${tool}`} />

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
