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

test("markKeywordFailed yayınlanmış kelimeyi düşürmüyor", () => {
  const govde = kaynak.slice(kaynak.indexOf("export async function markKeywordFailed"));
  assert.ok(/status === "PUBLISHED"/.test(govde), "PUBLISHED koruması kaldırılmış");
  assert.ok(
    govde.indexOf('status === "PUBLISHED"') < govde.indexOf("exhausted"),
    "koruma, durum güncellemesinden ÖNCE gelmeli",
  );
});

test("koruma durumu değil yalnızca lastError'ı yazıyor", () => {
  const govde = kaynak.slice(kaynak.indexOf("export async function markKeywordFailed"));
  const blok = govde.slice(govde.indexOf('status === "PUBLISHED"'), govde.indexOf("const exhausted"));
  assert.ok(/lastError/.test(blok), "yayın sonrası hata bilgisi kaybediliyor");
  assert.ok(!/status:/.test(blok), "koruma bloğu durumu değiştiriyor");
});
