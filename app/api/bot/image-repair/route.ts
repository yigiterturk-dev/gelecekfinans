import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { analyzeSeo } from "@/lib/seo";
import { decidePublication } from "@/lib/bot/autonomy";
import { getArticleImageResult } from "@/lib/bot/images";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findFirst({
    where: {
      articleSource: "BOT",
      status: "DRAFT",
      imageUrl: null,
      publicationDecision: "REVIEW",
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!article) return NextResponse.json({ repaired: 0, message: "Görsel bekleyen makale yok" });

  const recent = await prisma.article.findMany({
    where: { imageUrl: { not: null }, id: { not: article.id } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { automationMeta: true },
  });
  const recentConcepts = recent
    .map((row) => {
      const meta = row.automationMeta as { visual?: { brief?: { conceptKey?: string } } } | null;
      return meta?.visual?.brief?.conceptKey;
    })
    .filter((value): value is string => Boolean(value));

  const image = await getArticleImageResult({
    title: article.title,
    keyword: article.keyword,
    category: article.category,
    recentConcepts,
    maxAttempts: 2,
  });
  const previous = (article.automationMeta || {}) as Record<string, unknown>;
  const automationMeta = {
    ...previous,
    visual: {
      strategy: image.strategy,
      brief: image.brief,
      audit: image.audit,
      attempts: image.attempts,
      repairedAt: new Date().toISOString(),
    },
  };
  if (!image.url) {
    await prisma.article.update({
      where: { id: article.id },
      data: { automationMeta: asJson(automationMeta), imageStrategy: "NONE" },
    });
    return NextResponse.json({ repaired: 0, articleId: article.id, audit: image.audit });
  }

  const seo = analyzeSeo({
    title: article.title, meta: article.meta, keyword: article.keyword,
    content: article.content, slug: article.slug, imageUrl: image.url,
  });
  const publication = decidePublication({
    risk: article.riskLevel,
    sourceScore: article.sourceScore || 0,
    seoScore: seo.score,
    hasImage: true,
    autoPublishEnabled: true,
  });
  await prisma.article.update({
    where: { id: article.id },
    data: {
      imageUrl: image.url,
      imageStrategy: image.strategy,
      automationMeta: asJson(automationMeta),
      seoScore: seo.score,
      publicationDecision: publication.decision,
      status: publication.decision === "AUTO_PUBLISH" ? "PUBLISHED" : "DRAFT",
      autoPublished: publication.decision === "AUTO_PUBLISH",
      publishedAt: publication.decision === "AUTO_PUBLISH" ? new Date() : null,
    },
  });
  return NextResponse.json({
    repaired: 1,
    articleId: article.id,
    decision: publication.decision,
    audit: image.audit,
  });
}
