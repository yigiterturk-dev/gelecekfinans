import type { Metadata } from "next";
import Link from "next/link";
import { getAllDividends } from "@/lib/dividends";
import { tl } from "@/lib/market";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";

export const revalidate = 43200;
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/borsa/temettu-takvimi`;

export async function generateMetadata(): Promise<Metadata> {
  const year = new Date().getFullYear();
  const title = `Temettü Takvimi ${year} — BIST Hisselerinin Temettü Tarihleri ve Verimleri`;
  const description =
    "Borsa İstanbul'un büyük hisselerinin son üç yıldaki temettü (kâr payı) hak kullanım tarihleri, hisse başı tutarları ve son 12 aylık temettü verimi tek tabloda.";
  return {
    title,
    description,
    alternates: { canonical: URL },
    openGraph: { type: "website", url: URL, title, description, siteName: "GelecekFinans" },
    twitter: { card: "summary_large_image", title, description },
  };
}

const FAQ: FaqItem[] = [
  {
    q: "Temettü almak için hisseyi ne zaman elde tutmak gerekir?",
    a: "Kâr payı, hak kullanım (temettü kesim) tarihinden önceki işlem gününün kapanışında hisseyi elinde tutan yatırımcıya ödenir. Hak kullanım günü hisse, dağıtılan tutar kadar düşülmüş baz fiyattan açılır; bu yüzden yalnızca temettü için son gün alım yapmak tek başına kazanç sağlamaz.",
  },
  {
    q: "Tablodaki tutarlar neden şirketin açıkladığı rakamdan farklı olabilir?",
    a: "Tutarlar bedelsiz sermaye artırımı ve bölünmelere göre geriye dönük düzeltilmiştir; böylece bugünkü hisse fiyatıyla karşılaştırılabilir. Örneğin şirket sonradan %900 bedelsiz verdiyse eski temettü onda birine iner. Ödeme gününde hesabınıza geçen kesin brüt ve net tutar için şirketin KAP'taki kâr payı dağıtım bildirimine bakın.",
  },
  {
    q: "Temettü verimi nasıl hesaplanıyor?",
    a: "Son 365 günde hak kullanım tarihi gelen tüm dağıtımların hisse başı toplamı, hissenin güncel fiyatına bölünür. Geçmişe dönük bir göstergedir; şirketin gelecekte aynı tutarı dağıtacağı anlamına gelmez.",
  },
  {
    q: "Temettüden stopaj kesiliyor mu?",
    a: "Tam mükellef gerçek kişilere dağıtılan kâr paylarından kaynakta stopaj kesilir ve tablodaki tutarlar brüttür. Güncel oran ve beyan sınırı için Gelir İdaresi Başkanlığı duyurularına bakın; net tutarı hesaplamak için temettü hesaplama aracını kullanabilirsiniz.",
  },
];

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function TemettuTakvimi() {
  const rows = await getAllDividends();
  const byYield = [...rows].sort((a, b) => b.yieldPct - a.yieldPct);
  const events = rows
    .flatMap((r) => r.dividends.map((d) => ({ ...d, slug: r.slug, ticker: r.ticker, name: r.name })))
    .sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(events.map((e) => e.date.slice(0, 4)))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "BIST hisseleri temettü geçmişi",
        description: "Borsa İstanbul hisselerinin hak kullanım tarihli, bedelsiz/bölünme düzeltmeli hisse başı kâr payı tutarları.",
        url: URL,
        creator: { "@type": "Organization", name: "GelecekFinans", url: BASE },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
          { "@type": "ListItem", position: 3, name: "Temettü Takvimi", item: URL },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span> <span>Temettü Takvimi</span>
      </nav>
      <h1 className="page-header">Temettü Takvimi — BIST Hisselerinin Temettü Tarihleri</h1>
      <p className="market-lede">
        Borsa İstanbul&apos;un en çok işlem gören {rows.length} hissesinin son üç yıldaki kâr payı dağıtımları:
        hak kullanım tarihi, hisse başı brüt tutar ve son 12 aylık temettü verimi. Tablo yalnızca gerçekleşmiş
        dağıtımları gösterir; tahmin içermez.
      </p>

      {rows.length === 0 ? (
        <div className="market-na market-na-lg">Temettü verisi şu anda alınamadı. Lütfen daha sonra tekrar deneyin.</div>
      ) : (
        <>
          <section className="section">
            <h2 className="market-h2">Son 12 ayın temettü verimi</h2>
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <thead>
                  <tr><th>#</th><th>Hisse</th><th className="num">Fiyat (₺)</th><th className="num">12 ay temettü (₺)</th><th className="num">Verim</th><th>Son dağıtım</th></tr>
                </thead>
                <tbody>
                  {byYield.map((r, i) => (
                    <tr key={r.slug}>
                      <td className="muted">{i + 1}</td>
                      <td>
                        <Link href={`/borsa/${r.slug}`} className="crypto-link">
                          <span className="crypto-sym">{r.ticker}</span>
                          <span className="crypto-name">{r.name}</span>
                        </Link>
                      </td>
                      <td className="num">₺{tl(r.price, 2)}</td>
                      <td className="num">{r.trailing12 > 0 ? `₺${tl(r.trailing12, 2)}` : "—"}</td>
                      <td className="num"><strong>{r.yieldPct > 0 ? `%${tl(r.yieldPct, 2)}` : "—"}</strong></td>
                      <td>{r.dividends[0] ? fmtDate(r.dividends[0].date) : "Son 3 yılda yok"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <AdSlot position="inArticle" />

          {years.map((y) => (
            <section className="section" key={y}>
              <h2 className="market-h2">{y} temettü tarihleri</h2>
              <div className="crypto-table-wrap">
                <table className="crypto-table">
                  <thead>
                    <tr><th>Hak kullanım tarihi</th><th>Hisse</th><th className="num">Hisse başı brüt (₺)</th></tr>
                  </thead>
                  <tbody>
                    {events.filter((e) => e.date.startsWith(y)).map((e) => (
                      <tr key={`${e.ticker}-${e.date}`}>
                        <td>{fmtDate(e.date)}</td>
                        <td><Link href={`/borsa/${e.slug}`} className="crypto-link"><span className="crypto-sym">{e.ticker}</span><span className="crypto-name">{e.name}</span></Link></td>
                        <td className="num">₺{tl(e.amount, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </>
      )}

      <p className="conv-note">
        Kaynak: Yahoo Finance (Borsa İstanbul verisi). Tutarlar bedelsiz sermaye artırımı ve bölünmelere göre geriye
        dönük düzeltilmiştir ve brüttür; ödeme günündeki kesin tutar için şirketin KAP kâr payı dağıtım bildirimi esastır.
        Veri günde iki kez yenilenir. Bu sayfa yatırım tavsiyesi değildir.
      </p>

      <p className="market-hero-link">
        <Link href="/araclar/temettu-hesaplama">Temettü hesaplama aracıyla net kâr payını hesaplayın →</Link>
      </p>

      <MarketFaq items={FAQ} />

      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href="/borsa" className="market-chip">BIST 100 ve Hisse Fiyatları</Link>
          <Link href="/araclar/hisse-kar-zarar-hesaplama" className="market-chip">Hisse Kâr/Zarar</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
