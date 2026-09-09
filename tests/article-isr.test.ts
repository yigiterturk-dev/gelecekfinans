import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { kilitliGovde, tamGovde, TEASER_KELIME } from "../lib/article-body";

const oku = (p: string) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");

// Bu testlerin varlık sebebi ölçülmüş bir hata: sayfada `force-dynamic` ile
// `revalidate` yan yana duruyordu, force-dynamic revalidate'i eziyordu ve
// "makaleler önbellekleniyor" varsayımı sessizce yanlıştı. Kazanç, birinin
// sayfaya cookies()/getServerSession eklemesiyle aynı sessizlikle kaybolur.

test("makale sayfası ISR — force-dynamic YOK, revalidate VAR", () => {
  const s = oku("app/[slug]/page.tsx");
  assert.ok(!/dynamic\s*=\s*["']force-dynamic["']/.test(s), "force-dynamic geri gelmiş: sayfa artık önbelleklenmiyor");
  assert.match(s, /export const revalidate\s*=\s*\d+/, "revalidate tanımlı olmalı");
});

test("makale sayfası oturum/çerez okumuyor", () => {
  // Sayfayı dinamiğe düşüren tam olarak bunlar.
  const kod = oku("app/[slug]/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const yasak of ["getServerSession", "cookies(", "headers("]) {
    assert.ok(!kod.includes(yasak), `sayfa ${yasak} çağırıyor → sessizce dinamiğe düşer`);
  }
});

test("premium makale önbelleğe HER ZAMAN kilitli basılır", () => {
  const kod = oku("app/[slug]/page.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // Kilit kararı yalnızca makalenin premium alanına bakmalı; oturuma göre
  // değişirse önbelleğe üyeye özel içerik girer ve herkese servis edilir.
  assert.match(kod, /const gated\s*=\s*!!a\.premium\s*;/, "kilit kararı premium alanından başka şeye bakıyor");
});

test("kilitli gövde tam metni sızdırmıyor", () => {
  const uzunMetin = "<p>" + Array.from({ length: 600 }, (_, i) => `kelime${i}`).join(" ") + "</p>";
  const kilitli = kilitliGovde(uzunMetin);
  assert.ok(!kilitli.includes("kelime599"), "teaser makalenin sonunu içeriyor");
  assert.ok(kilitli.includes("kelime0"), "teaser başlangıcı içermeli");
  assert.ok(kilitli.length < uzunMetin.length, "teaser tam metinden kısa olmalı");
  assert.equal(TEASER_KELIME, 200);
});

test("premium gövde ucu oturum doğruluyor ve önbelleklenmiyor", () => {
  const s = oku("app/api/articles/[slug]/body/route.ts");
  assert.ok(s.includes("getServerSession"), "uç oturum kontrolü yapmalı");
  assert.match(s, /status:\s*401/, "oturumsuz istek 401 almalı");
  assert.match(s, /private,\s*no-store/, "kişiye özel yanıt önbelleklenmemeli");
  assert.ok(s.includes("article.premium"), "premium olmayan makale bu uçtan servis edilmemeli");
});

test("iki yol da aynı gövde fonksiyonunu kullanıyor", () => {
  // Bu depoda tekrarlayan hata sınıfı: ikinci yol, normal yolun defter işini
  // yapmıyor (iç bağlantı, bildirim, sayaç atlanmıştı). Ayrışmayı önle.
  assert.ok(oku("app/api/articles/[slug]/body/route.ts").includes("tamGovde"));
  assert.ok(oku("app/[slug]/page.tsx").includes("tamGovde"));
});

test("tamGovde çıktısı temizlenmiş HTML veriyor", () => {
  const kirli = `<p>merhaba</p><script>alert(1)</script><img src=x onerror="alert(1)">`;
  const temiz = tamGovde(kirli, "deneme", []);
  assert.ok(!temiz.includes("<script"), "script etiketi geçmiş");
  assert.ok(!/onerror\s*=/i.test(temiz), "olay özniteliği geçmiş");
  assert.ok(temiz.includes("merhaba"), "gerçek içerik korunmalı");
});
