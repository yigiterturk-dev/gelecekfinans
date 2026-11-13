/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CLI; no Next/TS loader required. */
const { mkdir, readFile, rename, writeFile } = require("node:fs/promises");
const { dirname, join } = require("node:path");

const JOBS = {
  news: "/api/bot/cron",
  guide: "/api/bot/guide-cron",
  gsc: "/api/bot/gsc-cron",
  image: "/api/bot/image-repair",
  index: "/api/bot/index-ping",
  newsletter: "/api/newsletter/cron",
};

// HTTP 200 tek başına başarılı üretim değildir. Ham yanıtlar (abone/anahtar/
// sağlayıcı verisi içerebilir) hiçbir zaman loga veya durum dosyasına yazılmaz.
function classifyResult(status, body) {
  if (status < 200 || status >= 300) return { level: "error", code: `HTTP_${status}` };
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { level: "error", code: "INVALID_RESPONSE" };
  }
  if (body.fatalErrorCode) return { level: "error", code: "PROVIDER_FAILED" };
  // Kapıların (kanıt, kalite, intihal) hepsini reddettiği koşu arıza değil:
  // sistem tasarlandığı gibi çalışıp yayınlanabilir konu bulamamış demektir.
  if (body.added === 0 && Number(body.blocked) > 0 && Array.isArray(body.errors) && body.errors.length) {
    return { level: "warning", code: "ALL_BLOCKED" };
  }
  if (body.error || (Array.isArray(body.errors) && body.errors.length && !body.added)) {
    return { level: "error", code: "PIPELINE_FAILED" };
  }
  if (body.skipped) return { level: "warning", code: "SKIPPED" };
  if (body.added === 0) return { level: "warning", code: "NO_CONTENT" };
  if (Array.isArray(body.errors) && body.errors.length) {
    return { level: "warning", code: "PARTIAL_SUCCESS" };
  }
  return { level: "ok", code: "COMPLETED" };
}

async function saveState(path, data) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data) + "\n", { mode: 0o600 });
  await rename(temporary, path);
}

async function runJob(job, { env = process.env, request = fetch } = {}) {
  const route = JOBS[job];
  if (!route) throw new Error("Unknown job");
  const stateFile = join(env.GF_CRON_STATE_DIR || "/var/lib/gelecekfinans/cron", `${job}.json`);
  let previous = {};
  try { previous = JSON.parse(await readFile(stateFile, "utf8")); } catch { /* first run */ }
  let result;
  let counts = {};
  let httpStatus = null;
  const startedAt = new Date().toISOString();
  const provider = env.ARTICLE_AI_PROVIDER || (env.OPENAI_API_KEY ? "openai" : "anthropic");
  const providerKey = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", deepseek: "DEEPSEEK_API_KEY" }[provider];
  const missingAI = ["news", "guide"].includes(job) && (!providerKey || !env[providerKey]);
  try {
    if (!env.CRON_SECRET) throw new Error("Missing cron secret");
    // Anahtar yokken rehber kuyruğuna bile dokunma. Site veri sunmaya devam eder.
    if (missingAI) throw new Error("Missing AI key");
    const response = await request(new URL(route, env.GF_CRON_BASE_URL || "https://gelecekfinans.com"), {
      headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      signal: AbortSignal.timeout(290_000),
      redirect: "error",
    });
    httpStatus = response.status;
    let body = null;
    try { body = await response.json(); } catch { /* malformed response */ }
    result = classifyResult(response.status, body);
    for (const key of ["added", "autoPublished", "reviewQueued", "blocked"]) {
      if (Number.isFinite(body?.[key])) counts[key] = body[key];
    }
  } catch {
    result = { level: "error", code: !env.CRON_SECRET ? "MISSING_SECRET" : missingAI ? "MISSING_AI_KEY" : "REQUEST_FAILED" };
  }
  const finishedAt = new Date().toISOString();
  const state = {
    job, startedAt, finishedAt, httpStatus, ...result, ...counts,
    lastSuccessAt: result.level === "ok" ? finishedAt : previous.lastSuccessAt ?? null,
    consecutiveFailures: result.level === "error" ? (previous.consecutiveFailures || 0) + 1 : 0,
  };
  await saveState(stateFile, state);
  return state;
}

module.exports = { JOBS, classifyResult, runJob };

if (require.main === module) {
  runJob(process.argv[2]).then((state) => {
    console.log(JSON.stringify(state));
    process.exitCode = state.level === "error" ? 1 : state.level === "warning" ? 2 : 0;
  }).catch(() => {
    console.error("GelecekFinans cron could not run or save its state");
    process.exitCode = 1;
  });
}
