import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Yazarlar",
  description: "GelecekFinans yazı işleri ekibi: sorumlu yazı işleri müdürü ve haber merkezi.",
  alternates: { canonical: "https://gelecekfinans.com/yazarlar" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/yazarlar", title: "Yazarlar — GelecekFinans", description: "GelecekFinans yazı işleri ekibi ve haber merkezi." }),
};

const EKIP = [
  {
    ad: "Yiğit Ertürk",
    rol: "Sorumlu Yazı İşleri Müdürü",
    aciklama:
      "Yayın akışının, kaynak doğrulamasının ve düzeltme süreçlerinin sorumlusu. Editoryal kararlar ve yayın ilkelerinin uygulanması onun gözetiminde yürütülür.",
  },
  {
    ad: "GelecekFinans Haber Merkezi",
    rol: "Haber Merkezi",
    aciklama:
      "İki bağımsız kaynak doğrulaması ve özgünlük kontrolünden geçen finans haberlerinin ortak imzası. İçerikler, editoryal kontrol ve yayın uygunluğu denetiminden sonra yayımlanır.",
  },
];

const EKIP_LD = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Yazarlar — GelecekFinans",
  url: "https://gelecekfinans.com/yazarlar",
  hasPart: EKIP.map((k) => ({
    "@type": k.rol === "Haber Merkezi" ? "Organization" : "Person",
    name: k.ad,
    jobTitle: k.rol,
    worksFor: { "@id": "https://gelecekfinans.com/#organization" },
  })),
};

export default function Yazarlar() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(EKIP_LD).replace(/</g, "\\u003c") }}
      />
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>Yazarlar</h1>
      <div className="article-prose">
        <p>
          GelecekFinans&apos;ta haberler editoryal kontrol sürecinden geçer. Yayın akışı ve sorumluluk
          aşağıdaki gibidir.
        </p>
        <ul>
          {EKIP.map((k) => (
            <li key={k.ad} style={{ marginBottom: 18 }}>
              <strong>{k.ad}</strong> — {k.rol}
              <br />
              {k.aciklama}
            </li>
          ))}
        </ul>
        <p>
          Yayın süreci ve düzeltme politikası için{" "}
          <Link href="/yayincilik-ilkeleri">Yayıncılık İlkeleri</Link>, yasal bilgiler için{" "}
          <Link href="/kunye">Künye</Link> sayfamıza bakabilirsiniz.
        </p>
        <p>
          Düzeltme ve kaynak bildirimleri:{" "}
          <a href="mailto:iletisim@gelecekfinans.com" style={{ color: "var(--accent)" }}>iletisim@gelecekfinans.com</a>
        </p>
      </div>
    </div>
  );
}
