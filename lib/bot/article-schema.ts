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

export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;
export type VerificationReport = z.infer<typeof VerificationSchema>;

