import { NextRequest, NextResponse } from "next/server";
import { runGuidePipeline } from "@/lib/bot/guide-orchestrator";
import { getSettings } from "@/lib/settings";

export const maxDuration = 300;

/**
 * Şerit B — rehber üretimi.
 *
 * Haber cron'undan AYRI çalışır; günde üç koşum (08, 12, 20 UTC).
 *
 * ⚠️ Koşum başına kaç kelime: 2026-09-04'e kadar 1'di ve yorumdaki gerekçe
 * "daha sık çalıştırmak yalnızca maliyeti öne çeker" idi. Ölçüm bunu
 * çürüttü: kuyrukta 47 kelime beklerken yayınlanmış rehber sayısı 5'ti ve
 * günlük yazar çağrısı bütçesinin yalnızca 6/24'ü kullanılıyordu. Yani fren
 * maliyet değil, bu sabitti.
 *
 * Koşum başına 2 → günde en çok 6 rehber. Haber şeridi tipik olarak 6 çağrı
 * kullanıyor; 24'lük ortak bütçeye rahat sığar. Kelime seçimi zaten küme
 * başına bir tane aldığı için tek gün içinde tek konu şişmez
 * (bkz. lib/bot/keywords.ts pickKeywords).
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
    count: Number(process.env.GUIDE_COUNT_PER_RUN ?? 2),
    targetWords: 1200,
    autoPublish: settings.autonomy?.enabled ?? false,
  });
  return NextResponse.json(result);
}
