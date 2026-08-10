import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { normalizeAdsensePublisherId } from "@/lib/adsense";

export async function GET() {
  const settings = await getSettings();
  const ga4Id = settings.ga4Id?.trim();
  return NextResponse.json({
    ga4Id: ga4Id && /^G-[A-Z0-9]+$/i.test(ga4Id) ? ga4Id.toUpperCase() : null,
    adsenseId: normalizeAdsensePublisherId(settings.adsenseId),
    adSlots: settings.adSlots || {},
  }, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
