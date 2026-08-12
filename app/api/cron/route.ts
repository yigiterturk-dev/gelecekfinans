import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { slugify } from "@/lib/slug";
import { analyzeSeo } from "@/lib/seo";
import { isDuplicate } from "@/lib/duplicate";
import { getTopics } from "@/lib/bot/topics";
import { writeArticle } from "@/lib/bot/writer";
import { getArticleImage } from "@/lib/bot/images";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { sendDailyDigest } from "@/lib/mail";

export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  // Secret yapılandırılmamışsa "Bearer undefined" ile bypass'ı önle (fail-closed).
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- 1. BOT: Generate articles ---
  const count = 3;
  const targetWords = 1000;

  const run = await prisma.botRun.create({ data: { articlesFound: 0 } });
  const topics = await getTopics(count * 3);

  await prisma.botRun.update({ where: { id: run.id }, data: { articlesFound: topics.length } });

  const recent = await prisma.article.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { id: true, title: true, content: true },
  });

  let added = 0;
  let duplicatesSkipped = 0;
  const errors: string[] = [];

  for (const topic of topics) {
    if (added >= count) break;
    try {
      const dupTitle = isDuplicate(topic.title, topic.summary, recent);
      if (dupTitle.duplicate) { duplicatesSkipped++; continue; }

      const article = await writeArticle(topic, targetWords);
      const slug = slugify(article.title);

      const existing = await prisma.article.findUnique({ where: { slug } });
      if (existing) { duplicatesSkipped++; continue; }

      const dupContent = isDuplicate(article.title, article.content, recent);
      if (dupContent.duplicate) { duplicatesSkipped++; continue; }

      article.content = await autoLink(article.content, article.category, slug);
      // Harici link garantisi (yazar harici link eklemediyse resmi kaynak ekle).
      article.content = ensureExternalLink(article.content, article.category, article.keyword);

      // Görseli önceden hesapla: hem SEO görsel kontrolünü besler hem DB'ye yazılır.
      const imageUrl = await getArticleImage({ title: article.title, keyword: article.keyword, category: article.category }) || null;

      const seo = analyzeSeo({
        title: article.title, meta: article.meta,
        keyword: article.keyword, content: article.content, slug, imageUrl,
      });

      const created = await prisma.article.create({
        data: {
          title: article.title, slug, meta: article.meta,
          keyword: article.keyword || null, category: article.category,
          content: article.content,
          ...(article.aiExtras ? { aiExtras: asJson(article.aiExtras) } : {}),
          imageUrl,
          source: article.source, articleSource: "BOT",
          status: "DRAFT", // Bot makaleleri DRAFT gelir; owner görsel ekleyip elle yayınlar
          seoScore: seo.score,
          publishedAt: null,
        },
      });

      recent.push({ id: created.id, title: created.title, content: created.content });
      added++;
    } catch (e) {
      errors.push(`${topic.title.slice(0, 40)}: ${(e as Error).message}`);
    }
  }

  await prisma.botRun.update({
    where: { id: run.id },
    data: { finishedAt: new Date(), articlesAdded: added, duplicatesSkipped, errors: errors.length ? errors.join("\n") : null, status: "completed" },
  });

  // --- 2. NEWSLETTER: Send daily digest ---
  let mailSent = 0;
  try {
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

    if (subscribers.length > 0 && articles.length > 0) {
      mailSent = await sendDailyDigest(subscribers.map(s => s.email), articles);
    }
  } catch (e) {
    errors.push(`Newsletter: ${(e as Error).message}`);
  }

  return NextResponse.json({ bot: { added, duplicatesSkipped }, newsletter: { sent: mailSent }, errors: errors.length });
}
