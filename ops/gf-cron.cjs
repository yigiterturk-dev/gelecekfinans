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
function classifyResult(status, body, job) {
  if (status < 200 || status >= 300) return { level: "error", code: `HTTP_${status}` };
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { level: "error", code: "INVALID_RESPONSE" };
  }
  // Newsletter responses use sent/failed, not the article pipeline's added/errors.
  // A 200 with zero deliveries must never update lastSuccessAt.
  if (job === "newsletter") {
    if (body.skipped) return { level: "warning", code: "SKIPPED" };
    const sent = Number(body.sent);
    const failed = body.failed === undefined ? 0 : Number(body.failed);
    if (!Number.isInteger(sent) || sent < 0 || !Number.isInteger(failed) || failed < 0) {
      return { level: "error", code: "INVALID_NEWSLETTER_RESULT" };
    }
    if (failed > 0) {
      return sent > 0
        ? { level: "warning", code: "PARTIAL_DELIVERY" }
        : { level: "error", code: "DELIVERY_FAILED" };
    }
    if (sent > 0) return { level: "ok", code: "DELIVERY_COMPLETED" };
    return { level: "warning", code: "NO_CONTENT" };
  }
  // Koşum içi yazar çağrısı tavanı arıza değil: o turda yazılabilen yazıldı.
  if (body.fatalErrorCode === "AI_BUDGET_LIMIT_REACHED") {
    return { level: "warning", code: "BUDGET_LIMIT" };
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
  const provider = env.ARTICLE_AI_PROVIDER?.trim().toLowerCase();
  const providerKey = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    gemini: "GEMINI_API_KEY",
  }[provider];
  const automationDisabled = ["news", "guide"].includes(job)
    && env.AI_AUTOMATION_ENABLED?.trim().toLowerCase() !== "true";
  const openAISpendingDisabled = ["news", "guide"].includes(job)
    && provider === "openai"
    && env.AI_OPENAI_SPENDING_ENABLED?.trim().toLowerCase() !== "true";
  const missingAI = ["news", "guide"].includes(job) && (!providerKey || !env[providerKey]);
  const hasNewsletterSecret = env.NEWSLETTER_SECRET || env.NEXTAUTH_SECRET || env.CRON_SECRET;
  const missingMail = job === "newsletter" && (!env.RESEND_API_KEY || !hasNewsletterSecret);
  try {
    if (!env.CRON_SECRET) throw new Error("Missing cron secret");
    // Kapalı yazı hattı için endpoint'e bile gitme; model çağrısı yapılmayacağını
    // uygulama zaten garanti eder, cron da gereksiz isteği ve hatalı alarmı önler.
    if (automationDisabled) {
      result = { level: "warning", code: "AI_AUTOMATION_DISABLED" };
    } else if (openAISpendingDisabled) {
      result = { level: "warning", code: "OPENAI_SPENDING_DISABLED" };
    } else if (missingAI) {
      throw new Error("Missing AI key");
    // Resend config yokken endpoint'i çağırma: hiçbir e-posta gönderilemez.
    } else if (missingMail) {
      result = { level: "warning", code: "MAIL_NOT_CONFIGURED" };
    } else {
      const response = await request(new URL(route, env.GF_CRON_BASE_URL || "https://gelecekfinans.com"), {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        signal: AbortSignal.timeout(290_000),
        redirect: "error",
      });
      httpStatus = response.status;
      let body = null;
      try { body = await response.json(); } catch { /* malformed response */ }
      result = classifyResult(response.status, body, job);
      for (const key of ["added", "autoPublished", "reviewQueued", "blocked", "repaired", "sent", "failed", "recipients", "articles", "sitemapUrls", "attempted", "googleSkippedUnsupported"]) {
        if (Number.isFinite(body?.[key])) counts[key] = body[key];
      }
    }
  } catch {
    result = { level: "error", code: !env.CRON_SECRET ? "MISSING_SECRET" : missingAI ? "MISSING_AI_KEY" : "REQUEST_FAILED" };
  }
  const finishedAt = new Date().toISOString();
  const state = {
    job, startedAt, finishedAt, httpStatus, ...result, ...counts,
    lastSuccessAt: result.level === "ok"
      ? finishedAt
      : job === "newsletter"
        ? null
        : previous.lastSuccessAt ?? null,
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
