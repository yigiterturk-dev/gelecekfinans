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
  ["Kira artışı", "Mevcut kira × (1 + oran); oran kullanıcı tarafından TÜİK'in 12 aylık ortalamalar serisinden girilir.", "TBK m. 344 · TÜİK TÜFE"],
  ["Emekli zammı", "Mevcut aylık × (1 + oran); yıllık fark = aylık fark × 12.", "TÜİK · SGK/ÇSGB duyuruları"],
  ["Kredi taksiti", "Taksit = A × i / (1 − (1 + i)^−n); anüite yöntemi.", "Bankaların ilan ettiği faiz"],
  ["Mevduat getirisi", "Brüt = Anapara × oran × gün / 365; net = brüt − stopaj.", "TCMB · Resmî Gazete stopaj oranları"],
  ["Bileşik faiz", "A = P × (1 + r)^t; ek yatırımda her ayın kendi süresi kadar büyümesi eklenir.", "—"],
  ["Hisse kâr/zarar", "(Satış − alış) × adet − komisyon − BSMV.", "BIST işlem kuralları"],
  ["Temettü", "Net = brüt × (1 − stopaj); verim = hisse başı temettü / fiyat.", "SPK · aracı kurum bildirimleri"],
  ["Enflasyon", "Alım gücü = tutar / (1 + enflasyon)^n; reel getiri = (1 + nominal)/(1 + enflasyon) − 1.", "TÜİK TÜFE / Yİ-ÜFE"],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
            Araçlar yalnızca kullanıcının girdiği değerlerle hesap yapar; kendi başına oran
            varsaymaz. Stopaj, KKDF, BSMV gibi kesintiler kullanıcı tarafından girilir ve
            hesaplayıcı bunları gizlemez. Sonuçlar bilgilendirme amaçlıdır, yatırım veya hukuk
            danışmanlığı değildir.
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
