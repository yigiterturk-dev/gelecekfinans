import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";
import { farkliKokenReddi } from "@/lib/csrf";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isAIAutomationEnabled } from "@/lib/bot/ai-budget";
import { acquireCronLock, releaseCronLock } from "@/lib/bot/cron-lock";
import { z } from "zod";

export const maxDuration = 300;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const generationRequestSchema = z.object({
  count: z.literal(1),
  category: z.enum(["", "kripto", "borsa", "doviz", "altin", "ekonomi"]).default(""),
  words: z.number().int().min(450).max(900).default(650),
}).strict();

function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Çok sık üretim isteği. Biraz bekleyip tekrar deneyin.", retryAfter: retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(retryAfterSec) } },
  );
}

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) {
    kokenReddi.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
    return kokenReddi;
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:bot:generate:${clientIp(req)}`, { limit: 10, windowMs: 30 * 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = generationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Üretim ayarları geçersiz." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  if (!isAIAutomationEnabled()) {
    return NextResponse.json({ error: "AI otomasyonu kapalı; üretim yapılmadı." }, { status: 503, headers: PRIVATE_HEADERS });
  }

  const lock = await acquireCronLock("bot:publishing-pipeline");
  if (!lock) {
    return NextResponse.json(
      { error: "Başka bir yayın üretim akışı sürüyor. Biraz bekleyip tekrar deneyin." },
      { status: 409, headers: { ...PRIVATE_HEADERS, "Retry-After": "30" } },
    );
  }

  try {
    const result = await runPublishingPipeline({
      trigger: "admin",
      count: parsed.data.count,
      category: parsed.data.category,
      targetWords: parsed.data.words,
      autoPublish: false,
    });
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Üretim şu anda tamamlanamadı." }, { status: 500, headers: PRIVATE_HEADERS });
  } finally {
    await releaseCronLock(lock).catch(() => {});
  }
}
