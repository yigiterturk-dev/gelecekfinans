import { monthLabel, nextMonth, pct, type CpiRow } from "@/lib/tufe";

/**
 * TÜİK TÜFE tablosu (sunucuda basılır, arama motoru okur).
 * kira: yenileme ayına göre azami artış (TBK 344, 12 aylık ortalama).
 * emekli: aylık / yıllık TÜFE + son 12 ay.
 * Kaynak satırı zorunlu: gazeteci/forum bu tabloyu atıfla kullanabilsin.
 */
export default function CpiTable({ rows, mode }: { rows: CpiRow[]; mode: "kira" | "emekli" }) {
  const last = rows.slice(-12).reverse();
  return (
    <section className="section">
      <h2 className="market-h2">
        {mode === "kira" ? "Aylara göre kira artış oranı (azami)" : "TÜFE aylık ve yıllık değişim — son 12 ay"}
      </h2>
      <div className="crypto-table-wrap">
        <table className="crypto-table">
          <thead>
            {mode === "kira" ? (
              <tr><th>Kira yenileme ayı</th><th>Dayanak veri</th><th>Azami artış</th></tr>
            ) : (
              <tr><th>Ay</th><th>Aylık TÜFE</th><th>Yıllık TÜFE</th><th>12 aylık ort.</th></tr>
            )}
          </thead>
          <tbody>
            {last.map((r) => mode === "kira" ? (
              <tr key={r.ym}><td>{monthLabel(nextMonth(r.ym))}</td><td>{r.label}</td><td><strong>{pct(r.avg12)}</strong></td></tr>
            ) : (
              <tr key={r.ym}><td>{r.label}</td><td>{pct(r.monthly)}</td><td>{pct(r.annual)}</td><td>{pct(r.avg12)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="conv-note">
        Kaynak: TÜİK Tüketici Fiyat Endeksi (Genel, 2003=100), TCMB EVDS üzerinden; oranlar endeksten hesaplanır.
        Son veri: {last[0]?.label}. Her ayın 3&apos;ünde TÜİK açıklamasından sonra en geç 1 saat içinde güncellenir.
        {mode === "kira" && " Kira yenileme ayındaki azami artış, bir önceki ayın TÜFE 12 aylık ortalama değişimidir (TBK m. 344)."}
      </p>
    </section>
  );
}
