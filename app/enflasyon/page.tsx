import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { paylasimMeta } from "@/lib/og";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";
import { getCpiSnapshot, monthLabel, nextMonth, pct } from "@/lib/tufe";
import { MEMUR_DONEMLER, memurZam } from "@/lib/memur-zam";

/**
 * Enflasyon (TÜFE) veri sayfası — TÜİK açıklama günü (her ayın 3'ü) için hub.
 * Rakamlar yalnız EVDS endeksinden hesaplanır; tahmin YOK. Kira/emekli/memur
 * için ayrı ince sayfa açılmadı: türetilmiş oran burada özetlenir, hesap araca gider.
 */
export const revalidate = 3600;
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/enflasyon`;

export async function generateMetadata(): Promise<Metadata> {
  const snap = await getCpiSnapshot();
  const l = snap?.latest;
  const title = l
    ? `${l.label} Enflasyon Oranı: Yıllık ${pct(l.annual)}, Aylık ${pct(l.monthly)} (TÜFE)`
    : "Enflasyon Oranı (TÜFE) — Aylık ve Yıllık Enflasyon";
  const description = l
    ? `TÜİK ${l.label} TÜFE: aylık ${pct(l.monthly)}, yıllık ${pct(l.annual)}, 12 aylık ortalama ${pct(l.avg12)}. Kira artış oranı, emekli ve memur zammına etkisi, son 24 ay tablosu.`
    : "TÜİK tüketici fiyat endeksi: aylık, yıllık ve 12 aylık ortalama enflasyon; kira artış oranı ve emekli/memur zammına etkisi.";
  return { title, description, alternates: { canonical: URL }, ...paylasimMeta({ url: URL, title, description }) };
}

const FAQ: FaqItem[] = [
  {
    q: "Enflasyon rakamları ne zaman açıklanır?",
    a: "TÜİK, bir önceki ayın Tüketici Fiyat Endeksi'ni (TÜFE) genellikle her ayın 3'ünde saat 10:00'da açıklar. Kesin tarih TÜİK'in yıllık ulusal veri yayımlama takviminde yer alır. Bu sayfa açıklamadan sonra en geç bir saat içinde güncellenir.",
  },
  {
    q: "Aylık, yıllık ve 12 aylık ortalama enflasyon arasındaki fark nedir?",
    a: "Aylık enflasyon, endeksin bir önceki aya göre değişimidir. Yıllık enflasyon, aynı ayın bir önceki yıldaki değerine göre değişimdir. 12 aylık ortalama ise son 12 ayın endeks ortalamasının, ondan önceki 12 ayın ortalamasına göre değişimidir; kira artışında yasal tavan bu orandır.",
  },
  {
    q: "Kira artış oranı enflasyonla nasıl bağlantılı?",
    a: "Türk Borçlar Kanunu'nun 344. maddesine göre konut ve çatılı işyeri kiralarında yenileme dönemindeki artış, bir önceki kira yılındaki TÜFE 12 aylık ortalama değişimini geçemez. Uygulamada kira yenileme ayından bir önceki ayın 12 aylık ortalaması esas alınır.",
  },
  {
    q: "Emekli zammı hangi enflasyon verisine göre belirlenir?",
    a: "SSK ve Bağ-Kur emeklilerinin aylıkları ocak ve temmuz aylarında, önceki altı ayın birikmiş TÜFE değişimi kadar artırılır. Ocak zammı temmuz–aralık, temmuz zammı ocak–haziran dönemindeki enflasyona göre hesaplanır.",
  },
  {
    q: "Memur zammında enflasyon farkı nasıl hesaplanır?",
    a: "Memur ve memur emeklisi maaşları toplu sözleşmedeki dönem zammı kadar artar. Altı aylık enflasyon, önceki dönemin toplu sözleşme zammını aşarsa aradaki fark enflasyon farkı olarak eklenir: fark = (1 + 6 aylık TÜFE) / (1 + önceki dönem zammı) − 1.",
  },
  {
    q: "Bu sayfadaki oranlar resmî mi?",
    a: "Endeks değerleri TÜİK'in açıkladığı Tüketici Fiyat Endeksi'dir (Genel, 2003=100) ve TCMB Elektronik Veri Dağıtım Sistemi'nden (EVDS) çekilir. Aylık, yıllık ve ortalama oranlar bu endeksten hesaplanır; yuvarlama nedeniyle TÜİK bülteninden virgülden sonra en fazla bir basamak fark olabilir. Gelecek aylar için tahmin yapılmaz.",
  },
];

export default async function EnflasyonPage() {
  const snap = await getCpiSnapshot();
  const latest = snap?.latest;
  const half = snap?.half ?? null;
  const rows = snap ? snap.rows.slice(-24).reverse() : [];
  const decembers = snap ? snap.rows.filter((r) => r.ym.endsWith("-12") && r.annual !== null).reverse() : [];
  const kiraAy = latest ? monthLabel(nextMonth(latest.ym)) : null;
  const donem = half ? MEMUR_DONEMLER[half.raiseMonth] : undefined;
  const memur = half && donem ? memurZam(half.pct, donem.base, donem.prev) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Dataset",
        name: "Türkiye TÜFE aylık, yıllık ve 12 aylık ortalama enflasyon",
        description:
          "TÜİK Tüketici Fiyat Endeksi (Genel, 2003=100) üzerinden hesaplanan aylık, yıllık ve 12 aylık ortalama enflasyon oranları; TBK 344 kira artış tavanı ve emekli/memur zammı için altı aylık birikmiş enflasyon.",
        url: URL,
        creator: { "@type": "Organization", name: "GelecekFinans", url: BASE },
        isBasedOn: "https://data.tuik.gov.tr",
        license: "https://creativecommons.org/licenses/by/4.0/",
        spatialCoverage: "Türkiye",
        temporalCoverage: rows.length ? `${rows.at(-1)!.ym}/${rows[0].ym}` : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Enflasyon", item: URL },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Enflasyon</span>
      </nav>
      <h1 className="page-header">{latest ? `${latest.label} Enflasyon Oranı (TÜFE)` : "Enflasyon Oranı (TÜFE)"}</h1>

      {latest ? (
        <>
          <p className="market-lede">
            TÜİK verilerine göre {latest.label} ayında tüketici fiyatları aylık <strong>{pct(latest.monthly)}</strong>{" "}
            değişti. Yıllık enflasyon <strong>{pct(latest.annual)}</strong>, 12 aylık ortalama enflasyon{" "}
            <strong>{pct(latest.avg12)}</strong> oldu.
          </p>

          <section className="section">
            <h2 className="market-h2">{latest.label} enflasyonu neyi değiştiriyor?</h2>
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <thead>
                  <tr><th>Konu</th><th>Oran</th><th>Dayanak</th><th></th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{kiraAy} kira artış oranı (azami)</td>
                    <td><strong>{pct(latest.avg12)}</strong></td>
                    <td className="muted">{latest.label} TÜFE 12 aylık ortalama, TBK 344</td>
                    <td><Link href="/araclar/kira-artis-hesaplama">Kiranı hesapla →</Link></td>
                  </tr>
                  {half && (
                    <tr>
                      <td>{half.raiseMonth} SSK/Bağ-Kur emekli zammı{half.complete ? "" : " (şu ana kadar)"}</td>
                      <td><strong>{pct(half.pct)}</strong></td>
                      <td className="muted">{half.fromLabel}–{half.toLabel} birikmiş TÜFE ({half.months}/6 ay)</td>
                      <td><Link href="/araclar/emekli-zammi-hesaplama">Aylığını hesapla →</Link></td>
                    </tr>
                  )}
                  {half && donem && memur && (
                    <tr>
                      <td>{half.raiseMonth} memur zammı{half.complete ? "" : " (şu ana kadar)"}</td>
                      <td><strong>{pct(memur.toplam)}</strong></td>
                      <td className="muted">
                        Toplu sözleşme %{donem.base} + enflasyon farkı {pct(memur.fark)} (önceki dönem %{donem.prev})
                      </td>
                      <td><Link href="/araclar/memur-zammi-hesaplama">Maaşını hesapla →</Link></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {half && !half.complete && (
              <p className="market-muted">
                {half.raiseMonth} zammı altı aylık enflasyonla kesinleşir; tabloda yalnız açıklanmış {half.months} ayın
                birikmiş değeri var. Kalan aylar için tahmin yapılmaz, her TÜİK açıklamasında güncellenir.
              </p>
            )}
          </section>

          <AdSlot position="inArticle" />

          <section className="section">
            <h2 className="market-h2">Son 24 ay aylık ve yıllık enflasyon</h2>
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <caption className="sr-only">TÜFE aylık, yıllık ve 12 aylık ortalama değişim, son 24 ay</caption>
                <thead>
                  <tr><th>Ay</th><th>Aylık</th><th>Yıllık</th><th>12 aylık ort.</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.ym}>
                      <td>{r.label}</td>
                      <td>{pct(r.monthly)}</td>
                      <td><strong>{pct(r.annual)}</strong></td>
                      <td>{pct(r.avg12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {decembers.length > 0 && (
            <section className="section">
              <h2 className="market-h2">Yıl sonu enflasyonu (Aralık, yıllık)</h2>
              <div className="crypto-table-wrap">
                <table className="crypto-table">
                  <thead><tr><th>Yıl</th><th>Yıllık TÜFE</th><th>12 aylık ort.</th></tr></thead>
                  <tbody>
                    {decembers.map((r) => (
                      <tr key={r.ym}>
                        <td>{r.ym.slice(0, 4)}</td>
                        <td><strong>{pct(r.annual)}</strong></td>
                        <td>{pct(r.avg12)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="conv-note">
            Kaynak: TÜİK Tüketici Fiyat Endeksi (Genel, 2003=100), TCMB EVDS üzerinden; oranlar endeksten hesaplanır.
            Son veri: {latest.label}. Atıf: “GelecekFinans, TÜİK verisi” — ayrıntı için{" "}
            <Link href="/basin">basın ve metodoloji</Link>.
          </p>
        </>
      ) : (
        <p className="market-lede">
          TÜFE verisine şu an ulaşılamıyor. Güncel oranlar için TÜİK bültenine bakın; sayfa veri geldiğinde kendiliğinden
          güncellenir.
        </p>
      )}

      <section className="section">
        <h2 className="market-h2">Enflasyonla ilgili hesaplamalar</h2>
        <ul>
          <li><Link href="/araclar/enflasyon-hesaplama">Enflasyon hesaplama</Link> — paranın yıllar içindeki alım gücü</li>
          <li><Link href="/araclar/kira-artis-hesaplama">Kira artışı hesaplama</Link> — yenileme ayına göre yasal tavan</li>
          <li><Link href="/araclar/emekli-zammi-hesaplama">Emekli zammı hesaplama</Link> — SSK/Bağ-Kur yeni aylık</li>
          <li><Link href="/araclar/memur-zammi-hesaplama">Memur zammı hesaplama</Link> — toplu sözleşme + enflasyon farkı</li>
          <li><Link href="/araclar/brut-net-maas-hesaplama">Brüt net maaş hesaplama</Link></li>
          <li><Link href="/faiz">Faiz oranları</Link> — TCMB politika faizi ve reel faiz</li>
        </ul>
      </section>

      <MarketFaq items={FAQ} />
      <ToolsRail title="Hesaplama Araçları" />
    </div>
  );
}
