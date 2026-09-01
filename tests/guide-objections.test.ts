import assert from "node:assert/strict";
import test from "node:test";
import { guideBlockingObjections, isOmissionObjection } from "../lib/bot/guide-objections";

/**
 * Canlı kayıttan alınan gerçek itirazlar (1 Eylül 2026, üç rehber koşumu da
 * bu itirazlarla öldü). Rehber şeridi somut rakam yazamaz; rakam istemek
 * kazanılamaz bir kilit kuruyordu.
 */
const CANLI_EKSIKLIK_ITIRAZLARI = [
  "Geçerlilik sürelerine dayalı emir türlerinin kesin sınırları yok.",
  "Borsada işlem yaparken kesin kazanç sağlanamayacağı bilgisi eksik.",
  "Emirlerin geçerlilik süreleri sürekli gözden geçirilmeli, ancak kesin süre belirtilmemiş.",
  "Fed'in kararının kesin gün ve saatine ilişkin somut bir bilgi paylaşılmadı.",
  "Komisyon oranlarına ilişkin daha fazla ayrıntı verilmeli.",
];

/** Bunlar GERÇEK ihlal: uydurma kurum/yasa, yatırım tavsiyesi, çelişki. */
const GERCEK_IHLALLER = [
  "Sermaye Denetim Üst Kurulu diye bir kurum yok.",
  "Metin, 6362 sayılı kanunun 45. maddesinin altın hesaplarını yasakladığını söylüyor; böyle bir madde yok.",
  "Altın fonlarında masraf olmadığı iddia ediliyor, bu yanlış.",
  "Okura hisse alması öneriliyor; yatırım tavsiyesi.",
  "Giriş bölümü riski düşük diyor, SSS bölümü yüksek riskli diyor.",
];

test("rehber itiraz süzgeci — eksiklik şikâyetlerini ret sebebi saymaz", () => {
    for (const objection of CANLI_EKSIKLIK_ITIRAZLARI) {
      assert.equal(isOmissionObjection(objection), true, objection);
    }
    assert.deepEqual(guideBlockingObjections(CANLI_EKSIKLIK_ITIRAZLARI), []);
});

test("rehber itiraz süzgeci — gerçek ihlalleri aynen geçirir — kapı zayıflamıyor", () => {
    for (const objection of GERCEK_IHLALLER) {
      assert.equal(isOmissionObjection(objection), false, objection);
    }
    assert.deepEqual(guideBlockingObjections(GERCEK_IHLALLER), GERCEK_IHLALLER);
});

test("rehber itiraz süzgeci — karışık listede yalnızca gerçek ihlal kalır", () => {
    const karisik = [...CANLI_EKSIKLIK_ITIRAZLARI, ...GERCEK_IHLALLER];
    assert.deepEqual(guideBlockingObjections(karisik), GERCEK_IHLALLER);
});

test("rehber itiraz süzgeci — boş ve anlamsız girdide çökmez", () => {
    assert.equal(isOmissionObjection(""), false);
    assert.equal(isOmissionObjection("   "), false);
    assert.deepEqual(guideBlockingObjections([]), []);
});
