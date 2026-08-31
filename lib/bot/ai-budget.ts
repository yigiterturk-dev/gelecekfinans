export interface ArticleAIBudgetConfig {
  dailyWriterCallLimit: number;
  maxWriterCallsPerRun: number;
  writerMaxOutputTokens: number;
  verifierMaxOutputTokens: number;
  evidencePromptCharacterLimit: number;
  evidenceItemCharacterLimit: number;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(parsed, maximum));
}

export function resolveArticleAIBudgetConfig(
  env: Record<string, string | undefined> = process.env,
): ArticleAIBudgetConfig {
  return {
    dailyWriterCallLimit: boundedInteger(env.ARTICLE_DAILY_WRITER_CALL_LIMIT, 10, 1, 50),
    // Koşu başına 1 iken TEK bir kalite reddi bütün koşumu "bütçe doldu"
    // hatasıyla bitiriyordu: elenen konu yerine yenisi denenemiyordu. 2 ile
    // koşum ikinci bir konuya şans veriyor, günlük tavan yine harcamayı
    // sınırlıyor (varsayılan 10).
    maxWriterCallsPerRun: boundedInteger(env.ARTICLE_MAX_WRITER_CALLS_PER_RUN, 2, 1, 10),
    // 2400 token, 800 kelimelik TÜRKÇE makale JSON'ına yetmiyordu: canlı
    // kayıtta "Unterminated string in JSON at position 7764" ile taslak
    // ortadan kesildi. Türkçe token başına daha az kelime taşır ve claims/faq
    // alanları da bu tavana sayılır. 5000 haber şeridi için rahat pay bırakır;
    // tavan rehber şeridi (1800 kelime) için 16000'e çıkarıldı.
    writerMaxOutputTokens: boundedInteger(env.OPENAI_WRITER_MAX_OUTPUT_TOKENS, 5000, 1200, 16000),
    verifierMaxOutputTokens: boundedInteger(env.OPENAI_VERIFIER_MAX_OUTPUT_TOKENS, 800, 300, 1600),
    evidencePromptCharacterLimit: boundedInteger(env.ARTICLE_EVIDENCE_PROMPT_MAX_CHARS, 14000, 4000, 24000),
    evidenceItemCharacterLimit: boundedInteger(env.ARTICLE_EVIDENCE_ITEM_MAX_CHARS, 2500, 800, 5000),
  };
}

/** Türkiye sabit UTC+3 kullandığı için günlük bütçe sınırı İstanbul gününe göre sıfırlanır. */
export function startOfIstanbulDay(now = new Date()): Date {
  const turkeyOffsetMs = 3 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + turkeyOffsetMs);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  ) - turkeyOffsetMs);
}
