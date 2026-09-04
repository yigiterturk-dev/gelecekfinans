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

test("onay maili ve bot alarmı da error alanını kontrol ediyor", () => {
  // Üç gönderim noktası da aynı tuzağa düşmüştü; üçü birden korunuyor.
  const alarm = readFileSync(new URL("../lib/bot/alert.ts", import.meta.url), "utf8");
  assert.ok(/\.error/.test(alarm), "bot alarmı Resend hatasını kontrol etmiyor");
  assert.ok(
    !/await new Resend\(key\)\.emails\.send\(\{[\s\S]*?\}\);\s*return true;/.test(alarm),
    "alarm gönderimi sonucu kontrol etmeden true dönüyor",
  );
  assert.ok(
    /onay maili reddedildi/.test(kaynak),
    "abonelik onay maili Resend hatasını kontrol etmiyor",
  );
});
