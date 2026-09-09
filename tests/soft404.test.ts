import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * 🔴 ÖLÇÜLEN REGRESYON (2026-09-09, aynı gün eklenip aynı gün geri alındı):
 * denetim "32 sayfa var, hiç loading.tsx yok" dedi; dört iskelet ekledim.
 * Sonuç: `loading.tsx` bir Suspense sınırı kuruyor, Next yanıtı erken
 * akıtıyor ve HTTP durumu 200'de KİLİTLENİYOR. Sonra çağrılan `notFound()`
 * 404 arayüzünü gösteriyor ama **HTTP 200 dönüyor** — klasik "soft 404".
 *
 * Ölçüm (yerel `next start`, Vercel değil — katman ayrıldı):
 *   kök loading.tsx VARKEN  /borsa/XXXX → 200
 *   kök loading.tsx YOKKEN  /borsa/XXXX → 404
 *
 * Soft 404, yanlış yazılan HER adresin geçerli sayfa gibi indekslenebilmesi
 * demek. İskelet konforu bunun yanında önemsiz; iskeletler geri alındı.
 */

const kok = fileURLToPath(new URL("../app", import.meta.url));

const gez = (d: string): string[] =>
  readdirSync(d).flatMap((ad) => {
    const tam = `${d}/${ad}`;
    return statSync(tam).isDirectory() ? gez(tam) : [tam];
  });

const kodu = (p: string) =>
  readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("kök seviyede loading.tsx YOK", () => {
  // Kök iskelet TÜM rotaları sarar; notFound() çağıran her sayfayı soft 404 yapar.
  assert.ok(!existsSync(`${kok}/loading.tsx`), "app/loading.tsx geri gelmiş → tüm site soft 404 verir");
});

test("notFound() çağıran hiçbir rotada loading.tsx yok", () => {
  const suclu: string[] = [];
  for (const p of gez(kok)) {
    if (!p.endsWith("/page.tsx")) continue;
    if (!kodu(p).includes("notFound(")) continue;
    const klasor = p.slice(0, p.lastIndexOf("/"));
    // Kendi segmentinde ya da herhangi bir ÜST segmentte loading.tsx var mı?
    let d = klasor;
    while (d.startsWith(kok)) {
      if (existsSync(`${d}/loading.tsx`)) {
        suclu.push(`${p.slice(kok.length + 1)} ← ${d.slice(kok.length) || "/"}/loading.tsx`);
        break;
      }
      d = d.slice(0, d.lastIndexOf("/"));
    }
  }
  assert.deepEqual(suclu, [], "bu rotalar notFound() çağırıyor ama bir loading.tsx altında → HTTP 200 (soft 404)");
});
