import { NextRequest, NextResponse } from "next/server";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { startOfIstanbulWeek } from "@/lib/bot/ai-budget";
import { acquireCronLock, releaseCronLock } from "@/lib/bot/cron-lock";
import { withBotRequestSignal } from "@/lib/bot/request-context";

export const maxDuration = 300;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const WEEKLY_NEWS_LIMIT = 3;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }
  const lock = await acquireCronLock("bot:publishing-pipeline");
  if (!lock) {
    return NextResponse.json({ skipped: true, reason: "Başka bir haber cron koşumu sürüyor" }, { headers: PRIVATE_HEADERS });
  }

  try {
    const settings = await getSettings();
    if (settings.autonomy?.cronEnabled === false) {
      return NextResponse.json({ skipped: true, reason: "Otomatik üretim ayarlardan duraklatıldı" }, { headers: PRIVATE_HEADERS });
    }

    const newsCreatedThisWeek = await prisma.article.count({
      where: {
        articleSource: "BOT",
        track: "NEWS",
        createdAt: { gte: startOfIstanbulWeek() },
      },
    });
    const remainingThisWeek = Math.max(0, WEEKLY_NEWS_LIMIT - newsCreatedThisWeek);
    if (remainingThisWeek === 0) {
      return NextResponse.json({
        added: 0,
        autoPublished: 0,
        reviewQueued: 0,
        blocked: 0,
        errors: [],
        skipped: true,
        reason: `Haftalık ${WEEKLY_NEWS_LIMIT} haber taslağı sınırına ulaşıldı`,
      }, { headers: PRIVATE_HEADERS });
    }

    const result = await withBotRequestSignal(req.signal, () => runPublishingPipeline({
      trigger: "cron",
      count: Math.min(settings.autonomy?.dailyArticleCount ?? 1, remainingThisWeek),
      targetWords: settings.autonomy?.targetWords ?? 550,
      autoPublish: settings.autonomy?.enabled ?? false,
    }));
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  } finally {
    await releaseCronLock(lock).catch(() => {});
  }
}
