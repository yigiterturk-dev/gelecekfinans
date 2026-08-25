import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendDailyDigest } from "@/lib/mail";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  // Secret yapılandırılmamışsa "Bearer undefined" ile bypass'ı önle (fail-closed).
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [subscribers, articles] = await Promise.all([
    prisma.subscriber.findMany({ where: { active: true, confirmed: true }, select: { email: true } }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { title: true, slug: true, meta: true, category: true },
    }),
  ]);

  if (subscribers.length === 0 || articles.length === 0) {
    return NextResponse.json({ sent: 0, reason: articles.length === 0 ? "no articles" : "no subscribers" });
  }

  const emails = subscribers.map((s) => s.email);
  await sendDailyDigest(emails, articles);

  return NextResponse.json({ sent: emails.length, articles: articles.length });
}
