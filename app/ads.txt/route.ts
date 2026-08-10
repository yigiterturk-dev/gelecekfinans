import { NextResponse } from "next/server";
import { adsTxtRecord } from "@/lib/adsense";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const settings = await getSettings();
  const record = adsTxtRecord(settings.adsenseId);
  if (!record) {
    return new NextResponse("AdSense publisher ID yapılandırılmadı.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse(`${record}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
