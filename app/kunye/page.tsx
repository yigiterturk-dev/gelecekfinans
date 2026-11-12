import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Künye",
  description: "GelecekFinans künyesi: yayıncı, sorumlu yazı işleri müdürü, yönetim yeri ve iletişim bilgileri.",
  alternates: { canonical: "https://gelecekfinans.com/kunye" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/kunye", title: "Künye — GelecekFinans", description: "GelecekFinans yayın künyesi ve iletişim bilgileri." }),
};

const KUNYE_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Künye — GelecekFinans",
  url: "https://gelecekfinans.com/kunye",
  mainEntity: {
    "@type": "NewsMediaOrganization",
    "@id": "https://gelecekfinans.com/#organization",
    name: "GelecekFinans",
    url: "https://gelecekfinans.com",
    publishingPrinciples: "https://gelecekfinans.com/yayincilik-ilkeleri",
    founder: {
      "@type": "Person",
      name: "Yiğit Ertürk",
      jobTitle: "Sorumlu Yazı İşleri Müdürü",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "editorial",
      email: "iletisim@gelecekfinans.com",
      availableLanguage: "Turkish",
    },
  },
};

export default function Kunye() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(KUNYE_LD).replace(/</g, "\\u003c") }}
      />
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>Künye</h1>
      <div className="article-prose">
        <p>
          Bu sayfa, 5651 sayılı Kanun kapsamında yayıncı ve sorumlu kişi bilgilerini içerir.
        </p>

        <h2>Yayın Bilgileri</h2>
        <p><strong>Yayın adı:</strong> GelecekFinans</p>
        <p><strong>Yayın türü:</strong> İnternet haber sitesi (finans ve ekonomi)</p>
        <p><strong>Yayın dili:</strong> Türkçe</p>
        <p><strong>Kuruluş yılı:</strong> 2026</p>
        <p><strong>Alan adı:</strong> gelecekfinans.com</p>

        <h2>Sorumlu Kişiler</h2>
        <p><strong>Yayıncı:</strong> Yiğit Ertürk (gerçek kişi)</p>
        <p><strong>Sorumlu Yazı İşleri Müdürü:</strong> Yiğit Ertürk</p>
        <p><strong>Yönetim yeri:</strong> İstanbul, Türkiye</p>

        <h2>İletişim</h2>
        <p>
          <strong>Editoryal:</strong>{" "}
          <a href="mailto:iletisim@gelecekfinans.com" style={{ color: "var(--accent)" }}>iletisim@gelecekfinans.com</a>
        </p>
        <p>
          <strong>Reklam ve iş birlikleri:</strong>{" "}
          <a href="mailto:reklam@gelecekfinans.com" style={{ color: "var(--accent)" }}>reklam@gelecekfinans.com</a>
        </p>

        <h2>Editoryal İlkeler ve Politikalar</h2>
        <p>
          Yayın sürecimiz ve düzeltme politikamız için{" "}
          <Link href="/yayincilik-ilkeleri">Yayıncılık İlkeleri</Link>, kişisel veriler için{" "}
          <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link> ve{" "}
          <Link href="/cerez-politikasi">Çerez Politikası</Link> sayfalarımıza bakabilirsiniz.
        </p>
        <p>
          Yazı işleri ekibi ve haber merkezi hakkında bilgi için{" "}
          <Link href="/yazarlar">Yazarlar</Link> sayfamızı inceleyebilirsiniz.
        </p>
      </div>
    </div>
  );
}
