import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Bu testler davranışı değil SÖZLEŞMEYİ koruyor: Resend SDK hatayı fırlatmıyor,
 * `{ data, error }` döndürüyor. Kod bu alanı kontrol etmeyi bırakırsa başarısız
 * gönderimler yeniden "başarılı" sayılmaya başlar ve kimse fark etmez.
 */
const kaynak = readFileSync(new URL("../lib/mail.ts", import.meta.url), "utf8");

test("gönderim sonucunda error alanı kontrol ediliyor", () => {
  assert.ok(/\.error/.test(kaynak), "res.error kontrolü kaldırılmış");
  assert.ok(
    !/\.then\(\(\)\s*=>\s*\{\s*sent\+\+;\s*\}\)/.test(kaynak),
    "koşulsuz sent++ geri gelmiş — Resend hataları başarılı sayılır",
  );
});

test("başarısız gönderim sayısı çağırana raporlanıyor", () => {
  assert.ok(/lastBatchResult/.test(kaynak), "lastBatchResult kaldırılmış");
  assert.ok(/failed/.test(kaynak), "failed sayacı yok");
});

test("bülten cron'u sonucu kayda düşüyor", () => {
  const cron = readFileSync(new URL("../app/api/newsletter/cron/route.ts", import.meta.url), "utf8");
  assert.ok(/automationEvent\.create/.test(cron), "bülten koşumu kayıt bırakmıyor");
  assert.ok(/stage: "newsletter"/.test(cron), "kayıt newsletter aşamasıyla etiketlenmiyor");
});
