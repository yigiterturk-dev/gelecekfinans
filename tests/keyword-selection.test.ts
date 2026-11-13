import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ENTITY_KEYWORD_COOLDOWN_HOURS,
  KEYWORD_COOLDOWN_HOURS,
  MAX_KEYWORD_ATTEMPTS,
  compareKeywordCandidates,
  resolveKeywordFailure,
  selectKeywordCandidates,
  type KeywordCandidate,
} from "../lib/bot/keywords";

/**
 * Sözleşme: rehber kuyruğunun günlük kotasını, arşiv malzemesi birikmemiş
 * varlık kelimeleri yiyemez.
 *
 * Canlı vaka (1 Kasım 2026): kuyrukta 47 varlık kelimesi 90 öncelikle duruyor,
 * 39 yazılabilir tohum rehberi onların arkasında bekliyordu. Varlık kelimesi
 * 24 saatlik genel bekleme dolunca her gün yeniden seçiliyor, kanıt kapısında
 * düşüyor, kota boşa gidiyordu.
 */

function candidate(overrides: Partial<KeywordCandidate> = {}): KeywordCandidate {
  return {
    id: "k1",
    term: "örnek kelime",
    category: "ekonomi",
    cluster: "ornek-kume",
    isHub: false,
    intent: "INFORMATIONAL",
    priority: 50,
    origin: "seed",
    lastTriedAt: null,
    ...overrides,
  };
}

function hoursAgo(hours: number, now: Date): Date {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

test("varlık kelimesi genel bekleme dolsa da kendi süresi dolmadan seçilmez", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const picked = selectKeywordCandidates(
    [candidate({ id: "entity", origin: "entity", priority: 90, lastTriedAt: hoursAgo(KEYWORD_COOLDOWN_HOURS + 1, now) })],
    1,
    now,
  );
  assert.equal(picked.length, 0);
});

test("varlık kelimesi kendi süresi dolunca yeniden denenebilir", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const picked = selectKeywordCandidates(
    [candidate({ id: "entity", origin: "entity", priority: 90, lastTriedAt: hoursAgo(ENTITY_KEYWORD_COOLDOWN_HOURS + 1, now) })],
    1,
    now,
  );
  assert.equal(picked.length, 1);
  assert.equal(picked[0].id, "entity");
});

test("bekleyen varlık kelimesi, arkadaki yazılabilir tohum kelimeyi engellemez", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const picked = selectKeywordCandidates(
    [
      candidate({ id: "entity", origin: "entity", priority: 90, lastTriedAt: hoursAgo(48, now) }),
      candidate({ id: "seed", cluster: "tohum-kume", priority: 80, lastTriedAt: hoursAgo(KEYWORD_COOLDOWN_HOURS + 1, now) }),
    ],
    1,
    now,
  );
  assert.deepEqual(picked.map((item) => item.id), ["seed"]);
});

test("aynı kümeden bir koşuda tek kelime alınır", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const picked = selectKeywordCandidates(
    [
      candidate({ id: "a", cluster: "ayni" }),
      candidate({ id: "b", cluster: "ayni" }),
      candidate({ id: "c", cluster: "farkli" }),
    ],
    5,
    now,
  );
  assert.deepEqual(picked.map((item) => item.id), ["a", "c"]);
});

test("seçilen kelimeye lastTriedAt sızmaz", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const [picked] = selectKeywordCandidates([candidate({ lastTriedAt: hoursAgo(100, now) })], 1, now);
  assert.equal("lastTriedAt" in picked, false);
});

test("kanıt kapısında düşen kelime de deneme sayar (sonsuz döngü yok)", () => {
  // Yazar çağrısı yapılmadan düşen kelime QUEUED durumundadır; bu düşüş
  // sayılmazsa kelime her koşuda yeniden seçilir ve kota sonsuza kadar yanar.
  const first = resolveKeywordFailure({ attempts: 0, status: "QUEUED" });
  assert.deepEqual(first, { status: "QUEUED", counted: true });

  const last = resolveKeywordFailure({ attempts: MAX_KEYWORD_ATTEMPTS - 1, status: "QUEUED" });
  assert.deepEqual(last, { status: "FAILED", counted: true });
});

test("yazımdan sonra düşen kelime iki kez sayılmaz", () => {
  const next = resolveKeywordFailure({ attempts: 1, status: "IN_PROGRESS" });
  assert.deepEqual(next, { status: "QUEUED", counted: false });
});

test("varlık kelimesi, yazılabilir tohum rehberin önüne geçmez", () => {
  // 1 Kasım 2026: 45 hiç denenmemiş varlık kelimesi 90 önceliğiyle 39 tohum
  // rehberin önündeydi. Varlık, kanıt arşivi birikmeden yazılamadığı için bu
  // sıralama günlük kotayı haftalarca boşa yaktı.
  const date = new Date("2026-10-01T00:00:00Z");
  const sorted = [
    { isHub: false, origin: "entity", priority: 90, attempts: 0, createdAt: date },
    { isHub: false, origin: "seed", priority: 60, attempts: 0, createdAt: date },
  ].sort(compareKeywordCandidates);
  assert.equal(sorted[0].origin, "seed");
});

test("hub kelimesi hâlâ her şeyin önünde", () => {
  const date = new Date("2026-10-01T00:00:00Z");
  const sorted = [
    { isHub: false, origin: "seed", priority: 99, attempts: 0, createdAt: date },
    { isHub: true, origin: "seed", priority: 10, attempts: 0, createdAt: date },
  ].sort(compareKeywordCandidates);
  assert.equal(sorted[0].isHub, true);
});
