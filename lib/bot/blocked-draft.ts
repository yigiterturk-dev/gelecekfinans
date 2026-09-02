import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { analyzeSeo } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { getArticleImageResult } from "./images";
import type { BlockedDraftError } from "./errors";

/**
 * Doğrulayıcının reddettiği BİTMİŞ makaleyi kurtarma.
 *
 * Neden: yazar çağrısı ödenmiş, metin yazılmış, kalite ve intihal kapıları
 * geçilmiş; yalnızca doğrulayıcı bir-iki cümleye itiraz etmiş ve onarım turu
 * tutmamış. Eski akışta bu metin tamamen kayboluyordu ve gün sıfır makaleyle
 * kapanıyordu (1 Eylül 2026: üç koşum, üçü de sıfır). Artık `DRAFT` olarak
 * kaydediliyor.
 *
 * 🔒 Güvenlik: kayıt HER ZAMAN `status: "DRAFT"` + `publicationDecision:
 * "REVIEW"` + `autoPublished: false`. Yayına çıkma yolu yok; sitede
 * görünmez, yalnızca panelde onay bekler. Doğrulayıcının itirazları
 * `automationMeta.verificationObjections` içinde duruyor ki Yiğit neyi
 * kontrol edeceğini bilsin.
 *
 * Kapak görseli TASLAK KAYDEDİLİRKEN üretiliyor (2026-09-02). Eskiden
 * üretilmiyordu — "makale zaten yayımlanmayacak" gerekçesiyle — ama panelde
 * onaylanan taslaklar görselsiz yayına çıkıp anasayfada gri kutu olarak
 * duruyordu; görsel ya `image-repair` cron'una sıra gelince ya da elle
 * geliyordu. Görsel hattı zaten deterministik şablona düşebiliyor, maliyeti
 * yayına çıkmayan bir taslak için de kabul edilebilir.
 */
export async function saveBlockedDraft(
  error: BlockedDraftError,
  context: {
    trigger: string;
    track: "NEWS" | "GUIDE" | "ENTITY";
    keywordId?: string;
    cluster?: string | null;
    sourceScore?: number;
    evidencePacket?: unknown;
  },
): Promise<{ id: string; slug: string } | null> {
  const draft = error.draft;
  const slug = slugify(draft.title);
  // Aynı slug varsa taslağı yazmıyoruz: yayındaki bir makalenin üzerine
  // doğrulanmamış metin koymak, kurtarmanın çözdüğünden büyük bir sorun.
  const existing = await prisma.article.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return null;

  // Son görsellerin kavramları: aynı kapak arka arkaya üretilmesin.
  const recent = await prisma.article.findMany({
    where: { imageUrl: { not: null } },
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
    title: draft.title,
    slug,
    keyword: draft.keyword,
    category: draft.category,
    recentConcepts,
    maxAttempts: 2,
    evidenceSourceCount: Number(
      (context.evidencePacket as { independentSourceCount?: number } | undefined)
        ?.independentSourceCount || 0,
    ),
  });

  const seo = analyzeSeo({
    title: draft.title, meta: draft.meta, keyword: draft.keyword,
    content: draft.content, slug, imageUrl: image.url,
  });

  const created = await prisma.article.create({
    data: {
      title: draft.title,
      slug,
      meta: draft.meta,
      keyword: draft.keyword || null,
      category: draft.category,
      content: draft.content,
      ...(draft.aiExtras ? { aiExtras: asJson(draft.aiExtras as object) } : {}),
      imageUrl: image.url,
      source: draft.source,
      articleSource: "BOT",
      // `ContentTrack` yalnızca NEWS|GUIDE; varlık şeridi DB'de GUIDE olarak
      // duruyor (canlı akışta da öyle), ayrımı `automationMeta.track` taşıyor.
      track: context.track === "NEWS" ? "NEWS" : "GUIDE",
      ...(context.keywordId ? { keywordId: context.keywordId } : {}),
      ...(context.cluster ? { cluster: context.cluster } : {}),
      status: "DRAFT",
      publishedAt: null,
      seoScore: seo.score,
      // Doğrulayıcı itiraz etti: taslak tanım gereği riskli, elle okunmalı.
      riskLevel: "RED",
      publicationDecision: "REVIEW",
      autoPublished: false,
      sourceScore: context.sourceScore ?? 0,
      imageStrategy: image.strategy,
      automationMeta: asJson({
        trigger: context.trigger,
        track: context.track,
        blockedBy: "VERIFICATION",
        verificationObjections: draft.objections,
        wordCount: draft.wordCount,
        visual: {
          strategy: image.strategy,
          brief: image.brief,
          audit: image.audit,
          attempts: image.attempts,
          licensedAsset: image.licensedAsset,
        },
        seoIssues: seo.issues,
        ...(context.evidencePacket ? { evidencePacket: context.evidencePacket } : {}),
      }),
    },
    select: { id: true, slug: true },
  });
  return created;
}
