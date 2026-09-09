import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "GelecekFinans web sitesi kullanım koşulları ve yasal uyarı.",
  alternates: { canonical: "https://gelecekfinans.com/kullanim-kosullari" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/kullanim-kosullari", title: "Kullanım Koşulları — GelecekFinans", description: "GelecekFinans web sitesi kullanım koşulları ve yasal uyarı." }),
};

export default function KullanimKosullari() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>Kullanım Koşulları</h1>
      <div className="article-prose">
        <p><strong>Son güncelleme:</strong> 17 Mayıs 2026</p>

        <h2>Genel</h2>
        <p>
          Bu web sitesini kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.
          GelecekFinans bu koşulları önceden bildirimde bulunmaksızın değiştirme hakkını saklı tutar.
        </p>

        <h2>Yatırım Tavsiyesi Değildir</h2>
        <p>
          GelecekFinans&apos;ta yayınlanan tüm içerikler yalnızca bilgilendirme amaçlıdır.
          Hiçbir içerik yatırım tavsiyesi, alım-satım önerisi veya finansal danışmanlık olarak
          değerlendirilmemelidir. Yatırım kararlarınızdan yalnızca siz sorumlusunuz.
        </p>

        <h2>Fikri Mülkiyet</h2>
        <p>
          Sitedeki tüm içerik, tasarım, logo ve yazılım GelecekFinans&apos;a aittir.
          İzinsiz kopyalanması, dağıtılması veya ticari amaçla kullanılması yasaktır.
        </p>

        <h2>Sorumluluk Sınırı</h2>
        <p>
          GelecekFinans, yayınlanan içeriklerin doğruluğu, eksiksizliği veya güncelliği konusunda
          garanti vermez. Sitede yer alan bilgilere dayanarak yapılan işlemlerden doğacak
          zararlardan sorumlu tutulamaz.
        </p>

        <h2>Bağlantılar</h2>
        <p>
          Sitemizde üçüncü taraf web sitelerine bağlantılar bulunabilir. Bu sitelerin içeriklerinden
          ve gizlilik politikalarından GelecekFinans sorumlu değildir.
        </p>
      </div>
    </div>
  );
}
