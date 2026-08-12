import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ArticleExtras } from "@/lib/types";
import type { Topic } from "./topics";
import { evidenceMaterialCharacterCount } from "./research";
import {
  ArticleDraftSchema,
  VerificationSchema,
  type ArticleDraft,
  type VerificationReport,
} from "./article-schema";
import { renderDraftHtml, validateDraft, type QualityReport } from "./quality";
import { checkPlagiarism, type PlagiarismReport } from "./plagiarism";
import { resolveArticleAIBudgetConfig } from "./ai-budget";
import {
  AIProviderConfigurationError,
  AnthropicBillingError,
  isAnthropicBillingError,
  isOpenAIQuotaError,
  OpenAIQuotaError,
} from "./errors";

export type ArticleAIProvider = "anthropic" | "openai";

export interface ArticleAIConfig {
  provider: ArticleAIProvider;
  writerModel: string;
  verifierModel: string;
}

export function resolveArticleAIConfig(
  env: Record<string, string | undefined> = process.env,
): ArticleAIConfig {
  const requested = env.ARTICLE_AI_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (requested && requested !== "anthropic" && requested !== "openai") {
    throw new AIProviderConfigurationError(`Desteklenmeyen ARTICLE_AI_PROVIDER: ${requested}`);
  }
  const provider: ArticleAIProvider = requested === "anthropic"
    ? "anthropic"
    : requested === "openai" || Boolean(env.OPENAI_API_KEY)
      ? "openai"
      : "anthropic";

  if (provider === "anthropic" && !env.ANTHROPIC_API_KEY) {
    throw new AIProviderConfigurationError("Claude seçili ancak ANTHROPIC_API_KEY tanımlı değil.");
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    throw new AIProviderConfigurationError("OpenAI seçili ancak OPENAI_API_KEY tanımlı değil.");
  }

  return provider === "anthropic"
    ? {
        provider,
        writerModel: env.ANTHROPIC_ARTICLE_MODEL || "claude-sonnet-5",
        verifierModel: env.ANTHROPIC_VERIFIER_MODEL || "claude-haiku-4-5",
      }
    : {
        provider,
        // Yedek adlar OpenAI'da gerçekten var olan modeller olmalı. Uydurma bir
        // ada düşersek env silindiği anda bot sessizce model_not_found ile ölür.
        writerModel: env.OPENAI_ARTICLE_MODEL || "gpt-5",
        verifierModel: env.OPENAI_VERIFIER_MODEL || "gpt-5-mini",
      };
}

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function openai(): OpenAI {
  openaiClient ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function anthropic(): Anthropic {
  anthropicClient ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

function evidencePrompt(topic: Topic): string {
  const packet = topic.evidencePacket;
  if (!packet || packet.status !== "VERIFIED") {
    throw new Error("RESEARCH_BLOCKED: İki bağımsız kaynak doğrulaması tamamlanmadı");
  }
  const budget = resolveArticleAIBudgetConfig();
  const blocks: string[] = [];
  let usedCharacters = 0;
  for (const item of packet.evidence) {
    const material = (item.content || item.summary).slice(0, budget.evidenceItemCharacterLimit);
    const block = [
      `[${item.id}]`,
      `Yayıncı: ${item.source}`,
      `Başlık: ${item.title}`,
      `Kanıt metni: ${material}`,
      `URL: ${item.sourceUrl}`,
      `Tarih: ${item.publishedAt || "belirtilmedi"}`,
    ].join("\n");
    if (blocks.length >= 2 && usedCharacters + block.length > budget.evidencePromptCharacterLimit) break;
    blocks.push(block);
    usedCharacters += block.length;
  }
  return blocks.join("\n\n");
}
function articleInstructions(targetWords: number): string {
  return [
    "GelecekFinans için Türkçe, ölçülü ve olgusal bir ekonomi haberi hazırla.",
    "Yalnızca verilen kanıt paketindeki olguları kullan; dış bilgi, güncel fiyat veya bellekteki bilgi ekleme.",
    "Her somut iddiayı claims alanında yaz ve destekleyen evidenceIds değerlerini belirt.",
    "Kanıtlar çatışıyorsa kesin hüküm verme; metinde çatışmayı açıkça belirt.",
    "Doğrudan alıntı kullanma. Uzman görüşü, neden-sonuç, oran, tarih, unvan veya Türkiye etkisi uydurma.",
    "Yatırım tavsiyesi, teknik analiz, destek/direnç, fiyat hedefi ve gelecek tahmini yazma.",
    `Gövdeyi malzemenin izin verdiği ölçüde ${Math.max(280, Math.min(targetWords, 800))} kelime civarında tut; doldurmak için tekrar yapma.`,
    "Başlık 35-85, meta 120-180 karakter olsun. Keyword 1-3 kelime ve hem meta hem giriş paragrafında doğal biçimde geçsin.",
    "Tam 3 özet maddesi ve 3 kısa SSS üret. Bullets yalnızca gerçekten listelenebilir olgular varsa dolu olsun.",
    'Disclaimer tam olarak "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir." olsun.',
    "Başarı ölçütü: kanıt dışı tek bir somut iddia veya rakam bulunmaması.",
  ].join("\n");
}

async function generateDraft(
  topic: Topic,
  targetWords: number,
): Promise<ArticleDraft> {
  const config = resolveArticleAIConfig();
  const budget = resolveArticleAIBudgetConfig();
  try {
    const userPrompt = `KONU: ${topic.title}\nKATEGORİ: ${topic.category}\n\nKANIT PAKETİ:\n${evidencePrompt(topic)}`;
    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.writerModel,
        max_tokens: 6000,
        system: articleInstructions(targetWords),
        messages: [{ role: "user", content: userPrompt }],
        output_config: {
          effort: "low",
          format: zodOutputFormat(ArticleDraftSchema),
        },
      });
      if (!response.parsed_output) throw new Error("Claude yapılandırılmış makale çıktısı alınamadı");
      return response.parsed_output;
    }

    const response = await openai().responses.parse({
      model: config.writerModel,
      max_output_tokens: budget.writerMaxOutputTokens,
      // effort: "none" DEĞİL — gpt-5 bunu reddediyor ve koşu 400 ile ölüyor:
      //   "Unsupported value: 'none' is not supported with the 'gpt-5' model.
      //    Supported values are: 'minimal', 'low', 'medium', and 'high'."
      // (2026-08-13'te canlı hata kaydından alındı; 7 günde 9 koşu bu yüzden
      //  düştü.) "minimal" en yakın karşılık: en az akıl yürütme, en hızlı,
      //  en ucuz — davranış "none" ile aynı niyette.
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: articleInstructions(targetWords) },
        { role: "user", content: userPrompt },
      ],
      text: { format: zodTextFormat(ArticleDraftSchema, "gelecekfinans_article") },
    });
    if (!response.output_parsed) throw new Error("OpenAI yapılandırılmış makale çıktısı alınamadı");
    return response.output_parsed;
  } catch (error) {
    if (config.provider === "anthropic" && isAnthropicBillingError(error)) throw new AnthropicBillingError();
    if (isOpenAIQuotaError(error)) throw new OpenAIQuotaError();
    throw error;
  }
}

async function verifyDraft(topic: Topic, draft: ArticleDraft): Promise<VerificationReport> {
  const config = resolveArticleAIConfig();
  const budget = resolveArticleAIBudgetConfig();
  try {
    const system = [
      "Bağımsız bir finans haber doğrulayıcısısın.",
      "Taslağı yalnızca verilen kanıtlarla karşılaştır.",
      "Kanıtta açıkça bulunmayan veya kanıttan güvenle çıkarılamayan her iddiayı unsupportedClaims alanına ekle.",
      "Kaynaklar birbiriyle çelişiyorsa conflictingClaims alanına ekle.",
      "passed yalnızca tüm iddialar destekleniyor, önemli çelişki yok ve kanıt kimlikleri doğruysa true olabilir.",
      "Eksik bilgiyi tahmin etme; durma kuralın tüm claims maddelerini bir kez incelemektir.",
    ].join("\n");
    const userPrompt = `KANITLAR:\n${evidencePrompt(topic)}\n\nTASLAK:\n${JSON.stringify(draft)}`;

    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.verifierModel,
        max_tokens: 1600,
        system,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { format: zodOutputFormat(VerificationSchema) },
      });
      if (!response.parsed_output) throw new Error("Claude yapılandırılmış doğrulama çıktısı alınamadı");
      return response.parsed_output;
    }

    const response = await openai().responses.parse({
      model: config.verifierModel,
      max_output_tokens: budget.verifierMaxOutputTokens,
      // effort: "none" DEĞİL — gpt-5 bunu reddediyor ve koşu 400 ile ölüyor:
      //   "Unsupported value: 'none' is not supported with the 'gpt-5' model.
      //    Supported values are: 'minimal', 'low', 'medium', and 'high'."
      // (2026-08-13'te canlı hata kaydından alındı; 7 günde 9 koşu bu yüzden
      //  düştü.) "minimal" en yakın karşılık: en az akıl yürütme, en hızlı,
      //  en ucuz — davranış "none" ile aynı niyette.
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      text: { format: zodTextFormat(VerificationSchema, "gelecekfinans_verification") },
    });
    if (!response.output_parsed) throw new Error("OpenAI yapılandırılmış doğrulama çıktısı alınamadı");
    return response.output_parsed;
  } catch (error) {
    if (config.provider === "anthropic" && isAnthropicBillingError(error)) throw new AnthropicBillingError();
    if (isOpenAIQuotaError(error)) throw new OpenAIQuotaError();
    throw error;
  }
}

export async function writeArticle(
  topic: Topic,
  targetWords = 650,
): Promise<{
  title: string;
  meta: string;
  keyword: string;
  content: string;
  aiExtras: ArticleExtras;
  category: string;
  source: string;
  wordCount: number;
  quality: QualityReport;
  verification: VerificationReport;
  plagiarism: PlagiarismReport;
  plagiarismRepairApplied: boolean;
  ai: ArticleAIConfig;
}> {
  const packet = topic.evidencePacket;
  if (!packet || packet.status !== "VERIFIED") {
    throw new Error("RESEARCH_BLOCKED: İki bağımsız kaynak doğrulaması tamamlanmadı");
  }

  const materialCharacters = evidenceMaterialCharacterCount(packet);
  if (materialCharacters < 800) {
    throw new Error(`RESEARCH_BLOCKED: Kanıt metni sağlam bir haber için fazla kısa: ${materialCharacters} karakter`);
  }

  const draft = await generateDraft(topic, targetWords);
  const quality = validateDraft(draft, packet);
  if (!quality.passed) {
    throw new Error(`QUALITY_BLOCKED: ${quality.issues.join("; ")}`);
  }

  const content = renderDraftHtml(draft, packet);
  const plagiarism = checkPlagiarism({
    candidate: [
      content,
      ...draft.summary,
      draft.impact,
      ...draft.faq.flatMap((item) => [item.q, item.a]),
    ].join(" "),
    evidencePacket: packet,
  });

  if (!plagiarism.passed) {
    throw new Error(`PLAGIARISM_BLOCKED: ${plagiarism.issues.join("; ")}`);
  }

  const verification = await verifyDraft(topic, draft);
  if (!verification.passed || verification.unsupportedClaims.length || verification.conflictingClaims.length) {
    const reasons = [...verification.unsupportedClaims, ...verification.conflictingClaims].join("; ");
    throw new Error(`VERIFICATION_BLOCKED: ${reasons || "Model doğrulaması geçmedi"}`);
  }

  return {
    title: draft.title,
    meta: draft.meta,
    keyword: draft.keyword,
    content,
    aiExtras: { summary: draft.summary, impact: draft.impact, faq: draft.faq },
    category: topic.category,
    source: packet.evidence.map((item) => item.source).join(", "),
    wordCount: quality.wordCount,
    quality,
    verification,
    plagiarism,
    plagiarismRepairApplied: false,
    ai: resolveArticleAIConfig(),
  };
}
