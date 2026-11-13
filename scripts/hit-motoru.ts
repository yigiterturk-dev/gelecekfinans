import { config } from "dotenv";
import { XMLParser } from "fast-xml-parser";
import path from "node:path";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../lib/db";
import { COMMODITY_QUERY } from "../lib/seo-feedback";
import {
  expectedClicks,
  newsScore,
  searchScore,
  verdict,
  type NewsSignals,
} from "../lib/hit-score";

for (const file of [".env.local", ".env.production", ".env"]) {
  if (!process.env.DATABASE_URL) config({ path: path.join(process.cwd(), file), quiet: true });
}

const BASE = "https://gelecekfinans.com";
const TARGET_POSITION = 6;
const BRAND = /gelecekfinans/i;
const FINANCE = /(borsa|dolar|euro|avro|alt[ıi]n|kripto|bitcoin|faiz|enflasyon|tcmb|merkez banka|asgari [üu]cret|emekli|vergi|zam|b[üu]t[çc]e|banka|hisse|fon|yat[ıi]r[ıi]m|ekonomi|piyasa|ihracat|ithalat|cari a[çc][ıi]k|i[şs]sizlik|konut|kira|maa[şs]|prim|d[ıi][şs] bor[çc])/i;
const GENERIC_ENTITY = new Set([
  "turkiye","turkiye cumhuriyet merkez bankasi","merkez bankasi","tcmb","fed","ecb","abd",
  "abd merkez bankasi","avrupa","avrupa birligi","almanya","cin","japonya","fransa","ingiltere",
  "italya","ispanya","rusya","ukrayna","iran","israil","suriye","azerbaycan","katar","suudi arabistan",
  "ankara","istanbul","izmir","washington","new york","londra","brüksel","bruksel","moskova",
  "altin","gumus","petrol","brent petrol","motorin","benzin","dolar","euro","borsa",
  "borsa istanbul","enflasyon","faiz","resmi gazete","hazine ve maliye bakanligi",
]);
const COMPETITOR = /(hesapkurdu|forbes|bloomberght|bigpara|investing|tradingview|mynet|ntvpara|doviz\.com|paratic|getmidas|midas)/i;
const NOISE = /^(kap \*\*\*|\*\*\*)/i;
const RECAP = /(g[üu]ne nas[ıi]l (ba[şs]lad[ıi]|ba[şs]layacak)|g[üu]nl[üu]k (borsa|piyasa) (yorumu|özeti)|kapan[ıi][şs] raporu|a[çc][ıi]l[ıi][şs] raporu|haftal[ıi]k (borsa|piyasa) (özeti|de[ğg]erlendirmesi))/i;
const STOP = new Set([
  "ve","ile","için","bir","bu","da","de","mi","ne","en","çok","daha","son","yeni","göre","kadar",
  "olarak","olan","oldu","dedi","açıkladı","açıklama","bekleniyor","sonra","önce","gibi","ama",
  "ancak","ya","şu","her","tüm","yıl","yılı","yılın","dolar","milyar","milyon",
]);

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

function norm(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g")
    .replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return [...new Set(norm(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t)))];
}

function overlap(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.filter((t) => set.has(t)).length;
}

async function getXml(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return parser.parse(await res.text());
  } catch {
    return null;
  }
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function ageOf(pub: unknown): number {
  const t = Date.parse(String(pub || ""));
  return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 3.6e6) : 24;
}

interface TrendItem { title: string; rank: number; ageHours: number }
interface Headline { title: string; tokens: string[]; ageHours: number }

async function fetchTrends(): Promise<TrendItem[]> {
  const urls = [
    "https://trends.google.com/trending/rss?geo=TR",
    "https://trends.google.com/trends/trendingsearches/daily/rss?geo=TR",
  ];
  for (const url of urls) {
    const doc = (await getXml(url)) as { rss?: { channel?: { item?: unknown } } } | null;
    const items = asArray(doc?.rss?.channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
    if (items.length > 0) {
      return items.map((item, i) => ({
        title: String((item.title as string) || "").trim(),
        rank: i + 1,
        ageHours: ageOf(item.pubDate),
      }));
    }
  }
  return [];
}

async function fetchHeadlines(): Promise<Headline[]> {
  const urls = [
    "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=tr&gl=TR&ceid=TR:tr",
    ...["borsa", "dolar kuru", "enflasyon", "faiz kararı", "altın fiyatı", "kripto para", "asgari ücret", "emekli maaşı"].map(
      (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:1d`)}&hl=tr&gl=TR&ceid=TR:tr`,
    ),
  ];
  const results = await Promise.all(urls.map(getXml));
  const out: Headline[] = [];
  const seen = new Set<string>();
  for (const doc of results) {
    const channel = (doc as { rss?: { channel?: { item?: unknown } } } | null)?.rss?.channel;
    for (const item of asArray(channel?.item as Record<string, unknown> | Record<string, unknown>[] | undefined)) {
      const raw = String((item.title as string) || "").trim();
      const title = raw.replace(/\s+-\s+[^-]+$/, "").trim();
      if (!title || seen.has(norm(title))) continue;
      seen.add(norm(title));
      out.push({ title, tokens: tokens(title), ageHours: ageOf(item.pubDate) });
    }
  }
  return out;
}

interface NewsCandidate {
  topic: string;
  trendRank: number | null;
  headlineCount: number;
  ageHours: number;
  entity: string | null;
  coveredBy: string | null;
  score: number;
  verdict: string;
}

function buildNewsCandidates(
  trends: TrendItem[],
  headlines: Headline[],
  entities: string[],
  articleTitles: Headline[],
): NewsCandidate[] {
  const pool = headlines.filter((h) => FINANCE.test(h.title) && !NOISE.test(h.title) && !RECAP.test(h.title));
  const df = new Map<string, number>();
  for (const h of pool) for (const t of h.tokens) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = (t: string) => Math.log((pool.length + 1) / (1 + (df.get(t) ?? 0)));
  const weight = (a: Headline, b: Headline): { total: number; rare: boolean } => {
    const set = new Set(b.tokens);
    let total = 0;
    let rare = false;
    for (const t of a.tokens) {
      if (!set.has(t)) continue;
      const w = idf(t);
      total += w;
      if (w > 3) rare = true;
    }
    return { total, rare };
  };
  const related = (a: Headline) =>
    pool.filter((b) => b !== a && (() => { const w = weight(a, b); return w.rare && w.total >= 3.4; })());

  const matchEntity = (text: string): string | null => {
    const n = ` ${norm(text)} `;
    for (const e of entities) if (n.includes(` ${e} `)) return e;
    return null;
  };

  const matchArticle = (text: string): string | null => {
    const t = tokens(text);
    let best: { title: string; hit: number } | null = null;
    for (const article of articleTitles) {
      const hit = overlap(t, article.tokens);
      if (hit >= Math.max(3, Math.ceil(t.length * 0.6)) && (!best || hit > best.hit)) {
        best = { title: article.title, hit };
      }
    }
    return best?.title ?? null;
  };

  const picked: NewsCandidate[] = [];
  const covered = new Set<Headline>();

  for (const trend of trends) {
    if (!FINANCE.test(trend.title) || NOISE.test(trend.title) || RECAP.test(trend.title)) continue;
    const item: Headline = { title: trend.title, tokens: tokens(trend.title), ageHours: trend.ageHours };
    const rel = related(item);
    rel.forEach((r) => covered.add(r));
    picked.push({
      topic: trend.title,
      trendRank: trend.rank,
      headlineCount: rel.length,
      ageHours: Math.min(trend.ageHours, ...rel.map((r) => r.ageHours), 24),
      entity: matchEntity(trend.title),
      coveredBy: matchArticle(trend.title),
      score: 0,
      verdict: "GEÇ",
    });
  }

  const clustered = pool.filter((h) => !covered.has(h));
  const density = clustered
    .map((h) => ({ h, rel: related(h) }))
    .sort((a, b) => b.rel.length - a.rel.length);
  const used = new Set<Headline>();
  for (const { h, rel } of density) {
    if (used.has(h) || rel.length < 2) continue;
    used.add(h);
    rel.forEach((r) => used.add(r));
    picked.push({
      topic: h.title,
      trendRank: null,
      headlineCount: rel.length,
      ageHours: Math.min(h.ageHours, ...rel.map((r) => r.ageHours)),
      entity: matchEntity(h.title),
      coveredBy: matchArticle(h.title),
      score: 0,
      verdict: "GEÇ",
    });
  }

  const maxCount = Math.max(1, ...picked.map((c) => c.headlineCount));
  for (const c of picked) {
    const signals: NewsSignals = {
      trendRank: c.trendRank,
      headlineCount: c.headlineCount,
      ageHours: c.ageHours,
      entityMatched: Boolean(c.entity),
    };
    const base = newsScore(signals, { maxHeadlineCount: maxCount });
    c.score = Math.round(COMMODITY_QUERY.test(c.topic) ? base * 0.85 : base);
    c.verdict = c.coveredBy ? "GÜNCELLE" : verdict(c.score, "haber", false);
  }

  const unique: NewsCandidate[] = [];
  const seen: string[][] = [];
  for (const c of picked.sort((a, b) => b.score - a.score)) {
    const t = tokens(c.topic);
    if (seen.some((s) => s.filter((x) => t.includes(x)).length >= Math.min(3, t.length))) continue;
    seen.push(t);
    unique.push(c);
  }
  return unique;
}

interface SearchCandidate {
  term: string;
  page: string;
  impressions: number;
  position: number;
  hasPage: boolean;
  kind: "refresh" | "new";
  gain: number;
  score: number;
  verdict: string;
}

async function fetchSearchCandidates(days: number, minImpressions: number): Promise<{
  candidates: SearchCandidate[];
  totals: { impressions: number; rows: number; bestPosition: number | null };
}> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await prisma.searchPerformance.findMany({
    where: { date: { gte: since } },
    select: { page: true, query: true, impressions: true, position: true },
  });

  const slugs = new Set(
    (await prisma.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } })).map((a) => a.slug),
  );

  type Agg = { impressions: number; posSum: number; n: number; best: number; bestQuery: string };
  const pages = new Map<string, Agg>();
  const queries = new Map<string, Agg & { pages: Set<string> }>();

  const merge = (agg: Agg | undefined, row: (typeof rows)[number]): Agg => {
    const next = agg ?? { impressions: 0, posSum: 0, n: 0, best: Infinity, bestQuery: row.query };
    next.impressions += row.impressions;
    next.posSum += row.position;
    next.n += 1;
    if (row.position < next.best) {
      next.best = row.position;
      next.bestQuery = row.query;
    }
    return next;
  };

  for (const row of rows) {
    pages.set(row.page, merge(pages.get(row.page), row));
    const key = row.query.toLowerCase();
    const q = queries.get(key) ?? {
      impressions: 0,
      posSum: 0,
      n: 0,
      best: Infinity,
      bestQuery: row.query,
      pages: new Set<string>(),
    };
    merge(q, row);
    q.pages.add(row.page);
    queries.set(key, q);
  }

  const usable = (term: string) =>
    term.trim().split(/\s+/).length >= 2 &&
    !BRAND.test(term) &&
    !COMPETITOR.test(term) &&
    !COMMODITY_QUERY.test(term);

  const pageOf = (url: string) => url.replace(BASE, "").replace(/^\/$/, "/") || "/";
  const HUB = /^(\/$|\/araclar|\/arsiv|\/kategori\/|\/rehber|\/yazarlar|\/hakkimizda|\/iletisim|\/kunye|\/borsa$|\/doviz$|\/kripto$|\/altin$|\/faiz$)/;
  const hasDedicatedPage = (url: string) => {
    const page = pageOf(url);
    if (HUB.test(page)) return false;
    const slug = page.split("/").filter(Boolean).pop() ?? "";
    return slugs.has(slug) || page.split("/").filter(Boolean).length >= 2;
  };

  const candidates: SearchCandidate[] = [];
  for (const [url, agg] of pages) {
    if (agg.impressions < minImpressions || agg.best > 30 || !usable(agg.bestQuery)) continue;
    const position = agg.best;
    const gain = expectedClicks(agg.impressions, position, TARGET_POSITION);
    const score = searchScore(gain);
    candidates.push({
      term: agg.bestQuery,
      page: pageOf(url),
      impressions: agg.impressions,
      position,
      hasPage: hasDedicatedPage(url),
      kind: "refresh",
      gain,
      score,
      verdict: position <= TARGET_POSITION + 1 ? "KORU" : verdict(score, "arama", true),
    });
  }

  let best: number | null = null;
  for (const [term, agg] of queries) {
    best = best === null ? agg.best : Math.min(best, agg.best);
    if (agg.impressions < 2 || agg.best > 25 || !usable(term)) continue;
    if ([...agg.pages].some((p) => hasDedicatedPage(p))) continue;
    const gain = expectedClicks(agg.impressions, agg.best, TARGET_POSITION);
    const score = searchScore(gain);
    candidates.push({
      term,
      page: pageOf([...agg.pages][0]),
      impressions: agg.impressions,
      position: agg.best,
      hasPage: false,
      kind: "new",
      gain,
      score,
      verdict: verdict(score, "arama", false),
    });
  }

  return {
    candidates: candidates.sort((a, b) => b.score - a.score || b.impressions - a.impressions),
    totals: {
      impressions: [...pages.values()].reduce((s, a) => s + a.impressions, 0),
      rows: rows.length,
      bestPosition: Number.isFinite(best as number) ? (best as number) : null,
    },
  };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

interface Options {
  days: number;
  limit: number;
  minImpressions: number;
  ledger: string;
  report: string;
  json: boolean;
  queue: boolean;
  channel: "hepsi" | "haber" | "arama";
}

function parseArgs(argv: string[]): Options {
  const flag = (name: string) => argv.includes(`--${name}`);
  const val = (name: string, fallback: number) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? Number(argv[i + 1]) || fallback : fallback;
  };
  const str = (name: string, fallback: string) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
  };
  const channel = str("kanal", "hepsi");
  return {
    days: val("gun", 28),
    limit: val("limit", 10),
    minImpressions: val("min-gosterim", 20),
    ledger: str("ledger", process.env.HIT_LEDGER || path.join(process.cwd(), "veri", "hit-tahminleri.jsonl")),
    report: str("rapor", process.env.HIT_RAPOR || path.join(process.cwd(), "veri", "hit-raporu.md")),
    json: flag("json"),
    queue: flag("kuyruk"),
    channel: channel === "haber" || channel === "arama" ? channel : "hepsi",
  };
}

function stampTR(date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function clean(text: string, max = 70): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function renderMarkdown(
  stamp: string,
  summary: string,
  news: NewsCandidate[],
  search: SearchCandidate[],
  opts: Options,
): string {
  const lines: string[] = [`# Hit Raporu — ${stamp}`, "", summary, ""];
  if (opts.channel !== "arama") {
    lines.push("## Haber / Discover", "");
    if (news.length === 0) lines.push("_Aday yok._", "");
    else {
      lines.push("| # | Skor | Karar | Konu | Kaynak | Yaş | Varlık |", "| --- | --- | --- | --- | --- | --- | --- |");
      news.slice(0, opts.limit).forEach((c, i) =>
        lines.push(
          `| ${i + 1} | ${c.score} | ${c.verdict} | ${clean(c.topic).replaceAll("|", "/")} | ${c.headlineCount} | ${c.ageHours.toFixed(1)}s | ${c.entity ?? "-"} |`,
        ),
      );
      lines.push("");
    }
  }
  if (opts.channel !== "haber") {
    lines.push("## Organik arama", "");
    if (search.length === 0) lines.push("_Kazanılabilir sorgu yok._", "");
    else {
      lines.push(
        "| # | Skor | Karar | Sorgu | Gösterim | Sıra | Beklenen tık | Sayfa |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
      );
      search.slice(0, opts.limit).forEach((c, i) =>
        lines.push(
          `| ${i + 1} | ${c.score} | ${c.verdict} | ${clean(c.term, 50).replaceAll("|", "/")} | ${c.impressions} | ${c.position.toFixed(1)} | +${c.gain.toFixed(1)} | ${c.kind === "new" ? "yeni sayfa" : c.page} |`,
        ),
      );
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const wantNews = opts.channel !== "arama";
  const wantSearch = opts.channel !== "haber";

  const [lastRow, entityRows, recentArticles, trends, headlines] = await Promise.all([
    prisma.searchPerformance.findFirst({ orderBy: { date: "desc" }, select: { date: true } }),
    wantNews
      ? prisma.entity.findMany({ where: { type: { not: "INSTITUTION" } }, select: { key: true, name: true, aliases: true } })
      : Promise.resolve([]),
    wantNews
      ? prisma.article.findMany({
          where: { status: "PUBLISHED", publishedAt: { gte: new Date(Date.now() - 45 * 864e5) } },
          select: { title: true },
          take: 400,
        })
      : Promise.resolve([]),
    wantNews ? fetchTrends().catch(() => []) : Promise.resolve([]),
    wantNews ? fetchHeadlines().catch(() => []) : Promise.resolve([]),
  ]);

  const entities = [
    ...new Set(
      entityRows
        .flatMap((e) => [e.key, ...e.aliases.map(norm)])
        .filter((e) => e.length > 3 && !GENERIC_ENTITY.has(e)),
    ),
  ];

  const news = buildNewsCandidates(
    trends,
    headlines,
    entities,
    recentArticles.map((a) => ({ title: a.title, tokens: tokens(a.title), ageHours: 0 })),
  );
  const search = wantSearch
    ? await fetchSearchCandidates(opts.days, opts.minImpressions)
    : { candidates: [], totals: { impressions: 0, rows: 0, bestPosition: null } };

  const stamp = stampTR();
  const financeTrends = trends.filter((t) => FINANCE.test(t.title)).length;
  const summary =
    `GSC son veri: ${lastRow ? lastRow.date.toISOString().slice(0, 10) : "yok"} | pencere: ${opts.days}g | ` +
    `${search.totals.rows} satır / ${search.totals.impressions} gösterim | en iyi sıra: ${search.totals.bestPosition?.toFixed(1) ?? "-"} | ` +
    `trend: ${trends.length} (finans ${financeTrends}) | haber: ${headlines.length}`;

  console.log(`\n=== HIT MOTORU ${stamp} ===`);
  console.log(summary);

  if (wantNews) {
    console.log(`\n--- HABER / DISCOVER ---`);
    if (news.length === 0) console.log("  (aday yok: trend ve haber kaynakları boş ya da finans dışı)");
    for (const c of news.slice(0, opts.limit)) {
      console.log(
        `  ${pad(String(c.score), 3)} ${pad(c.verdict, 8)} ${pad(clean(c.topic, 56), 56)} kaynak:${pad(String(c.headlineCount), 3)} yaş:${c.ageHours.toFixed(1)}s varlık:${c.entity ?? "-"}${c.coveredBy ? ` | var: ${clean(c.coveredBy, 24)}` : ""}`,
      );
    }
  }

  if (wantSearch) {
    console.log(`\n--- ORGANİK ARAMA ---`);
    if (search.candidates.length === 0) {
      console.log(`  (kazanılabilir sorgu yok: gösterimler ${opts.minImpressions}'in altında ya da sıra 30'un gerisinde)`);
    }
    for (const c of search.candidates.slice(0, opts.limit)) {
      const note = c.kind === "new" ? "(yeni sayfa)" : c.hasPage ? c.page : `${c.page} (hub)`;
      console.log(
        `  ${pad(String(c.score), 3)} ${pad(c.verdict, 10)} ${pad(`"${c.term}"`, 44)} gös:${pad(String(c.impressions), 4)} sıra:${c.position.toFixed(1)}→${TARGET_POSITION} +${c.gain.toFixed(1)} tık/${opts.days}g ${note}`,
      );
    }
  }

  if (opts.json) {
    await mkdir(path.dirname(opts.ledger), { recursive: true });
    await appendFile(
      opts.ledger,
      `${JSON.stringify({
        at: new Date().toISOString(),
        days: opts.days,
        target: TARGET_POSITION,
        totals: search.totals,
        news: news.slice(0, opts.limit),
        search: search.candidates.slice(0, opts.limit),
      })}\n`,
    );
    console.log(`\nledger: ${opts.ledger}`);
  }

  if (opts.report) {
    await mkdir(path.dirname(opts.report), { recursive: true });
    await writeFile(opts.report, renderMarkdown(stamp, summary, news, search.candidates, opts));
    console.log(`rapor: ${opts.report}`);
  }

  if (opts.queue) {
    let added = 0;
    for (const c of search.candidates.filter((s) => s.verdict === "YAZ").slice(0, opts.limit)) {
      if (await prisma.keyword.findUnique({ where: { term: c.term } })) continue;
      await prisma.keyword.create({
        data: {
          term: c.term,
          category: "ekonomi",
          cluster: "hit-motoru",
          origin: "gsc",
          priority: Math.min(95, 55 + c.score),
          impressions: c.impressions,
          position: Number(c.position.toFixed(1)),
          notes: `Hit motoru: beklenen +${c.gain.toFixed(1)} tık/${opts.days}g`,
        },
      });
      added += 1;
    }
    console.log(`\nkuyruğa eklenen kelime: ${added}`);
  }
}

main()
  .catch((e) => {
    console.error("HATA:", (e as Error).message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
