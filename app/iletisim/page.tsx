import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";

export const metadata: Metadata = {
  title: "İletişim",
  description: "GelecekFinans ile iletişime geçin. Haber, öneri ve düzeltme talepleriniz için bize ulaşın.",
  alternates: { canonical: "https://gelecekfinans.com/iletisim" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/iletisim", title: "İletişim — GelecekFinans", description: "GelecekFinans ile iletişime geçin." }),
};

export default function Iletisim() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>İletişim</h1>
      <div className="article-prose">
        <p>Bize aşağıdaki kanallardan ulaşabilirsiniz:</p>
        <p><strong>E-posta:</strong> <a href="mailto:iletisim@gelecekfinans.com" style={{ color: "var(--accent)" }}>iletisim@gelecekfinans.com</a></p>
        <p><strong>Reklam &amp; İş Birlikleri:</strong> <a href="mailto:reklam@gelecekfinans.com" style={{ color: "var(--accent)" }}>reklam@gelecekfinans.com</a></p>
        <h2>Düzeltme Talebi</h2>
        <p>
          Haberlerimizde bir hata fark ettiyseniz lütfen konu başlığına &quot;Düzeltme&quot; yazarak
          iletisim@gelecekfinans.com adresine bildiriniz.
        </p>
      </div>
    </div>
  );
}
