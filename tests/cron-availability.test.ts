import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyResult, runJob } from "../ops/gf-cron.cjs";

test("HTTP 200 içindeki sağlayıcı arızası başarı sayılmaz", () => {
  assert.equal(classifyResult(200, { fatalErrorCode: "OPENAI_QUOTA_EXHAUSTED", added: 0 }).level, "error");
  assert.equal(classifyResult(500, {}).level, "error");
  assert.equal(classifyResult(200, null).level, "error");
  assert.equal(classifyResult(200, { errors: ["blocked"], added: 0 }).level, "error");
});

test("çalışmış görünen boş üretim ve eksik GSC uyarıdır", () => {
  assert.equal(classifyResult(200, { added: 0, blocked: 2, errors: [] }).code, "NO_CONTENT");
  // 12 Kasım 2026: tüm adaylar kapılarda düştü, üretim hatası yok.
  const hepsiKapıda = classifyResult(200, { added: 0, blocked: 6, errors: ["PLAGIARISM_BLOCKED"] });
  assert.equal(hepsiKapıda.level, "warning");
  assert.equal(hepsiKapıda.code, "ALL_BLOCKED");
  // 13 Kasım 2026: bir makale yayınlandıktan sonra koşum içi çağrı tavanı doldu.
  const butce = classifyResult(200, { fatalErrorCode: "AI_BUDGET_LIMIT_REACHED", added: 1, blocked: 5 });
  assert.equal(butce.level, "warning");
  assert.equal(butce.code, "BUDGET_LIMIT");
  assert.equal(classifyResult(200, { skipped: true }).code, "SKIPPED");
  assert.equal(classifyResult(200, { added: 1, errors: [] }).level, "ok");
});

test("görev başarısı ve ardışık arıza kalıcı kaydedilir; gizli yanıt kaydedilmez", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "gf-cron-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test", GF_CRON_STATE_DIR: directory, CRON_SECRET: "test-secret", ARTICLE_AI_PROVIDER: "openai", OPENAI_API_KEY: "test-key" };
  const success = await runJob("news", { env, request: async () => new Response(JSON.stringify({ added: 1, apiKey: "never-log-this" })) });
  assert.equal(success.level, "ok");
  const failure = () => runJob("news", { env, request: async () => new Response("upstream-secret", { status: 503 }) });
  assert.equal((await failure()).consecutiveFailures, 1);
  const second = await failure();
  assert.equal(second.consecutiveFailures, 2);
  assert.equal(second.lastSuccessAt, success.lastSuccessAt);
  const saved = await readFile(join(directory, "news.json"), "utf8");
  assert.ok(!saved.includes("secret"));
  assert.ok(!saved.includes("apiKey"));
});

test("AI anahtarı yokken haber veya rehber kuyruğuna istek gönderilmez", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "gf-no-key-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const env: NodeJS.ProcessEnv = { NODE_ENV: "test", GF_CRON_STATE_DIR: directory, CRON_SECRET: "test", ARTICLE_AI_PROVIDER: "openai" };
  for (const job of ["news", "guide"]) {
    const result = await runJob(job, { env, request: async () => { assert.fail("Anahtar yokken kuyruğa dokunuldu"); } });
    assert.equal(result.code, "MISSING_AI_KEY");
    assert.equal(result.httpStatus, null);
  }
});
