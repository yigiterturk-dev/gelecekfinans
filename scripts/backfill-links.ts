/**
 * Bağlantısız yayınlanmış bot makalelerini onarır.
 *
 * Neden: kurtarılan taslaklar `autoLink`/`ensureExternalLink` katmanından
 * geçmeden kaydediliyordu (bkz. lib/bot/blocked-draft.ts). Panelden onaylanan
 * bu makaleler sıfır bağlantıyla yayına çıktı. Kod düzeltildi; bu script
 * ZATEN yayında olanları geriye dönük onarır.
 *
 * Varsayılan KURU KOŞU. Uygulamak için: npm run fix:links -- --apply
 */
import { prisma } from "@/lib/db";
import { autoLink } from "@/lib/bot/linker";
import { ensureExternalLink } from "@/lib/bot/external-link";
import { analyzeSeo } from "@/lib/seo";

const APPLY = process.argv.includes("--apply");
const MIN_LINKS = 2;

async function main() {
  const articles = await prisma.article.findMany({
    where: { articleSource: "BOT", status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, meta: true, keyword: true, category: true, content: true, imageUrl: true, seoScore: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const weak = articles.filter((a) => (a.content.match(/<a\s[^>]*href=/g) || []).length < MIN_LINKS);
  console.log(`${articles.length} yayın makalesi tarandı, ${weak.length} tanesinde ${MIN_LINKS}'den az bağlantı var.`);
  if (!weak.length) return;

  for (const article of weak) {
    const before = (article.content.match(/<a\s[^>]*href=/g) || []).length;
    const linked = ensureExternalLink(
      await autoLink(article.content, article.category, article.slug),
      article.category,
      article.keyword ?? "",
      undefined,
    );
    const after = (linked.match(/<a\s[^>]*href=/g) || []).length;
    const seo = analyzeSeo({
      title: article.title, meta: article.meta, keyword: article.keyword ?? "",
      content: linked, slug: article.slug, imageUrl: article.imageUrl ?? undefined,
    });
    console.log(
      `  ${before} -> ${after} bağlantı | seo ${article.seoScore ?? "-"} -> ${seo.score} | ${article.title.slice(0, 52)}`,
    );
    if (APPLY && after > before) {
      await prisma.article.update({
        where: { id: article.id },
        data: { content: linked, seoScore: seo.score },
      });
    }
  }
  console.log(APPLY ? "\n✅ UYGULANDI." : "\n(kuru koşu — uygulamak için: npm run fix:links -- --apply)");
}
main().finally(() => prisma.$disconnect());
