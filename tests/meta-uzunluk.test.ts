import assert from "node:assert/strict";
import test from "node:test";
import { capMetaLength } from "../lib/bot/writer";

const kelime = "faiz kararı";

function meta(uzunluk: number): string {
  const govde = `TCMB faiz kararı beklentileri piyasada tartışılıyor ve analistler farklı senaryolar üzerinde duruyor `;
  return govde.repeat(5).slice(0, uzunluk).trim().padEnd(uzunluk, "x");
}

test("tercih edilen uzunluğun altındaki meta olduğu gibi kalır", () => {
  const girdi = meta(150);
  assert.equal(capMetaLength(girdi, kelime), girdi);
});

test("181 karakterlik meta kapı sınırının altına iner — makale çöpe gitmez", () => {
  // 2026-09-02'de bitmiş bir makale tam bu yüzden imha edilmişti.
  const girdi = meta(181);
  const sonuc = capMetaLength(girdi, kelime);
  assert.ok(sonuc.length <= 180, `meta hâlâ uzun: ${sonuc.length}`);
  assert.ok(sonuc.length >= 110, `meta fazla kısaldı: ${sonuc.length}`);
  assert.ok(sonuc.toLocaleLowerCase("tr-TR").includes(kelime), "odak kelime kayboldu");
});

test("kırpma her zaman odak kelimeyi korur", () => {
  // Odak kelime metanın sonunda: 165'e kırpınca kaybolur, 180'e kırpınca kalır.
  const girdi = `${"Piyasalarda son gelişmeler ve analistlerin beklentileri detaylı biçimde değerlendiriliyor bugün ".repeat(2).slice(0, 168)} ${kelime}`;
  const sonuc = capMetaLength(girdi, kelime);
  assert.ok(
    sonuc === girdi || sonuc.toLocaleLowerCase("tr-TR").includes(kelime),
    "kelimeyi kaybeden bir kırpma döndü",
  );
});

test("kelime korunamıyorsa taslak bozulmadan geri döner", () => {
  const girdi = `${"A".repeat(200)} ${kelime}`;
  assert.equal(capMetaLength(girdi, kelime), girdi);
});
