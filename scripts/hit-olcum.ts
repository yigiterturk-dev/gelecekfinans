import { config } from "dotenv";
import path from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { prisma } from "../lib/db";

for (const file of [".env.local", ".env.production", ".env"]) {
  if (!process.env.DATABASE_URL) config({ path: path.join(process.cwd(), file), quiet: true });
}

const BASE = "https://gelecekfinans.com";

interface SearchForecast {
  term: string;
  page: string;
  impressions: number;
  position: number;
  kind: "refresh" | "new";
  gain: number;
  score: number;
  verdict: string;
}

interface NewsForecast {
  topic: string;
  headlineCount: number;
  entity: string | null;
  score: number;
  verdict: string;
}

interface LedgerEntry {
  at: string;
  days: number;
  target: number;
  news?: NewsForecast[];
  search?: SearchForecast[];
}

const STOP = new Set(["ve","ile","için","bir","bu","da","de","mi","ne","en","çok","daha","son","yeni","göre","kadar","olan","oldu","dedi"]);
function tokens(s: string): string[] {
  return [...new Set(
    s.toLocaleLowerCase("tr")
      .replace(/[^a-z0-9çğıöşü ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  )];
}

function overlap(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.filter((t) => set.has(t)).length;
}

function stampTR(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

async function loadLedger(file: string): Promise<LedgerEntry[]> {
  let raw = "";
  try {
    raw = await readFile(file, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as LedgerEntry];
      } catch {
        return [];
      }
    });
}

async function main() {
  const args = process.argv.slice(2);
  const val = (name: string, fallback: number) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? Number(args[i + 1]) || fallback : fallback;
  };
  const str = (name: string, fallback: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
  };

  const ledgerPath = str("ledger", process.env.HIT_LEDGER || path.join(process.cwd(), "veri", "hit-tahminleri.jsonl"));
  const outPath = str("cikti", path.join(process.cwd(), "veri", "hit-kalibrasyon.json"));
  const minAgeDays = val("min-yas", 7);
  const windowDays = val("pencere", 14);
  const dataLagDays = val("gecikme", 3);

  const entries = await loadLedger(ledgerPath);
  if (entries.length === 0) {
    console.log(`ledger boş ya da yok: ${ledgerPath}`);
    return;
  }

  const now = Date.now();
  const usable = entries.filter((e) => (now - Date.parse(e.at)) / 864e5 >= minAgeDays);
  if (usable.length === 0) {
    console.log(`ölçülecek kayıt yok (${entries.length} kayıt, hepsi ${minAgeDays} günden yeni)`);
    return;
  }

  const searchResults: Array<{ term: string; verdict: string; predicted: number; actual: number }> = [];
  const newsResults: Array<{ topic: string; verdict: string; written: boolean; slug: string | null; gscClicks: number; pageViews: number }> = [];

  for (const entry of usable) {
    const start = new Date(entry.at);
    const rawEnd = new Date(start.getTime() + windowDays * 864e5);
    const laggedEnd = new Date(now - dataLagDays * 864e5);
    const end = rawEnd < laggedEnd ? rawEnd : laggedEnd;
    const windowStart = start;
    const windowLen = (end.getTime() - start.getTime()) / 864e5;
    if (windowLen < 1) continue;

    for (const forecast of entry.search ?? []) {
      if (forecast.kind === "new") continue;
      const pageUrl = `${BASE}${forecast.page === "/" ? "" : forecast.page}`;
      const rows = await prisma.searchPerformance.findMany({
        where: { page: pageUrl, date: { gte: windowStart, lte: end } },
        select: { clicks: true },
      });
      const actual = rows.reduce((sum, r) => sum + r.clicks, 0);
      searchResults.push({
        term: forecast.term,
        verdict: forecast.verdict,
        predicted: (forecast.gain * windowLen) / Math.max(1, entry.days),
        actual,
      });
    }

    const published = await prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: windowStart, lte: end } },
      select: { slug: true, title: true, publishedAt: true },
    });

    for (const forecast of entry.news ?? []) {
      const topicTokens = tokens(forecast.topic);
      let match: { slug: string; title: string } | null = null;
      let bestHit = 0;
      for (const article of published) {
        const hit = overlap(topicTokens, tokens(article.title));
        if (hit >= Math.max(3, Math.ceil(topicTokens.length * 0.5)) && hit > bestHit) {
          bestHit = hit;
          match = { slug: article.slug, title: article.title };
        }
      }
      if (!match) {
        newsResults.push({ topic: forecast.topic, verdict: forecast.verdict, written: false, slug: null, gscClicks: 0, pageViews: 0 });
        continue;
      }
      const gscRows = await prisma.searchPerformance.findMany({
        where: { page: { endsWith: `/${match.slug}` }, date: { gte: windowStart, lte: end } },
        select: { clicks: true },
      });
      const pageViews = await prisma.pageView.count({
        where: { path: { contains: `/${match.slug}` }, createdAt: { gte: windowStart, lte: end } },
      });
      newsResults.push({
        topic: forecast.topic,
        verdict: forecast.verdict,
        written: true,
        slug: match.slug,
        gscClicks: gscRows.reduce((sum, r) => sum + r.clicks, 0),
        pageViews,
      });
    }

    console.log(
      `\n${stampTR(entry.at)} kaydı | ölçüm ${windowStart.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)} (${windowLen.toFixed(0)}g)`,
    );
    for (const result of searchResults.slice(-((entry.search ?? []).filter((s) => s.kind !== "new").length))) {
      console.log(
        `  arama  ${result.verdict.padEnd(10)} "${result.term.slice(0, 40).padEnd(40)}" tahmin:${result.predicted.toFixed(1).padStart(5)} gerçek:${String(result.actual).padStart(4)}`,
      );
    }
    for (const result of newsResults.slice(-(entry.news ?? []).length)) {
      const status = result.written ? `${result.gscClicks} GSC tık + ${result.pageViews} sayfa görüntüleme (${result.slug})` : "yazılmadı";
      console.log(`  haber  ${result.verdict.padEnd(8)} "${result.topic.slice(0, 44).padEnd(44)}" ${status}`);
    }
  }

  const searchN = searchResults.length;
  const searchPredicted = searchResults.reduce((s, r) => s + r.predicted, 0);
  const searchActual = searchResults.reduce((s, r) => s + r.actual, 0);
  const searchMae = searchN
    ? searchResults.reduce((s, r) => s + Math.abs(r.predicted - r.actual), 0) / searchN
    : 0;
  const searchHits = searchResults.filter((r) => r.actual > 0).length;

  const newsN = newsResults.length;
  const written = newsResults.filter((r) => r.written);
  const newsClicks = written.reduce((s, r) => s + r.gscClicks + r.pageViews, 0);

  console.log(`\n=== ÖZET ===`);
  if (searchN > 0) {
    console.log(
      `arama: ${searchN} tahmin | tahmin ${searchPredicted.toFixed(1)} tık, gerçek ${searchActual} tık | MAE ${searchMae.toFixed(2)} | tık alan tahmin ${pct(searchHits / searchN)}`,
    );
  } else {
    console.log("arama: ölçülecek tahmin yok");
  }
  if (newsN > 0) {
    console.log(
      `haber: ${newsN} tahmin | yazılan ${written.length} (${pct(written.length / newsN)}) | yazılan başına ort. tık+PV ${written.length ? (newsClicks / written.length).toFixed(1) : "0"}`,
    );
  } else {
    console.log("haber: ölçülecek tahmin yok");
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    `${JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        ledger: ledgerPath,
        minAgeDays,
        windowDays,
        search: { n: searchN, predicted: searchPredicted, actual: searchActual, mae: searchMae, hitRate: searchN ? searchHits / searchN : 0, rows: searchResults },
        news: { n: newsN, written: written.length, avgPayoff: written.length ? newsClicks / written.length : 0, rows: newsResults },
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\nçıktı: ${outPath}`);
}

main()
  .catch((e) => {
    console.error("HATA:", (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
