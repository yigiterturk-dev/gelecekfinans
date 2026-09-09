/**
 * Sitemap'teki adresleri Google'a "güncellendi" diye bildirir.
 *
 * Argümansız çalışınca sitemap'i okur ve HEPSİNİ bildirir; adres verilirse
 * yalnızca onları. Kota günde 200 bildirim olduğu için sitemap 52 adresle
 * rahat sığıyor.
 *
 *   npx tsx --env-file=.env.local scripts/indeks-bildir.ts
 *   npx tsx --env-file=.env.local scripts/indeks-bildir.ts https://gelecekfinans.com/x
 */
import { notifyGoogleUrlUpdated } from "../lib/bot/indexing";
import { notifyIndexNow } from "../lib/bot/indexnow";

const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const args = process.argv.slice(2);
  const urls = args.length ? args : await sitemapUrls();
  console.log(`${urls.length} adres bildirilecek`);

  let ok = 0;
  const failures = new Map<string, string>();
  for (const url of urls) {
    const result = await notifyGoogleUrlUpdated(url);
    if (result.ok) {
      ok++;
      console.log(`  ✓ ${url.replace(SITE_URL, "")}`);
    } else {
      failures.set(result.reason, result.detail || "");
      console.log(`  ✗ ${url.replace(SITE_URL, "")} — ${result.reason}`);
      // Kurulum eksikse tek tek denemenin anlamı yok, hepsi aynı hatayı verir.
      if (result.reason === "not-configured" || result.reason === "api-disabled") break;
    }
  }

  console.log(`\nbildirilen: ${ok}/${urls.length}`);
  await indexNowToplu(urls);
  for (const [reason, detail] of failures) {
    if (reason === "api-disabled") {
      console.log("\n⚠️ Web Search Indexing API kapalı. GCP konsolunda aç:");
      console.log("   https://console.developers.google.com/apis/api/indexing.googleapis.com/overview");
    } else if (reason === "forbidden") {
      console.log("\n⚠️ Servis hesabı mülkün SAHİBİ değil. GSC → Ayarlar → Kullanıcılar ve izinler'den");
      // Servis hesabı adresi maskelenir: bu çıktı oturum dökümüne düşüyor.
      const sa = process.env.GSC_CLIENT_EMAIL ?? "";
      const [saAd, saAlan] = sa.split("@");
      const saMaskeli = saAd ? `${saAd.slice(0, 4)}${"*".repeat(Math.max(1, saAd.length - 4))}@${saAlan ?? ""}` : "(GSC_CLIENT_EMAIL yok)";
      console.log(`   ${saMaskeli} adresini 'Sahip' olarak ekle (tam adres .env.local'de).`);
    } else if (reason === "not-configured") {
      console.log("\n⚠️ GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY yok (.env.local).");
    } else {
      console.log(`\n⚠️ ${reason}: ${detail}`);
    }
  }
}


/** Google tek tek ister; IndexNow tek istekte hepsini alır. */
async function indexNowToplu(urls: string[]) {
  const r = await notifyIndexNow(urls);
  if (r.ok) console.log(`IndexNow: ${r.count} adres bildirildi (Bing/Yandex)`);
  else console.log(`IndexNow bildirilemedi: ${r.reason}${r.detail ? " — " + r.detail : ""}`);
}

main();
