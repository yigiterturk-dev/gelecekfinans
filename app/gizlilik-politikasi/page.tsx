import type { Metadata } from "next";
import { paylasimMeta } from "@/lib/og";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "GelecekFinans gizlilik politikası ve kişisel verilerin korunması.",
  alternates: { canonical: "https://gelecekfinans.com/gizlilik-politikasi" },
  ...paylasimMeta({ url: "https://gelecekfinans.com/gizlilik-politikasi", title: "Gizlilik Politikası — GelecekFinans", description: "GelecekFinans gizlilik politikası ve kişisel verilerin korunması." }),
};

export default function GizlilikPolitikasi() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "60px 24px 100px" }}>
      <h1 style={{ fontFamily: "var(--display)", fontSize: 36, fontWeight: 900, marginBottom: 24 }}>Gizlilik Politikası</h1>
      <div className="article-prose">
        <p><strong>Son güncelleme:</strong> 23 Kasım 2026</p>

        <h2>Toplanan Veriler</h2>
        <p>
          Site içi sayaç, ziyaret edilen sayfanın yolunu kişisel profil oluşturmadan kaydeder. Teknik
          sunucu günlüklerinde güvenlik ve hata ayıklama amacıyla IP adresi, tarayıcı bilgisi ve istek
          zamanı sınırlı süreyle yer alabilir. Kötüye kullanımı önlemek için bazı isteklerde IP adresi
          kısa süreli hız sınırı sayacında kullanılır; süresi dolan sayaç kayıtları otomatik temizlenir.
          “Kabul et” tercihinizden sonra Google Analytics,
          ziyaret edilen sayfa ve etkileşim gibi kullanım verilerini işler.
        </p>

        <h2>Çerezler</h2>
        <p>
          Google Analytics ve Google Reader Revenue Manager yalnızca “Kabul et” tercihinizden sonra;
          Google AdSense ise etkinleştirilmişse ve onayınız varsa yüklenir. “Yalnızca zorunlu” seçeneği
          bu hizmetleri yüklemez. Borsa sayfalarındaki TradingView grafiği, yalnızca ilgili grafiğin
          “TradingView grafiğini yükle” düğmesine basıldığında istenir. Çerez tercihinizi sayfa altındaki
          “Çerez tercihleri” bağlantısından yönetebilirsiniz. Seçiminiz tarayıcınızın yerel depolama
          alanında saklanır.
        </p>

        <h2>Üçüncü Taraf Hizmetler</h2>
        <p>
          Google Reader Revenue Manager, Google Haberler için yapılandırılmış okuyucu gelir
          çağrılarını gösterebilir. TradingView grafikleri yalnızca ilgili yükleme düğmesine basıldığında
          istenir. Bu üçüncü taraf hizmetleri istek sırasında teknik veriler alabilir; her sağlayıcının
          kendi gizlilik ve saklama kuralları geçerlidir. Google entegrasyonuyla ilgili bilgi için{" "}
          <a href="https://support.google.com/news/publisher-center/answer/16941185" target="_blank" rel="noopener noreferrer">
            Google Publisher Center yardımına
          </a>{" "}
          bakabilirsiniz. Google Analytics ve etkinleştirilmişse AdSense de Google hizmetleridir;
          her sağlayıcının kendi gizlilik ve saklama kuralları geçerlidir.
        </p>

        <h2>Veri Güvenliği</h2>
        <p>
          Kişisel verilerinizi korumak için endüstri standardı güvenlik önlemleri uygulanmaktadır.
          Ancak internet üzerinden hiçbir veri iletimi %100 güvenli değildir.
        </p>

        <h2>Haklarınız</h2>
        <p>
          6698 sayılı KVKK kapsamında kişisel verilerinize erişim, düzeltme ve silme haklarına
          sahipsiniz. Taleplerinizi iletisim@gelecekfinans.com adresine iletebilirsiniz.
        </p>

        <h2>Veri Saklama ve İletişim</h2>
        <p>
          Veriler, belirtilen amaç için gerekli süreyle ve uygulanabilir yasal yükümlülükler kapsamında
          saklanır. Erişim, düzeltme, silme veya itiraz taleplerinizde hangi işlem ya da veriyi kastettiğinizi
          belirterek iletisim@gelecekfinans.com adresine ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
