import { test } from "node:test";
import assert from "node:assert/strict";
import { fxLiveFaq } from "../lib/market-faq";

const fmt = { tl: (n: number, d = 2) => n.toFixed(d).replace(".", ","), when: () => "21 Kasım 15:40" };

test("kur yoksa soru basılmaz", () => {
  assert.equal(fxLiveFaq("usd-try", "Dolar", "USD", null, null, fmt), null);
  assert.equal(fxLiveFaq("usd-try", "Dolar", "USD", { rate: NaN, changePct: null, updatedAt: null }, null, fmt), null);
});

test("euro sorusu avro eş anlamlısını ve canlı kuru içerir", () => {
  const f = fxLiveFaq("eur-try", "Euro", "EUR", { rate: 48.1234, changePct: -0.31, updatedAt: "x" }, 48.5, fmt)!;
  assert.equal(f.q, "Bugün 1 euro (avro) ne kadar, kaç TL?");
  assert.match(f.a, /1 EUR = ₺48,1234/);
  assert.match(f.a, /%0,31 düşüş/);
  assert.match(f.a, /efektif satış kuru ₺48,5000/);
});

test("dolar: TCMB yoksa o cümle yok, yükseliş yazılır", () => {
  const f = fxLiveFaq("usd-try", "Dolar", "USD", { rate: 42, changePct: 0.5, updatedAt: null }, null, fmt)!;
  assert.equal(f.q, "Bugün 1 dolar ne kadar, kaç TL?");
  assert.match(f.a, /%0,50 yükseliş/);
  assert.doesNotMatch(f.a, /Merkez Bankası/);
});
