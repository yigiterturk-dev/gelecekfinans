import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStockQuery,
  isBlockedCandidate,
  pickBestCandidate,
  scoreCandidate,
  stockMediaConfigured,
  wikimediaThumb,
} from "../lib/bot/stock-media";
import type { LicensedMediaAsset } from "../lib/bot/media-types";

function asset(overrides: Partial<LicensedMediaAsset> = {}): LicensedMediaAsset {
  return {
    provider: "pexels",
    assetId: "1",
    licenseId: "pexels-license",
    licenseName: "Pexels License",
    downloadUrl: "https://images.pexels.com/a.jpg",
    sourceUrl: "https://www.pexels.com/photo/1",
    attribution: "Fotoğraf: X / Pexels",
    caption: "stock market trading screen",
    width: 1880,
    height: 1253,
    ...overrides,
  };
}

test("türkçe başlık ingilizce sorguya çevrilir", () => {
  const query = buildStockQuery({ title: "Bitcoin yeni zirveye yaklaştı", keyword: "bitcoin", category: "kripto" });
  assert.match(query, /bitcoin/);
  assert.match(query, /crypto/i);
});

test("kategori ve varlık sözlüğü birlikte kullanılır", () => {
  assert.match(buildStockQuery({ title: "Dolar/TL kuru", category: "doviz" }), /us dollar/);
  assert.match(buildStockQuery({ title: "Gram altın fiyatı", category: "altin" }), /gold/);
});

test("bilinmeyen kategori jenerik sorguya düşer", () => {
  assert.equal(buildStockQuery({ title: "Bilinmeyen konu", category: "xyz" }), "finance newspaper desk");
});

test("klişe stok etiketleri reddedilir", () => {
  assert.equal(isBlockedCandidate("money rain over a businessman"), true);
  assert.equal(isBlockedCandidate("piggy bank savings"), true);
  assert.equal(isBlockedCandidate("stock market trading screen"), false);
});

test("portre ve düşük çözünürlük adayı geçmez", () => {
  assert.ok(scoreCandidate(asset({ width: 800, height: 1200 }), "stock market") < 0);
  assert.ok(scoreCandidate(asset({ width: 900, height: 600 }), "stock market") < 0);
  assert.ok(scoreCandidate(asset({ caption: "money rain" }), "stock market") < 0);
});

test("16:9 geniş görsel 4:3 adaya tercih edilir", () => {
  const best = pickBestCandidate(
    [asset({ assetId: "a", width: 1600, height: 1200 }), asset({ assetId: "b", width: 1920, height: 1080 })],
    "stock market trading screen",
  );
  assert.equal(best?.assetId, "b");
});

test("geçerli aday yoksa null döner", () => {
  assert.equal(pickBestCandidate([asset({ caption: "piggy bank" })], "stock market"), null);
});

test("anahtarsız Openverse sayesinde görsel arama hep açık", () => {
  const pexels = process.env.PEXELS_API_KEY;
  const pixabay = process.env.PIXABAY_API_KEY;
  delete process.env.PEXELS_API_KEY;
  delete process.env.PIXABAY_API_KEY;
  assert.equal(stockMediaConfigured(), true);
  if (pexels) process.env.PEXELS_API_KEY = pexels;
  if (pixabay) process.env.PIXABAY_API_KEY = pixabay;
});

test("wikimedia dosyası küçük resme çevrilir, svg olduğu gibi kalır", () => {
  const jpg = "https://upload.wikimedia.org/wikipedia/commons/6/66/NASDAQ_stock_market_display.jpg";
  assert.match(wikimediaThumb(jpg), /\/thumb\/6\/66\/NASDAQ_stock_market_display\.jpg\/1600px-/);
  const svg = "https://upload.wikimedia.org/wikipedia/commons/1/11/Chart.svg";
  assert.equal(wikimediaThumb(svg), svg);
});

test("son 60 günde kullanılan görsel atlanır", () => {
  const used = { "pexels:1": Date.now() };
  const picked = pickBestCandidate(
    [asset({ assetId: "1" }), asset({ assetId: "2", width: 1800, height: 1100 })],
    "stock market",
    { used },
  );
  assert.equal(picked?.assetId, "2");
});

test("aynı başlık her çalıştırmada aynı adayı seçer", () => {
  const pool = ["1", "2", "3"].map((id) => asset({ assetId: id }));
  const first = pickBestCandidate(pool, "stock market", { seed: "bist yükseldi" });
  const second = pickBestCandidate(pool, "stock market", { seed: "bist yükseldi" });
  assert.equal(first?.assetId, second?.assetId);
});
