import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [runs, recentDecisions] = await Promise.all([
    prisma.botRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.article.findMany({
      where: { articleSource: "BOT" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, title: true, slug: true, status: true, createdAt: true,
        riskLevel: true, publicationDecision: true, sourceScore: true,
        seoScore: true, imageStrategy: true, autoPublished: true,
      },
    }),
  ]);

  return NextResponse.json({ runs, recentDecisions });
}
