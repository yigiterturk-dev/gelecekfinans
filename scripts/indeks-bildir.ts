/**
 * Sitemap adreslerini IndexNow katılımcılarına bildirir.
 *
 * Argümansız çalışınca sitemap'i okur ve HEPSİNİ bildirir; adres verilirse
 * yalnızca onları. Kota günde 200 bildirim olduğu için sitemap 52 adresle
 * rahat sığıyor.
 *
 *   npx tsx --env-file=.env.local scripts/indeks-bildir.ts
 *   npx tsx --env-file=.env.local scripts/indeks-bildir.ts https://gelecekfinans.com/x
 */
import { notifyIndexNow } from "../lib/bot/indexnow";

const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const args = process.argv.slice(2);
  const urls = args.length ? args : await sitemapUrls();
  console.log(`${urls.length} adres IndexNow'a bildiriliyor. Google Indexing API normal makale sayfalarını desteklemediği için kullanılmıyor.`);
  await indexNowToplu(urls);
}


/** IndexNow tek istekte birden çok adres alır. */
async function indexNowToplu(urls: string[]) {
  const r = await notifyIndexNow(urls);
  if (r.ok) console.log(`IndexNow: ${r.count} adres bildirildi (Bing/Yandex)`);
  else console.log(`IndexNow bildirilemedi: ${r.reason}${r.detail ? " — " + r.detail : ""}`);
}

main();
