import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";
import { getSettings } from "@/lib/settings";
import { sendDailyDigest, mailEnabled } from "@/lib/mail";
import { acquireCronLock, releaseCronLock } from "@/lib/bot/cron-lock";

export const maxDuration = 300;

/**
 * Eski cron adresi geriye dönük uyumluluk için korunur, fakat artık içerik
 * üretimini doğrudan yapmaz; kanıt kapılı tek orkestratöre yönlendirir.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  let bot;
  if (settings.autonomy?.cronEnabled === false) {
    bot = { skipped: true, reason: "Otomatik üretim ayarlardan duraklatıldı" };
  } else {
    const lock = await acquireCronLock("bot:publishing-pipeline");
    if (!lock) {
      return NextResponse.json({ error: "Başka bir yayın üretim akışı sürüyor." }, { status: 409 });
    }
    try {
      bot = await runPublishingPipeline({
        trigger: "cron",
        count: settings.autonomy?.dailyArticleCount ?? 1,
        targetWords: settings.autonomy?.targetWords ?? 550,
        autoPublish: settings.autonomy?.enabled ?? false,
      });
    } finally {
      await releaseCronLock(lock).catch(() => {});
    }
  }

  let mailSent = 0;
  let mailError: string | null = null;
  const mailSkipped = !mailEnabled();
  try {
    if (!mailSkipped) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [subscribers, articles] = await Promise.all([
        prisma.subscriber.findMany({ where: { active: true, confirmed: true }, select: { email: true } }),
        prisma.article.findMany({
          where: { status: "PUBLISHED", publishedAt: { gte: since } },
          orderBy: { publishedAt: "desc" },
          take: 10,
          select: { title: true, slug: true, meta: true, category: true },
        }),
      ]);
      if (subscribers.length > 0 && articles.length > 0) {
        mailSent = await sendDailyDigest(subscribers.map(s => s.email), articles);
      }
    }
  } catch (error) {
    mailError = (error as Error).message;
  }

  return NextResponse.json({
    bot,
    newsletter: mailSkipped
      ? { sent: 0, skipped: true, reason: "mail not configured" }
      : { sent: mailSent, error: mailError },
  });
}
