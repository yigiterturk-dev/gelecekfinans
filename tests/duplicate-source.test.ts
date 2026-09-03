import test from "node:test";
import assert from "node:assert/strict";
import { findSourceRepeat, normalizeSourceUrl } from "../lib/duplicate";

const HABERTURK = "https://www.haberturk.com/borsa-gunu-dususle-tamamladi-3909836-ekonomi";

// 2-3 Eylül'de yaşanan gerçek olay: aynı haberturk haberi akşam ve ertesi
// sabah iki ayrı makale olarak yazıldı. Başlıklar yalnızca "borsa/istanbulda"
// paylaşıyordu, kaynak ise birebir aynıydı.
const yesterdayClose = {
  id: "a1",
  title: "Borsa İstanbul'da gün düşüşle kapandı: İşlem hacmi 195,2 milyar TL",
  automationMeta: {
    sourceUrl: HABERTURK,
    evidencePacket: {
      evidence: [
        { id: "ev-1-publisher:haberturk-borsa-gunu-dususle-tamamladi", sourceUrl: HABERTURK },
        { id: "ev-2-publisher:anadolu-ajansi-borsa-gunu-dususle-tamamladi" },
        { id: "ev-3-publisher:dunya-borsa-istanbul-gunu-dususle-tamamladi" },
      ],
    },
  },
};

test("normalizeSourceUrl protokol/www/sorgu farklarını siler", () => {
  assert.equal(normalizeSourceUrl(HABERTURK), "haberturk.com/borsa-gunu-dususle-tamamladi-3909836-ekonomi");
  assert.equal(
    normalizeSourceUrl("http://haberturk.com/borsa-gunu-dususle-tamamladi-3909836-ekonomi/?utm_source=x"),
    normalizeSourceUrl(HABERTURK),
  );
});

test("aynı kaynak URL'inden ikinci haber tekrar sayılır", () => {
  const repeat = findSourceRepeat({ sourceUrl: HABERTURK }, [yesterdayClose]);
  assert.ok(repeat);
  assert.equal(repeat.reason, "primary-url");
  assert.equal(repeat.matchId, "a1");
});

test("kaynak URL'i farklı olsa da 2+ kanıt kimliği örtüşürse tekrar sayılır", () => {
  const repeat = findSourceRepeat(
    {
      sourceUrl: "https://www.aa.com.tr/tr/ekonomi/borsa-gunu-dususle-tamamladi/1",
      evidencePacket: {
        evidence: [
          { id: "ev-1-publisher:anadolu-ajansi-borsa-gunu-dususle-tamamladi" },
          { id: "ev-2-publisher:dunya-borsa-istanbul-gunu-dususle-tamamladi" },
        ],
      },
    },
    [yesterdayClose],
  );
  assert.ok(repeat);
  assert.equal(repeat.reason, "evidence-overlap");
});

test("ertesi günün kapanışı (yeni kaynak) engellenmez", () => {
  const repeat = findSourceRepeat(
    {
      sourceUrl: "https://www.haberturk.com/borsa-gunu-yukselisle-tamamladi-3911111-ekonomi",
      evidencePacket: { evidence: [{ id: "ev-1-publisher:haberturk-borsa-gunu-yukselisle-tamamladi" }] },
    },
    [yesterdayClose],
  );
  assert.equal(repeat, null);
});

test("tek ortak kanıt tekrar saymaz (takip haberi serbest)", () => {
  const repeat = findSourceRepeat(
    {
      sourceUrl: "https://www.dunya.com/finans/yeni-haber",
      evidencePacket: { evidence: [{ id: "ev-1-publisher:dunya-borsa-istanbul-gunu-dususle-tamamladi" }] },
    },
    [yesterdayClose],
  );
  assert.equal(repeat, null);
});

test("kaynak bilgisi olmayan makaleler eşleşmez", () => {
  assert.equal(findSourceRepeat({}, [yesterdayClose]), null);
  assert.equal(findSourceRepeat({ sourceUrl: HABERTURK }, [{ id: "x", title: "y", automationMeta: null }]), null);
});
