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
