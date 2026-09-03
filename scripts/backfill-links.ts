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
import { isGenericAnchor } from "@/lib/bot/linker";

/**
 * Anlamsız çapa metnini SÖKER (metni korur, bağlantıyı kaldırır).
 *
 * 4 Eylül 2026: eski çapa seçici "nasıl" gibi jenerik kelimeleri iç bağlantıya
 * çeviriyordu; yayındaki bir makalenin giriş cümlesinde "nasıl" iki ayrı ve
 * konuyla ilgisiz makaleye bağlıydı. Seçici düzeltildi ama basılmış bağlantılar
 * yerinde kaldı; burada sökülüp yeniden kurulurlar.
 */
function stripWeakAnchors(html: string): { content: string; removed: string[] } {
  const removed: string[] = [];
  const content = html.replace(
    /<a\s[^>]*href="\/[^"]*"[^>]*>([^<]{1,40})<\/a>/g,
    (whole, text: string) => {
      const words = text.trim().split(/\s+/);
      // YALNIZCA gerçekten anlamsız çapalar sökülür. "TCMB", "Borsa",
      // "kripto", "dolar" kısa ama hedefin konusunu söylüyor; onlar kalır.
      const weak = words.length === 1 && isGenericAnchor(words[0]);
      if (!weak) return whole;
      removed.push(text.trim());
      return text;
    },
  );
  return { content, removed };
}

const APPLY = process.argv.includes("--apply");
const MIN_LINKS = 2;

async function main() {
  const articles = await prisma.article.findMany({
    where: { articleSource: "BOT", status: "PUBLISHED" },
    select: { id: true, slug: true, title: true, meta: true, keyword: true, category: true, content: true, imageUrl: true, seoScore: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const weak = articles.filter((a) =>
    (a.content.match(/<a\s[^>]*href=/g) || []).length < MIN_LINKS
    || stripWeakAnchors(a.content).removed.length > 0);
  console.log(`${articles.length} yayın makalesi tarandı, ${weak.length} tanesinde eksik bağlantı ya da anlamsız çapa var.`);
  if (!weak.length) return;

  for (const article of weak) {
    const before = (article.content.match(/<a\s[^>]*href=/g) || []).length;
    const cleaned = stripWeakAnchors(article.content);
    const linked = ensureExternalLink(
      await autoLink(cleaned.content, article.category, article.slug),
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
      `  ${before} -> ${after} bağlantı | seo ${article.seoScore ?? "-"} -> ${seo.score}`
      + `${cleaned.removed.length ? ` | sökülen çapa: ${cleaned.removed.join(", ")}` : ""}`
      + ` | ${article.title.slice(0, 46)}`,
    );
    if (APPLY && (after > before || cleaned.removed.length)) {
      await prisma.article.update({
        where: { id: article.id },
        data: { content: linked, seoScore: seo.score },
      });
    }
  }
  console.log(APPLY ? "\n✅ UYGULANDI." : "\n(kuru koşu — uygulamak için: npm run fix:links -- --apply)");
}
main().finally(() => prisma.$disconnect());
