import Link from "next/link";
import { TOOL_CATALOG } from "@/lib/tool-catalog";

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
 * sayfalarında görünüyor. Bağlantılar ortak TOOL_CATALOG kaynağından
 * üretildiği için rail için ayrı bir araç listesi güncellemek gerekmez.
 */
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
        {TOOL_CATALOG.filter((tool) => `/araclar/${tool.slug}` !== current).map((tool) => (
          <Link key={tool.slug} href={`/araclar/${tool.slug}`} className="market-chip">{tool.railLabel}</Link>
        ))}
        {current && <Link href="/araclar" className="market-chip">Tüm Araçlar</Link>}
      </div>
    </section>
  );
}
