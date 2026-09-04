/**
 * Sitemap'teki HER adresin Google indeks durumunu sayar.
 *
 * Neden: GSC'de yalnız 9 sayfa gösterim alıyor ama sitemap'te 59 adres var.
 * "Yayınladık" ile "Google biliyor" ayrı şeyler; bu fark ölçülmeden
 * dış bağlantı/içerik işine girmek boşa kürek.
 *
 * ⚠️ İki tuzak ölçülerek öğrenildi (4 Eylül):
 *   1. Sonucu sonda basmak KÖRLÜK yaratıyor — 8 dakika boyunca ekranda
 *      tek satır vardı, oysa çağrılar çoktan hata veriyordu. Her adres
 *      kendi satırını ANINDA basar.
 *   2. Art arda hızlı çağrıda token uç noktası (`oauth2.googleapis.com`)
 *      bağlantıyı düşürüyor. Token bir kez alınır, çağrılar arası bekleme
 *      konur, hata veren adres bir kez tekrar denenir.
 *
 *   npx tsx --env-file=.env --env-file=.env.local scripts/indeks-durum.ts
 */
import { google } from "googleapis";

const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";
const BEKLEME_MS = Number(process.env.INDEKS_BEKLEME_MS ?? 5000);

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GSC_CLIENT_EMAIL,
    key: (process.env.GSC_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  await auth.authorize(); // token bir kez alınsın; her çağrıda yenilenmesin
  const sc = google.searchconsole({ version: "v1", auth });
  const urls = await sitemapUrls();
  console.log(`${urls.length} adres inceleniyor (adres başına ~${BEKLEME_MS}ms)...\n`);

  const sayac: Record<string, number> = {};
  const disarida: string[] = [];

  async function incele(url: string) {
    const res = await sc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: process.env.GSC_SITE_URL! },
    });
    return res.data.inspectionResult?.indexStatusResult;
  }

  let i = 0;
  for (const url of urls) {
    i++;
    const yol = url.replace(SITE_URL, "") || "/";
    let r;
    try {
      r = await incele(url);
    } catch {
      await bekle(3000);
      try {
        r = await incele(url);
      } catch (e) {
        sayac["HATA"] = (sayac["HATA"] ?? 0) + 1;
        console.log(`${String(i).padStart(2)}/${urls.length} HATA ${yol} — ${(e as Error).message.slice(0, 70)}`);
        continue;
      }
    }
    const anahtar = `${r?.verdict} / ${r?.coverageState}`;
    sayac[anahtar] = (sayac[anahtar] ?? 0) + 1;
    if (r?.verdict !== "PASS") disarida.push(`${r?.coverageState} · ${yol}`);
    console.log(`${String(i).padStart(2)}/${urls.length} ${r?.verdict === "PASS" ? "✅" : "❌"} ${anahtar} · ${yol}`);
    await bekle(BEKLEME_MS);
  }

  console.log("\n--- durum dağılımı ---");
  for (const [k, v] of Object.entries(sayac).sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(3)} × ${k}`);
  console.log(`\n--- indekste OLMAYAN ${disarida.length} adres ---`);
  for (const s of disarida) console.log(s);
}

main();
