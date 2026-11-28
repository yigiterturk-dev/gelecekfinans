/**
 * BIST finansal tabloları — İş Yatırım'ın kamuya açık mali tablo ucundan.
 *
 * Kaynak, şirketlerin KAP'a gönderdiği finansal tabloların İş Yatırım
 * tarafından yayımlanan halidir; API anahtarı istemez, lisans ücreti yoktur.
 * Bu yüzden sayfada kaynak açıkça yazılır ve kesin tutar için KAP bildirimi
 * esas kabul edilir.
 *
 * Uç, dört dönemi birlikte döner ve parametre SIRASI önemlidir:
 *   companyCode, exchange, financialGroup, year1, period1, ... year4, period4
 * financialGroup: sanayi/ticari şirketlerde "XI_29", bankalarda "UFRS_K".
 *
 * Tüm çağrılar savunmacıdır (timeout + try/catch + Next revalidate). Hata
 * durumunda `null` döner; sayfa "veri alınamadı" gösterir, uydurma rakam yok.
 */

const ENDPOINT =
  "https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/MaliTablo";

/** Bilinen banka kodları — banka şablonu (UFRS_K) ile çekilir. */
const BANK_TICKERS = new Set(["GARAN", "AKBNK", "ISCTR", "YKBNK", "HALKB", "VAKBN", "QNBFB", "TSKB", "ALBRK"]);

export type StatementTemplate = "industrial" | "bank";

/** Bir mali tablo dönemi. `quarter` 1-4; 4 = yıl sonu (12 aylık). */
export interface FinPeriod {
  year: number;
  quarter: number;
  /** Uçtan gelen dönem sonu numarası: 3, 6, 9 veya 12. */
  endMonth: number;
  /** "2026/9" gibi kısa etiket. */
  key: string;
  /** "9 aylık" / "12 aylık" — kümülatif çerçeve. */
  frame: string;
}

export interface FinLine {
  code: string;
  label: string;
  values: Array<number | null>;
}

export interface Financials {
  ticker: string;
  template: StatementTemplate;
  periods: FinPeriod[];
  lines: FinLine[];
  /** Son dönem bilanço tarihi (YYYY-MM-DD). */
  asOf: string;
  source: string;
}

interface RawItem {
  itemCode?: string;
  itemDescTr?: string;
  value1?: string;
  value2?: string;
  value3?: string;
  value4?: string;
}

/** Çeyrek sonu + yasal bildirim payı. Bir dönem ancak bu süre geçince "açıklandı" sayılır. */
const FILING_GRACE_DAYS: Record<number, number> = { 1: 40, 2: 50, 3: 40, 4: 70 };

function expectedLatest(today = new Date()): { year: number; quarter: number } {
  let year = today.getUTCFullYear();
  let quarter = Math.floor(today.getUTCMonth() / 3) + 1;
  for (let i = 0; i < 6; i += 1) {
    const end = new Date(Date.UTC(year, quarter * 3, 0));
    const daysSinceEnd = (today.getTime() - end.getTime()) / 86_400_000;
    if (daysSinceEnd >= FILING_GRACE_DAYS[quarter]) return { year, quarter };
    quarter -= 1;
    if (quarter === 0) {
      quarter = 4;
      year -= 1;
    }
  }
  return { year: year - 1, quarter: 4 };
}

function quarterToPeriod({ year, quarter }: { year: number; quarter: number }): FinPeriod {
  const endMonth = quarter * 3;
  return {
    year,
    quarter,
    endMonth,
    key: `${year}/${endMonth}`,
    frame: endMonth === 12 ? "12 aylık" : `${endMonth} aylık`,
  };
}

/**
 * Karşılaştırma kolonları: en son dönem, geçen yılın aynı dönemi, önceki yıl
 * sonu ve iki yıl önceki yıl sonu. Böylece hem yıllık (YoY) hem de yıllık
 * (12 aylık) çerçeve aynı tabloda dürüstçe gösterilir.
 */
function comparisonPeriods(today = new Date()): FinPeriod[] {
  const latest = expectedLatest(today);
  const yearEnd = (year: number) => quarterToPeriod({ year, quarter: 4 });
  return [
    quarterToPeriod(latest),
    quarterToPeriod({ year: latest.year - 1, quarter: latest.quarter }),
    yearEnd(latest.year - 1),
    yearEnd(latest.year - 2),
  ];
}

function toNumber(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function fetchTable(
  ticker: string,
  template: StatementTemplate,
  periods: FinPeriod[],
): Promise<RawItem[] | null> {
  const group = template === "bank" ? "UFRS_K" : "XI_29";
  const p = [0, 1, 2, 3].map((i) => periods[i] ?? periods[periods.length - 1]);
  const qs = new URLSearchParams({
    companyCode: ticker,
    exchange: "4",
    financialGroup: group,
    year1: String(p[0].year),
    period1: String(p[0].endMonth),
    year2: String(p[1].year),
    period2: String(p[1].endMonth),
    year3: String(p[2].year),
    period3: String(p[2].endMonth),
    year4: String(p[3].year),
    period4: String(p[3].endMonth),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${ENDPOINT}?${qs.toString()}`, {
      next: { revalidate: 43_200 },
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; GelecekFinansBot/1.0)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { value?: RawItem[] };
    const rows = data.value ?? [];
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Şablona göre tabloda gösterilecek kalemler. Kodlar şablon içinde sabittir. */
const INDUSTRIAL_LINES: Array<{ code: string; label: string }> = [
  { code: "1BL", label: "Toplam Varlıklar" },
  { code: "1AA", label: "Nakit ve Nakit Benzerleri" },
  { code: "2N", label: "Özkaynaklar" },
  { code: "2AA", label: "Kısa Vadeli Finansal Borçlar" },
  { code: "2BA", label: "Uzun Vadeli Finansal Borçlar" },
  { code: "3C", label: "Satış Gelirleri" },
  { code: "3D", label: "Brüt Kâr" },
  { code: "3DF", label: "Faaliyet Kârı" },
  { code: "3Z", label: "Net Kâr (Ana Ortaklık)" },
  { code: "4B", label: "Amortisman" },
  { code: "4C", label: "İşletme Faaliyetlerinden Nakit" },
];

const BANK_LINES: Array<{ code: string; label: string }> = [
  { code: "1Z", label: "Toplam Aktif" },
  { code: "1AF", label: "Krediler" },
  { code: "2A", label: "Mevduat" },
  { code: "2O", label: "Özkaynaklar" },
  { code: "3A", label: "Faiz Gelirleri" },
  { code: "3C", label: "Net Faiz Geliri" },
  { code: "3CA", label: "Net Ücret ve Komisyon Geliri" },
  { code: "3CH", label: "Net Faaliyet Kârı" },
  { code: "3Z", label: "Net Dönem Kârı" },
];

function pickLines(rows: RawItem[], defs: Array<{ code: string; label: string }>): FinLine[] {
  const byCode = new Map(rows.map((r) => [r.itemCode ?? "", r]));
  return defs.flatMap(({ code, label }) => {
    const r = byCode.get(code);
    if (!r) return [];
    return [
      {
        code,
        label,
        values: [toNumber(r.value1), toNumber(r.value2), toNumber(r.value3), toNumber(r.value4)],
      },
    ];
  });
}

/**
 * Hisse için son dört dönemin finansal tablosunu getirir.
 * Banka şablonu boş dönerse sanayi şablonuna, tersi de geçerlidir.
 */
export async function getFinancials(ticker: string): Promise<Financials | null> {
  const symbol = ticker.toUpperCase();
  const periods = comparisonPeriods();
  const preferred: StatementTemplate = BANK_TICKERS.has(symbol) ? "bank" : "industrial";
  const fallback: StatementTemplate = preferred === "bank" ? "industrial" : "bank";

  let template = preferred;
  let rows = await fetchTable(symbol, preferred, periods);
  if (!rows) {
    template = fallback;
    rows = await fetchTable(symbol, fallback, periods);
  }
  if (!rows) return null;

  const lines = pickLines(rows, template === "bank" ? BANK_LINES : INDUSTRIAL_LINES);
  if (lines.length === 0) return null;

  const latest = periods[0];
  const asOf = new Date(Date.UTC(latest.year, latest.endMonth, 0)).toISOString().slice(0, 10);

  return {
    ticker: symbol,
    template,
    periods,
    lines,
    asOf,
    source: "İş Yatırım — KAP finansal tabloları",
  };
}

/** Birden çok hisseyi sınırlı eşzamanlılıkla getirir (liste sayfaları için). */
export async function getFinancialsBatch(
  tickers: string[],
  concurrency = 5,
): Promise<Map<string, Financials | null>> {
  const out = new Map<string, Financials | null>();
  const queue = [...tickers];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (;;) {
      const ticker = queue.shift();
      if (!ticker) return;
      out.set(ticker, await getFinancials(ticker));
    }
  });
  await Promise.all(workers);
  return out;
}

/* --------------------------------------------------------------------------
 * Türetilmiş metrikler
 * ------------------------------------------------------------------------ */
export interface FinSummary {
  /** Son 12 ay (TTM) akış kalemleri; hesaplanamıyorsa null. */
  revenueTtm: number | null;
  netIncomeTtm: number | null;
  ebitdaTtm: number | null;
  /** En son bilanço kalemleri. */
  totalAssets: number | null;
  equity: number | null;
  netDebt: number | null;
  /** Oranlar (yüzde veya kat). */
  revenueYoY: number | null;
  netIncomeYoY: number | null;
  netMargin: number | null;
  roe: number | null;
  netDebtToEbitda: number | null;
  loansToDeposits: number | null;
}

export function lineValue(fin: Financials, code: string, index: number): number | null {
  const line = fin.lines.find((l) => l.code === code);
  return line ? line.values[index] ?? null : null;
}

/** TTM = geçen yıl sonu + bu yıl kümülatif - geçen yıl aynı dönem. */
function ttm(a: number | null, b: number | null, c: number | null): number | null {
  if (a == null || b == null || c == null) return null;
  return a + b - c;
}

function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** Oranı yüzde puanına çevirir (0.123 → 12.3). */
function pctPoint(numerator: number | null, denominator: number | null): number | null {
  const r = ratio(numerator, denominator);
  return r == null ? null : r * 100;
}

export function summarize(fin: Financials): FinSummary {
  const [latest, priorYearSame, lastYearEnd] = [0, 1, 2];

  if (fin.template === "bank") {
    const netIncomeTtm = ttm(lineValue(fin, "3Z", lastYearEnd), lineValue(fin, "3Z", latest), lineValue(fin, "3Z", priorYearSame));
    const equity = lineValue(fin, "2O", latest);
    const loans = lineValue(fin, "1AF", latest);
    const deposits = lineValue(fin, "2A", latest);
    return {
      revenueTtm: ttm(lineValue(fin, "3C", lastYearEnd), lineValue(fin, "3C", latest), lineValue(fin, "3C", priorYearSame)),
      netIncomeTtm,
      ebitdaTtm: null,
      totalAssets: lineValue(fin, "1Z", latest),
      equity,
      netDebt: null,
      revenueYoY: pctChange(lineValue(fin, "3C", latest), lineValue(fin, "3C", priorYearSame)),
      netIncomeYoY: pctChange(lineValue(fin, "3Z", latest), lineValue(fin, "3Z", priorYearSame)),
      netMargin: null,
      roe: ratio(netIncomeTtm, equity),
      netDebtToEbitda: null,
      loansToDeposits: ratio(loans, deposits),
    };
  }

  const revenueTtm = ttm(lineValue(fin, "3C", lastYearEnd), lineValue(fin, "3C", latest), lineValue(fin, "3C", priorYearSame));
  const netIncomeTtm = ttm(lineValue(fin, "3Z", lastYearEnd), lineValue(fin, "3Z", latest), lineValue(fin, "3Z", priorYearSame));
  const ebitda = (i: number) => {
    const op = lineValue(fin, "3DF", i);
    const dep = lineValue(fin, "4B", i);
    return op == null ? null : op + (dep ?? 0);
  };
  const ebitdaTtm = ttm(ebitda(lastYearEnd), ebitda(latest), ebitda(priorYearSame));
  const equity = lineValue(fin, "2N", latest);
  const cash = lineValue(fin, "1AA", latest);
  const shortDebt = lineValue(fin, "2AA", latest);
  const longDebt = lineValue(fin, "2BA", latest);
  const netDebt =
    cash == null || shortDebt == null || longDebt == null ? null : shortDebt + longDebt - cash;

  return {
    revenueTtm,
    netIncomeTtm,
    ebitdaTtm,
    totalAssets: lineValue(fin, "1BL", latest),
    equity,
    netDebt,
    revenueYoY: pctChange(lineValue(fin, "3C", latest), lineValue(fin, "3C", priorYearSame)),
    netIncomeYoY: pctChange(lineValue(fin, "3Z", latest), lineValue(fin, "3Z", priorYearSame)),
    netMargin: pctPoint(netIncomeTtm, revenueTtm),
    roe: ratio(netIncomeTtm, equity),
    netDebtToEbitda: ratio(netDebt, ebitdaTtm),
    loansToDeposits: null,
  };
}
