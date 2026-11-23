import { prisma } from "../lib/db";

interface Totals {
  impressions: number;
  clicks: number;
  weightedPosition: number;
}

interface QueryPageTotals extends Totals {
  query: string;
  page: string;
}

function addRow(totals: Totals, row: { impressions: number; clicks: number; position: number }) {
  totals.impressions += row.impressions;
  totals.clicks += row.clicks;
  totals.weightedPosition += row.position * row.impressions;
}

function averagePosition(totals: Totals): number {
  return totals.impressions > 0 ? totals.weightedPosition / totals.impressions : 0;
}

function formatCtr(totals: Totals): string {
  return totals.impressions > 0 ? `${(100 * totals.clicks / totals.impressions).toFixed(2)}%` : "0.00%";
}

function formatPage(page: string): string {
  try {
    const url = new URL(page);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return page;
  }
}

async function main() {
  const days = Math.max(7, Math.min(180, Number(process.argv[2]) || 28));
  // Search Console typically trails by a few days. Use completed UTC dates and
  // retain the requested window instead of mixing every historical snapshot.
  const endExclusive = new Date();
  endExclusive.setUTCHours(0, 0, 0, 0);
  endExclusive.setUTCDate(endExclusive.getUTCDate() - 2);
  const since = new Date(endExclusive);
  since.setUTCDate(since.getUTCDate() - days);

  const rows = await prisma.searchPerformance.findMany({
    where: { source: "gsc", date: { gte: since, lt: endExclusive } },
    select: { page: true, query: true, clicks: true, impressions: true, position: true },
  });

  const byQuery = new Map<string, Totals>();
  const byPage = new Map<string, Totals>();
  const byQueryPage = new Map<string, QueryPageTotals>();

  const empty = (): Totals => ({ impressions: 0, clicks: 0, weightedPosition: 0 });
  for (const row of rows) {
    const query = byQuery.get(row.query) ?? empty();
    addRow(query, row);
    byQuery.set(row.query, query);

    const page = byPage.get(row.page) ?? empty();
    addRow(page, row);
    byPage.set(row.page, page);

    const key = `${row.query}\u0000${row.page}`;
    const queryPage = byQueryPage.get(key) ?? { query: row.query, page: row.page, ...empty() };
    addRow(queryPage, row);
    byQueryPage.set(key, queryPage);
  }

  const totals = [...byQuery.values()].reduce((sum, value) => {
    sum.impressions += value.impressions;
    sum.clicks += value.clicks;
    sum.weightedPosition += value.weightedPosition;
    return sum;
  }, empty());

  console.log(`GSC aralığı: ${since.toISOString().slice(0, 10)} – ${new Date(endExclusive.getTime() - 86_400_000).toISOString().slice(0, 10)} UTC`);
  console.log(`satır: ${rows.length} | sorgu: ${byQuery.size} | sayfa: ${byPage.size} | gösterim: ${totals.impressions} | tık: ${totals.clicks} | CTR: ${formatCtr(totals)}`);

  console.log("\n=== SAYFALAR (gösterime göre) ===");
  [...byPage.entries()].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 15)
    .forEach(([page, value]) => console.log(
      `gös ${String(value.impressions).padStart(4)} | tık ${String(value.clicks).padStart(3)} | CTR ${formatCtr(value).padStart(6)} | ağırlıklı sıra ${averagePosition(value).toFixed(1).padStart(5)} | ${formatPage(page)}`,
    ));

  console.log("\n=== FIRSAT: ağırlıklı sıra 8–30, sorgu + sayfa bazında ===");
  [...byQueryPage.values()]
    .filter((value) => value.impressions >= 2 && averagePosition(value) >= 8 && averagePosition(value) <= 30)
    .sort((a, b) => b.impressions - a.impressions).slice(0, 20)
    .forEach((value) => console.log(
      `gös ${String(value.impressions).padStart(3)} | tık ${value.clicks} | CTR ${formatCtr(value)} | sıra ${averagePosition(value).toFixed(1).padStart(5)} | ${value.query} → ${formatPage(value.page)}`,
    ));

  console.log("\n=== EN ÇOK GÖSTERİM ALAN SORGULAR ===");
  [...byQuery.entries()].sort((a, b) => b[1].impressions - a[1].impressions).slice(0, 20)
    .forEach(([query, value]) => console.log(
      `gös ${String(value.impressions).padStart(3)} | tık ${value.clicks} | CTR ${formatCtr(value)} | sıra ${averagePosition(value).toFixed(1).padStart(5)} | ${query}`,
    ));
}

main().catch((error) => console.error("HATA:", (error as Error).message));
