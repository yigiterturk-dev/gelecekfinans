import { serializeJsonLd } from "@/lib/json-ld";
import { datasetDescription } from "@/lib/dataset-desc";
import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BIST_STOCKS, BIST_INDEX_SLUG, tl } from "@/lib/market";
import { getFinancials, summarize, type Financials } from "@/lib/financials";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";

export const revalidate = 43200;
const BASE = "https://gelecekfinans.com";

export async function generateMetadata({ params }: { params: Promise<{ hisse: string }> }): Promise<Metadata> {
  const { hisse } = await params;
  const cfg = BIST_STOCKS[hisse];
  if (!cfg || cfg.index) return {};
  const fin = await getFinancials(cfg.ticker);
  const donem = fin ? `${fin.periods[0].key} (${fin.periods[0].frame})` : "son çeyrek";
  const title = `${cfg.name} (${cfg.ticker}) Bilanço — ${donem} Finansal Tablo`;
  const description = `${cfg.name} ${cfg.ticker} bilançosu: ${donem} gelir tablosu, özkaynak, borç ve nakit akışı kalemleri; geçen yılın aynı dönemi ve yıl sonuyla karşılaştırmalı. KAP finansal tablolarından.`;
  const url = `${BASE}/borsa/${hisse}/bilanco`;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...paylasimMeta({ url, title, description }),
  };
}

const FAQ_CORE: FaqItem[] = [
  {
    q: "Bilançodaki rakamlar neden KAP'taki tabloyla birebir aynı olmayabilir?",
    a: "Veri, şirketlerin KAP'a gönderdiği finansal tabloların İş Yatırım tarafından yayımlanan halinden alınır ve iki kurum arasında sürüm/güncelleme farkı olabilir. Kesin ve resmî tutar için her zaman şirketin KAP'taki finansal rapor bildirimi esastır.",
  },
  {
    q: "Dönem sütunları neden '9 aylık' veya '12 aylık' yazıyor?",
    a: "Türkiye'de ara dönem finansal tabloları yıl başından itibaren kümülatiftir: 9 aylık tablo Ocak-Eylül toplamını gösterir, tek çeyreğe ait değildir. Bu yüzden karşılaştırmalar aynı uzunluktaki dönemlerle (bu yıl 9 ay ↔ geçen yıl 9 ay) yapılır.",
  },
  {
    q: "FAVÖK ve net borç nasıl hesaplanıyor?",
    a: "FAVÖK, faaliyet kârına amortisman gideri eklenerek yaklaşık olarak hesaplanır; şirketin kendi FAVÖK tanımı farklı olabilir. Net borç, kısa ve uzun vadeli finansal borçların toplamından nakit ve nakit benzerleri düşülerek bulunur. İkisi de tablodaki kalemlerden türetilir, tahmin içermez.",
  },
  {
    q: "Son 12 ay (TTM) rakamı ne anlama geliyor?",
    a: "TTM, son yıllık tabloya bu yılın kümülatif dönemi eklenip geçen yılın aynı dönemi düşülerek bulunur; yani son dört çeyreğin toplamıdır. Mevsimsellikten arındırılmış bir bakış sağlar.",
  },
];

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}₺${tl(a / 1e12, 2)} trilyon`;
  if (a >= 1e9) return `${sign}₺${tl(a / 1e9, 1)} milyar`;
  if (a >= 1e6) return `${sign}₺${tl(a / 1e6, 1)} milyon`;
  if (a >= 1e3) return `${sign}₺${tl(a / 1e3, 1)} bin`;
  return `${sign}₺${tl(a, 0)}`;
}

function fmtPct(n: number | null, digits = 1): string {
  if (n == null) return "—";
  return `%${tl(n, digits)}`;
}

function fmtChange(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : "−"}%${tl(Math.abs(n), 1)}`;
}

function fmtMultiple(n: number | null): string {
  if (n == null) return "—";
  return `${tl(n, 2)}x`;
}

function summarySentences(fin: Financials): string[] {
  const s = summarize(fin);
  const p = fin.periods;
  const out: string[] = [];

  if (fin.template === "bank") {
    if (s.netIncomeTtm != null) {
      out.push(
        `Son 12 ayda net kâr ${fmtMoney(s.netIncomeTtm)} oldu; ${p[0].frame} net kâr geçen yılın aynı dönemine göre ${fmtChange(s.netIncomeYoY)} değişti.`,
      );
    }
    if (s.roe != null) out.push(`Net kârın özkaynaklara oranı (ROE, son 12 ay) ${fmtPct(s.roe * 100)}.`);
    if (s.loansToDeposits != null) {
      out.push(`Kredilerin mevduata oranı ${fmtPct(s.loansToDeposits * 100)}; yani krediler mevduatın bu kadarlık kısmını karşılıyor.`);
    }
    return out;
  }

  if (s.revenueTtm != null) {
    out.push(
      `${p[0].year} yılının ${p[0].frame} döneminde satış gelirleri geçen yılın aynı dönemine göre ${fmtChange(s.revenueYoY)} değişti; son 12 ay hasılatı ${fmtMoney(s.revenueTtm)}.`,
    );
  }
  if (s.netIncomeTtm != null) {
    out.push(
      `Son 12 ay net kâr ${fmtMoney(s.netIncomeTtm)}${s.netMargin != null ? `, net kâr marjı ${fmtPct(s.netMargin)}` : ""}; ${p[0].frame} net kâr geçen yılın aynı dönemine göre ${fmtChange(s.netIncomeYoY)} değişti.`,
    );
  }
  if (s.netDebt != null) {
    out.push(
      `Net finansal borç ${fmtMoney(s.netDebt)}${s.netDebtToEbitda != null ? `, net borç/FAVÖK ${fmtMultiple(s.netDebtToEbitda)}` : ""}${s.roe != null ? `; özkaynak kârlılığı ${fmtPct(s.roe * 100)}` : ""}.`,
    );
  }
  return out;
}

export default async function BilancoPage({ params }: { params: Promise<{ hisse: string }> }) {
  const { hisse } = await params;
  const cfg = BIST_STOCKS[hisse];
  if (!cfg || cfg.index) notFound();

  const fin = await getFinancials(cfg.ticker);
  const url = `${BASE}/borsa/${hisse}/bilanco`;
  const s = fin ? summarize(fin) : null;
  const sentences = fin ? summarySentences(fin) : [];
  const others = Object.entries(BIST_STOCKS).filter(([k, c]) => k !== hisse && !c.index);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: `${cfg.name} (${cfg.ticker}) finansal tablolar`,
        description: datasetDescription(
          `${cfg.name} bilançosunun gelir tablosu, bilanço ve nakit akışı kalemleri; dönem karşılaştırmalı.`,
        ),
        url,
        creator: { "@type": "Organization", name: "GelecekFinans", url: BASE },
        isAccessibleForFree: true,
        temporalCoverage: fin ? fin.asOf.slice(0, 4) : undefined,
        variableMeasured: ["Satış gelirleri", "Net kâr", "Özkaynaklar", "Toplam varlıklar", "Finansal borçlar"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
          { "@type": "ListItem", position: 3, name: cfg.name, item: `${BASE}/borsa/${hisse}` },
          { "@type": "ListItem", position: 4, name: "Bilanço", item: url },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span>{" "}
        <Link href={`/borsa/${hisse}`}>{cfg.name}</Link> <span>/</span> <span>Bilanço</span>
      </nav>

      <h1 className="page-header">
        {cfg.name} ({cfg.ticker}) Bilanço{fin ? ` — ${fin.periods[0].key} (${fin.periods[0].frame})` : ""}
      </h1>
      <p className="market-lede">
        {fin
          ? `${cfg.name} şirketinin ${fin.asOf} tarihli finansal tablosu; geçen yılın aynı dönemi ve yıl sonu tablolarıyla karşılaştırmalı. Tutarlar TL ve ara dönemler kümülatiftir. Kaynak: KAP finansal tabloları (İş Yatırım).`
          : `${cfg.name} (${cfg.ticker}) için finansal tablo verisi şu anda alınamadı.`}
      </p>

      {!fin || !s ? (
        <div className="market-na market-na-lg">
          Bilanço verisi şu anda alınamadı. Veri kaynağı geçici olarak yanıt vermiyor olabilir; birkaç saat içinde tekrar deneyin.
        </div>
      ) : (
        <>
          <div className="market-stats-block">
            <h2 className="market-h2">Özet</h2>
            <div className="market-stats">
              {fin.template === "bank" ? (
                <>
                  <span>Net faiz geliri (12 ay): <strong>{fmtMoney(s.revenueTtm)}</strong></span>
                  <span>Net kâr (12 ay): <strong>{fmtMoney(s.netIncomeTtm)}</strong></span>
                  <span>Özkaynaklar: <strong>{fmtMoney(s.equity)}</strong></span>
                  <span>Toplam aktif: <strong>{fmtMoney(s.totalAssets)}</strong></span>
                  <span>ROE (12 ay): <strong>{s.roe != null ? fmtPct(s.roe * 100) : "—"}</strong></span>
                  <span>Krediler/Mevduat: <strong>{s.loansToDeposits != null ? fmtPct(s.loansToDeposits * 100) : "—"}</strong></span>
                </>
              ) : (
                <>
                  <span>Hasılat (12 ay): <strong>{fmtMoney(s.revenueTtm)}</strong></span>
                  <span>Net kâr (12 ay): <strong>{fmtMoney(s.netIncomeTtm)}</strong></span>
                  <span>FAVÖK (12 ay): <strong>{fmtMoney(s.ebitdaTtm)}</strong></span>
                  <span>Net kâr marjı: <strong>{fmtPct(s.netMargin)}</strong></span>
                  <span>Özkaynaklar: <strong>{fmtMoney(s.equity)}</strong></span>
                  <span>Net finansal borç: <strong>{fmtMoney(s.netDebt)}</strong></span>
                  <span>Net borç/FAVÖK: <strong>{fmtMultiple(s.netDebtToEbitda)}</strong></span>
                  <span>ROE (12 ay): <strong>{s.roe != null ? fmtPct(s.roe * 100) : "—"}</strong></span>
                </>
              )}
            </div>
          </div>

          {sentences.length > 0 && (
            <section className="section">
              <h2 className="market-h2">Bu bilanço ne diyor?</h2>
              <ul className="market-prose">
                {sentences.map((sentence) => (
                  <li key={sentence}>{sentence}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="section">
            <h2 className="market-h2">Finansal tablo</h2>
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <caption className="sr-only">
                  {cfg.name} {cfg.ticker} finansal tablo kalemleri, dönem karşılaştırmalı
                </caption>
                <thead>
                  <tr>
                    <th>Kalem</th>
                    {fin.periods.map((per) => (
                      <th key={per.key} className="num">
                        {per.key}
                        <div className="market-muted" style={{ fontWeight: 400, fontSize: 11 }}>{per.frame}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fin.lines.map((line) => (
                    <tr key={line.code}>
                      <td>{line.label}</td>
                      {line.values.map((v, i) => (
                        <td key={`${line.code}-${i}`} className="num">{fmtMoney(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <AdSlot position="inArticle" />

          <p className="conv-note">
            Kaynak: {fin.source}. Ara dönem tabloları yıl başından itibaren kümülatiftir; TTM rakamları son dört
            çeyreğin toplamıdır. Banka tablolarında kalem adları farklıdır. Kesin ve resmî tutarlar için şirketin
            KAP&apos;taki finansal rapor bildirimi esastır. Bu sayfa yatırım tavsiyesi değildir.
          </p>
        </>
      )}

      <p className="market-hero-link">
        <Link href={`/borsa/${hisse}`}>{cfg.name} canlı fiyat ve grafik sayfasına dön →</Link>
      </p>

      <MarketFaq items={FAQ_CORE} />
      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">Diğer Bilançolar</h2>
        <div className="market-chips">
          <Link href="/borsa/bilanco-takvimi" className="market-chip">Tüm bilanço takvimi</Link>
          {others.map(([k, c]) => (
            <Link key={k} href={`/borsa/${k}/bilanco`} className="market-chip">{c.name} bilanço</Link>
          ))}
        </div>
      </section>

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/borsa" className="market-chip">BIST 100 ve Hisse Fiyatları</Link>
          <Link href="/borsa/temettu-takvimi" className="market-chip">Temettü Takvimi</Link>
          <Link href={`/borsa/${BIST_INDEX_SLUG}`} className="market-chip">BIST 100 Endeksi</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
