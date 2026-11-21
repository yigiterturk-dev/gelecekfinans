/**
 * TÜFE (Genel, 2003=100) — TÜİK verisi, TCMB EVDS üzerinden.
 *
 * Seri: TP.GENENDEKS.T1 (veri grubu bie_tukfiy2003). TÜİK 2026'da baz yılını
 * 2025=100'e taşıdı; eski TP.FG.J0 Aralık 2025'te bitiyor. 2003=100 genel
 * endeksi TÜİK yayımlamaya devam ediyor ve uzun geriye gidiyor — oran
 * hesapları (aylık/yıllık/12 aylık ortalama) baz yılından bağımsız.
 *
 * Uç: evds3 (evds2 artık 302 dönüyor; 17 Kas 2026 ölçümü). Anahtar başlıkta.
 * Hata olursa null: sayfalar elle giriş moduna düşer, sessiz yanlış veri yok.
 */

export interface CpiPoint { ym: string; idx: number }

export interface CpiRow {
  ym: string;
  label: string;
  monthly: number;
  annual: number | null;
  /** TBK 344 kira tavanı: son 12 ay ortalaması / önceki 12 ay ortalaması − 1 */
  avg12: number | null;
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export async function getCpiSeries(): Promise<CpiPoint[] | null> {
  const key = process.env.EVDS_API_KEY;
  if (!key) return null;
  const end = new Date();
  const e = `01-${String(end.getMonth() + 1).padStart(2, "0")}-${end.getFullYear()}`;
  try {
    const res = await fetch(
      `https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.GENENDEKS.T1&startDate=01-01-2021&endDate=${e}&type=json`,
      { headers: { key }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: Array<{ Tarih?: string; TP_GENENDEKS_T1?: string | null }> };
    const points: CpiPoint[] = [];
    for (const item of data.items || []) {
      const v = item.TP_GENENDEKS_T1 ? parseFloat(item.TP_GENENDEKS_T1) : NaN;
      const [y, m] = (item.Tarih || "").split("-").map(Number);
      if (!y || !m || !Number.isFinite(v) || v <= 0) continue;
      points.push({ ym: `${y}-${String(m).padStart(2, "0")}`, idx: v });
    }
    points.sort((a, b) => a.ym.localeCompare(b.ym));
    return points.length >= 25 ? points : null;
  } catch {
    return null;
  }
}

export function buildCpiRows(points: CpiPoint[]): CpiRow[] {
  const rows: CpiRow[] = [];
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const monthly = (p.idx / points[i - 1].idx - 1) * 100;
    const annual = i >= 12 ? (p.idx / points[i - 12].idx - 1) * 100 : null;
    let avg12: number | null = null;
    if (i >= 23) {
      const sum = (from: number, to: number) => points.slice(from, to + 1).reduce((s, x) => s + x.idx, 0);
      avg12 = (sum(i - 11, i) / sum(i - 23, i - 12) - 1) * 100;
    }
    rows.push({ ym: p.ym, label: monthLabel(p.ym), monthly, annual, avg12 });
  }
  return rows;
}

/**
 * Memur/emekli enflasyon farkı penceresi: Ocak zammı = Temmuz–Aralık birikmiş,
 * Temmuz zammı = Ocak–Haziran birikmiş TÜFE. Son açıklanan aya kadarki kısmı
 * döner; pencere tamamlanmadıysa `complete: false` (tahmin YAPILMAZ).
 */
export function halfYearCumulative(points: CpiPoint[]) {
  const last = points.at(-1)!;
  const [y, m] = last.ym.split("-").map(Number);
  const baseYm = m <= 6 ? `${y - 1}-12` : `${y}-06`;
  const base = points.find((p) => p.ym === baseYm);
  if (!base) return null;
  const firstYm = nextMonth(baseYm);
  return {
    fromLabel: monthLabel(firstYm),
    toLabel: monthLabel(last.ym),
    months: m <= 6 ? m : m - 6,
    pct: (last.idx / base.idx - 1) * 100,
    complete: m === 6 || m === 12,
    raiseMonth: m <= 6 ? `Temmuz ${y}` : `Ocak ${y + 1}`,
  };
}

export async function getCpiSnapshot() {
  const points = await getCpiSeries();
  if (!points) return null;
  const rows = buildCpiRows(points);
  return { rows, latest: rows.at(-1)!, half: halfYearCumulative(points) };
}

export const pct = (v: number | null, d = 2) =>
  v === null ? "—" : `%${v.toLocaleString("tr-TR", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

type CpiSnapshot = NonNullable<Awaited<ReturnType<typeof getCpiSnapshot>>>;

/**
 * Kira/emekli/memur araçlarının başlığı son açıklanan TÜFE'den kurulur:
 * "Aralık 2026 kira artış oranı" gibi aylık sorgular araç sayfasına düşsün,
 * ayrı ince sayfa açılmasın. Veri yoksa null → statik başlık kalır.
 */
export function cpiToolMeta(kind: "kira" | "emekli" | "memur", snap: CpiSnapshot | null) {
  if (!snap) return null;
  const { latest, half } = snap;
  if (kind === "kira") {
    if (latest.avg12 === null) return null;
    const ay = monthLabel(nextMonth(latest.ym));
    return {
      title: `${ay} Kira Artış Oranı ${pct(latest.avg12)} — Kira Artışı Hesaplama`,
      desc: `${ay}'da yenilenen kira sözleşmelerinde azami artış ${pct(latest.avg12)} (TÜİK ${latest.label} TÜFE 12 aylık ortalama, TBK 344). Yeni kira bedelini hesaplayın.`,
    };
  }
  if (!half) return null;
  const donem = `${half.months} aylık enflasyon ${pct(half.pct)} (${half.fromLabel}–${half.toLabel})`;
  if (kind === "emekli") {
    return {
      title: half.complete
        ? `${half.raiseMonth} Emekli Zammı ${pct(half.pct)} — Emekli Maaşı Zam Hesaplama`
        : `${half.raiseMonth} Emekli Zammı: ${half.months} Aylık Enflasyon ${pct(half.pct)} — Hesaplama`,
      desc: `SSK ve Bağ-Kur emeklisinin ${half.raiseMonth} zammı 6 aylık TÜFE'dir. ${half.complete ? "Kesinleşen" : "Şu ana kadarki"} ${donem}, TÜİK. Yeni aylığınızı hesaplayın.`,
    };
  }
  return {
    title: `${half.raiseMonth} Memur Zammı Hesaplama — ${half.months} Aylık Enflasyon ${pct(half.pct)}`,
    desc: `Memur ve memur emeklisi ${half.raiseMonth} zammı: toplu sözleşme oranı + enflasyon farkı. ${half.complete ? "Kesinleşen" : "Şu ana kadarki"} ${donem}, TÜİK. Yeni maaşı hesaplayın.`,
  };
}
