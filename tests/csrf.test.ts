import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";
import { farkliKokenReddi } from "../lib/csrf";

const istek = (h: Record<string, string>) =>
  new NextRequest("https://gelecekfinans.com/api/admin/x", { method: "POST", headers: h });

test("aynı kökenden gelen istek geçer", () => {
  assert.equal(
    farkliKokenReddi(istek({ origin: "https://gelecekfinans.com", host: "gelecekfinans.com" })),
    null
  );
});

test("farklı kökenden gelen istek 403 alır", () => {
  const r = farkliKokenReddi(istek({ origin: "https://kotu-site.example", host: "gelecekfinans.com" }));
  assert.equal(r?.status, 403);
});

test("Origin yoksa Referer'a bakılır", () => {
  assert.equal(
    farkliKokenReddi(istek({ referer: "https://gelecekfinans.com/admin", host: "gelecekfinans.com" })),
    null
  );
  assert.equal(
    farkliKokenReddi(istek({ referer: "https://kotu-site.example/x", host: "gelecekfinans.com" }))?.status,
    403
  );
});

test("Origin ve Referer hiç yoksa istek REDDEDİLMEZ", () => {
  // Tasarım kararı: cron ve sunucu-sunucu çağrıları başlık göndermez ve
  // oturum çerezi de taşımaz. Yoklukta reddetmek onları kırardı.
  assert.equal(farkliKokenReddi(istek({ host: "gelecekfinans.com" })), null);
});

test("bozuk Origin başlığı reddedilir", () => {
  assert.equal(
    farkliKokenReddi(istek({ origin: "bu-bir-url-degil", host: "gelecekfinans.com" }))?.status,
    403
  );
});

test("proxy arkasında x-forwarded-host esas alınır", () => {
  assert.equal(
    farkliKokenReddi(istek({ origin: "https://gelecekfinans.com", host: "10.0.0.5", "x-forwarded-host": "gelecekfinans.com" })),
    null
  );
});

test("durum değiştiren HER admin ucu kapıyı çağırır", () => {
  // Yeni bir admin ucu eklenip kapı unutulursa bu test kırılır.
  // ⚠️ .pathname kullanma: depo yolunda boşluk varsa %20 olarak gelir ve scandir patlar.
  const kok = fileURLToPath(new URL("../app/api/admin", import.meta.url));
  const gez = (d: string): string[] =>
    readdirSync(d).flatMap((ad) => {
      const tam = `${d}/${ad}`;
      return statSync(tam).isDirectory() ? gez(tam) : tam.endsWith("route.ts") ? [tam] : [];
    });
  const eksik = gez(kok).filter((p) => {
    const s = readFileSync(p, "utf8");
    return /export async function (POST|PUT|PATCH|DELETE)/.test(s) && !s.includes("farkliKokenReddi");
  });
  assert.deepEqual(eksik, [], "bu uçlarda köken kapısı yok");
});

test("create-admin scripti sırları sızdırmıyor", () => {
  // Bu üç şey bir kez gerçekten oldu: admin şifresi bir oturum dökümünde göründü.
  const ham = readFileSync(fileURLToPath(new URL("../scripts/create-admin.ts", import.meta.url)), "utf8");
  // Yorumlar soyulur: dosyanın başındaki açıklama eski hatayı ADIYLA anlatıyor,
  // onu ihlal sanmak testi yanlış yere kırar.
  const s = ham.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/admin123/.test(s), "kodda varsayılan şifre kalmış");
  assert.ok(!/console\.log\([^)]*\$\{?password/.test(s), "şifre ekrana basılıyor");
  assert.ok(s.includes("process.env.ADMIN_PASSWORD"), "şifre ortam değişkeninden okunmalı");
  assert.ok(!/process\.argv\[3\]\s*\|\|/.test(s), "şifre hâlâ argümandan varsayılanla alınıyor");
});
