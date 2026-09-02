import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { analyzeSeo } from "@/lib/seo";
import { getArticleImageResult } from "@/lib/bot/images";

/**
 * Kapak görseli olmayan bir makaleye görseli YERİNDE üretir.
 *
 * NEDEN (2026-09-02): doğrulayıcının bloklayıp taslağa düşürdüğü makalelerin
 * görseli üretilmiyordu; panelden elle "yayınla" denince ya gri kutuyla
 * yayına çıkıyor ya da "kapak görseli olmayan makale yayına alınamaz"
 * hatasıyla geri çevriliyordu. Her iki durumda da iş Yiğit'in üstünde
 * kalıyordu: image-repair cron'unun o makaleye sırasının gelmesini beklemek
 * gerekiyordu. Artık yayına alma anında görsel üretiliyor.
 *
 * Görseli zaten olan makalede hiçbir şey yapmaz (para/zaman harcamaz).
 */
export async function ensureArticleImage(
  id: string,
): Promise<{ imageUrl: string | null; generated: boolean }> {
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return { imageUrl: null, generated: false };
  if (article.imageUrl && article.imageUrl.trim()) {
    return { imageUrl: article.imageUrl, generated: false };
  }

  // Son görsellerin kavramlarını topla ki aynı kapak tekrar üretilmesin.
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

  const previous = (article.automationMeta || {}) as Record<string, unknown>;
  const image = await getArticleImageResult({
    title: article.title,
    slug: article.slug,
    keyword: article.keyword,
    category: article.category,
    recentConcepts,
    maxAttempts: 2,
    evidenceSourceCount:
      typeof previous.evidencePacket === "object" && previous.evidencePacket
        ? Number(
            (previous.evidencePacket as { independentSourceCount?: number })
              .independentSourceCount || 0,
          )
        : 0,
  });

  const automationMeta = asJson({
    ...previous,
    visual: {
      strategy: image.strategy,
      brief: image.brief,
      audit: image.audit,
      attempts: image.attempts,
      licensedAsset: image.licensedAsset,
      repairedAt: new Date().toISOString(),
      repairedBy: "PUBLISH",
    },
  });

  if (!image.url) {
    await prisma.article.update({
      where: { id },
      data: { automationMeta, imageStrategy: "NONE" },
    });
    return { imageUrl: null, generated: false };
  }

  const seo = analyzeSeo({
    title: article.title,
    meta: article.meta,
    keyword: article.keyword,
    content: article.content,
    slug: article.slug,
    imageUrl: image.url,
  });

  await prisma.article.update({
    where: { id },
    data: {
      imageUrl: image.url,
      imageStrategy: image.strategy,
      automationMeta,
      seoScore: seo.score,
    },
  });
  return { imageUrl: image.url, generated: true };
}
