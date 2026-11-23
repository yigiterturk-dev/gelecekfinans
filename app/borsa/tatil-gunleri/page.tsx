import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { paylasimMeta } from "@/lib/og";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";
import {
  BIST_TATIL,
  HAFTA_SONU_TATIL,
  gunDurumu,
  istanbulDate,
  siradakiTatil,
  sonrakiIslemGunu,
  trTarih,
} from "@/lib/bist-tatil";

// "Bugün borsa açık mı" kutusu güne bağlı: saatlik yenilenir.
export const revalidate = 3600;
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/borsa/tatil-gunleri`;
const RESMI = "https://www.borsaistanbul.com/resmi-tatil-gunleri";
const SAATLER = "/borsa-istanbul-islem-saatleri-kacta-acilir-kacta-kapanir";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Borsa İstanbul Tatil Günleri 2026-2027 — Borsa Ne Zaman Kapalı?";
  const description =
    "Borsa İstanbul'un 2026 resmî tatil tablosu ve 2027 beklenen tatil günleri: bayram ve arife yarım günleri, takasın kaydığı tarihler ve bugün borsanın açık olup olmadığı.";
  return {
    title,
    description,
    alternates: { canonical: URL },
    ...paylasimMeta({ url: URL, title, description }),
  };
}

const FAQ: FaqItem[] = [
  {
    q: "Arife günü borsa açık mı?",
    a: "Ramazan Bayramı, Kurban Bayramı ve Cumhuriyet Bayramı arifelerinde Borsa İstanbul pay piyasasında yarım gün seans yapılır; öğleden sonra işlem olmaz. Borsa İstanbul'un 2026 tablosuna göre arife günlerinde takas da yapılmaz, o günlerin işlemlerinin takası bayram sonrasına kayar.",
  },
  {
    q: "Bayramda borsa açık mı?",
    a: "Hayır. Ramazan ve Kurban Bayramı'nın hafta içine denk gelen günlerinde pay piyasasında seans yapılmaz. Bayram hafta sonuna taşarsa o günler zaten işlem günü değildir; seans bayramdan sonraki ilk iş gününde açılır.",
  },
  {
    q: "Tatil günlerinde hisse takası ne zaman hesaba geçer?",
    a: "Pay piyasasında takas normalde işlem gününden iki iş günü sonra (T+2) yapılır. Araya tatil girdiğinde takas, tatil günleri sayılmadan bir sonraki iş gününe kayar. Hangi işlemin takasının hangi gün yapılacağı Borsa İstanbul'un yıllık tatil tablosunda tek tek yazılıdır; 2026 için bu sayfadaki tabloda yer alır.",
  },
  {
    q: "Borsa tatil günlerini ve seans takvimini hangi kurumdan öğrenebilirim?",
    a: "Resmî kaynak Borsa İstanbul'dur. Kurum her yılın tatil tablosunu bir önceki yılın sonunda duyurur, Kamuyu Aydınlatma Platformu'nda (KAP) yayımlar ve internet sitesindeki Resmi Tatil Günleri sayfasında yıl bazında saklar. Yıl içinde bir değişiklik olursa ayrıca duyuru yapılır.",
  },
  {
    q: "2027 borsa tatil tablosu ne zaman açıklanır?",
    a: "Borsa İstanbul 2026 tablosunu 4 Aralık 2025'te duyurdu; 2027 tablosunun da benzer şekilde 2026 yılı sonunda açıklanması beklenir. Bu sayfadaki 2027 listesi, resmî tatil kanunu ve Diyanet'in 2027 takvimine göre hazırlanmış bir öngörüdür; Borsa İstanbul tablosu yayımlandığında onunla güncellenir.",
  },
  {
    q: "Hafta sonu borsa açık mı?",
    a: "Hayır. Borsa İstanbul pay piyasasında cumartesi ve pazar günleri seans yapılmaz. Hafta sonuna denk gelen resmî tatiller (örneğin 2026'da 30 Ağustos Zafer Bayramı) bu nedenle işlem takvimini etkilemez.",
  },
];

function Durum() {
  const bugun = istanbulDate();
  const d = gunDurumu(bugun);
  const sonraki = sonrakiIslemGunu(bugun);
  const siradaki = siradakiTatil(bugun);
  let baslik: string;
  let aciklama: string;
  if (d.tur === "acik") {
    baslik = "Bugün borsa açık";
    aciklama = "Bugün Borsa İstanbul pay piyasasında normal seans var.";
  } else if (d.tur === "yarim") {
    baslik = "Bugün borsa yarım gün açık";
    aciklama = `${d.gun.name} nedeniyle yarım gün seans yapılıyor; öğleden sonra işlem yok.`;
  } else if (d.tur === "kapali") {
    baslik = "Bugün borsa kapalı";
    aciklama = `${d.gun.name} nedeniyle seans yapılmıyor. Borsa ${trTarih(sonraki)} günü açılacak.`;
  } else {
    baslik = "Bugün borsa kapalı (hafta sonu)";
    aciklama = `Hafta sonu seans yapılmaz. Borsa ${trTarih(sonraki)} günü açılacak.`;
  }
  return (
    <section className="section">
      <h2 className="market-h2">Bugün borsa açık mı?</h2>
      <div className="market-stats-block">
        <p><strong>{baslik}</strong> — {trTarih(bugun)}</p>
        <p>{aciklama}</p>
        {siradaki && (
          <p>
            Sıradaki tatil: <strong>{trTarih(siradaki.date)}</strong>, {siradaki.name}
            {siradaki.tur === "yarim" ? " (yarım gün seans)" : " (seans yok)"}
            {siradaki.resmi ? "" : " — beklenen"}.
          </p>
        )}
      </div>
    </section>
  );
}

function Tablo({ yil }: { yil: string }) {
  const rows = BIST_TATIL.filter((t) => t.date.startsWith(yil));
  const resmi = rows.every((r) => r.resmi);
  const hs = HAFTA_SONU_TATIL.filter((h) => h.date.startsWith(yil));
  return (
    <section className="section">
      <h2 className="market-h2">
        {yil} borsa tatil günleri{resmi ? "" : " (beklenen)"}
      </h2>
      {!resmi && (
        <p className="market-muted">
          Borsa İstanbul {yil} tablosunu henüz yayımlamadı. Liste, 2429 sayılı Ulusal Bayram ve Genel Tatiller
          Kanunu ile Diyanet İşleri Başkanlığı&apos;nın {yil} takvimine göre hazırlanmıştır ve resmî tablo
          açıklandığında güncellenecektir.
        </p>
      )}
      <div className="crypto-table-wrap">
        <table className="crypto-table">
          <caption className="sr-only">Borsa İstanbul pay piyasası {yil} tatil günleri</caption>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tatil</th>
              <th>Seans</th>
              {resmi && <th>Takas</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.date}>
                <td>{trTarih(t.date)}</td>
                <td>{t.name}</td>
                <td><strong>{t.tur === "yarim" ? "Yarım gün" : "Kapalı"}</strong></td>
                {resmi && <td className="muted">{t.takas ?? "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hs.length > 0 && (
        <p className="market-muted">
          Hafta sonuna denk geldiği için seans takvimini etkilemeyen tatiller:{" "}
          {hs.map((h) => `${trTarih(h.date, false)} (${h.name})`).join(", ")}.
        </p>
      )}
    </section>
  );
}

export default function TatilGunleri() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
      { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
      { "@type": "ListItem", position: 3, name: "Tatil Günleri", item: URL },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span> <span>Tatil Günleri</span>
      </nav>
      <h1 className="page-header">Borsa İstanbul Tatil Günleri 2026-2027</h1>
      <p className="market-lede">
        Borsa İstanbul pay piyasasının kapalı olduğu ve yarım gün seans yapılan günler. 2026 listesi Borsa
        İstanbul&apos;un resmî tatil tablosundan alınmıştır ve her tatilde takasın hangi güne kaydığını da gösterir.
        Seansın kaçta açılıp kapandığı için <Link href={SAATLER}>Borsa İstanbul işlem saatleri</Link> rehberine bakın.
      </p>

      <Durum />

      <Tablo yil="2026" />

      <AdSlot position="inArticle" />

      <Tablo yil="2027" />

      <p className="conv-note">
        Kaynak: Borsa İstanbul, 04.12.2025 tarihli 41625 sayılı duyuru ve ekindeki &quot;Pay Piyasası 2026 Yılı
        Tatil Tablosu&quot; (<a href={RESMI} rel="nofollow noopener" target="_blank">borsaistanbul.com/resmi-tatil-gunleri</a>).
        Borçlanma araçları ve kıymetli madenler piyasalarının takvimi farklı olabilir. Yıl içindeki değişiklikler için
        Borsa İstanbul ve KAP duyuruları esastır.
      </p>

      <MarketFaq items={FAQ} />

      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili Sayfalar</h2>
        <div className="market-chips">
          <Link href={SAATLER} className="market-chip">Borsa İşlem Saatleri</Link>
          <Link href="/borsa" className="market-chip">BIST 100 ve Hisse Fiyatları</Link>
          <Link href="/borsa/temettu-takvimi" className="market-chip">Temettü Takvimi</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
