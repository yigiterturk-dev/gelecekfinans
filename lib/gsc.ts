import { google } from "googleapis";
import { prisma } from "./db";

/**
 * Google Search Console adaptörü.
 *
 * Kimlik bilgileri yoksa sistem çökmez; `isGscConfigured()` false döner ve
 * çağıran taraf iç `PageView` verisine düşer. Botun geri besleme döngüsü
 * (hangi sayfa kaçıncı sırada) buradan besleniyor.
 */

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GSC_CLIENT_EMAIL &&
      process.env.GSC_PRIVATE_KEY &&
      process.env.GSC_SITE_URL,
  );
}

function client() {
  const auth = new google.auth.JWT({
    email: process.env.GSC_CLIENT_EMAIL,
    // Vercel ortam değişkeni satır sonlarını \n olarak taşır.
    key: (process.env.GSC_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: [SCOPE],
  });
  return google.searchconsole({ version: "v1", auth });
}

export interface SearchRow {
  date: Date;
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Son `days` günün (tarih, sayfa, sorgu) kırılımını çeker.
 * GSC verisi 2-3 gün gecikmeli geldiği için bitiş tarihi bugünden 2 gün geri.
 */
export async function fetchSearchRows(days = 28, rowLimit = 5000): Promise<SearchRow[]> {
  if (!isGscConfigured()) return [];
  const res = await client().searchanalytics.query({
    siteUrl: process.env.GSC_SITE_URL!,
    requestBody: {
      startDate: isoDay(days + 2),
      endDate: isoDay(2),
      dimensions: ["date", "page", "query"],
      rowLimit,
      type: "web",
    },
  });

  return (res.data.rows ?? []).flatMap((row) => {
    const [date, page, query] = row.keys ?? [];
    if (!date || !page || !query) return [];
    return [
      {
        date: new Date(`${date}T00:00:00.000Z`),
        page,
        query,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      },
    ];
  });
}

/** Çekilen satırları SearchPerformance tablosuna yazar (upsert). */
export async function syncSearchPerformance(days = 28) {
  const rows = await fetchSearchRows(days);
  let written = 0;
  for (const row of rows) {
    await prisma.searchPerformance.upsert({
      where: { date_page_query: { date: row.date, page: row.page, query: row.query } },
      create: { ...row, source: "gsc" },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      },
    });
    written += 1;
  }
  return { fetched: rows.length, written };
}
