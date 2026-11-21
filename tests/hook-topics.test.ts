import { test } from "node:test";
import assert from "node:assert/strict";
import { insertToolCta, matchHookTopic } from "../lib/bot/hook-topics";

const id = (t: string) => matchHookTopic(t)?.id ?? null;

test("araca bağlanan Türkiye gündemi kanca olur", () => {
  assert.equal(id("Kasım ayı enflasyonu açıklandı: yıllık yüzde 31"), "enflasyon");
  assert.equal(id("TÜFE beklentilerin altında kaldı"), "enflasyon");
  assert.equal(id("Merkez Bankası politika faizini yüzde 39,5'e indirdi"), "faiz");
  assert.equal(id("Kira artış oranı belli oldu"), "kira");
  assert.equal(id("En düşük emekli aylığı için yeni formül"), "emekli");
  assert.equal(id("Memur maaşlarına ocakta ne kadar zam gelecek?"), "memur");
  assert.equal(id("Asgari ücret 2027 için ilk toplantı tarihi"), "asgari-ucret");
  assert.equal(id("Gram altın güne yükselişle başladı"), "altin");
  assert.equal(id("Dolar/TL rekor tazeledi"), "doviz");
});

test("genel ve yabancı haber elenir", () => {
  assert.equal(id("Fed faiz kararını açıkladı"), null);
  assert.equal(id("ABD enflasyonu beklentiyi aştı"), null);
  assert.equal(id("Çin'in ihracatı geriledi"), null);
  assert.equal(id("Şirket 2 milyar dolarlık yatırım yapacak"), null);
  assert.equal(id("Kiraz ihracatında rekor"), null);
  assert.equal(id("Piyasalar baskı altında kaldı"), null);
  assert.equal(id("Bitcoin 56 bin doların altını gördü"), null);
  assert.equal(id("Fransa'da 850 ev sular altında kaldı"), null);
  assert.equal(id("Fon soruşturmasında aranan Serdar Altınbaş yakalandı"), null);
  assert.equal(id("Ons altın faiz beklentileriyle 14 ayın dibinde"), "altin");
});

test("araç kutusu ilk paragraftan sonra bir kez eklenir", () => {
  const topic = matchHookTopic("Kira artış oranı belli oldu")!;
  const html = insertToolCta("<p>Giriş.</p><p>İkinci.</p>", topic);
  assert.match(html, /^<p>Giriş\.<\/p><div class="tool-cta">.*kira-artis-hesaplama.*<\/div><p>İkinci/);
  assert.equal(insertToolCta(html, topic), html);
});
