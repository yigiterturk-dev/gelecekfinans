import { z } from "zod";

export const ArticleClaimSchema = z.object({
  text: z.string().min(1),
  kind: z.enum(["FACT", "CONTEXT", "INFERENCE"]),
  evidenceIds: z.array(z.string()).min(1),
});

export const ArticleDraftSchema = z.object({
  title: z.string().min(1),
  meta: z.string().min(1),
  keyword: z.string().min(1),
  lede: z.string().min(1),
  sections: z.array(z.object({
    heading: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
    bullets: z.array(z.string().min(1)),
  })).min(1).max(5),
  summary: z.array(z.string().min(1)).length(3),
  impact: z.string().min(1),
  faq: z.array(z.object({
    q: z.string().min(1),
    a: z.string().min(1),
  })).length(3),
  claims: z.array(ArticleClaimSchema).min(1),
  disclaimer: z.string().min(1),
});

export const VerificationSchema = z.object({
  passed: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  conflictingClaims: z.array(z.string()),
  corrections: z.array(z.string()),
  verifiedEvidenceIds: z.array(z.string()),
});

/**
 * Rehber (evergreen) taslağı. Haber şemasıyla aynı ALANLARA sahiptir —
 * dolayısıyla `ArticleDraft` tipiyle uyumludur ve aynı kalite/render/intihal
 * makinesinden geçer — yalnızca sayı sınırları farklıdır: rehber daha çok
 * bölüm ve daha çok SSS taşır. SSS sayısı bilerek yüksek: rehber sayfaların
 * AI cevaplarında ve "Sıkça Sorulan Sorular" zengin sonucunda alıntılanma
 * şansı doğrudan buna bağlı.
 */
export const GuideDraftSchema = ArticleDraftSchema.extend({
  // Kanıt paketi olmadan üretilen kavramsal rehberde "iddia -> kanıt kimliği"
  // eşlemesi anlamsız; boş bırakılabilir. Uydurmaya karşı koruma burada değil,
  // kalite kapısındaki somut rakam yasağında ve doğrulayıcı modelde.
  claims: z.array(ArticleClaimSchema),
  sections: z.array(z.object({
    heading: z.string().min(1),
    paragraphs: z.array(z.string().min(1)).min(1),
    bullets: z.array(z.string().min(1)),
    /**
     * H3 alt başlıklar. Uzun rehberde H2-only yapı hem okuru yorar hem de
     * SEO çözümlemesinde eksik sayılır; ayrıca AI cevapları bir bölümü ancak
     * kendi başlığıyla birlikte alıntılıyor.
     */
    subsections: z.array(z.object({
      heading: z.string().min(1),
      paragraphs: z.array(z.string().min(1)).min(1),
    })).default([]),
  })).min(4).max(8),
  summary: z.array(z.string().min(1)).length(3),
  faq: z.array(z.object({
    q: z.string().min(1),
    a: z.string().min(1),
  })).min(4).max(6),
});

export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;
export type VerificationReport = z.infer<typeof VerificationSchema>;

/**
 * İki haberin aynı olayı anlatıp anlatmadığına dair hakem kararı. Kapı
 * gevşetmesi değil: yalnızca başlık benzerliği gri banda düşen çiftler
 * sorulur ve model "hayır" derse ikinci kaynak sayılmaz.
 */
export const SameStorySchema = z.object({
  sameEvent: z.boolean(),
  reason: z.string(),
});
export type SameStoryVerdict = z.infer<typeof SameStorySchema>;

/**
 * Haberde adı geçen gerçek varlıklar (şirket, kişi, kurum).
 *
 * `excerpt` zorunlu ve kanıt metninden BİREBİR alınmalı: varlık kaydının
 * modelin hafızasından değil, doğrulanmış haberden geldiğinin ispatı budur.
 * Alıntı kanıtta bulunamazsa varlık düşürülür (bkz. entities.ts).
 */
export const ExtractedEntitySchema = z.object({
  name: z.string().min(2).max(80),
  type: z.enum(["COMPANY", "PERSON", "INSTITUTION"]),
  role: z.string().min(3).max(160),
  excerpt: z.string().min(10).max(400),
});

export const EntityExtractionSchema = z.object({
  entities: z.array(ExtractedEntitySchema).max(6),
});
