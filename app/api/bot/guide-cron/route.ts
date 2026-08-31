import { NextRequest, NextResponse } from "next/server";
import { runGuidePipeline } from "@/lib/bot/guide-orchestrator";
import { getSettings } from "@/lib/settings";

export const maxDuration = 300;

/**
 * Şerit B — rehber üretimi.
 *
 * Haber cron'undan AYRI ve daha seyrek çalışır (günde bir). Sebep: rehber
 * içerik tazelik yarışında değil; havuzdaki 45 kelime günde bir yazılsa bile
 * bir buçuk ayda kümeler tamamlanır ve her sayfa yıllarca trafik getirir.
 * Daha sık çalıştırmak yalnızca model maliyetini öne çeker.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  if (settings.autonomy?.cronEnabled === false) {
    return NextResponse.json({ skipped: true, reason: "Otomatik üretim ayarlardan duraklatıldı" });
  }
  const result = await runGuidePipeline({
    trigger: "cron",
    count: 1,
    targetWords: 1200,
    autoPublish: settings.autonomy?.enabled ?? false,
  });
  return NextResponse.json(result);
}
