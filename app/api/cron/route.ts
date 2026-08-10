import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";
import { getSettings } from "@/lib/settings";
import { sendDailyDigest } from "@/lib/mail";

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
  const bot = settings.autonomy?.cronEnabled === false
    ? { skipped: true, reason: "Otomatik üretim ayarlardan duraklatıldı" }
    : await runPublishingPipeline({
        trigger: "cron",
        count: settings.autonomy?.dailyArticleCount ?? 1,
        targetWords: settings.autonomy?.targetWords ?? 550,
        autoPublish: settings.autonomy?.enabled ?? false,
      });

  let mailSent = 0;
  let mailError: string | null = null;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [subscribers, articles] = await Promise.all([
      prisma.subscriber.findMany({ where: { active: true }, select: { email: true } }),
      prisma.article.findMany({
        where: { status: "PUBLISHED", publishedAt: { gte: since } },
        orderBy: { publishedAt: "desc" },
        take: 10,
        select: { title: true, slug: true, meta: true, category: true },
      }),
    ]);
    if (subscribers.length && articles.length) {
      await sendDailyDigest(subscribers.map((subscriber) => subscriber.email), articles);
      mailSent = subscribers.length;
    }
  } catch (error) {
    mailError = (error as Error).message;
  }

  return NextResponse.json({ bot, newsletter: { sent: mailSent, error: mailError } });
}
