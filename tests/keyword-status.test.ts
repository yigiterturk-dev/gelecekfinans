import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Sözleşme testi: yayınlanmış kelimenin durumu geri alınamaz.
 * Canlı vaka (3 Eylül): makale yayımlandıktan sonra bir adım hata verince
 * catch bloğu markKeywordFailed çağırıp kelimeyi PUBLISHED'dan FAILED'a
 * düşürmüştü. Koruma çağıran tarafta değil fonksiyonun içinde olmalı ki
 * hangi yoldan gelinirse gelinsin çalışsın.
 */
const kaynak = readFileSync(new URL("../lib/bot/keywords.ts", import.meta.url), "utf8");

function markKeywordFailedGovdesi(): string {
  return kaynak.slice(kaynak.indexOf("export async function markKeywordFailed"));
}

/** PUBLISHED koruması: koruma bloğunun SONU (return) ile durum hesabının başı. */
function korumaSiniri(govde: string): { bas: number; son: number; durumHesabi: number } {
  const bas = govde.indexOf('status === "PUBLISHED"');
  return {
    bas,
    son: govde.indexOf("return;", bas),
    durumHesabi: govde.indexOf("resolveKeywordFailure("),
  };
}

test("markKeywordFailed yayınlanmış kelimeyi düşürmüyor", () => {
  const govde = markKeywordFailedGovdesi();
  assert.ok(/status === "PUBLISHED"/.test(govde), "PUBLISHED koruması kaldırılmış");
  const { bas, son, durumHesabi } = korumaSiniri(govde);
  assert.ok(durumHesabi > 0, "durum hesabı bulunamadı");
  assert.ok(bas < son && son < durumHesabi, "koruma, durum güncellemesinden ÖNCE gelmeli");
});

test("koruma durumu değil yalnızca lastError'ı yazıyor", () => {
  const govde = markKeywordFailedGovdesi();
  const { bas, son } = korumaSiniri(govde);
  const blok = govde.slice(bas, son);
  assert.ok(/lastError/.test(blok), "yayın sonrası hata bilgisi kaybediliyor");
  assert.ok(!/status:/.test(blok), "koruma bloğu durumu değiştiriyor");
});
