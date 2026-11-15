import Link from "next/link";

/**
 * Araç sayfalarına gövdeden iç bağlantı.
 *
 * Neden: 2026-11-15 indeks taraması sitemap'teki 200 adresin 45'ının
 * "URL is unknown to Google" olduğunu gösterdi; bunların neredeyse tamamı
 * `/araclar/*` ve `/altin/*` sayfaları. Sebep içerik değil, BAĞLANTI:
 * bu sayfalara yalnızca menü ve /araclar hub'ından tek bir bağlantı
 * gidiyordu. Menü bağlantısı her sayfada tekrarlandığı için değersizdir;
 * tarayıcı gövdedeki bağlam bağlantısını takip eder.
 *
 * Bugün aynı rail ana sayfa, beş piyasa hub'ı, kategori ve makale
 * sayfalarında görünüyor. Yeni bir araç eklendiğinde TEK yerden buraya
 * eklemek yeterli.
 */
const TOOLS = [
  { href: "/araclar/doviz-cevirici", label: "Döviz Çevirici" },
  { href: "/araclar/altin-hesaplama", label: "Altın Hesaplama" },
  { href: "/araclar/kredi-faiz-hesaplama", label: "Kredi Faizi" },
  { href: "/araclar/mevduat-faiz-hesaplama", label: "Mevduat Faizi" },
  { href: "/araclar/enflasyon-hesaplama", label: "Enflasyon" },
  { href: "/araclar/bilesik-faiz-hesaplama", label: "Bileşik Faiz" },
  { href: "/araclar/hisse-kar-zarar-hesaplama", label: "Hisse Kâr/Zarar" },
  { href: "/araclar/kira-artis-hesaplama", label: "Kira Artışı" },
  { href: "/araclar/emekli-zammi-hesaplama", label: "Emekli Zammı" },
  { href: "/araclar/temettu-hesaplama", label: "Temettü" },
];

export default function ToolsRail({
  title = "Hesaplama Araçları",
  current,
}: {
  title?: string;
  /** Bulunduğunuz aracın yolu; kendine bağlantı verilmez. */
  current?: string;
}) {
  return (
    <section className="section market-links" aria-labelledby="tools-rail-title">
      <h2 className="market-h2" id="tools-rail-title">{title}</h2>
      <div className="market-chips">
        {TOOLS.filter((t) => t.href !== current).map((t) => (
          <Link key={t.href} href={t.href} className="market-chip">{t.label}</Link>
        ))}
        {current && <Link href="/araclar" className="market-chip">Tüm Araçlar</Link>}
      </div>
    </section>
  );
}
