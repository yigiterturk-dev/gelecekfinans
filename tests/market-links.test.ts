import { test } from "node:test";
import assert from "node:assert/strict";
import { injectMarketLinks } from "../lib/market-links";

test("varlık adını ilgili canlı veri sayfasına bağlar", () => {
  const out = injectMarketLinks("<p>BIST 100 endeksi günü yükselişle kapattı.</p>");
  // En uzun eşleşme çapa olur: "BIST 100 endeksi" daha iyi bir çapa metnidir.
  assert.match(out, /<a href="\/borsa\/bist-100">BIST 100 endeksi<\/a>/);
});

test("uzun ifade kısa olanı ezer: 'gram altın' /altin/gram-altin'e gider", () => {
  const out = injectMarketLinks("<p>Bugün gram altın rekor tazeledi.</p>");
  assert.match(out, /href="\/altin\/gram-altin"/);
  assert.ok(!out.includes('href="/altin"'), "genel altın sayfasına bağlanmamalı");
});

test("aynı sayfaya ikinci bağlantı eklemez", () => {
  const out = injectMarketLinks("<p>Bitcoin yükseldi. Bitcoin yine yükseldi.</p>");
  assert.equal((out.match(/href="\/kripto\/bitcoin"/g) || []).length, 1);
});

test("mevcut bağlantının metnine dokunmaz", () => {
  const giris = '<p><a href="/eski-haber">Bitcoin</a> hakkında.</p>';
  assert.equal(injectMarketLinks(giris), giris);
});

test("etiket özniteliğinin içine link basmaz", () => {
  const giris = '<p><img alt="Bitcoin grafiği" src="/x.png" /></p>';
  assert.equal(injectMarketLinks(giris), giris);
});

test("en fazla 3 bağlantı ekler", () => {
  const giris = "<p>Bitcoin, Ethereum, Solana, Cardano ve BIST 100 hareketlendi.</p>";
  const out = injectMarketLinks(giris);
  assert.equal((out.match(/<a href="/g) || []).length, 3);
});

test("sayfanın kendisine link vermez", () => {
  const out = injectMarketLinks("<p>BIST 100 yükseldi.</p>", "/borsa/bist-100");
  assert.ok(!out.includes('href="/borsa/bist-100"'));
});

test("sayfada zaten o bağlantı varsa tekrar eklemez", () => {
  const giris = '<p>Detay: <a href="/borsa/bist-100">endeks sayfası</a>. BIST 100 yükseldi.</p>';
  const out = injectMarketLinks(giris);
  assert.equal((out.match(/href="\/borsa\/bist-100"/g) || []).length, 1);
});
