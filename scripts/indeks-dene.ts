/** Verilen URL'lerin Google indeks durumunu GSC URL İnceleme API'siyle sorar. */
import { google } from "googleapis";

const URLS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["https://gelecekfinans.com/", "https://gelecekfinans.com/kripto", "https://gelecekfinans.com/hakkimizda"];

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GSC_CLIENT_EMAIL,
    key: (process.env.GSC_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const sc = google.searchconsole({ version: "v1", auth });
  for (const url of URLS) {
    try {
      const res = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: process.env.GSC_SITE_URL! },
      });
      const r = res.data.inspectionResult?.indexStatusResult;
      console.log(`\n${url}`);
      console.log(`  karar        : ${r?.verdict}`);
      console.log(`  kapsam       : ${r?.coverageState}`);
      console.log(`  robots       : ${r?.robotsTxtState}  indeksleme: ${r?.indexingState}`);
      console.log(`  son tarama   : ${r?.lastCrawlTime}`);
      console.log(`  kanonik (G)  : ${r?.googleCanonical}`);
      console.log(`  kanonik (biz): ${r?.userCanonical}`);
      console.log(`  yönlendiren  : ${(r?.referringUrls ?? []).length} sayfa`);
    } catch (e) {
      console.log(`\n${url}\n  HATA: ${(e as Error).message}`);
    }
  }
}
main().then(() => process.exit(0));
