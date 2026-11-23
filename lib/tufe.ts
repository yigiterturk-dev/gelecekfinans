import { parseDecimalInput } from "@/lib/parse-decimal-input";

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
  monthly: number | null;
  annual: number | null;
  /** TBK 344 kira tavanı: son 12 ay ortalaması / önceki 12 ay ortalaması − 1 */
  avg12: number | null;
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function percentChange(current: number, base: number): number | null {
  if (!Number.isFinite(current) || current <= 0 || !Number.isFinite(base) || base <= 0) return null;
  const change = (current / base - 1) * 100;
  return Number.isFinite(change) ? change : null;
}

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
    const seenMonths = new Set<string>();
    for (const item of data.items || []) {
      const v = item.TP_GENENDEKS_T1 ? parseDecimalInput(item.TP_GENENDEKS_T1) : NaN;
      // EVDS monthly Tarih values may be unpadded (YYYY-M) or padded (YYYY-MM).
      const date = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(item.Tarih || "");
      if (!date || !Number.isFinite(v) || v <= 0) continue;
      const y = Number(date[1]);
      const m = Number(date[2]);
      const day = date[3] === undefined ? null : Number(date[3]);
      if (y < 1 || m < 1 || m > 12 || (day !== null && (day < 1 || day > new Date(Date.UTC(y, m, 0)).getUTCDate()))) continue;
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      if (seenMonths.has(ym)) return null;
      seenMonths.add(ym);
      points.push({ ym, idx: v });
    }
    points.sort((a, b) => a.ym.localeCompare(b.ym));
    return points.length >= 25 ? points : null;
  } catch {
    return null;
  }
}

export function buildCpiRows(points: CpiPoint[]): CpiRow[] {
  const rows: CpiRow[] = [];
  const monthIndex = (ym: string) => {
    const [year, month] = ym.split("-").map(Number);
    return year * 12 + month - 1;
  };
  const isContinuous = (from: number, to: number) => {
    for (let i = from + 1; i <= to; i++) {
      if (monthIndex(points[i].ym) - monthIndex(points[i - 1].ym) !== 1) return false;
    }
    return true;
  };
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const monthly = isContinuous(i - 1, i) ? percentChange(p.idx, points[i - 1].idx) : null;
    const annual = i >= 12 && isContinuous(i - 12, i)
      ? percentChange(p.idx, points[i - 12].idx)
      : null;
    let avg12: number | null = null;
    if (i >= 23 && isContinuous(i - 23, i)) {
      const sum = (from: number, to: number) => points.slice(from, to + 1).reduce((s, x) => s + x.idx, 0);
      avg12 = percentChange(sum(i - 11, i), sum(i - 23, i - 12));
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
  if (!points.length) return null;
  const last = points.at(-1)!;
  const [y, m] = last.ym.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isFinite(last.idx) || last.idx <= 0) return null;
  const baseYm = m <= 6 ? `${y - 1}-12` : `${y}-06`;
  const base = points.find((p) => p.ym === baseYm);
  if (!base || !Number.isFinite(base.idx) || base.idx <= 0) return null;
  const expectedMonths = m <= 6 ? m : m - 6;
  const availableMonths = new Set(points.map((point) => point.ym));
  let cursor = baseYm;
  for (let i = 0; i < expectedMonths; i++) {
    cursor = nextMonth(cursor);
    if (!availableMonths.has(cursor)) return null;
  }
  if (cursor !== last.ym) return null;
  const pct = percentChange(last.idx, base.idx);
  if (pct === null) return null;
  const firstYm = nextMonth(baseYm);
  return {
    fromLabel: monthLabel(firstYm),
    toLabel: monthLabel(last.ym),
    months: expectedMonths,
    pct,
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
