import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// 1x1 şeffaf GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

function pixel() {
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Length": String(PIXEL.length),
    },
  });
}

/**
 * Bülten açılma takibi (open-rate). E-postaya gömülü pikselle çağrılır:
 *   /api/newsletter/open?c=<campaignId>&v=A|B
 * Sayaç artırılır; hatada bile her zaman piksel döner (fail-soft).
 */
export async function GET(req: NextRequest) {
  const c = req.nextUrl.searchParams.get("c");
  const v = req.nextUrl.searchParams.get("v");
  if (c && c.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(c) && (v === "A" || v === "B")) {
    try {
      await prisma.newsletterCampaign.update({
        where: { id: c },
        data: v === "A" ? { opensA: { increment: 1 } } : { opensB: { increment: 1 } },
      });
    } catch {
      // kampanya bulunamazsa sessizce geç
    }
  }
  return pixel();
}
