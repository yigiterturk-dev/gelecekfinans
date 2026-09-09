import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * ÖLÇÜLDÜ (2026-09-09): sitemap'teki 112 adresin yalnızca 53'ünde `lastmod`
 * vardı (makaleler). Google `lastmod`'u tarama sıralaması için ipucu olarak
 * kullanıyor ve bu sitenin ana sorunu tam olarak tarama bütçesiydi
 * ("Discovered – currently not indexed").
 *
 * 🔑 Tarih UYDURULMAZ: her zaman "şimdi" yazmak Google'ın lastmod'a güvenmeyi
 * bırakmasına yol açar. Bu yüzden tarihler ya veritabanından (makale) ya da
 * ilgili profil dosyasının gerçek değişim gününden geliyor.
 */
const kaynak = readFileSync(fileURLToPath(new URL("../app/sitemap.ts", import.meta.url)), "utf8");

test("sitemap'te lastModified'sız giriş kalmadı", () => {
  // Her `url:` satırının ait olduğu nesnede lastModified olmalı.
  const nesneler = kaynak.match(/\{[^{}]*url:\s*`[^`]*`[^{}]*\}/g) ?? [];
  const eksik = nesneler.filter((n) => !n.includes("lastModified"));
  assert.equal(
    eksik.length,
    0,
    `lastModified'sız giriş var:\n${eksik.map((n) => n.replace(/\s+/g, " ").slice(0, 90)).join("\n")}`
  );
});

test("lastmod 'şimdi' ile uydurulmuyor", () => {
  // new Date() (argümansız) = her taramada taze görünen sahte sinyal.
  const kod = kaynak.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(
    !/lastModified:\s*new Date\(\)/.test(kod),
    "lastModified: new Date() → her taramada 'değişti' der, Google sinyale güvenmeyi bırakır"
  );
});

test("profil tarihleri sabit ve açıkça yazılmış", () => {
  assert.match(kaynak, /PROFIL_TARIHLERI/, "profil tarihleri tek yerde tanımlı olmalı");
  // Tarihler ISO gün biçiminde sabit olmalı ki gözle denetlenebilsin.
  const tarihler = kaynak.match(/new Date\("(\d{4}-\d{2}-\d{2})"\)/g) ?? [];
  assert.ok(tarihler.length >= 5, "beklenen sabit tarih sayısı bulunamadı");
});
