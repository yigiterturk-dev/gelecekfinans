import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startOfIstanbulDay } from "@/lib/bot/ai-budget";
import type { UsageSummary } from "@/lib/bot/usage";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const istanbulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function istanbulDateKey(date: Date): string {
  const parts = new Map(istanbulDateFormatter.formatToParts(date).map(({ type, value }) => [type, value] as const));
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(retryAfterSec) } },
  );
}

/**
 * Panelde maliyet ve engel kayıtları görünmüyordu: ekran yalnızca BotRun
 * özetini çekiyordu, AutomationEvent'e hiç bakmıyordu. "Bugün para nereye
 * gitti, makale neden çıkmadı" sorularının cevabı yalnızca terminaldeydi.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:bot-runs:get:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit.retryAfterSec);

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [runs, recentDecisions, costEvents, blockEvents] = await Promise.all([
    prisma.botRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.article.findMany({
      where: { articleSource: "BOT" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, slug: true, status: true, createdAt: true,
        riskLevel: true, publicationDecision: true, sourceScore: true,
        seoScore: true, imageStrategy: true, autoPublished: true,
        automationMeta: true,
      },
    }),
    prisma.automationEvent.findMany({
      where: { stage: "cost", createdAt: { gte: monthAgo } },
      select: { createdAt: true, metadata: true },
    }),
    prisma.automationEvent.findMany({
      where: { level: { in: ["warning", "error"] }, createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { createdAt: true, stage: true, message: true, level: true },
    }),
  ]);

  const dayStart = startOfIstanbulDay();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const cost = { today: 0, week: 0, month: 0, calls: 0, byModel: {} as Record<string, number>, unpriced: [] as string[] };
  const unpriced = new Set<string>();
  const activeDays = new Set<string>();

  for (const event of costEvents) {
    const usage = event.metadata as unknown as UsageSummary | null;
    if (!usage || typeof usage.costUsd !== "number") continue;
    cost.month += usage.costUsd;
    cost.calls += usage.calls;
    if (event.createdAt >= weekStart) cost.week += usage.costUsd;
    if (event.createdAt >= dayStart) cost.today += usage.costUsd;
    activeDays.add(istanbulDateKey(event.createdAt));
    for (const [model, stat] of Object.entries(usage.byModel || {})) {
      cost.byModel[model] = (cost.byModel[model] || 0) + stat.costUsd;
    }
    for (const model of usage.unpricedModels || []) unpriced.add(model);
  }
  cost.unpriced = [...unpriced];

  // Aylık gidiş, ÖLÇÜLEN gün sayısına bölünerek bulunuyor: ölçüm 1 Eylül'de
  // eklendi, 30 güne bölmek ilk haftalarda harcamayı olduğundan düşük gösterir.
  const projectedMonthly = activeDays.size ? (cost.month / activeDays.size) * 30 : 0;

  return NextResponse.json({
    runs,
    recentDecisions,
    cost: {
      today: Number(cost.today.toFixed(4)),
      week: Number(cost.week.toFixed(4)),
      month: Number(cost.month.toFixed(4)),
      calls: cost.calls,
      measuredDays: activeDays.size,
      projectedMonthly: Number(projectedMonthly.toFixed(2)),
      byModel: Object.fromEntries(
        Object.entries(cost.byModel)
          .sort((a, b) => b[1] - a[1])
          .map(([model, value]) => [model, Number(value.toFixed(4))]),
      ),
      unpricedModels: cost.unpriced,
    },
    blocks: blockEvents,
  }, { headers: PRIVATE_HEADERS });
}
