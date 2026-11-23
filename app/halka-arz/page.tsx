import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { paylasimMeta } from "@/lib/og";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";
import IpoDemandCalculator from "@/components/calculators/IpoDemandCalculator";

/**
 * Halka arz rehberi — arama konsolunda "halka arz" niyeti için ayrı sayfa yoktu;
 * sorgu bir habere düşüyordu. Güncel halka arz listesi BİLEREK yazılmaz (bayatlar,
 * yanlış bilgi riski); süreç ve katılım anlatılır, güncel duyurular KAP'a bağlanır.
 */
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/halka-arz`;

export const metadata: Metadata = (() => {
  const title = "Halka Arz Nedir? Nasıl Katılınır, Süreç Nasıl İşler?";
  const description =
    "Halka arz nedir, bir şirket borsaya nasıl açılır? SPK onayı, izahname, talep toplama, dağıtım ve borsada işlem görme adımları; halka arza katılmak için gerekenler, kavramlar ve riskler.";
  return { title, description, alternates: { canonical: URL }, ...paylasimMeta({ url: URL, title, description }) };
})();

const FAQ: FaqItem[] = [
  {
    q: "Halka arz nedir, kısaca nasıl işler?",
    a: "Pay halka arzında yeni paylar sermaye artırımı yoluyla satılabilir, mevcut ortaklar paylarını satabilir veya iki yöntem birlikte kullanılabilir. Şirkete kaynak girişi sermaye artırımı kısmından doğar; ortak satışının bedeli payını satan ortağa gider. Dağılımı izahname ve fon kullanım raporundan kontrol edin.",
  },
  {
    q: "Halka arza katılmak için ne gerekiyor?",
    a: "Katılmak için bir aracı kurumda veya bankada yatırım hesabınızın olması ve halka arz süresince o kurum üzerinden talep girmeniz gerekir. Talep, ilgili halka arzın izahnamesinde belirtilen fiyat aralığı ve kurallara göre alınır. Bazı arzlarda ek olarak o kurumun müşterisi olma veya belirli bir hesap türü şartı aranabilir; bu şartlar her arzda duyurulur.",
  },
  {
    q: "İzahname nedir, neden okunmalı?",
    a: "İzahname, halka arz edilecek şirketin faaliyetleri, finansalları, riskleri, ortaklık yapısı ve arz koşullarını içeren resmî belgedir. Şirketin ne iş yaptığını, parayı ne için topladığını ve hangi riskleri taşıdığını buradan öğrenirsiniz. SPK'nın izahnameyi onaylaması, payı garanti ettiği veya yatırım tavsiyesi verdiği anlamına gelmez. Yalnızca kısa vadeli fiyat hareketine bakıp izahnameyi atlamayın.",
  },
  {
    q: "Halka arzda kazanç garanti mi?",
    a: "Hayır. Halka arz fiyatı, arz sonrası piyasada oluşan fiyatın altında da üstünde de kalabilir; ilk günlerde sert düşüşler görülebilir. Talep toplama sırasında her talebin karşılanacağı da garanti değildir; dağıtım yöntemine göre talebinizin bir kısmı karşılanabilir. Halka arz, risksiz kazanç kapısı değildir.",
  },
  {
    q: "Lot, talep toplama ve dağıtım ne anlama geliyor?",
    a: "Lot, bir paydan alınabilecek en küçük işlem birimidir. Talep toplama, yatırımcıların belirlenen süre içinde kaç lot almak istediğini bildirdiği aşamadır. Dağıtım ise toplanan talebin, arz edilen pay sayısına göre yatırımcılara paylaştırılmasıdır; talep arzdan fazlaysa dağıtım eşit veya oransal yapılabilir.",
  },
  {
    q: "Güncel halka arzları nereden takip edebilirim?",
    a: "Kesin bilgi kaynağı Kamuyu Aydınlatma Platformu (KAP) ve Sermaye Piyasası Kurulu (SPK) bültenleridir; izahname ve onay duyuruları burada yayımlanır. Aracı kurumlar da kendi müşterilerine arz takvimini duyurur. Bu sayfa güncel arz listesi tutmaz, çünkü liste sürekli değişir ve bayat bilgi yanıltıcı olur; güncel gelişmeler için borsa haberlerimizi takip edebilirsiniz.",
  },
];

export default function HalkaArzPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Halka Arz Nedir? Nasıl Katılınır?",
        description:
          "Halka arz süreci, katılım adımları, temel kavramlar ve riskler üzerine rehber.",
        url: URL,
        inLanguage: "tr-TR",
        isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
        publisher: { "@type": "Organization", name: "GelecekFinans", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: BASE },
          { "@type": "ListItem", position: 2, name: "Borsa", item: `${BASE}/borsa` },
          { "@type": "ListItem", position: 3, name: "Halka Arz", item: URL },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span>{" "}
        <span>Halka Arz</span>
      </nav>
      <h1 className="page-header">Halka Arz Nedir? Nasıl Katılınır?</h1>

      <p className="market-lede">
        Halka arz, bir şirketin paylarının ilk kez halka satışa çıkarılıp borsada işlem görmeye başlamasıdır.
        Bu rehber sürecin adımlarını, katılım için gerekenleri ve en sık gözden kaçan riskleri anlatır; güncel arz
        listesi tutmaz.
      </p>

      <section className="section">
        <h2 className="market-h2">Halka arz nedir?</h2>
        <p className="market-prose">
          Halka arzda bir şirketin payları yatırımcılara sunulur. Satış, şirketin sermaye artırarak yeni pay çıkarması,
          mevcut ortakların paylarını satması veya bu iki yöntemin birlikte uygulanmasıyla yapılabilir. Bu ayrım,
          satış gelirinin kime gideceğini belirler.
        </p>
        <p className="market-prose">
          Sermaye artırımı bölümünün satış geliri şirkete kaynak sağlar; mevcut ortak satışı bölümünün geliri ise
          payını satan ortağa gider. Karma arzda iki tutar ayrıdır. Halka arz sonrasında paylar Borsa İstanbul&apos;da
          işlem görebilir; yatırımcı getirisi garanti değildir.
        </p>
      </section>

      <section className="section">
        <h2 className="market-h2">Halka arz gelirini kim alır?</h2>
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <caption className="sr-only">Halka arz yöntemine göre satış gelirinin alıcısı</caption>
            <thead>
              <tr><th>Yöntem</th><th>Ne satılır?</th><th>Satış bedelini kim alır?</th></tr>
            </thead>
            <tbody>
              <tr><td>Sermaye artırımı</td><td>Şirketin çıkardığı yeni paylar</td><td>Şirket; izahnamede açıklanan kullanım alanlarına göre</td></tr>
              <tr><td>Ortak satışı</td><td>Mevcut ortağın sahip olduğu paylar</td><td>Payını satan ortak; bu bölüm şirkete yeni kaynak sağlamaz</td></tr>
              <tr><td>Karma yöntem</td><td>Yeni paylar ve mevcut paylar</td><td>Her bölümün bedeli ilgili satıcıya gider</td></tr>
            </tbody>
          </table>
        </div>
        <p className="market-muted">
          Halka arzın hangi yöntemle yapıldığını, ortak satışını ve sermaye artırımını izahnamede ayrı ayrı kontrol edin.
          Sermaye artırımından gelecek fonun planlanan kullanımını ayrıca fon kullanım raporunda inceleyin.
        </p>
      </section>

      <section className="section">
        <h2 className="market-h2">Halka arz süreci adım adım</h2>
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <caption className="sr-only">Halka arz sürecinin temel aşamaları</caption>
            <thead>
              <tr><th>Aşama</th><th>Ne olur?</th></tr>
            </thead>
            <tbody>
              <tr><td>Hazırlık ve başvuru</td><td>Şirket, halka arz için aracı kurumla anlaşır ve izahname taslağını hazırlar.</td></tr>
              <tr><td>SPK onayı</td><td>Sermaye Piyasası Kurulu izahnameyi inceler; onaylanan arz SPK bülteninde duyurulur.</td></tr>
              <tr><td>Talep toplama</td><td>Belirlenen günlerde yatırımcılar aracı kurum üzerinden kaç lot almak istediklerini bildirir.</td></tr>
              <tr><td>Dağıtım</td><td>Toplanan talep, arz edilen pay sayısına göre yatırımcılara paylaştırılır.</td></tr>
              <tr><td>Borsada işlem</td><td>Paylar Borsa İstanbul&apos;da işlem görmeye başlar; fiyat artık piyasada oluşur.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="market-muted">
          Takvim ve kurallar her arzda izahname ve duyurularla belirlenir; bu sayfa süreci genel hatlarıyla anlatır.
        </p>
      </section>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Halka arza nasıl katılınır?</h2>
        <ol className="market-prose">
          <li>
            <strong>Yatırım hesabı açın.</strong> Bir aracı kurum veya bankada pay senedi işlemine uygun yatırım
            hesabınız olmalıdır. Hesap açılışında kimlik ve vergi bilgileri ile sözleşmeler gerekir.
          </li>
          <li>
            <strong>İzahnameyi okuyun.</strong> Şirketin faaliyet alanını, finansallarını, arz gerekçesini ve risk
            bölümünü inceleyin. Kısa vadeli fiyat beklentisi yerine şirketin ne olduğuna bakın.
          </li>
          <li>
            <strong>Talep girin.</strong> Talep toplama süresince ilgili kurumun kanalından (mobil uygulama, internet
            şubesi veya şube) kaç lot istediğinizi bildirin. Talep, izahnamedeki fiyat aralığına göre alınır.
          </li>
          <li>
            <strong>Dağıtımı bekleyin.</strong> Dağıtım sonucu hesabınıza yansır; talebinizin tamamı karşılanmayabilir.
            Karşılanmayan tutar hesabınıza iade edilir.
          </li>
          <li>
            <strong>İşlem gününü takip edin.</strong> Paylar borsada işlem görmeye başladığında fiyat serbestçe
            oluşur; halka arz fiyatı ile borsa fiyatı aynı olmak zorunda değildir.
          </li>
        </ol>
      </section>

      <section className="section">
        <h2 className="market-h2">Sık kullanılan kavramlar</h2>
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <thead>
              <tr><th>Kavram</th><th>Anlamı</th></tr>
            </thead>
            <tbody>
              <tr><td>Lot</td><td>Bir paydan alınabilecek en küçük işlem birimi.</td></tr>
              <tr><td>İzahname</td><td>Şirketin faaliyet, finansal ve risk bilgilerini içeren resmî arz belgesi.</td></tr>
              <tr><td>Talep toplama</td><td>Yatırımcıların kaç lot istediğini bildirdiği süre.</td></tr>
              <tr><td>Dağıtım yöntemi</td><td>Talebin arz edilen paylara göre nasıl paylaştırılacağını belirleyen kural.</td></tr>
              <tr><td>Konsorsiyum</td><td>Arzı birlikte yürüten aracı kurumlar grubu.</td></tr>
              <tr><td>Lock-up</td><td>Belirli ortakların paylarını bir süre satamamasına dair taahhüt.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 className="market-h2">Halka arz talep tutarını hesaplayın</h2>
        <p className="market-prose">
          İzahnamede veya aracı kurum ekranında belirtilen pay fiyatı ve talep etmek istediğiniz lot sayısıyla brüt
          tutarı görün. Bu hesap, dağıtılacak lot sayısını tahmin etmez.
        </p>
        <IpoDemandCalculator />
      </section>

      <section className="section">
        <h2 className="market-h2">Riskler ve dikkat edilmesi gerekenler</h2>
        <ul className="market-prose">
          <li>
            <strong>Fiyat düşebilir.</strong> Halka arz sonrası pay fiyatı ilk günlerde sert hareket edebilir; arz
            fiyatının altına inmesi mümkündür.
          </li>
          <li>
            <strong>SPK onayı garanti veya tavsiye değildir.</strong> İzahname onayı, payın güvence altında olduğu
            ya da Kurulun yatırım tavsiyesi verdiği anlamına gelmez. Şirketi ve riskleri izahnamenin tamamında inceleyin.
          </li>
          <li>
            <strong>Talep garantisi yoktur.</strong> Dağıtımda talebinizin yalnızca bir kısmı karşılanabilir.
          </li>
          <li>
            <strong>Likidite riski.</strong> İşlem hacmi düşük paylarda istediğiniz anda istediğiniz fiyattan
            satamayabilirsiniz.
          </li>
          <li>
            <strong>Bilgi kirliliği.</strong> Sosyal medyadaki &quot;kesin tavan&quot; iddiaları kaynak değildir;
            izahname ve resmî duyuruları esas alın.
          </li>
        </ul>
        <p className="market-muted">
          Bu sayfa eğitim amaçlıdır ve yatırım tavsiyesi değildir. Kararlarınızı kendi araştırmanıza ve resmî
          kaynaklara dayandırın.
        </p>
      </section>

      <section className="section market-links">
        <h2 className="market-h2">Resmî kaynaklar</h2>
        <ul className="market-prose">
          <li><a href="https://spk.gov.tr/data/61e34f9a1b41c61270320792/Halka%20Arz.pdf" target="_blank" rel="noopener noreferrer">SPK: Halka arz yöntemleri ve ortak satışı/sermaye artırımı farkı</a></li>
          <li><a href="https://spk.gov.tr/hakkimizda/gorev-yetki-ve-sorumluluklar/izahname-ve-ihrac-bilgisi-onayi" target="_blank" rel="noreferrer">SPK: İzahname ve ihraç bilgisi onayı</a></li>
          <li><a href="https://spk.gov.tr/yatirimcilar/usulsuz-halka-arzlar" target="_blank" rel="noreferrer">SPK: Usulsüz halka arzlar konusunda uyarılar</a></li>
          <li><a href="https://www.kap.org.tr/tr/" target="_blank" rel="noreferrer">KAP: Kamuyu Aydınlatma Platformu</a></li>
        </ul>
      </section>

      <MarketFaq items={FAQ} />

      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili sayfalar</h2>
        <div className="market-chips">
          <Link href="/borsa" className="market-chip">Borsa ve Hisse Fiyatları</Link>
          <Link href="/borsa/temettu-takvimi" className="market-chip">Temettü Takvimi</Link>
          <Link href="/borsa/tatil-gunleri" className="market-chip">Borsa Tatil Günleri</Link>
          <Link href="/araci-kurumlar" className="market-chip">Aracı Kurum Nedir?</Link>
          <Link href="/araclar/hisse-kar-zarar-hesaplama" className="market-chip">Hisse Kâr/Zarar Hesaplama</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
