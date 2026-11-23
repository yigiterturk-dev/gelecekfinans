import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: ".env.local" });

const email = process.env.GSC_CLIENT_EMAIL;
const key = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!email || !key) {
  console.error("GSC_CLIENT_EMAIL ve GSC_PRIVATE_KEY gerekli (.env.local veya ortam değişkenleri).");
  process.exitCode = 1;
} else {
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const searchConsole = google.searchconsole({ version: "v1", auth });

  const day = (offset) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    return date.toISOString().slice(0, 10);
  };

  const compact = (value) => Number(value ?? 0).toFixed(0);
  const pagePath = (value) => {
    try {
      return new URL(value).pathname;
    } catch {
      return value;
    }
  };

  async function main() {
    const { data: siteData } = await searchConsole.sites.list();
    const sites = siteData.siteEntry ?? [];
    if (sites.length === 0) {
      console.log("Bu servis hesabının erişebildiği Search Console mülkü bulunamadı.");
      return;
    }

    console.log("ERİŞİM:", sites.map((site) => `${site.siteUrl} [${site.permissionLevel}]`).join("\n        "));

    for (const site of sites) {
      console.log(`\n=== ${site.siteUrl}`);
      for (const [label, startDate, endDate] of [
        ["son28", day(30), day(3)],
        ["önceki28", day(58), day(31)],
      ]) {
        const { data } = await searchConsole.searchanalytics.query({
          siteUrl: site.siteUrl,
          requestBody: { startDate, endDate, dimensions: [], type: "web" },
        });
        const totals = data.rows?.[0];
        console.log(
          ` ${label}: tık ${compact(totals?.clicks)} | gös ${compact(totals?.impressions)} | ort.sıra ${Number(totals?.position ?? 0).toFixed(1)}`,
        );
      }

      const { data: queryData } = await searchConsole.searchanalytics.query({
        siteUrl: site.siteUrl,
        requestBody: { startDate: day(30), endDate: day(3), dimensions: ["query"], rowLimit: 6, type: "web" },
      });
      console.log(
        " top sorgu:",
        (queryData.rows ?? []).map((row) => `${row.keys?.[0] ?? "(sorgu yok)"} (g${compact(row.impressions)}/t${compact(row.clicks)}/s${compact(row.position)})`).join(" · ") || "yok",
      );

      const { data: pageData } = await searchConsole.searchanalytics.query({
        siteUrl: site.siteUrl,
        requestBody: { startDate: day(30), endDate: day(3), dimensions: ["page"], rowLimit: 5, type: "web" },
      });
      console.log(
        " top sayfa:",
        (pageData.rows ?? []).map((row) => `${pagePath(row.keys?.[0] ?? "")} (g${compact(row.impressions)}/t${compact(row.clicks)})`).join(" · ") || "yok",
      );
    }
  }

  main().catch((error) => {
    const status = error?.response?.status;
    const code = error?.code;
    const reason = status ? `HTTP ${status}` : code ? `hata kodu ${code}` : "beklenmeyen hata";
    console.error(`Search Console özeti alınamadı (${reason}). Kimlik bilgilerini ve mülk erişimini kontrol edin.`);
    process.exitCode = 1;
  });
}
