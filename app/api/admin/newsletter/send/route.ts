import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSegmentDigest, mailEnabled } from "@/lib/mail";
import { isSegment } from "@/lib/newsletter";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const newsletterSendSchema = z.object({
  segment: z.string().refine(isSegment).optional(),
  subjectA: z.string().trim().min(1).max(150),
  subjectB: z.string().trim().min(1).max(150).optional(),
}).strict();

export const maxDuration = 60;

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } }
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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:newsletter:send:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const parsed = newsletterSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Segment veya konu satırları geçersiz" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { segment: seg = null, subjectA: subA, subjectB: subB } = parsed.data;

  if (!mailEnabled()) {
    return NextResponse.json(
      { error: "Bülten gönderimi yapılandırılmamış (RESEND_API_KEY / NEWSLETTER_SECRET)." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

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
      recipients: subscribers.length,
      availableArticles: articles.length,
    }, { headers: PRIVATE_HEADERS });
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
  }, { headers: PRIVATE_HEADERS });
}
