import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { paylasimMeta } from "@/lib/og";
import MarketFaq from "@/components/MarketFaq";
import ToolsRail from "@/components/ToolsRail";
import AdSlot from "@/components/AdSlot";
import type { FaqItem } from "@/lib/market-faq";

/**
 * Aracı kurum rehberi — "aracı kurumlar / en iyi aracı kurum" niyeti için ayrı
 * sayfa yoktu. BİLEREK sıralama/öneri yapılmaz: komisyon ve koşullar sürekli
 * değişir, üstelik "en iyi" kişinin ihtiyacına göre değişir. Sayfa seçim
 * kriterlerini ve hesap açma adımlarını anlatır.
 */
const BASE = "https://gelecekfinans.com";
const URL = `${BASE}/araci-kurumlar`;

export const metadata: Metadata = (() => {
  const title = "Aracı Kurum Nedir, Nasıl Seçilir? Nelere Dikkat Edilmeli";
  const description =
    "Aracı kurum nedir, SPK yetkisi neden önemli? Komisyon ve maliyet, işlem platformu, ürün çeşitliliği, müşteri hizmetleri ve güvenlik açısından aracı kurum seçme kriterleri, hesap açma adımları.";
  return { title, description, alternates: { canonical: URL }, ...paylasimMeta({ url: URL, title, description }) };
})();

const FAQ: FaqItem[] = [
  {
    q: "Aracı kurum nedir, ne işe yarar?",
    a: "Aracı kurum, yatırımcının borsadaki alım satım emirlerini kendi adına iletmesini sağlayan, Sermaye Piyasası Kurulu tarafından yetkilendirilmiş finansal kuruluştur. Pay senedi, tahvil, fon ve türev ürün gibi işlemler için yatırım hesabı bu kurumlarda açılır. Bankalar da aracı kurum yetkisiyle benzer hizmet verebilir.",
  },
  {
    q: "Aracı kurumun SPK yetkisi neden önemli?",
    a: "Kurumun ve sunacağı yatırım hizmetinin SPK'nın güncel yetki listesinde bulunduğunu doğrulayın. Kaydi paylar MKK kayıtlarında hak sahibi bazında izlenir; e-YATIRIMCI üzerinden hesaplarınızı görebilirsiniz. Yatırımcı Tazmin Merkezi getiri veya piyasa zararı garantisi vermez; tazmin ancak kanuni koşullar ve SPK kararıyla gündeme gelir.",
  },
  {
    q: "En iyi aracı kurum hangisi?",
    a: "Tek bir 'en iyi' aracı kurum yoktur; seçim yatırımcının ihtiyacına göre değişir. Sık işlem yapan biri düşük komisyona, uzun vadeli yatırımcı ise sağlam araştırma ve kolay arayüze öncelik verebilir. Bu sayfa bilinçli olarak sıralama veya öneri yapmaz; komisyon ve kampanyalar sürekli değiştiği için güncel koşulları kurumların kendi sitelerinden doğrulamak gerekir.",
  },
  {
    q: "Aracı kurum seçerken hangi maliyetlere bakmalı?",
    a: "İşlem komisyonu tek kalem değildir; alım satımda alınan komisyonun yanında borsa payı ve mevzuat gereği alınan vergiler de hesaba katılır. Ayrıca hesap işletim ücreti, para çekme/yatırma masrafı ve bazı ürünlerde ek ücretler olabilir. Karşılaştırma yaparken yalnızca 'yüzde kaç komisyon' reklamına değil, toplam maliyete bakın.",
  },
  {
    q: "Aracı kurumda hesap açmak için ne gerekiyor?",
    a: "Kimlik belgesi, vergi kimlik numarası ve iletişim bilgileriyle başvuru yapılır; sözleşmeler imzalanır. Çoğu kurum başvuruyu mobil uygulama veya internet üzerinden uzaktan tamamlamaya izin verir; bazı durumlarda görüntülü görüşme veya ek doğrulama istenebilir. Hesap onaylandıktan sonra para transferiyle işleme başlanır.",
  },
  {
    q: "Aynı anda birden fazla aracı kurumda hesap açılabilir mi?",
    a: "Evet, birden fazla aracı kurumda yatırım hesabı açılabilir. Yatırımcılar kimi zaman komisyonu düşük kurumda işlem yapıp başka bir kurumun araştırma veya halka arz hizmetinden yararlanır. Ancak her kurumda ayrı sözleşme ve ayrı varlık takibi olduğunu, portföyü tek ekranda görmek için ek çaba gerektiğini unutmamak gerekir.",
  },
];

export default function AraciKurumlarPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Aracı Kurum Nedir, Nasıl Seçilir?",
        description:
          "Aracı kurumun işlevi, SPK yetkisi, seçim kriterleri ve hesap açma adımları.",
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
          { "@type": "ListItem", position: 3, name: "Aracı Kurumlar", item: URL },
        ],
      },
    ],
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <Link href="/borsa">Borsa</Link> <span>/</span>{" "}
        <span>Aracı Kurumlar</span>
      </nav>
      <h1 className="page-header">Aracı Kurum Nedir, Nasıl Seçilir?</h1>

      <p className="market-lede">
        Borsada işlem yapmak için bir aracı kurum üzerinden yatırım hesabı açmanız gerekir. Bu rehber aracı kurumun
        ne yaptığını, seçerken hangi kriterlere bakılacağını ve hesap açma adımlarını anlatır; sıralama veya öneri
        yapmaz.
      </p>

      <section className="section">
        <h2 className="market-h2">Aracı kurum nedir?</h2>
        <p className="market-prose">
          Aracı kurum, yatırımcının borsaya ilettiği alım satım emirlerini yerine getiren, Sermaye Piyasası Kurulu
          tarafından yetkilendirilmiş finansal kuruluştur. Pay senedi ve tahvil gibi işlemlerin yanında fon, varant
          ve türev ürünlerde de aracılık edebilir. Yatırımcı adına hesap açar, emirleri borsaya iletir ve takas
          süreçlerini yürütür.
        </p>
        <p className="market-prose">
          Bankalar da aracı kurum yetkisiyle benzer hizmet verebilir. Aradaki fark çoğunlukla platform, ürün
          çeşitliliği, araştırma hizmeti ve maliyet yapısındadır; işlev aynıdır.
        </p>
      </section>

      <section className="section">
        <h2 className="market-h2">Yetki ve güvence: nelere bakmalı?</h2>
        <ul className="market-prose">
          <li>
            <strong>SPK yetkisi.</strong> Kurumun Sermaye Piyasası Kurulu tarafından yetkilendirilmiş olması ilk
            kontroldür. Kurumun yetkisini ve izin verilen faaliyetlerini SPK'nın güncel listesinden doğrulayın.
          </li>
          <li>
            <strong>Kaydi varlıkların takibi.</strong> Paylar gibi kaydi sermaye piyasası araçları MKK kayıtlarında
            hak sahibi bazında izlenir. e-YATIRIMCI üzerinden MKK sistemlerinde adınıza görünen hesap ve işlemleri
            kontrol edebilirsiniz; bu, piyasa değer kaybına karşı garanti anlamına gelmez.
          </li>
          <li>
            <strong>YTM kapsamı.</strong> Yatırımcı Tazmin Merkezi getiri veya yatırım zararı garantisi değildir.
            SPK'nın tazmin kararı, yatırım kuruluşunun sermaye piyasası faaliyetinden doğan nakit ödeme ya da araç
            teslim yükümlülüklerini yerine getirememesi gibi kanuni koşullara bağlıdır; kapsamı resmî mevzuattan
            doğrulayın.
          </li>
        </ul>
      </section>

      <AdSlot position="inArticle" />

      <section className="section">
        <h2 className="market-h2">Aracı kurum seçme kriterleri</h2>
        <div className="crypto-table-wrap">
          <table className="crypto-table">
            <caption className="sr-only">Aracı kurum seçerken değerlendirilecek temel kriterler</caption>
            <thead>
              <tr><th>Kriter</th><th>Neye bakılır?</th></tr>
            </thead>
            <tbody>
              <tr><td>Toplam maliyet</td><td>İşlem komisyonu, borsa payı, vergiler ve hesap/transfer ücretlerinin toplamı.</td></tr>
              <tr><td>İşlem platformu</td><td>Mobil ve web arayüzünün hızı, emir türleri, grafik araçları, stabilite.</td></tr>
              <tr><td>Ürün çeşitliliği</td><td>Pay, fon, tahvil, türev ve halka arz hizmetlerine erişim.</td></tr>
              <tr><td>Araştırma ve veri</td><td>Şirket raporları, temettü ve bilanço verisi, piyasa özetleri.</td></tr>
              <tr><td>Müşteri hizmetleri</td><td>Ulaşılabilirlik, yanıt süresi ve sorun çözme kalitesi.</td></tr>
              <tr><td>Güvenlik</td><td>İki adımlı doğrulama, işlem bildirimleri ve para çekme güvenlik kuralları.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="market-muted">
          &quot;En iyi aracı kurum&quot; diye tek bir cevap yoktur; ihtiyaca göre ağırlık değişir. Bu sayfa sıralama
          yapmaz ve öneri sunmaz.
        </p>
      </section>

      <section className="section">
        <h2 className="market-h2">Hesap açma adımları</h2>
        <ol className="market-prose">
          <li><strong>Kurumu seçin.</strong> Yukarıdaki kriterleri kendi işlem sıklığınıza göre tartın.</li>
          <li><strong>Başvuru yapın.</strong> Kimlik, vergi ve iletişim bilgileriyle mobil veya internet üzerinden başvurun.</li>
          <li><strong>Sözleşmeleri onaylayın.</strong> Yatırım hesabı, işlem ve risk bildirim sözleşmelerini okuyup imzalayın.</li>
          <li><strong>Hesabı doğrulayın.</strong> Gerekiyorsa görüntülü görüşme veya ek doğrulama tamamlayın.</li>
          <li><strong>Para yatırın.</strong> Onaylanan hesaba transferle bakiye aktarıp işleme başlayın.</li>
        </ol>
      </section>

      <MarketFaq items={FAQ} />

      <section className="section market-links">
        <h2 className="market-h2">Resmî kaynaklar</h2>
        <ul className="market-prose">
          <li><a href="https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar" target="_blank" rel="noopener noreferrer">SPK: Aracı kurumlar ve faaliyet izinleri</a></li>
          <li><a href="https://www.mkk.com.tr/yatirimci-hizmetleri/e-yatirimci" target="_blank" rel="noopener noreferrer">MKK: e-YATIRIMCI hesap ve işlem takibi</a></li>
          <li><a href="https://www.ytm.gov.tr/home/sayfa/17" target="_blank" rel="noopener noreferrer">YTM: Koruma kapsamı ve tazmin koşulları</a></li>
        </ul>
      </section>

      <ToolsRail />

      <section className="section market-links">
        <h2 className="market-h2">İlgili sayfalar</h2>
        <div className="market-chips">
          <Link href="/borsa" className="market-chip">Borsa ve Hisse Fiyatları</Link>
          <Link href="/halka-arz" className="market-chip">Halka Arz Nedir?</Link>
          <Link href="/borsa/temettu-takvimi" className="market-chip">Temettü Takvimi</Link>
          <Link href="/araclar/hisse-kar-zarar-hesaplama" className="market-chip">Hisse Kâr/Zarar Hesaplama</Link>
          <Link href="/araclar/temettu-hesaplama" className="market-chip">Temettü Hesaplama</Link>
          <Link href="/kategori/borsa" className="market-chip">Borsa Haberleri</Link>
        </div>
      </section>
    </div>
  );
}
