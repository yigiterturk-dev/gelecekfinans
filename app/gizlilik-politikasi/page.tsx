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
        <p><strong>Son güncelleme:</strong> 6 Ağustos 2026</p>

        <h2>Toplanan Veriler</h2>
        <p>
          Site içi sayaç, ziyaret edilen sayfanın yolunu kişisel profil oluşturmadan kaydeder. Teknik
          sunucu günlüklerinde güvenlik ve hata ayıklama amacıyla IP adresi, tarayıcı bilgisi ve istek
          zamanı sınırlı süreyle yer alabilir. Onay vermeniz halinde Google Analytics ziyaret edilen
          sayfa ve etkileşim gibi kullanım verilerini işler. Vercel Analytics toplulaştırılmış trafik
          ölçümü sağlar.
        </p>

        <h2>Çerezler</h2>
        <p>
          Zorunlu işlevler dışındaki Google Analytics ve reklam hizmetleri yalnızca “Kabul et”
          tercihinizden sonra yüklenir. “Yalnızca zorunlu” seçeneği bu hizmetleri yüklemez. Tercihiniz
          tarayıcınızın yerel depolama alanında saklanır; site verilerini temizleyerek tercihinizi
          sıfırlayabilirsiniz.
        </p>

        <h2>Üçüncü Taraf Hizmetler</h2>
        <p>
          Onay verdiğinizde Google Analytics ve etkinleştirilmişse Google AdSense gibi üçüncü taraf
          hizmetler kendi teknolojilerini kullanabilir. Bu sağlayıcıların kendi gizlilik ve saklama
          kuralları geçerlidir. Reklam tercihlerinizi Google reklam ayarlarından ayrıca yönetebilirsiniz.
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
