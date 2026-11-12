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
        <p><strong>Son güncelleme:</strong> 12 Kasım 2026</p>

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
          sayfalar ve etkileşimler gibi kullanım verilerini toplulaştırılmış biçimde ölçer. Vercel
          Analytics ise kişisel profil oluşturmayan toplulaştırılmış trafik ölçümü sağlar.
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
          seçeneğini belirleyebilirsiniz. Tercihinizi değiştirmek için tarayıcınızın site verilerini
          temizlemeniz yeterlidir; siteyi yeniden ziyaret ettiğinizde bildirim tekrar gösterilir.
          Ayrıca tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz; zorunlu
          kayıtların engellenmesi bazı tercihlerin hatırlanmamasına yol açabilir.
        </p>

        <h2>Üçüncü Taraf Hizmetler</h2>
        <p>
          Onay verdiğinizde çalışan Google Analytics ve reklam hizmetleri kendi gizlilik ve saklama
          kurallarına tabidir. Reklam tercihlerinizi Google reklam ayarlarından ayrıca
          yönetebilirsiniz.
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
