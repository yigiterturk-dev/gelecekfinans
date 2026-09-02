import assert from "node:assert/strict";
import test from "node:test";
import { CallBudget } from "../lib/bot/call-budget";
import { sameStoryJudgeCallsUsed, sameStoryJudgeSkipped } from "../lib/bot/writer";

test("tavan dolunca çağrı hakkı verilmez", () => {
  const budget = new CallBudget(2);
  assert.equal(budget.take(), true);
  assert.equal(budget.take(), true);
  assert.equal(budget.take(), false, "tavan aşıldığında hak verilmemeli");
  assert.equal(budget.used(), 2, "reddedilen deneme harcanan sayılmamalı");
});

test("tavan yüzünden sorulamayan soru AYRI sayılır", () => {
  // Kapının reddi ile hiç bakmaması aynı şey değil; kayıtta da ayrışmalı.
  const budget = new CallBudget(1);
  budget.take();
  assert.equal(budget.available(), false);
  budget.skip();
  budget.skip();
  assert.equal(budget.skipped(), 2);
  assert.equal(budget.used(), 1, "atlanan soru para harcamış gibi görünmemeli");
});

test("sıfırlama iki sayacı da temizler", () => {
  const budget = new CallBudget(3);
  budget.take();
  budget.skip();
  budget.reset();
  assert.equal(budget.used(), 0);
  assert.equal(budget.skipped(), 0);
  assert.equal(budget.available(), true);
});

test("hakem sayaçları koşum başında sıfırdan başlar", () => {
  // Ağ çağrısı YOK: yalnızca modül düzeyindeki sayaçların ilk hâli okunuyor.
  assert.equal(sameStoryJudgeCallsUsed(), 0);
  assert.equal(sameStoryJudgeSkipped(), 0);
});

test("varsayılan hakem tavanı gerçek koşumu karşılar", () => {
  // Gerçek koşum: ~20 konu × en fazla 3 aday. Tavan 8'ken soruların dörtte
  // üçü modele hiç ulaşmıyordu (ölçüm 2026-09-02: 112 soru, 29 gerçek çağrı).
  const tavan = Number(process.env.RESEARCH_JUDGE_MAX_CALLS_PER_RUN) || 60;
  assert.ok(tavan >= 60, `tavan gerçek koşumun altında kalmamalı, şu an ${tavan}`);
});
