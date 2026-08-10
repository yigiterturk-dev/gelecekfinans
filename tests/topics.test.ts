import assert from "node:assert/strict";
import test from "node:test";
import { classifyTopicText } from "../lib/bot/topics";

test("kelime içi eşleşmeler gündem haberini finans kategorisine sokmaz", () => {
  assert.equal(classifyTopicText("Kuraklığın vurduğu Avrupa'da nehir yatağı patlatıldı").category, null);
  assert.equal(classifyTopicText("Hasankeyf Tüneli girişinde feci kaza: 12 yaralı").category, null);
  assert.equal(classifyTopicText("12 Ağustos'ta yer çekimi duracak mı?").category, null);
  assert.equal(classifyTopicText("Yapay zekadan tehlikeli hamle").category, null);
});

test("doğrudan piyasa başlıklarını doğru kategoriye ayırır", () => {
  assert.equal(classifyTopicText("Putin kripto piyasasını düzenleyen yasayı imzaladı").category, "kripto");
  assert.equal(classifyTopicText("Altın kritik seviyeyi aştı").category, "altin");
  assert.equal(classifyTopicText("Dolar/TL kuru haftaya yükselişle başladı").category, "doviz");
  assert.equal(classifyTopicText("BIST 100 endeksi günü düşüşle tamamladı").category, "borsa");
  assert.equal(classifyTopicText("TCMB politika faizini sabit tuttu").category, "ekonomi");
});

test("şirket sonuçlarını ekonomi olarak tutar ama dolar tutarını döviz sanmaz", () => {
  assert.equal(
    classifyTopicText("Koç Holding'den 36,4 milyar dolarlık gelir").category,
    "ekonomi",
  );
  assert.equal(
    classifyTopicText("THY yılın ilk yarısında 18 milyar 864 milyon lira kâr etti").category,
    "ekonomi",
  );
});

test("finans dışı negatif sinyal zayıf özet eşleşmesini geçersiz kılar", () => {
  const result = classifyTopicText(
    "Meteoroloji açıkladı: Yeni haftada hava nasıl olacak?",
    "Sıcaklıkların fiyatlar ve tüketici davranışı üzerinde etkisi konuşuluyor.",
  );
  assert.equal(result.category, null);
});
