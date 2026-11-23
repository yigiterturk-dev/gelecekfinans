import { serializeJsonLd } from "@/lib/json-ld";
import type { Metadata } from "next";
import Link from "next/link";
import EmbedCode from "@/components/EmbedCode";
import { EMBED_TOOLS, BASE, embedSrc } from "@/lib/embed-tools";

export const revalidate = 86400;

const title = "Hesaplayıcıyı Sitenize Gömün — Ücretsiz Finans Araçları";
const description =
  "Kira artışı, emekli zammı, kredi ve mevduat faizi hesaplayıcılarını tek satır iframe ile sitenize ekleyin. Ücretsiz, kayıt gerekmez, mobil uyumlu.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${BASE}/gomulu` },
  openGraph: { type: "website", url: `${BASE}/gomulu`, title, description, siteName: "GelecekFinans" },
  twitter: { card: "summary_large_image", title, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Gömülebilir Finans Hesaplayıcıları",
  description,
  url: `${BASE}/gomulu`,
  isPartOf: { "@type": "WebSite", name: "GelecekFinans", url: BASE },
  hasPart: EMBED_TOOLS.map((t) => ({
    "@type": "WebApplication",
    name: t.label,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: `${BASE}/araclar/${t.slug}`,
    description: t.desc,
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
  })),
};

export default function GomuluPage() {
  return (
    <div className="container market-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Ana Sayfa</Link> <span>/</span> <span>Gömülebilir Araçlar</span>
      </nav>

      <h1 className="page-header">Hesaplayıcıyı sitenize gömün</h1>
      <p className="market-lede">
        Aşağıdaki araçları tek satır <code>iframe</code> ile kendi sayfanıza ekleyebilirsiniz.
        Ücretsizdir, kayıt istemez, reklam göstermez ve mobilde çalışır. Tek koşul: aracın
        altındaki kaynak bağlantısının kaldırılmaması.
      </p>

      <section className="section">
        <h2 className="market-h2">Neden gömülü araç?</h2>
        <div className="article-prose">
          <p>
            Hesaplayıcılar sayfa üzerinde kalma süresini artırır ve okuyucunun işini bitirir:
            &quot;kira artışı ne kadar oldu&quot; sorusunu soran kişi cevabı okumak yerine hesaplamak ister.
            Araç, sayfanızın içinde açılır; ziyaretçi siteyi terk etmez.
          </p>
          <p>
            Gömülen sayfa <strong>noindex</strong> olarak sunulur. Yani aracın kopyası arama
            sonuçlarında ayrı bir adres olarak görünmez, kendi sayfanızla yarışmaz ve sitenizde
            yinelenen içerik oluşturmaz.
          </p>
        </div>
      </section>

      {EMBED_TOOLS.map((t) => (
        <section className="section" key={t.slug} id={t.slug}>
          <h2 className="market-h2">{t.label}</h2>
          <p className="market-lede">{t.desc}</p>
          <div className="embed-preview">
            <iframe
              src={embedSrc(t.slug)}
              width="100%"
              height={t.height}
              style={{ border: "1px solid #e6e6e6", borderRadius: 12, maxWidth: "100%" }}
              loading="lazy"
              title={`${t.label} önizleme`}
            />
          </div>
          <EmbedCode tool={t} />
          <p className="market-note">
            Doğrudan adres: <code>{embedSrc(t.slug)}</code> · Yüksekliği içeriğinize göre
            değiştirebilirsiniz.
          </p>
        </section>
      ))}

      <section className="section market-links">
        <h2 className="market-h2">Tüm araçlar</h2>
        <div className="market-chips">
          {EMBED_TOOLS.map((t) => (
            <Link key={t.slug} href={`/araclar/${t.slug}`} className="market-chip">{t.label}</Link>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="market-h2">Gömme kuralları</h2>
        <div className="article-prose">
          <ul>
            <li>Araç değiştirilmeden, olduğu gibi gömülür; üzerine reklam veya katman eklenmez.</li>
            <li>Altındaki kaynak bağlantısı korunur. Bağlantı kaldırılırsa gömme izni düşer.</li>
            <li>Ticari kullanım serbesttir; ücret, kayıt veya bildirim gerekmez.</li>
            <li>Kesinti veya hata olursa <Link href="/iletisim">iletişim</Link> üzerinden bildirebilirsiniz.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
