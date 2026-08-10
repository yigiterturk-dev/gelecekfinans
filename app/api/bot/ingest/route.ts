import { NextRequest, NextResponse } from "next/server";

/**
 * Eski harici bot hazır HTML göndererek kanıt, doğrulama ve plagiarism
 * kapılarını atlayabiliyordu. Uç adres bilerek kapalı tutulur; otomatik içerik
 * yalnızca /api/bot/generate veya zamanlanmış ortak orkestratörden geçer.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.BOT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    error: "Bu ingest akışı kullanımdan kaldırıldı. Kanıt kapılı /api/bot/generate akışını kullanın.",
    code: "INGEST_PIPELINE_RETIRED",
  }, { status: 410 });
}
