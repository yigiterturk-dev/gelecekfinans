import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseImageStrategy, classifyRisk, decidePublication, scoreSource,
} from "../lib/bot/autonomy";

test("resmi kaynak yüksek güven skoru alır", () => {
  const result = scoreSource({
    title: "TCMB faiz kararını açıkladı", summary: "A".repeat(120),
    category: "ekonomi", source: "TCMB", sourceUrl: "https://www.tcmb.gov.tr/duyuru",
  });
  assert.equal(result.score, 100);
});

test("hassas siyasi konu otomatik yayına girmez", () => {
  const risk = classifyRisk({
    title: "Seçim sonrası ekonomi gündemi", summary: "",
    category: "ekonomi", source: "Kaynak",
  });
  assert.equal(risk.level, "RED");
  assert.equal(decidePublication({
    risk: risk.level, sourceScore: 95, seoScore: 95, hasImage: true, autoPublishEnabled: true,
    verifiedEvidence: true,
  }).decision, "REVIEW");
});

test("doğrulanmış ve tüm kalite eşiklerini geçen rutin haber otomatik yayımlanır", () => {
  assert.equal(decidePublication({
    risk: "GREEN", sourceScore: 82, seoScore: 80, hasImage: true, autoPublishEnabled: true,
    verifiedEvidence: true,
  }).decision, "AUTO_PUBLISH");
});

test("tek RSS özeti bütün eşikleri geçse bile otomatik yayımlanmaz", () => {
  assert.equal(decidePublication({
    risk: "GREEN", sourceScore: 95, seoScore: 95, hasImage: true, autoPublishEnabled: true,
    verifiedEvidence: false,
  }).decision, "REVIEW");
});

test("spekülatif manşet insan incelemesine gider", () => {
  const risk = classifyRisk({
    title: "Altın uçuyor: Uzman o tarihe işaret etti", summary: "",
    category: "altin", source: "Kaynak",
  });
  assert.equal(risk.level, "YELLOW");
});

test("fiyat kategorileri veri grafiği kullanır", () => {
  assert.equal(chooseImageStrategy("altin", "GREEN"), "MARKET_CHART");
});

test("doğrudan besleme listesindeki yayıncılar otomatik yayın eşiğini geçer", () => {
  const base = { title: "Büyüme rakamları açıklandı", summary: "A".repeat(120), category: "ekonomi" };
  for (const url of [
    "https://www.trthaber.com/haber/ekonomi/1",
    "https://www.ekonomim.com/ekonomi/2",
    "https://www.yenisafak.com/ekonomi/3",
    "https://www.sabah.com.tr/ekonomi/4",
    "https://tr.investing.com/news/5",
  ]) {
    assert.ok(scoreSource({ ...base, source: "Yayıncı", sourceUrl: url }).score >= 75, url);
  }
});

test("kripto dikey yayınları eşiği geçer ama genel gazetenin altında kalır", () => {
  const base = { title: "Bitcoin işlem hacmi arttı", summary: "A".repeat(120), category: "kripto" };
  const specialist = scoreSource({ ...base, source: "CoinTurk", sourceUrl: "https://coin-turk.com/haber" });
  const daily = scoreSource({ ...base, source: "Sözcü", sourceUrl: "https://www.sozcu.com.tr/haber" });
  assert.ok(specialist.score >= 75);
  assert.ok(specialist.score < daily.score);
});

test("tanımsız yayıncı otomatik yayına giremez", () => {
  const result = scoreSource({
    title: "Altın yükseldi", summary: "A".repeat(120), category: "altin",
    source: "Bilinmeyen", sourceUrl: "https://rastgele-blog.example/haber",
  });
  assert.ok(result.score < 75);
});
