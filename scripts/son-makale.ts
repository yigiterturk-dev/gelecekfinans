import { prisma } from "../lib/db";
async function main() {
  const a = await prisma.article.findFirst({
    orderBy: { createdAt: "desc" },
    select: { title: true, meta: true, keyword: true, status: true, publicationDecision: true,
      seoScore: true, imageUrl: true, imageStrategy: true, content: true, automationMeta: true },
  });
  if (!a) return;
  console.log("başlık:", a.title, `(${a.title.length})`);
  console.log("meta:", a.meta, `(${a.meta.length})`);
  console.log("keyword:", a.keyword, "| seo:", a.seoScore, "| karar:", a.publicationDecision, "| durum:", a.status);
  console.log("görsel:", a.imageUrl, "| strateji:", a.imageStrategy);
  const m = a.automationMeta as {
    decisionReasons?: unknown; seoIssues?: unknown; quality?: { wordCount?: number };
    visual?: { audit?: unknown; attempts?: unknown };
  } | null;
  console.log("karar gerekçeleri:", JSON.stringify(m?.decisionReasons));
  console.log("seo sorunları:", JSON.stringify(m?.seoIssues));
  console.log("görsel audit:", JSON.stringify(m?.visual?.audit));
  console.log("görsel deneme:", JSON.stringify(m?.visual?.attempts));
  console.log("kelime:", m?.quality?.wordCount);
  console.log("\n--- içerik ilk 700 ---\n", a.content.slice(0, 700));
  await prisma.$disconnect();
}
main();
