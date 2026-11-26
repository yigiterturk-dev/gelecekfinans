import assert from "node:assert/strict";
import test from "node:test";
import { isDuplicate } from "../lib/duplicate";

const mevcut = [
  { id: "1", title: "Enflasyon Nedir, Nasıl Hesaplanır? Kavram, Yöntem ve Dikkat Edilmesi Gerekenler", content: "Enflasyon fiyatlar genel düzeyinin artışıdır." },
  { id: "2", title: "Gram Altın Hesaplama Nasıl Yapılır?", content: "Gram altın fiyatı ons ve kur ile bulunur." },
];

test("farklı konulu rehber kalıp kelimeler yüzünden benzer sayılmaz", () => {
  assert.equal(isDuplicate("Kira Artış Oranı Nasıl Hesaplanır? Adımlar ve Dikkat Edilmesi Gerekenler", "Kira artışı TÜFE on iki aylık ortalamasıyla sınırlıdır.", mevcut).duplicate, false);
});

test("aynı konunun rehberi hâlâ benzer sayılır", () => {
  assert.equal(isDuplicate("Gram Altın Nasıl Hesaplanır? Gram Altın Hesaplama Rehberi", "Başka giriş.", mevcut).duplicate, true);
});

test("aynı olaylı haber başlıkları hâlâ yakalanır", () => {
  const haber = [{ id: "3", title: "Rusya Merkez Bankası Faiz İndirimine Gitti", content: "x" }];
  assert.equal(isDuplicate("Rusya Merkez Bankası Faiz Oranını Beklentilerin Altında İndirdi", "y", haber).duplicate, true);
});
