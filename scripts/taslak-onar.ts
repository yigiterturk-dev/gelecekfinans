/**
 * İnceleme kuyruğunda bekleyen bot taslaklarını onarır:
 *  - metaya yapıştırılmış "Keyword: ..." etiketini söker (arama sonucunda görünüyordu),
 *  - eksik kapak görselini üretir,
 *  - SEO skorunu ve yayın kararını yeniden hesaplar,
 *  - karar AUTO_PUBLISH ise yayına alır.
 * Kuru çalışma varsayılan; yazmak için --apply.
 */
import { prisma } from "../lib/db";
import { analyzeSeo } from "../lib/seo";
import { getArticleImageResult } from "../lib/bot/images";
import { decidePublication } from "../lib/bot/autonomy";
import { asJson } from "../lib/prisma-json";

const APPLY = process.argv.includes("--apply");

function stripKeywordLabel(meta: string): string {
  return meta.replace(/\s*(?:keyword|anahtar kelime|odak kelime)\s*[:=]\s*.*$/i, "").trim();
}

async function main() {
  const drafts = await prisma.article.findMany({
    where: { status: "DRAFT", articleSource: "BOT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, slug: true, meta: true, keyword: true, category: true,
      content: true, imageUrl: true, riskLevel: true, sourceScore: true, automationMeta: true,
    },
  });
  console.log(`${drafts.length} bot taslağı bulundu${APPLY ? "" : " (kuru çalışma)"}`);

  for (const draft of drafts) {
    const meta = stripKeywordLabel(draft.meta);
    const metaFixed = meta !== draft.meta && meta.length >= 110;
    let imageUrl = draft.imageUrl;
    let imageStrategy: string | null = null;
    if (!imageUrl) {
      const image = await getArticleImageResult({
        title: draft.title, keyword: draft.keyword || "", category: draft.category,
        slug: draft.slug, recentConcepts: [], maxAttempts: 1,
      });
      imageUrl = image.url;
      imageStrategy = image.strategy;
    }
    const seo = analyzeSeo({
      title: draft.title, meta, keyword: draft.keyword || "",
      content: draft.content, slug: draft.slug, imageUrl,
    });
    const automation = draft.automationMeta as Record<string, unknown> | null;
    const decision = decidePublication({
      risk: draft.riskLevel,
      sourceScore: draft.sourceScore ?? 0,
      seoScore: seo.score,
      hasImage: Boolean(imageUrl),
      autoPublishEnabled: true,
      verifiedEvidence: automation?.verifiedEvidence === true,
    });
    console.log(
      `- ${draft.title.slice(0, 55)} | meta${metaFixed ? " ONARILDI" : " aynı"}` +
      ` | görsel ${imageUrl ? imageStrategy || "var" : "YOK"} | seo ${seo.score} | karar ${decision.decision}`,
    );
    if (!APPLY) continue;
    await prisma.article.update({
      where: { id: draft.id },
      data: {
        meta: metaFixed ? meta : draft.meta,
        imageUrl,
        ...(imageStrategy ? { imageStrategy } : {}),
        seoScore: seo.score,
        publicationDecision: decision.decision,
        ...(decision.decision === "AUTO_PUBLISH"
          ? { status: "PUBLISHED" as const, publishedAt: new Date(), autoPublished: true }
          : {}),
        automationMeta: asJson({
          ...(automation || {}),
          repair: { at: new Date().toISOString(), metaFixed, imageStrategy, seoIssues: seo.issues },
          decisionReasons: decision.reasons,
        }),
      },
    });
  }
  await prisma.$disconnect();
}
main();
