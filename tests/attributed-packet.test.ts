import { test } from "node:test";
import assert from "node:assert/strict";
import { toAttributedPacket, type EvidencePacket } from "../lib/bot/research";

const now = Date.parse("2026-11-12T12:00:00Z");
const pkt = (over: Partial<EvidencePacket["evidence"][0]> = {}, count = 1): EvidencePacket => ({
  storyKey: "k", status: "INSUFFICIENT", independentSourceCount: count, reasons: [],
  evidence: [{
    id: "ev-1", title: "Asgari ücrette kulis: yüzde 30 zam bekleniyor", summary: "x", source: "Sözcü",
    sourceUrl: "https://www.sozcu.com.tr/a", publisherKey: "publisher:sozcu",
    publishedAt: "2026-11-11T12:00:00Z", sourceScore: 60, ...over,
  }],
});

test("taze kulis haberi allowlist yayıncıdan atıflı şeride girer", () => {
  assert.equal(toAttributedPacket(pkt(), now)?.status, "ATTRIBUTED");
});
test("bilinmeyen alan, bayat, kulis olmayan ve çok kaynaklı reddedilir", () => {
  assert.equal(toAttributedPacket(pkt({ sourceUrl: "https://blog.example.com/a" }), now), null);
  assert.equal(toAttributedPacket(pkt({ publishedAt: "2026-11-01T00:00:00Z" }), now), null);
  assert.equal(toAttributedPacket(pkt({ title: "Borsa günü yükselişle kapattı" }), now), null);
  assert.equal(toAttributedPacket(pkt({}, 2), now), null);
});
