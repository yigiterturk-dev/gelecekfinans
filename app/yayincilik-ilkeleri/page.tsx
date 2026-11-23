import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";
import { serializeJsonLd } from "@/lib/json-ld";

const BASE = "https://gelecekfinans.com";

export const metadata: Metadata = {
  title: "Yayıncılık İlkeleri ve Düzeltme Politikası",
  description: "GelecekFinans'ın kaynak doğrulama, yapay zekâ kullanımı, özgünlük, düzeltme ve reklam bağımsızlığı ilkeleri.",
  alternates: { canonical: `${BASE}/yayincilik-ilkeleri` },
  ...paylasimMeta({
    url: `${BASE}/yayincilik-ilkeleri`,
    title: "Yayıncılık İlkeleri — GelecekFinans",
    description: "Kaynak doğrulama, özgünlük, düzeltme ve yapay zekâ kullanım politikamız.",
  }),
};

export default function YayincilikIlkeleri() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${BASE}/yayincilik-ilkeleri#webpage`,
    name: "GelecekFinans Yayıncılık İlkeleri",
    url: `${BASE}/yayincilik-ilkeleri`,
    inLanguage: "tr-TR",
    about: { "@id": `${BASE}/#organization` },
    isPartOf: { "@id": `${BASE}/#website` },
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 100px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Yayıncılık İlkeleri</span>
      </nav>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(34px, 6vw, 52px)", lineHeight: 1.08, margin: "20px 0 18px", color: "var(--ink)" }}>
        Yayıncılık İlkeleri
      </h1>
      <p style={{ color: "var(--ink2)", fontSize: 17, lineHeight: 1.7, marginBottom: 36 }}>
        Amacımız hızlı görünmek değil; okurun karar verirken dayanak olarak kullanabileceği, kaynağı açık ve
        anlaşılır finans haberi üretmektir. Aşağıdaki kurallar otomatik ve manuel tüm içerikler için geçerlidir.
      </p>

      <div className="article-prose">
        <h2>1. Kaynak ve doğrulama standardı</h2>
        <p>
          Yeni bot haber taslakları en az iki bağımsız kaynakla araştırılır. Resmî kurum açıklamaları,
          şirket bildirimleri ve birincil veriler önceliklidir. Güncel bot akışı tek kaynağa dayanan,
          kaynağı belirsiz veya birbiriyle çelişen iddiaları yayına uygun bulmaz. Bazı eski içerikler aynı
          doğrulama kayıtlarına sahip olmayabilir.
        </p>

        <h2>2. Yapay zekâ kullanımı</h2>
        <p>
          Yapay zekâ; kaynak paketini sınıflandırma, taslak oluşturma, iddia eşleştirme ve dil kontrolünde
          yardımcı olabilir. Yeni bot taslaklarında modelin belleğinden bilgi eklenmez; somut iddialar
          araştırma paketindeki kaynaklara bağlanır. İkinci model doğrulaması veya intihal denetimi
          başarısızsa taslak yayına uygun bulunmaz.
          Geçmişte bazı bot haberleri bu otomatik kontrollerden sonra tek tek insan editör incelemesi
          olmadan yayımlandı; bu ayrımı okurdan saklamıyoruz.
        </p>

        <h2>3. Özgünlük ve fayda</h2>
        <p>
          Kaynak metinler kopyalanmaz veya yalnızca sözcükleri değiştirilerek yeniden yayınlanmaz. Haber; ne
          olduğunu, neden önemli olduğunu ve okura olası etkisini kanıtların izin verdiği ölçüde açıklar.
          Arama trafiği için konu dışı, tekrar eden veya bilgi değeri taşımayan sayfalar üretilmez.
        </p>

        <h2>4. Finansal sınırlar</h2>
        <p>
          İçerikler bilgilendirme amaçlıdır; yatırım tavsiyesi, kişisel portföy önerisi, fiyat hedefi veya
          kesin gelecek tahmini içermez. Canlı piyasa verileri bilgilendirme amaçlıdır ve işlem platformu
          fiyatlarından farklılık gösterebilir.
        </p>

        <h2 id="duzeltme-politikasi">5. Düzeltme politikası</h2>
        <p>
          Maddi hata doğrulandığında yazı gecikmeden güncellenir ve sayfadaki “güncellendi” tarihi değişir.
          Başlığı veya sonucu etkileyen önemli düzeltmeler yazı içinde ayrıca açıklanır. Düzeltme talebinizi
          ilgili URL ve dayanak kaynakla birlikte{" "}
          <a href="mailto:iletisim@gelecekfinans.com">iletisim@gelecekfinans.com</a> adresine gönderebilirsiniz.
        </p>

        <h2>6. Reklam ve ticari bağımsızlık</h2>
        <p>
          Reklamverenler konu seçimi, haber değerlendirmesi veya yayın kararına müdahale edemez. Sponsorlu
          çalışmalar ve ortaklık bağlantıları görünür biçimde etiketlenir. Reklam yerleşimi haber metni gibi
          sunulmaz.
        </p>

        <h2>7. Yayın ritmi</h2>
        <p>
          Günlük sayı bir hedef değil, üst sınırdır. Sistem günde en fazla ayarlanan sayıda aday hazırlar;
          yeterli kanıt veya özgün değer yoksa sıfır içerikle tamamlanabilir. Yeni bot haberleri ve rehberleri
          editör incelemesi için taslak olarak kaydedilir; editör onayı olmadan otomatik yayımlanmaz.
        </p>
      </div>

      <p style={{ marginTop: 40, color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>
        Son güncelleme: 23 Kasım 2026
      </p>
    </div>
  );
}
