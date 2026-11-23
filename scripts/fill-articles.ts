// Tek seferlik: ana sayfayı doldurmak için toplu makale üretir ve canlı DB'ye yazar.
// Cron route'unun (app/api/bot/cron) mantığının aynısı, count parametreli.
// Çalıştırma: npx tsx --env-file=.env scripts/fill-articles.ts [count]
import { prisma } from "../lib/db";
import { asJson } from "../lib/prisma-json";
import { slugify } from "../lib/slug";
import { analyzeSeo } from "../lib/seo";
import { isDuplicate } from "../lib/duplicate";
import { getTopics } from "../lib/bot/topics";
import { writeArticle } from "../lib/bot/writer";
import { getArticleImage } from "../lib/bot/images";
import { autoLink } from "../lib/bot/linker";
import { ensureExternalLink } from "../lib/bot/external-link";
import { isAIAutomationEnabled } from "../lib/bot/ai-budget";
import { AIProviderFatalError } from "../lib/bot/errors";

async function main() {
  if (!isAIAutomationEnabled()) {
    console.error("[fill] AI otomasyonu kapalı; model çağrısı yapılmadı. Açmak için AI_AUTOMATION_ENABLED=true gerekir.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const count = parseInt(process.argv[2] || "20");
  const targetWords = 1000;
  console.log(`[fill] ${count} makale hedefleniyor...`);

  const topics = await getTopics(count * 3);
  console.log(`[fill] ${topics.length} konu bulundu`);
  if (topics.length === 0) {
    console.log("[fill] Konu yok, çıkılıyor.");
    return;
  }

  const recent = await prisma.article.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { id: true, title: true, content: true },
  });

  let added = 0;
  let duplicatesSkipped = 0;

  for (const topic of topics) {
    if (added >= count) break;
    try {
      if (isDuplicate(topic.title, topic.summary, recent).duplicate) { duplicatesSkipped++; continue; }

      const article = await writeArticle(topic, targetWords);
      const slug = slugify(article.title);

      if (await prisma.article.findUnique({ where: { slug } })) { duplicatesSkipped++; continue; }
      if (isDuplicate(article.title, article.content, recent).duplicate) { duplicatesSkipped++; continue; }

      article.content = await autoLink(article.content, article.category, slug);
      // Harici link garantisi (yazar harici link eklemediyse resmi kaynak ekle).
      article.content = ensureExternalLink(article.content, article.category, article.keyword);

      // Görseli önceden hesapla: hem SEO görsel kontrolünü besler hem DB'ye yazılır.
      const imageUrl = (await getArticleImage({ title: article.title, keyword: article.keyword, category: article.category })) || null;

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
          status: "DRAFT",
          seoScore: seo.score,
          publicationDecision: "REVIEW",
          autoPublished: false,
          publishedAt: null,
        },
      });

      recent.push({ id: created.id, title: created.title, content: created.content });
      added++;
      console.log(`[fill] (${added}/${count}) DRAFT [seo ${seo.score}] ${article.title.slice(0, 60)}`);
    } catch (e) {
      if (e instanceof AIProviderFatalError) throw e;
      console.log(`[fill] HATA: ${topic.title.slice(0, 40)} → ${(e as Error).message}`);
    }
  }

  console.log(`[fill] BİTTİ — eklenen: ${added}, atlanan(duplicate): ${duplicatesSkipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
