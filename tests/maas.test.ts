import { test } from "node:test";
import assert from "node:assert/strict";
import { brutNetYil, kumulatifVergi, netBrut } from "../lib/maas";

test("asgari ücret 12 ay boyunca net 28.075,50 TL, vergi yok", () => {
  for (const a of brutNetYil(33_030)) {
    assert.equal(a.net, 28_075.5);
    assert.equal(a.gelirVergisi, 0);
    assert.equal(a.damga, 0);
  }
});

test("asgari ücret işveren maliyeti 40.874,63 TL", () => {
  assert.equal(brutNetYil(33_030)[0].isverenMaliyet, 40_874.63);
});

test("tarife: tebliğdeki taban vergi tutarları", () => {
  assert.equal(kumulatifVergi(190_000), 28_500);
  assert.equal(kumulatifVergi(400_000), 70_500);
  assert.equal(kumulatifVergi(1_500_000), 367_500);
  assert.equal(kumulatifVergi(5_300_000), 1_697_500);
});

test("yüksek ücrette dilim yıl içinde yükselir, net düşer", () => {
  const y = brutNetYil(100_000);
  assert.ok(y[11].net < y[0].net);
  assert.equal(y[0].vergiOrani, 0.15);
});

test("SGK tavanı aşılınca prim sabit", () => {
  const y = brutNetYil(400_000);
  assert.equal(y[0].sgk, 41_617.8);
});

test("net→brüt geri dönüşü tutarlı", () => {
  const brut = netBrut(50_000);
  assert.ok(Math.abs(brutNetYil(brut)[0].net - 50_000) < 0.02);
});
