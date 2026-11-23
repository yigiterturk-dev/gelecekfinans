import { NextRequest, NextResponse } from "next/server";
import { runGuidePipeline } from "@/lib/bot/guide-orchestrator";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { startOfIstanbulWeek } from "@/lib/bot/ai-budget";
import { acquireCronLock, releaseCronLock } from "@/lib/bot/cron-lock";

export const maxDuration = 300;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const WEEKLY_GUIDE_LIMIT = 2;

/**
 * Şerit B — rehber üretimi.
 *
 * Cron sık çalışsa bile otomatik rehber üretimi haftada iki yeni adayla sınırlı.
 * Kota, tüm durumlarda oluşturulan bot rehberlerini sayar; yalnızca başarılı
 * yayınları saymak doğrulayıcı itirazıyla kurtarılan taslakları dışarıda bırakırdı.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }
  const lock = await acquireCronLock("bot:publishing-pipeline");
  if (!lock) {
    return NextResponse.json({ skipped: true, reason: "Başka bir rehber cron koşumu sürüyor" }, { headers: PRIVATE_HEADERS });
  }

  try {
    const settings = await getSettings();
    if (settings.autonomy?.cronEnabled === false) {
      return NextResponse.json({ skipped: true, reason: "Otomatik üretim ayarlardan duraklatıldı" }, { headers: PRIVATE_HEADERS });
    }

    const guidesCreatedThisWeek = await prisma.article.count({
      where: {
        articleSource: "BOT",
        track: "GUIDE",
        createdAt: { gte: startOfIstanbulWeek() },
      },
    });
    const remainingThisWeek = Math.max(0, WEEKLY_GUIDE_LIMIT - guidesCreatedThisWeek);
    if (remainingThisWeek === 0) {
      return NextResponse.json({
        added: 0,
        autoPublished: 0,
        reviewQueued: 0,
        blocked: 0,
        errors: [],
        skipped: true,
        reason: `Haftalık ${WEEKLY_GUIDE_LIMIT} rehber taslağı sınırına ulaşıldı`,
      }, { headers: PRIVATE_HEADERS });
    }

    const configuredCount = Number(process.env.GUIDE_COUNT_PER_RUN ?? WEEKLY_GUIDE_LIMIT);
    const requestedCount = Number.isSafeInteger(configuredCount) && configuredCount > 0
      ? configuredCount
      : WEEKLY_GUIDE_LIMIT;
    const result = await runGuidePipeline({
      trigger: "cron",
      count: Math.min(remainingThisWeek, requestedCount),
      targetWords: 1200,
      autoPublish: false,
    });
    return NextResponse.json(result, { headers: PRIVATE_HEADERS });
  } finally {
    await releaseCronLock(lock).catch(() => {});
  }
}
