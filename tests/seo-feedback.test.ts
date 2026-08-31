import { test } from "node:test";
import assert from "node:assert/strict";
import { guessCluster, COMMODITY_QUERY } from "../lib/seo-feedback";

test("canlı fiyat sorguları kelime havuzuna alınmaz", () => {
  for (const q of ["dolar kuru", "bitcoin kaç tl", "dolar alış satış fiyatı", "güncel dolar fiyatı"]) {
    assert.equal(COMMODITY_QUERY.test(q), true, q);
  }
});

test("kavramsal sorgular fiyat sorgusu sayılmaz", () => {
  for (const q of ["borsaya nasıl başlanır", "temettü nedir", "halka arz süreci"]) {
    assert.equal(COMMODITY_QUERY.test(q), false, q);
  }
});

test("kurucu kelimesi döviz kümesine düşmez", () => {
  assert.equal(guessCluster("midas kurucusu").cluster, "tasarruf-araclari");
  assert.equal(guessCluster("dolar kuru").cluster, "doviz-temel");
});

test("küme tahmini konuya göre ayrışır", () => {
  assert.equal(guessCluster("bitcoin nasıl alınır").cluster, "kripto-temel");
  assert.equal(guessCluster("gram altın yatırımı").cluster, "altin-yatirimi");
  assert.equal(guessCluster("halka arz nedir").cluster, "borsa-baslangic");
  assert.equal(guessCluster("enflasyon nedir").cluster, "makro-temel");
});
