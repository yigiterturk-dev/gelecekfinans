import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "GelecekFinans hakkında bilgi edinin. Misyonumuz, ekibimiz ve editoryal politikamız.",
  alternates: { canonical: "https://gelecekfinans.com/hakkimizda" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/hakkimizda", title: "Hakkımızda — GelecekFinans", description: "GelecekFinans hakkında bilgi edinin. Misyonumuz ve editoryal politikamız." }),
};

export default function Hakkimizda() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24, color: "#111" }}>Hakkımızda</h1>
      <div className="article-prose">
        <p>
          <strong>GelecekFinans</strong>, Türkiye&apos;nin güncel finans ve ekonomi haberlerini hızlı, tarafsız ve
          anlaşılır bir dille aktaran bağımsız bir haber platformudur.
        </p>
        <h2>Misyonumuz</h2>
        <p>
          Borsa, döviz, kripto para, altın ve makroekonomi alanlarında yatırımcıları doğru bilgiyle
          buluşturmak. Karmaşık finansal gelişmeleri herkesin anlayabileceği bir dile çevirmek.
        </p>
        <h2>Editoryal Politikamız</h2>
        <p>
          Haberlerimiz birincil veya güvenilir yayın kaynaklarıyla hazırlanır. Otomatik akıştan gelen bir konu,
          iki bağımsız kaynak doğrulaması, iddia denetimi ve özgünlük kontrolü tamamlanmadan yayınlanmaz.
          Kaynaklar yazının sonunda görünür biçimde paylaşılır.
        </p>
        <p>
          Yapay zekâ; araştırma paketini düzenleme, taslak hazırlama ve kalite kontrol adımlarında yardımcı araç
          olarak kullanılabilir. Sonuç; kaynak sınırı, intihal, finansal iddia ve yayın uygunluğu kontrollerine
          tabidir. Ayrıntılı süreç için <Link href="/yayincilik-ilkeleri">yayıncılık ilkelerimizi</Link> inceleyebilirsiniz.
        </p>
        <h2>Bağımsızlık ve Şeffaflık</h2>
        <p>
          Tüm içeriklerimiz bilgilendirme amaçlıdır ve yatırım tavsiyesi niteliği taşımaz. Reklam veya sponsorlu
          içerik, haber kararlarımızı belirlemez; ticari çalışmalar açıkça etiketlenir.
        </p>
        <h2>Düzeltmeler</h2>
        <p>
          Maddi bir hata tespit edildiğinde içerik düzeltilir ve güncellenme tarihi sayfada gösterilir.
          Düzeltme taleplerini kaynak bağlantısıyla birlikte e-posta üzerinden iletebilirsiniz.
        </p>
        <h2>İletişim</h2>
        <p>
          Sorularınız, kaynak bildirimleriniz veya düzeltme talepleriniz için{" "}
          <a href="mailto:iletisim@gelecekfinans.com" style={{ color: "var(--accent)" }}>iletisim@gelecekfinans.com</a> adresinden bize ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
