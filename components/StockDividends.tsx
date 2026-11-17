import Link from "next/link";
import { tl } from "@/lib/market";
import type { StockDividends as Data } from "@/lib/dividends";

/**
 * Hisse sayfasına ÖZGÜ temettü bloğu: 19 sayfa birbirinin kopyası sayılıp
 * indekslenmiyordu (stock-profiles.ts notu); gerçek, hisseye ait veri ekler.
 */
export default function StockDividends({ data }: { data: Data }) {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <section className="section">
      <h2 className="market-h2">{data.name} ({data.ticker}) temettü geçmişi</h2>
      {data.dividends.length === 0 ? (
        <p className="market-prose">
          {data.name}, son üç yılda kâr payı (temettü) dağıtmadı. Şirketin kâr dağıtım politikası ve genel kurul
          kararları KAP&apos;ta yayımlanır.
        </p>
      ) : (
        <>
          <p className="market-prose">
            {data.name} son üç yılda {data.dividends.length} kez kâr payı dağıttı; en son dağıtımın hak kullanım tarihi{" "}
            {fmt(data.dividends[0].date)}.{" "}
            {data.trailing12 > 0
              ? `Son 12 ayda dağıtılan hisse başı toplam ₺${tl(data.trailing12, 2)}, güncel fiyata göre temettü verimi %${tl(data.yieldPct, 2)}.`
              : "Son 12 ayda dağıtım yapılmadı."}
          </p>
          <div className="crypto-table-wrap">
            <table className="crypto-table">
              <thead><tr><th>Hak kullanım tarihi</th><th className="num">Hisse başı brüt (₺)</th></tr></thead>
              <tbody>
                {data.dividends.map((d) => (
                  <tr key={d.date}><td>{fmt(d.date)}</td><td className="num">₺{tl(d.amount, 4)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="conv-note">
        Kaynak: Yahoo Finance. Tutarlar bedelsiz/bölünmeye göre düzeltilmiş brüt tutardır; kesin tutar için KAP kâr
        payı bildirimi esastır. <Link href="/borsa/temettu-takvimi">Tüm hisselerin temettü takvimi →</Link>
      </p>
    </section>
  );
}
