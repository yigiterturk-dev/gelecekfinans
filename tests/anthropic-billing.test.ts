import assert from "node:assert/strict";
import test from "node:test";
import {
  getAnthropicMonthWindow,
  getAnthropicPagination,
  sumAnthropicCostCents,
} from "../lib/anthropic-billing";

test("Anthropic maliyet kalemlerini sent cinsinden güvenli toplar", () => {
  const total = sumAnthropicCostCents({
    data: [
      { results: [{ amount: "123.50" }, { amount: "25" }] },
      { results: [{ amount: 1.5 }, { amount: "geçersiz" }] },
    ],
  });

  assert.equal(total, 150);
});

test("Anthropic maliyet ay aralığını UTC ve bugünü kapsayacak şekilde üretir", () => {
  assert.deepEqual(getAnthropicMonthWindow(new Date("2026-08-06T08:30:00Z")), {
    startingAt: "2026-08-01T00:00:00.000Z",
    endingAt: "2026-08-06T08:30:00.000Z",
  });
});

test("Anthropic sayfalama bilgisini yalnız geçerli değerlerle kabul eder", () => {
  assert.deepEqual(getAnthropicPagination({ has_more: true, next_page: "page_2" }), {
    hasMore: true,
    nextPage: "page_2",
  });
  assert.deepEqual(getAnthropicPagination({ has_more: true }), {
    hasMore: true,
    nextPage: null,
  });
});
