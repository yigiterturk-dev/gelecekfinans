import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEvidenceIdWith } from "../lib/bot/writer";

const paket = new Set([
  "ev-1-publisher:anadolu-ajansi-ecb-faiz",
  "ev-2-publisher:dunya-ecb-sinyali",
  "ark-1-aa",
  "ark-2-dunya",
]);

test("birebir eşleşen kimlik olduğu gibi döner", () => {
  assert.equal(resolveEvidenceIdWith("ark-1-aa", paket), "ark-1-aa");
});

test("köşeli parantez soyulur", () => {
  assert.equal(
    resolveEvidenceIdWith("[ev-2-publisher:dunya-ecb-sinyali]", paket),
    "ev-2-publisher:dunya-ecb-sinyali",
  );
});

test("kısaltılmış ön ek tek eşleşmeye çözülür", () => {
  assert.equal(resolveEvidenceIdWith("ark-2", paket), "ark-2-dunya");
});

test("model 'publisher' kelimesini yayıncı yerine yazınca sıra numarasından çözülür", () => {
  // 4 Eylül canlı kaydı: gerçek kimlik ark-1-aa, model ark-1-publisher yazdı.
  assert.equal(resolveEvidenceIdWith("ark-1-publisher", paket), "ark-1-aa");
  assert.equal(resolveEvidenceIdWith("ark-2-publisher", paket), "ark-2-dunya");
});

test("sıra numarası birden çok kimliğe uyuyorsa dokunulmaz", () => {
  const belirsiz = new Set(["ark-1-aa", "ark-1-dunya"]);
  assert.equal(resolveEvidenceIdWith("ark-1-publisher", belirsiz), "ark-1-publisher");
});

test("paketle ilgisiz kimlik uydurulmaz", () => {
  assert.equal(resolveEvidenceIdWith("ark-9-boyle-bir-sey-yok", paket), "ark-9-boyle-bir-sey-yok");
});
