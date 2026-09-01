import { prisma } from "@/lib/db";
import { asJson } from "@/lib/prisma-json";
import { analyzeSeo } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import type { VerificationBlockedError } from "./errors";

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
 * Kapak görseli üretilmiyor: görsel para/zaman harcar ve makale zaten
 * yayımlanmayacak. Onaylanan taslağın görselini `scripts/backfill-images.ts`
 * ya da `/api/bot/image-repair` sonradan tamamlıyor.
 */
export async function saveBlockedDraft(
  error: VerificationBlockedError,
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

  const seo = analyzeSeo({
    title: draft.title, meta: draft.meta, keyword: draft.keyword,
    content: draft.content, slug, imageUrl: null,
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
      imageUrl: null,
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
      imageStrategy: "NONE",
      automationMeta: asJson({
        trigger: context.trigger,
        track: context.track,
        blockedBy: "VERIFICATION",
        verificationObjections: draft.objections,
        wordCount: draft.wordCount,
        seoIssues: seo.issues,
        ...(context.evidencePacket ? { evidencePacket: context.evidencePacket } : {}),
      }),
    },
    select: { id: true, slug: true },
  });
  return created;
}
