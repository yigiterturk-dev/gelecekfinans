import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSegmentDigest, mailEnabled } from "@/lib/mail";
import { isSegment } from "@/lib/newsletter";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

/**
 * Admin: segment hedefli + opsiyonel A/B konu satırı testli bülten gönderir.
 * Body: { segment?: string, subjectA: string, subjectB?: string }
 * - segment verilirse yalnızca o kategoriyi tercih eden (ya da tüm
 *   kategorilere abone) onaylı/aktif aboneler hedeflenir.
 */
export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:newsletter:send:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { segment, subjectA, subjectB } = (body || {}) as {
    segment?: unknown;
    subjectA?: unknown;
    subjectB?: unknown;
  };

  const seg = typeof segment === "string" && segment ? segment : null;
  if (seg && !isSegment(seg)) {
    return NextResponse.json({ error: "Geçersiz segment" }, { status: 400 });
  }
  const subA = typeof subjectA === "string" ? subjectA.trim().slice(0, 150) : "";
  if (!subA) return NextResponse.json({ error: "Konu satırı (A) zorunlu" }, { status: 400 });
  const subB =
    typeof subjectB === "string" && subjectB.trim() ? subjectB.trim().slice(0, 150) : undefined;

  // Onaylı + aktif aboneler. Segment varsa: ya tercihi boş (tümü) ya da
  // ilgili kategoriyi içerenler.
  const subscribers = await prisma.subscriber.findMany({
    where: {
      active: true,
      confirmed: true,
      ...(seg
        ? { OR: [{ preferences: { isEmpty: true } }, { preferences: { has: seg } }] }
        : {}),
    },
    select: { email: true },
  });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: since },
      ...(seg ? { category: seg } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { title: true, slug: true, meta: true, category: true },
  });

  if (subscribers.length === 0 || articles.length === 0) {
    return NextResponse.json({
      sent: 0,
      reason: articles.length === 0 ? "uygun makale yok" : "alıcı yok",
    });
  }

  // Kampanya kaydını önce oluştur (tracking pikseli campaignId kullanır).
  const campaign = await prisma.newsletterCampaign.create({
    data: {
      segment: seg,
      subjectA: subA,
      subjectB: subB || null,
      recipients: subscribers.length,
    },
  });

  const result = await sendSegmentDigest({
    emails: subscribers.map((s) => s.email),
    articles,
    subjectA: subA,
    subjectB: subB,
    campaignId: campaign.id,
  });

  await prisma.newsletterCampaign.update({
    where: { id: campaign.id },
    data: { recipientsA: result.recipientsA, recipientsB: result.recipientsB },
  });

  return NextResponse.json({
    campaignId: campaign.id,
    mailEnabled: mailEnabled(),
    ...result,
  });
}
