import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import { BASE } from "@/lib/embed-tools";

export const revalidate = 86400;

const title = "Basın ve Kaynak — Metodoloji, Veri Kaynakları, Atıf";
const description =
  "GelecekFinans hesaplayıcılarının formülleri, veri kaynakları, atıf biçimi ve editöryel iletişim bilgileri. Gazeteciler ve içerik üreticileri için kaynak sayfası.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/basin` },
  openGraph: { type: "website", url: `${BASE}/basin`, title, description, siteName: "GelecekFinans" },
  twitter: { card: "summary_large_image", title, description },
};

const METHOD = [
  ["Kira artışı", "p girilen yüzde oranı: yeni kira = mevcut kira × (1 + p/100). p, TÜİK'in 12 aylık ortalamalar serisinden alınır.", "TBK m. 344 · TÜİK TÜFE"],
  ["Emekli zammı", "z girilen yüzde zam: yeni aylık = mevcut aylık × (1 + z/100); yıllıklandırılmış fark = aylık fark × 12. Bu, zam ayından yıl sonuna kadar fiilen alınacak toplam değildir.", "TÜİK · SGK/ÇSGB duyuruları"],
  ["Kredi taksiti", "Taksit = A × i / (1 − (1 + i)^−n); A anapara, i girilen aylık faiz yüzdesinin 100'e bölünmüş hali, n ay sayısıdır. Anüite yöntemi; KKDF, BSMV ve dosya masrafları dahil değildir.", "Kullanıcının girdiği anapara, aylık faiz ve vade"],
  ["Mevduat getirisi", "p yıllık faiz, t stopaj (ikisi de girilen yüzde): brüt = anapara × (p/100) × gün / 365; net = brüt × (1 − t/100).", "Kullanıcının girdiği faiz ve stopaj oranları"],
  ["Bileşik faiz", "P başlangıç tutarı, M ay sonu katkısı, r yıllık nominal oran (girilen yüzdenin 100'e bölünmüş hali), n girilen sürenin en yakın aya yuvarlanmış ay sayısı: A = P(1 + r/12)^n + M[((1 + r/12)^n − 1)/(r/12)] (r ≠ 0). r = 0 ise A = P + Mn.", "Kullanıcının girdiği yıllık nominal oran"],
  ["Hisse kâr/zarar", "Net K/Z = brüt satış tutarı − brüt alış tutarı − alış ve satış komisyonları − bu komisyonların BSMV'si. Komisyon oranı binde (‰), BSMV oranı yüzde (%) girilir.", "Kullanıcının girdiği fiyat, adet, komisyon ve BSMV oranları"],
  ["Temettü", "t girilen stopaj yüzdesi: net = yıllık brüt temettü × (1 − t/100); brüt verim (%) = hisse başı yıllık brüt temettü ÷ hisse fiyatı × 100.", "Kullanıcının girdiği tutar ve stopaj oranı"],
  ["Enflasyon", "p girilen dönem kümülatif enflasyon yüzdesi: ileri = geçmiş tutar × (1 + p/100); ters = bugünkü tutar ÷ (1 + p/100).", "Kullanıcının girdiği dönem enflasyonu (TÜİK verisiyle doğrulayın)"],
];

export default function BasinPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${BASE}/basin`,
    inLanguage: "tr-TR",
    isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
    publisher: { "@type": "NewsMediaOrganization", name: "GelecekFinans", url: BASE },
  };

  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Basın ve Kaynak</span>
      </nav>

      <h1 className="page-header">Basın ve kaynak</h1>
      <p className="market-lede">
        GelecekFinans, ekonomi ve piyasa verilerini hesaplanabilir hâle getiren bağımsız bir Türkçe
        finans yayınıdır. Bu sayfa, araçlarımızın yöntemini ve kaynak olarak nasıl gösterileceğini
        açıklar.
      </p>

      <section className="section">
        <h2 className="market-h2">Kaynak olarak gösterme</h2>
        <div className="article-prose">
          <p>
            Hesaplayıcılarımızı veya verdiğimiz oranları haberinizde kullanabilirsiniz. Metin
            içinde atıf şu biçimde yeterlidir:
          </p>
          <ul>
            <li>Ölçülü: <em>Kaynak: GelecekFinans kira artışı hesaplayıcısı</em></li>
            <li>Bağlantılı: <code>&lt;a href=&quot;https://gelecekfinans.com/araclar/kira-artis-hesaplama&quot;&gt;GelecekFinans&lt;/a&gt;</code></li>
            <li>Araç gömme: <Link href="/gomulu">gömülebilir hesaplayıcılar</Link> sayfasındaki iframe kodu.</li>
          </ul>
          <p>
            İzin istemenize gerek yok; aracı değiştirmediğiniz ve kaynak bağlantısını koruduğunuz
            sürece kullanım serbesttir.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="market-h2">Yöntem</h2>
        <div className="article-prose">
          <table>
            <thead>
              <tr><th>Araç</th><th>Formül</th><th>Veri</th></tr>
            </thead>
            <tbody>
              {METHOD.map(([a, b, c]) => (
                <tr key={a}><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>
              ))}
            </tbody>
          </table>
          <p>
            Her araçta kullanılan varsayılan oranlar ve hesap kapsamı ayrıca açıklanır. Bazı
            oranlar kullanıcı tarafından değiştirilebilir; bazı kesintiler ise kapsam dışıdır
            (örneğin kredi aracında KKDF ve BSMV). Sonuçlar bilgilendirme amaçlıdır, yatırım
            veya hukuk danışmanlığı değildir.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="market-h2">Veri kaynakları</h2>
        <div className="article-prose">
          <ul>
            <li>TÜİK — tüketici ve üretici fiyat endeksleri, aylık bültenler.</li>
            <li>TCMB — politika faizi, gösterge kurlar, istatistikler.</li>
            <li>BIST ve aracı kurum verileri — hisse fiyatları ve endeks değerleri.</li>
            <li>Piyasa veri sağlayıcıları — döviz, altın ve kripto paraların canlı fiyatları.</li>
          </ul>
          <p>
            Canlı fiyatlar yaklaşık on dakikada bir güncellenir; banka ve kuyumcu ekranlarından
            makas nedeniyle farklılık gösterebilir.
          </p>
        </div>
      </section>

      <section className="section">
        <h2 className="market-h2">İletişim</h2>
        <div className="article-prose">
          <p>
            Veri talebi, düzeltme bildirimi ve röportaj için:{" "}
            <a href="mailto:iletisim@gelecekfinans.com">iletisim@gelecekfinans.com</a>
          </p>
          <ul>
            <li>Yayın ilkeleri: <Link href="/yayincilik-ilkeleri">yayıncılık ilkeleri ve düzeltme politikası</Link></li>
            <li>Künye: <Link href="/kunye">künye</Link> · Yazarlar: <Link href="/yazarlar">yazarlar</Link></li>
            <li>Marka işareti: <a href={`${BASE}/icon.svg`}>icon.svg</a></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
