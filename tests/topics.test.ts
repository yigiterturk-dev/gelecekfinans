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

/**
 * Şirket/fintek haberleri kapıdan geçmeli.
 *
 * Bu testler bir kayıptan doğdu: "Midas ödeme sistemleri işine giriyor,
 * kurucu Egem Eraslan açıkladı" haberi sitenin Search Console'da iş yapan
 * TEK sayfasıydı ("midas kurucu" 12. sıra), ama başlığı makro sözlükteki
 * hiçbir kelimeyi içermediği için kapı bugün onu elerdi. Aşağıdakiler o
 * kör noktanın geri gelmesini engeller.
 */
test("fintek şirket haberi konu olarak kabul edilir", () => {
  const sonuc = classifyTopicText("Midas ödeme sistemleri işine giriyor, kurucu Egem Eraslan açıkladı");
  assert.notEqual(sonuc.category, null);
});

test("aracı kurum lisans haberi kabul edilir", () => {
  const sonuc = classifyTopicText("Aracı kurum için SPK onayı çıktı");
  assert.notEqual(sonuc.category, null);
});

test("şirket birleşmesi kabul edilir", () => {
  const sonuc = classifyTopicText("İki katılım bankası birleşme kararı aldı");
  assert.notEqual(sonuc.category, null);
});

test("finans dışı haber hâlâ reddedilir", () => {
  // Kapı gevşetildi ama delinmedi: alakasız gündem hâlâ girmemeli.
  const sonuc = classifyTopicText("Metro istasyonunda kaza: 3 yaralı");
  assert.equal(sonuc.category, null);
});

/**
 * ── TÜRKÇE EKLERİ ───────────────────────────────────────────────────────────
 * ÖLÇÜM (3 Eylül 2026, 20 feed canlı): 473 haberin yalnızca 121'i (%26)
 * havuza giriyordu, 352'si eleniyordu. Sebep sözlük eksikliği değil, EŞLEME
 * biçimiydi: `includesPhrase` tam kelime arıyordu ve Türkçe eklemeli bir dil.
 * "ihracat" sözlükte vardı ama gelen başlık "ihracatımız", "ihracatta",
 * "ihracatla" yazıyordu; "enflasyon" vardı, başlık "enflasyonu" diyordu.
 * Havuza giremeyen haber ne konu olabiliyor NE DE ikinci kaynak sayılabiliyor —
 * "İkinci bağımsız yayıncı bulunamadı" ile ölen 168 konunun kökü buydu.
 */
test("Türkçe ekli biçimler sözlükle eşleşir", () => {
  const ekliBaşlıklar: Array<[string, string]> = [
    ["Ticaret Bakanı Bolat: Ocak-ağustos dönemi ihracatımız Cumhuriyet tarihimizin en yükseği oldu", "ekonomi"],
    ["Savunma ve havacılık sanayisi ihracattaki gücünü artırıyor", "ekonomi"],
    ["Yıllık kira enflasyonu son 46 ayın en düşük seviyesine indi", "ekonomi"],
    ["Merkez Bankası'nın rezervleri açıklandı", "ekonomi"],
    ["Borsada güne yükselişle başlandı", "borsa"],
    ["Konut kredisi faizlerinde son durum", "ekonomi"],
  ];
  for (const [başlık, beklenen] of ekliBaşlıklar) {
    assert.equal(classifyTopicText(başlık).category, beklenen, `eşleşmedi: ${başlık}`);
  }
});

/**
 * Ek toleransı kapıyı körleştirmemeli. Eski `text.includes("kur")` hatasının
 * geri gelmediğini ve ek alan köklerin yanlış arkadaşlarının hâlâ elendiğini
 * bu test sabitler.
 */
test("ek toleransı yanlış arkadaşları içeri almaz", () => {
  const elenmeli = [
    "Kuraklığın vurduğu Avrupa'da nehir yatağı patlatıldı",
    "Hasankeyf Tüneli girişinde feci kaza: 12 yaralı",
    "Yeni tüfek ihalesinde son teklif verildi",
    "Milli Dayanışma Kanunu'nun teklif desteği ve kapsamı",
  ];
  for (const başlık of elenmeli) {
    assert.equal(classifyTopicText(başlık).category, null, `elenmeliydi: ${başlık}`);
  }
});

/**
 * "Baskı altında", "yüzde 5'in altında" gibi kalıplar altın haberi DEĞİLDİR;
 * "altın" kökü Türkçede "alt"ın bulunma hâliyle birebir çakışır.
 */
test("altın kökü, alt ekli biçimleriyle karışmaz", () => {
  // "alt"ın bulunma hâli: önünde sayı ya da "baskı/kontrol" gibi bir ad var.
  assert.notEqual(classifyTopicText("Şirket hisseleri baskı altında kaldı").category, "altin");
  assert.notEqual(classifyTopicText("Enflasyon yüzde 5in altında kaldı").category, "altin");
  // Gerçek altın haberi: aynı ek, ama önünde o sinyal yok. Koşulsuz eleme
  // bunu da düşürüyordu ("Altındaki sert düşüşün nedeni belli oldu").
  assert.equal(classifyTopicText("Altındaki sert düşüşün nedeni belli oldu").category, "altin");
  assert.equal(classifyTopicText("Gram altın rekor tazeledi").category, "altin");
  assert.equal(classifyTopicText("Altının onsu yeniden yükselişte").category, "altin");
});
