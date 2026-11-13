import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { prisma } from "../lib/db";
import { DatabaseUnavailableError, getAllArticles, getGuides } from "../lib/articles";

function stub(t: TestContext, target: object, method: string, implementation: (...args: unknown[]) => unknown) {
  const obj = target as Record<string, unknown>;
  const original = obj[method];
  obj[method] = implementation;
  t.after(() => { obj[method] = original; });
}

test("veritabanı kesintisi haber listesini boşaltmaz", async (t) => {
  t.mock.method(console, "error", () => {});
  stub(t, prisma.article, "findMany", async () => { throw new Error("connection refused"); });
  await assert.rejects(getAllArticles(), DatabaseUnavailableError);
});

test("gerçekten boş veritabanı boş haber listesi döndürür", async (t) => {
  stub(t, prisma.article, "findMany", async () => []);
  assert.deepEqual(await getAllArticles(), []);
});

test("görüntülenme sayacı arızası yayımlanmış haberi gizlemez", async (t) => {
  t.mock.method(console, "error", () => {});
  stub(t, prisma.article, "findMany", async () => [{
    id: "article-1", slug: "test-haberi", title: "Test haberi", meta: "Açıklama",
    category: "ekonomi", keyword: null, source: null, imageUrl: null,
    publishedAt: new Date("2026-11-01T10:00:00Z"),
    createdAt: new Date("2026-11-01T10:00:00Z"), updatedAt: new Date("2026-11-01T10:00:00Z"),
  }]);
  stub(t, prisma.pageView, "groupBy", async () => { throw new Error("counter unavailable"); });
  const articles = await getAllArticles();
  assert.equal(articles.length, 1);
  assert.equal(articles[0].slug, "test-haberi");
  assert.equal(articles[0].views, 0);
});

test("veritabanı kesintisi rehber arşivini boşaltmaz", async (t) => {
  t.mock.method(console, "error", () => {});
  stub(t, prisma.article, "findMany", async () => { throw new Error("connection refused"); });
  await assert.rejects(getGuides(), DatabaseUnavailableError);
});
