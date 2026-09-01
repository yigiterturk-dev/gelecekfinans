import assert from "node:assert/strict";
import test from "node:test";
import { accentForCategory, createBrandedCard, wrapHeadline } from "../lib/bot/images";
import { createVisualBrief } from "../lib/bot/visual-director";

test("doğrudan fiyat hareketi gerçek veri grafiğine gider", () => {
  const brief = createVisualBrief({
    title: "Dolar/TL kuru yüzde 2 yükseldi",
    keyword: "dolar kuru",
    category: "doviz",
  });
  assert.equal(brief.mode, "DATA_CHART");
  assert.match(brief.rationale, /gerçek veri/i);
});
test("sağlayıcı yokken haber sentetik fotoğraf yerine markalı karta gider", () => {
  const previousEndpoint = process.env.LICENSED_MEDIA_SEARCH_ENDPOINT;
  const previousKey = process.env.LICENSED_MEDIA_API_KEY;
  delete process.env.LICENSED_MEDIA_SEARCH_ENDPOINT;
  delete process.env.LICENSED_MEDIA_API_KEY;
  const brief = createVisualBrief({
    title: "TCMB politika faizini sabit tuttu",
    keyword: "politika faizi",
    category: "ekonomi",
  });
  assert.equal(brief.mode, "BRANDED_CARD");
  assert.match(brief.mustAvoid.join(" "), /sentetik kişi/i);
  if (previousEndpoint) process.env.LICENSED_MEDIA_SEARCH_ENDPOINT = previousEndpoint;
  if (previousKey) process.env.LICENSED_MEDIA_API_KEY = previousKey;
});

test("markalı kart gerçek PNG üretir", async () => {
  const png = await createBrandedCard({
    title: "TCMB politika faizini sabit tuttu",
    keyword: "politika faizi",
    category: "ekonomi",
    evidenceSourceCount: 2,
  });
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.length > 10_000);
});

test("başlık dengeli satırlara bölünür, son satırda tek kelime kalmaz", () => {
  const lines = wrapHeadline("Kripto para nedir? Tanım, çalışma prensipleri, kullanım ve riskler");
  assert.ok(lines.length <= 4);
  const uzunluklar = lines.map((l) => l.length);
  // En kısa satır, en uzunun yarısından kısa olmamalı.
  assert.ok(Math.min(...uzunluklar) >= Math.max(...uzunluklar) / 2, JSON.stringify(lines));
});

test("kategori vurgu rengi ayrışır, bilinmeyen kategori varsayılana düşer", () => {
  assert.notEqual(accentForCategory("kripto").accent, accentForCategory("borsa").accent);
  assert.equal(accentForCategory("bilinmeyen").accent, accentForCategory("ekonomi").accent);
});

test("borsa haberi de gerçek veri grafiğine gider", () => {
  const brief = createVisualBrief({
    title: "BIST 100 güne kayıpla başladı",
    keyword: "bist 100",
    category: "borsa",
  });
  assert.equal(brief.mode, "DATA_CHART");
});
