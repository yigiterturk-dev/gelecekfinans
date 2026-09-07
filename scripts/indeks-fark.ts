/**
 * İndeks durumunu ölçer, önceki ölçümle FARKINI raporlar ve anlık görüntüyü saklar.
 *
 * Neden var: `indeks-durum.ts` yalnız o anki tabloyu basıyordu; "düzeldi mi"
 * sorusunu cevaplamak için iki çıktıyı elle karşılaştırmak gerekiyordu.
 * 7 Eylül'de 35 şablon sayfaya özgün içerik yazıldı ve tüm sitemap indeks
 * bildirimine sokuldu; bunun işe yarayıp yaramadığı ancak aradaki farkla
 * ölçülebilir. Canlılık değil DOĞRULUK ölçülüyor: kaç adres PASS'a geçti,
 * kaç adres geri gitti, hangileri.
 *
 * Anlık görüntüler `veri/indeks/<YYYY-AA-GG>.json` altında birikir; her çalışma
 * en son kaydedilenle karşılaştırır. İlk çalıştırmada karşılaştıracak bir şey
 * olmadığı için yalnız kayıt alınır.
 *
 *   npx tsx --env-file=.env.local scripts/indeks-fark.ts
 *
 * ⚠️ indeks-durum.ts'te ölçülerek öğrenilen iki tuzak burada da geçerli:
 *   1. Her adres kendi satırını ANINDA basar (sonda basmak körlük yaratıyor).
 *   2. Token bir kez alınır, çağrılar arasında beklenir, hata veren adres bir
 *      kez tekrar denenir — `oauth2.googleapis.com` art arda hızlı çağrıda
 *      bağlantıyı düşürüyor.
 */
import { google } from "googleapis";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";
const BEKLEME_MS = Number(process.env.INDEKS_BEKLEME_MS ?? 5000);
const KLASOR = "veri/indeks";

const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** yol -> coverageState. PASS olanlar da dahil, hepsi saklanır. */
type Anlik = { tarih: string; durum: Record<string, string> };

function oncekiAnlik(): Anlik | null {
  let dosyalar: string[];
  try {
    dosyalar = readdirSync(KLASOR).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return null;
  }
  const son = dosyalar.at(-1);
  if (!son) return null;
  return JSON.parse(readFileSync(join(KLASOR, son), "utf8")) as Anlik;
}

async function sitemapUrls(): Promise<string[]> {
  const xml = await (await fetch(`${SITE_URL}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  const onceki = oncekiAnlik();

  const auth = new google.auth.JWT({
    email: process.env.GSC_CLIENT_EMAIL,
    key: (process.env.GSC_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  await auth.authorize();
  const sc = google.searchconsole({ version: "v1", auth });

  const urls = await sitemapUrls();
  console.log(`${urls.length} adres inceleniyor (adres başına ~${BEKLEME_MS}ms)...`);
  console.log(onceki ? `karşılaştırılacak ölçüm: ${onceki.tarih}\n` : "önceki ölçüm yok, yalnız kayıt alınacak\n");

  async function incele(url: string) {
    const res = await Promise.race([
      sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: url, siteUrl: process.env.GSC_SITE_URL! },
      }),
      new Promise<never>((_, red) => setTimeout(() => red(new Error("süre aşımı (30 sn)")), 30000)),
    ]);
    return res.data.inspectionResult?.indexStatusResult;
  }

  const durum: Record<string, string> = {};
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
        console.log(`${String(i).padStart(2)}/${urls.length} HATA ${yol} — ${(e as Error).message.slice(0, 70)}`);
        continue; // HATA kaydedilmez; yanlış "geri gitti" raporu üretmesin
      }
    }
    const kapsam = r?.coverageState ?? "bilinmiyor";
    durum[yol] = kapsam;
    const pass = r?.verdict === "PASS";
    // Önceki ölçümde ne olduğunu satırın yanında göster: fark anında görünsün.
    const eski = onceki?.durum[yol];
    const isaret = !eski ? "" : eski === kapsam ? "" : `   (önce: ${eski})`;
    console.log(`${String(i).padStart(2)}/${urls.length} ${pass ? "✅" : "❌"} ${kapsam} · ${yol}${isaret}`);
    await bekle(BEKLEME_MS);
  }

  const tarih = new Date().toISOString().slice(0, 10);
  mkdirSync(KLASOR, { recursive: true });
  writeFileSync(join(KLASOR, `${tarih}.json`), JSON.stringify({ tarih, durum } satisfies Anlik, null, 2) + "\n");

  const indeksli = (d: Record<string, string>) =>
    Object.values(d).filter((v) => v === "Submitted and indexed" || v === "Indexed, not submitted in sitemap").length;

  console.log("\n=== DURUM DAĞILIMI ===");
  const sayac: Record<string, number> = {};
  for (const v of Object.values(durum)) sayac[v] = (sayac[v] ?? 0) + 1;
  for (const [k, v] of Object.entries(sayac).sort((a, b) => b[1] - a[1])) {
    console.log(`${String(v).padStart(3)} × ${k}`);
  }

  if (!onceki) {
    console.log(`\nİlk ölçüm kaydedildi: ${KLASOR}/${tarih}.json — karşılaştırma bir sonraki çalıştırmada.`);
    return;
  }

  const duzelen: string[] = [];
  const gerileyen: string[] = [];
  const yeni: string[] = [];
  for (const [yol, kapsam] of Object.entries(durum)) {
    const eski = onceki.durum[yol];
    if (eski === undefined) {
      yeni.push(`${yol} · ${kapsam}`);
      continue;
    }
    if (eski === kapsam) continue;
    const eskiIyi = eski === "Submitted and indexed" || eski === "Indexed, not submitted in sitemap";
    const yeniIyi = kapsam === "Submitted and indexed" || kapsam === "Indexed, not submitted in sitemap";
    if (!eskiIyi && yeniIyi) duzelen.push(`${yol}   ${eski} → ${kapsam}`);
    else if (eskiIyi && !yeniIyi) gerileyen.push(`${yol}   ${eski} → ${kapsam}`);
  }
  const kaybolan = Object.keys(onceki.durum).filter((y) => durum[y] === undefined);

  const oncekiSayi = indeksli(onceki.durum);
  const simdikiSayi = indeksli(durum);
  const delta = simdikiSayi - oncekiSayi;

  console.log(`\n=== FARK (${onceki.tarih} → ${tarih}) ===`);
  console.log(`indeksli: ${oncekiSayi} → ${simdikiSayi}   (${delta >= 0 ? "+" : ""}${delta})`);
  console.log(`\n✅ DÜZELEN ${duzelen.length}`);
  for (const s of duzelen) console.log(`   ${s}`);
  console.log(`\n🔴 GERİLEYEN ${gerileyen.length}`);
  for (const s of gerileyen) console.log(`   ${s}`);
  if (yeni.length) {
    console.log(`\n🆕 SİTEMAP'E YENİ GİREN ${yeni.length}`);
    for (const s of yeni) console.log(`   ${s}`);
  }
  if (kaybolan.length) {
    console.log(`\n⚠️  SİTEMAP'TEN ÇIKAN ${kaybolan.length}`);
    for (const s of kaybolan) console.log(`   ${s}`);
  }
}

main();
