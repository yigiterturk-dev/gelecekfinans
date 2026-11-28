import { serializeJsonLd } from "@/lib/json-ld";
import { datasetDescription } from "@/lib/dataset-desc";
import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";
import { BIST_STOCKS, tl } from "@/lib/market";
import { getFinancialsBatch, lineValue, summarize, type Financials } from "@/lib/financials";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";

export const revalidate = 43200;
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/borsa/bilanco-takvimi`;

export async function generateMetadata(): Promise<Metadata> {
  const title = "Bilanço Takvimi — BIST Şirketlerinin Son Açıklanan Finansal Tabloları";
  const description =
    "Borsa İstanbul'un büyük şirketlerinin en son açıklanan bilanço dönemi: satış geliri veya net faiz geliri, net kâr, yıllık değişim ve özkaynak kârlılığı tek tabloda. KAP finansal tablolarından.";
  return {
    title,
    description,
    alternates: { canonical: URL },
    ...paylasimMeta({ url: URL, title, description }),
  };
}

const FAQ: FaqItem[] = [
  {
    q: "Bilanço takvimi neyi gösteriyor?",
    a: "Her şirket için en son KAP'a bildirilen finansal tablo dönemini ve o dönemin özet rakamlarını gösterir. Yeni dönem bildirildikçe tablo kendiliğinden güncellenir; ayrıca bir tarih duyurusu beklemek gerekmez.",
  },
  {
    q: "Tablodaki gelir rakamı bankalarda neden farklı?",
    a: "Bankalar satış geliri yerine net faiz geliri açıklar. Bu yüzden banka satırlarında 'gelir' kolonu net faiz gelirini gösterir; diğer şirketlerde satış gelirleri yer alır. İki kalem aynı şey değildir.",
  },
  {
    q: "Rakamlar neden kümülatif?",
    a: "Türkiye'de ara dönem tabloları yıl başından itibaren kümülatiftir: 9 aylık tablo Ocak-Eylül toplamıdır. Bu sayfadaki değişim oranları da aynı uzunluktaki dönemlerle (bu yıl 9 ay ↔ geçen yıl 9 ay) karşılaştırılır.",
  },
];

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}₺${tl(a / 1e12, 2)} trn`;
  if (a >= 1e9) return `${sign}₺${tl(a / 1e9, 1)} mr`;
  if (a >= 1e6) return `${sign}₺${tl(a / 1e6, 1)} mn`;
  return `${sign}₺${tl(a, 0)}`;
}

function fmtChange(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : "−"}%${tl(Math.abs(n), 1)}`;
}

function fmtPct(n: number | null): string {
  return n == null ? "—" : `%${tl(n, 1)}`;
}

interface Row {
  slug: string;
  ticker: string;
  name: string;
  fin: Financials;
  revenue: number | null;
  netIncome: number | null;
  revenueYoY: number | null;
  netIncomeYoY: number | null;
  roe: number | null;
}

export default async function BilancoTakvimiPage() {
  const entries = Object.entries(BIST_STOCKS).filter(([, c]) => !c.index);
  const batch = await getFinancialsBatch(entries.map(([, c]) => c.ticker));

  const rows: Row[] = entries.flatMap(([slug, cfg]) => {
    const fin = batch.get(cfg.ticker);
    if (!fin) return [];
    const s = summarize(fin);
    return [
      {
        slug,
        ticker: cfg.ticker,
        name: cfg.name,
        fin,
        revenue: lineValue(fin, "3C", 0),
        netIncome: lineValue(fin, "3Z", 0),
        revenueYoY: s.revenueYoY,
        netIncomeYoY: s.netIncomeYoY,
        roe: s.roe == null ? null : s.roe * 100,
      },
    ];
  });

  const donem = rows[0]?.fin.periods[0];
  const donemLabel = donem ? `${donem.key} (${donem.frame})` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "BIST şirketleri son açıklanan bilanço dönemi",
        description: datasetDescription(
          "Borsa İstanbul şirketlerinin KAP'a bildirdiği en son finansal tablo döneminin özet kalemleri ve yıllık değişimleri.",
        ),
        url: URL,
        creator: { "@type": "Organization", name: "GelecekFinans", url: BASE },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
          { "@type": "ListItem", position: 3, name: "Bilanço Takvimi", item: URL },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span>{" "}
        <span>Bilanço Takvimi</span>
      </nav>

      <h1 className="page-header">Bilanço Takvimi — Son Açıklanan Finansal Tablolar</h1>
      <p className="market-lede">
        Borsa İstanbul&apos;un en çok işlem gören {rows.length} şirketinin KAP&apos;a bildirdiği en son finansal
        tablo dönemi{donemLabel ? ` (${donemLabel})` : ""}: gelir, net kâr, yıllık değişim ve özkaynak kârlılığı.
        Yeni dönem bildirildikçe tablo güncellenir; ara dönem rakamları kümülatiftir.
      </p>

      {rows.length === 0 ? (
        <div className="market-na market-na-lg">Bilanço verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
      ) : (
        <>
          <section className="section">
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <caption className="sr-only">BIST şirketlerinin son açıklanan bilanço dönemi özeti</caption>
                <thead>
                  <tr>
                    <th>Hisse</th>
                    <th className="num">Gelir*</th>
                    <th className="num">Gelir Δ</th>
                    <th className="num">Net kâr</th>
                    <th className="num">Net kâr Δ</th>
                    <th className="num">ROE (12 ay)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.slug}>
                      <td>
                        <Link href={`/borsa/${r.slug}/bilanco`} className="crypto-link">
                          <span className="crypto-sym">{r.ticker}</span>
                          <span className="crypto-name">{r.name}</span>
                        </Link>
                      </td>
                      <td className="num">{fmtMoney(r.revenue)}</td>
                      <td className={`num ${r.revenueYoY != null && r.revenueYoY < 0 ? "market-dn" : "market-up"}`}>
                        {fmtChange(r.revenueYoY)}
                      </td>
                      <td className="num">{fmtMoney(r.netIncome)}</td>
                      <td className={`num ${r.netIncomeYoY != null && r.netIncomeYoY < 0 ? "market-dn" : "market-up"}`}>
                        {fmtChange(r.netIncomeYoY)}
                      </td>
                      <td className="num">{fmtPct(r.roe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="market-muted" style={{ marginTop: 8, fontSize: 12 }}>
              * Bankalarda net faiz geliri, diğer şirketlerde satış gelirleri. Gelir ve net kâr dönem kümülatifidir; ROE son 12 aya göre hesaplanır.
            </p>
          </section>

          <AdSlot position="inArticle" />

          <p className="conv-note">
            Kaynak: KAP finansal tabloları (İş Yatırım). Kesin ve resmî tutarlar için şirketlerin KAP&apos;taki
            finansal rapor bildirimleri esastır. Bu sayfa yatırım tavsiyesi değildir.
          </p>
        </>
      )}

      <MarketFaq items={FAQ} />
      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/borsa" className="market-chip">BIST 100 ve Hisse Fiyatları</Link>
          <Link href="/borsa/temettu-takvimi" className="market-chip">Temettü Takvimi</Link>
          <Link href="/borsa/tatil-gunleri" className="market-chip">Borsa Tatil Günleri</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
