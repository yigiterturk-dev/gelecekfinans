import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { paylasimMeta, OG_GORSEL } from "../lib/og";

/**
 * ÖLÇÜLEN HATA (2026-09-09): sitemap'teki 112 adres tarandı, 6 sayfada
 * `og:image` HİÇ yoktu. Sebep: `app/opengraph-image.tsx` dosya kuralı,
 * sayfa kendi `openGraph` nesnesini yazınca devreye girmiyor. Hiçbir test,
 * hiçbir derleme uyarısı bunu söylemiyordu — yalnızca paylaşınca görülüyordu.
 */

const kok = fileURLToPath(new URL("../app", import.meta.url));
const gez = (d: string): string[] =>
  readdirSync(d).flatMap((ad) => {
    const tam = `${d}/${ad}`;
    return statSync(tam).isDirectory() ? gez(tam) : tam.endsWith("page.tsx") ? [tam] : [];
  });

test("paylasimMeta görseli her zaman ekliyor", () => {
  const m = paylasimMeta({ url: "https://x.test/a", title: "Başlık", description: "Açıklama" });
  const g = m.openGraph?.images;
  assert.ok(Array.isArray(g) && g.length > 0, "openGraph.images boş");
  assert.equal((g[0] as { url: string }).url, OG_GORSEL);
  assert.ok(Array.isArray(m.twitter?.images) && m.twitter.images.length > 0, "twitter.images boş");
});

test("openGraph'ı ELLE kurup görsel koymayan sayfa yok", () => {
  const suclu: string[] = [];
  for (const p of gez(kok)) {
    const s = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // Elle yazılmış openGraph bloğu ara (paylasimMeta kullananlar muaf).
    const blok = s.match(/openGraph:\s*\{[\s\S]*?\n\s{0,4}\},/);
    if (!blok) continue;
    if (!/images\s*:/.test(blok[0])) {
      suclu.push(p.slice(kok.length + 1));
    }
  }
  assert.deepEqual(
    suclu,
    [],
    "bu sayfalar openGraph yazıp images koymamış → paylaşımda görsel çıkmaz. paylasimMeta() kullan."
  );
});
