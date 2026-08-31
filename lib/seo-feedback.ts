import { prisma } from "./db";

/**
 * Search Console geri besleme döngüsü.
 *
 * Bot körlemesine yazmasın diye: hangi sorgu hangi sayfayı getiriyor, hangi
 * sayfa ilk sayfanın dibinde takılmış — bunları ölçüp kelime havuzuna ve
 * tazeleme kuyruğuna çeviriyoruz.
 */

/** Bu eşiğin altındaki gösterim gürültü sayılır. */
const MIN_OPPORTUNITY_IMPRESSIONS = 3;
/** 40. sıranın gerisi "Google bizi alakalı bulmuyor" demek; oraya yazmak boşa. */
const MAX_OPPORTUNITY_POSITION = 40;
/** Tazeleme için tatlı nokta: ilk sayfanın hemen dibi. */
const REFRESH_MIN_POSITION = 5;
const REFRESH_MAX_POSITION = 30;

/**
 * Canlı fiyat sayfalarının sorguları ("dolar kuru", "bitcoin kaç tl").
 * Bunlar Türkiye'nin en rekabetli sorguları; makaleyle kazanılmaz ve
 * kazanılsa bile ziyaretçi rakamı görüp çıkar — reklam geliri getirmez.
 */
export const COMMODITY_QUERY = /\b(kaç tl|ne kadar|kuru|kur|fiyat[ıi]?|al[ıi][şs]|sat[ıi][şs]|canl[ıi]|g[üu]ncel|anl[ıi]k)\b/i;

interface Aggregate {
  impressions: number;
  clicks: number;
  positionSum: number;
  samples: number;
  page: string;
}

function average(agg: Aggregate): number {
  return agg.samples > 0 ? agg.positionSum / agg.samples : 0;
}

async function aggregate(days: number, by: "query" | "page") {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await prisma.searchPerformance.findMany({ where: { date: { gte: since } } });

  const map = new Map<string, Aggregate>();
  for (const row of rows) {
    const key = by === "query" ? row.query : row.page;
    const agg = map.get(key) ?? { impressions: 0, clicks: 0, positionSum: 0, samples: 0, page: row.page };
    agg.impressions += row.impressions;
    agg.clicks += row.clicks;
    agg.positionSum += row.position;
    agg.samples += 1;
    map.set(key, agg);
  }
  return map;
}

/** Havuzdaki kelimelerin gerçek performansını Search Console'dan işler. */
export async function attachPerformanceToKeywords(days = 90) {
  const byQuery = await aggregate(days, "query");
  const keywords = await prisma.keyword.findMany({ select: { id: true, term: true } });

  let updated = 0;
  for (const keyword of keywords) {
    const agg = byQuery.get(keyword.term.toLowerCase()) ?? byQuery.get(keyword.term);
    if (!agg) continue;
    await prisma.keyword.update({
      where: { id: keyword.id },
      data: {
        impressions: agg.impressions,
        clicks: agg.clicks,
        position: Number(average(agg).toFixed(1)),
      },
    });
    updated += 1;
  }
  return { updated };
}

/** Sorgunun hangi kümeye ait olduğunu mevcut küme adlarından tahmin eder. */
export function guessCluster(query: string): { cluster: string; category: string } {
  const q = query.toLowerCase();
  if (/(bitcoin|btc|ethereum|kripto|coin|solana|cardano|doge)/.test(q))
    return { cluster: "kripto-temel", category: "kripto" };
  if (/(alt[ıi]n|gram alt[ıi]n|[çc]eyrek)/.test(q))
    return { cluster: "altin-yatirimi", category: "yatirim" };
  if (/(dolar|euro|avro|d[öo]viz|usd|\bkur\b|\bkuru\b)/.test(q))
    return { cluster: "doviz-temel", category: "doviz" };
  if (/(borsa|hisse|bist|halka arz|temett[üu])/.test(q))
    return { cluster: "borsa-baslangic", category: "borsa" };
  if (/(faiz|enflasyon|tcmb|merkez bankas)/.test(q))
    return { cluster: "makro-temel", category: "ekonomi" };
  return { cluster: "tasarruf-araclari", category: "yatirim" };
}

export interface MinedKeyword {
  term: string;
  impressions: number;
  position: number;
  cluster: string;
}

/**
 * Search Console'da görünen ama havuzda olmayan sorguları kelime olarak ekler.
 * Havuzun kendi kendini büyütmesi bu fonksiyonla oluyor.
 */
export async function mineKeywordOpportunities(days = 90, limit = 10) {
  const byQuery = await aggregate(days, "query");
  const existing = new Set(
    (await prisma.keyword.findMany({ select: { term: true } })).map((k) => k.term.toLowerCase()),
  );

  // Zaten sıralanan bir sayfaya ait sorgular yeni yazı konusu DEĞİL: onlar
  // tazeleme işi. Yeni makale açarsak kendi sayfamızla yarışırız (yamyamlık).
  const refreshPages = new Set((await getRefreshCandidates(days, 50)).map((c) => c.page));

  const candidates: MinedKeyword[] = [];
  for (const [query, agg] of byQuery) {
    if (refreshPages.has(agg.page)) continue;
    const position = average(agg);
    if (agg.impressions < MIN_OPPORTUNITY_IMPRESSIONS) continue;
    if (position > MAX_OPPORTUNITY_POSITION) continue;
    if (existing.has(query.toLowerCase())) continue;
    // Tek kelimelik sorgu ("dolar") bir rehber konusu değil, bir kategori.
    if (query.trim().split(/\s+/).length < 2) continue;
    if (COMMODITY_QUERY.test(query)) continue;
    candidates.push({ term: query, impressions: agg.impressions, position, ...guessCluster(query) });
  }

  candidates.sort((a, b) => b.impressions - a.impressions);
  const picked = candidates.slice(0, limit);

  for (const candidate of picked) {
    const { cluster, category } = guessCluster(candidate.term);
    await prisma.keyword.create({
      data: {
        term: candidate.term,
        category,
        cluster,
        origin: "gsc",
        // Google zaten bizi bu sorguda alakalı buluyor: sıradaki işlerin önüne geç.
        priority: Math.min(95, 60 + candidate.impressions),
        impressions: candidate.impressions,
        position: Number(candidate.position.toFixed(1)),
        notes: `Search Console keşfi: ${candidate.impressions} gösterim, ort. sıra ${candidate.position.toFixed(1)}`,
      },
    });
  }

  return { candidates: candidates.length, added: picked.length, picked };
}

export interface RefreshCandidate {
  page: string;
  impressions: number;
  clicks: number;
  /** Sayfanın en iyi sıradaki sorgusu — asıl fırsat bu. */
  bestPosition: number;
  /** İlk sayfanın dibinde takılmış sorgular; yeniden yazımda hedeflenecek. */
  nearMissQueries: Array<{ query: string; position: number; impressions: number }>;
}

interface QueryStat {
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
}

async function queryStats(days: number): Promise<QueryStat[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const rows = await prisma.searchPerformance.findMany({ where: { date: { gte: since } } });

  const map = new Map<string, Aggregate>();
  for (const row of rows) {
    const key = `${row.page}\u0000${row.query}`;
    const agg = map.get(key) ?? { impressions: 0, clicks: 0, positionSum: 0, samples: 0, page: row.page };
    agg.impressions += row.impressions;
    agg.clicks += row.clicks;
    agg.positionSum += row.position;
    agg.samples += 1;
    map.set(key, agg);
  }

  return [...map.entries()].map(([key, agg]) => {
    const [page, query] = key.split("\u0000");
    return {
      query,
      page,
      position: Number(average(agg).toFixed(1)),
      impressions: agg.impressions,
      clicks: agg.clicks,
    };
  });
}

/**
 * İlk sayfanın dibinde takılmış sayfalar. Google bunları zaten beğenmiş;
 * yeniden yazmak, sıfırdan makale yazmaktan çok daha ucuza tıklama getirir.
 *
 * Sayfa ortalamasına değil, sayfanın EN İYİ sorgusuna bakıyoruz: ortalama,
 * sayfanın hiç sıralanamadığı yüzlerce kuyruk sorgusuyla bozuluyor.
 */
export async function getRefreshCandidates(days = 90, limit = 10): Promise<RefreshCandidate[]> {
  const stats = await queryStats(days);

  const byPage = new Map<string, QueryStat[]>();
  for (const stat of stats) {
    byPage.set(stat.page, [...(byPage.get(stat.page) ?? []), stat]);
  }

  const out: RefreshCandidate[] = [];
  for (const [page, list] of byPage) {
    const nearMiss = list
      .filter((s) => s.position >= REFRESH_MIN_POSITION && s.position <= REFRESH_MAX_POSITION)
      .sort((a, b) => a.position - b.position);
    if (nearMiss.length === 0) continue;
    out.push({
      page,
      impressions: list.reduce((sum, s) => sum + s.impressions, 0),
      clicks: list.reduce((sum, s) => sum + s.clicks, 0),
      bestPosition: nearMiss[0].position,
      nearMissQueries: nearMiss
        .slice(0, 8)
        .map((s) => ({ query: s.query, position: s.position, impressions: s.impressions })),
    });
  }

  return out.sort((a, b) => a.bestPosition - b.bestPosition).slice(0, limit);
}
