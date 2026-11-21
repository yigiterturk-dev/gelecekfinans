import { test } from "node:test";
import assert from "node:assert/strict";
import { BIST_TATIL, HAFTA_SONU_TATIL, gunDurumu, siradakiTatil, sonrakiIslemGunu, istanbulDate } from "../lib/bist-tatil";

const wd = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

test("tatil listesi sıralı, tekrarsız ve yalnız hafta içi", () => {
  const dates = BIST_TATIL.map((x) => x.date);
  assert.deepEqual([...dates].sort(), dates);
  assert.equal(new Set(dates).size, dates.length);
  for (const d of dates) assert.ok(wd(d) >= 1 && wd(d) <= 5, `${d} hafta sonu`);
  for (const h of HAFTA_SONU_TATIL) assert.ok(wd(h.date) === 0 || wd(h.date) === 6, `${h.date} hafta içi`);
});

test("2026 resmî tablo, 2027 beklenen", () => {
  for (const t of BIST_TATIL) assert.equal(t.resmi, t.date.startsWith("2026"));
});

test("gün durumu", () => {
  assert.equal(gunDurumu("2026-03-19").tur, "yarim");
  assert.equal(gunDurumu("2026-05-27").tur, "kapali");
  assert.equal(gunDurumu("2026-11-21").tur, "hafta-sonu");
  assert.equal(gunDurumu("2026-11-23").tur, "acik");
});

test("sıradaki tatil ve işlem günü", () => {
  assert.equal(siradakiTatil("2026-11-21")?.date, "2027-01-01");
  assert.equal(sonrakiIslemGunu("2026-05-26"), "2026-06-01");
  assert.equal(sonrakiIslemGunu("2026-12-31"), "2027-01-04");
});

test("İstanbul tarihi UTC gece yarısını doğru çevirir", () => {
  assert.equal(istanbulDate(new Date("2026-11-21T22:30:00Z")), "2026-11-22");
});
