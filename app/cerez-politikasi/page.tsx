import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "GelecekFinans'ta kullanılan çerezler, amaçları ve çerez tercihlerinizi nasıl yönetebileceğiniz.",
  alternates: { canonical: "https://gelecekfinans.com/cerez-politikasi" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/cerez-politikasi", title: "Çerez Politikası — GelecekFinans", description: "GelecekFinans'ta kullanılan çerezler, amaçları ve tercihlerinizi yönetme yolları." }),
};

export default function CerezPolitikasi() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>Çerez Politikası</h1>
      <div className="article-prose">
        <p><strong>Son güncelleme:</strong> 23 Kasım 2026</p>

        <p>
          Bu politika, gelecekfinans.com üzerinde kullanılan çerezleri ve benzeri yerel depolama
          teknolojilerini açıklar. Kişisel verilerin işlenmesine ilişkin genel bilgiler için{" "}
          <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link> sayfamızı inceleyebilirsiniz.
        </p>

        <h2>Çerez Nedir?</h2>
        <p>
          Çerezler, ziyaret ettiğiniz siteler tarafından tarayıcınıza kaydedilen küçük metin
          dosyalarıdır. Sitenin düzgün çalışmasını sağlamak, tercihlerinizi hatırlamak ve trafiği
          ölçmek için kullanılır.
        </p>

        <h2>Kullandığımız Çerezler</h2>
        <h3>Zorunlu çerezler ve yerel depolama</h3>
        <p>
          Tema tercihi ve gizlilik onayı seçiminiz tarayıcınızın yerel depolama alanında saklanır.
          Bu kayıtlar sitenin temel işlevleri ve tercihlerinizin hatırlanması için gereklidir;
          onayınıza bağlı değildir ve üçüncü taraflarla paylaşılmaz.
        </p>
        <h3>Ölçümleme çerezleri</h3>
        <p>
          Yalnızca “Kabul et” seçeneğini tercih etmeniz halinde Google Analytics, ziyaret edilen
          sayfalar ve etkileşimler gibi kullanım verilerini ölçer.
        </p>
        <h3>Google Haberler okuyucu gelir hizmeti</h3>
        <p>
          Google Reader Revenue Manager entegrasyonu, yalnızca “Kabul et” tercihinizden sonra yüklenir.
          Google Haberler için yapılandırılmış destek veya abonelik çağrıları gösterebilir. Ayrıntılar için{" "}
          <a href="https://support.google.com/news/publisher-center/answer/16941185" target="_blank" rel="noopener noreferrer">
            Google Publisher Center yardımını
          </a>{" "}
          inceleyebilirsiniz.
        </p>
        <h3>TradingView grafikleri</h3>
        <p>
          Borsa ve hisse sayfalarındaki TradingView grafiği, siz “TradingView grafiğini yükle” düğmesine
          bastıktan sonra istenir. Bu seçim Google Analytics, Google Haberler veya reklam tercihinden
          ayrıdır ve yalnızca açık olan grafik için geçerlidir. İstek sırasında tarayıcınız TradingView&apos;e
          bağlanır; sağlayıcı teknik verileri işleyebilir ve kendi gizlilik kurallarını uygular. Grafiği
          yüklemeden başlıktaki doğrudan bağlantıyla TradingView&apos;e gidebilirsiniz.
        </p>
        <h3>Reklam çerezleri</h3>
        <p>
          Etkinleştirildiğinde Google AdSense gibi üçüncü taraf reklam hizmetleri, size daha ilgili
          reklamlar göstermek amacıyla kendi çerezlerini kullanabilir. Bu çerezler yalnızca onay
          vermeniz halinde yüklenir.
        </p>

        <h2>Tercihlerinizi Yönetme</h2>
        <p>
          Site ilk açıldığında gösterilen gizlilik bildiriminde “Kabul et” ya da “Yalnızca zorunlu”
          seçeneğini belirleyebilirsiniz. Tercihinizi daha sonra değiştirmek için sayfa altındaki
          “Çerez tercihleri” bağlantısını kullanın; değişiklik sonrası yeni tercih uygulanırken sayfa
          yenilenir. Dilerseniz tarayıcınızın site verilerini de temizleyebilirsiniz. Tarayıcı
          ayarlarından çerezleri engellemek bazı tercihlerin hatırlanmamasına yol açabilir.
        </p>

        <h2>Üçüncü Taraf Hizmetler</h2>
        <p>
          “Kabul et” tercihinizden sonra yüklenen Google Analytics, Google Reader Revenue Manager ve
          etkinleştirilmiş reklam hizmetleri kendi gizlilik ve saklama kurallarına tabidir. TradingView
          grafikleri yalnızca yükleme düğmesine bastığınızda üçüncü taraf isteği başlatır. Reklam
          tercihlerinizi Google reklam ayarlarından ayrıca yönetebilirsiniz.
        </p>

        <h2>İletişim</h2>
        <p>
          Çerezler ve kişisel verilerle ilgili sorularınızı{" "}
          <a href="mailto:iletisim@gelecekfinans.com" style={{ color: "var(--accent)" }}>iletisim@gelecekfinans.com</a>{" "}
          adresine iletebilirsiniz.
        </p>
      </div>
    </div>
  );
}
