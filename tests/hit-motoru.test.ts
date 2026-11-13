import assert from "node:assert/strict";
import test from "node:test";

import { ctrAt, expectedClicks, newsScore, searchScore, verdict } from "../lib/hit-score";

test("ctrAt position arttıkça düşer ve 40 sonrası tabana iner", () => {
  assert.ok(ctrAt(1) > ctrAt(3));
  assert.ok(ctrAt(3) > ctrAt(10));
  assert.ok(ctrAt(10) > ctrAt(30));
  assert.ok(ctrAt(30) > ctrAt(40));
  assert.ok(ctrAt(40) > ctrAt(80));
  assert.ok(ctrAt(500) >= 0.001);
  assert.equal(ctrAt(0), 0);
});

test("expectedClicks sıra iyileşmesini gösterime çevirir, gerilemeyi saymaz", () => {
  const gain = expectedClicks(1000, 18, 6);
  assert.ok(gain > 0);
  assert.equal(expectedClicks(1000, 3, 10), 0);
});

test("searchScore 0-100 arasında kalır", () => {
  assert.equal(searchScore(0), 0);
  assert.equal(searchScore(4.2), 42);
  assert.equal(searchScore(500), 100);
});

test("newsScore tazelik ve varlık eşleşmesiyle yükselir", () => {
  const stale = newsScore({ trendRank: null, headlineCount: 1, ageHours: 30, entityMatched: false });
  const fresh = newsScore({ trendRank: 2, headlineCount: 6, ageHours: 1, entityMatched: true });
  assert.ok(fresh > stale);
  assert.ok(fresh <= 100);
});

test("verdict kanala ve sayfa varlığına göre ayrışır", () => {
  assert.equal(verdict(80, "haber", false), "GİR");
  assert.equal(verdict(30, "haber", false), "GEÇ");
  assert.equal(verdict(60, "arama", false), "YAZ");
  assert.equal(verdict(60, "arama", true), "GÜÇLENDİR");
  assert.equal(verdict(10, "arama", false), "GEÇ");
});

test("newsScore göreli normalizasyon: zirveye uzak konu daha düşük skor alır", () => {
  const leader = newsScore({ trendRank: null, headlineCount: 40, ageHours: 1, entityMatched: false }, { maxHeadlineCount: 40 });
  const small = newsScore({ trendRank: null, headlineCount: 4, ageHours: 1, entityMatched: false }, { maxHeadlineCount: 40 });
  assert.ok(leader > small);
  assert.ok(small >= 45);
});
