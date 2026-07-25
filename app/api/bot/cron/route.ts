import { NextRequest, NextResponse } from "next/server";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";
import { getSettings } from "@/lib/settings";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  const result = await runPublishingPipeline({
    trigger: "cron",
    count: settings.autonomy?.dailyArticleCount ?? 3,
    targetWords: settings.autonomy?.targetWords ?? 1000,
    autoPublish: settings.autonomy?.enabled ?? true,
  });
  return NextResponse.json(result);
}
