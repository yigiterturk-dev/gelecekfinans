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
    /**
     * Günlük yazar çağrısı tavanı.
     *
     * ÖLÇÜM (2026-09-02): tavan 10'ken gün ortasında 10/10 doluydu — hakem
     * kapısı düzeltilip konular serbest kalınca ilk çarpılacak duvar buydu.
     * Program koşum başına 2 makale hedefiyle 3 haber + 3 rehber koşumu
     * çalıştırıyor: en iyi ihtimalle 12 çağrı, bir kalite reddi olan koşumda
     * daha fazla. 10 bu programın ALTINDA kalıyordu.
     *
     * Yazar çağrısı ~$0,026 (gpt-5). 16 çağrı ≈ $0,42/gün ≈ $12,6/ay —
     * $50-75 bütçenin beşte biri. Darboğaz para değil, kapıdan geçen konu.
     */
    /**
     * 3 Eylül 2026: sayaç düzeltilince (onarım turları da düşülüyor) 16'lık
     * tavan pratikte YARIYA indi — eskiden 16 konu × ~2 çağrı = 32 çağrılık
     * harcamaya izin veriyordu. Program aynı kalsın diye tavan gerçek çağrı
     * cinsinden 24'e çekildi: ~$0,63/gün, ~$19/ay; $50-75 bütçenin içinde.
     */
    dailyWriterCallLimit: boundedInteger(env.ARTICLE_DAILY_WRITER_CALL_LIMIT, 24, 1, 50),
    // Koşu başına 1 iken TEK bir kalite reddi bütün koşumu "bütçe doldu"
    // hatasıyla bitiriyordu: elenen konu yerine yenisi denenemiyordu. 2 ile
    // koşum ikinci bir konuya şans veriyordu ama koşumun HEDEFİ de 2 makale:
    // ilk konu reddedilirse ikinci makale için çağrı kalmıyordu. 3, hedefi
    // bir redde rağmen tutturmaya yetiyor; günlük tavan harcamayı sınırlıyor.
    // Aynı düzeltmenin koşu tarafı: 3 artık "3 konu" değil "3 çağrı" demek ve
    // tek bir onarımlı konu tavanın üçte ikisini yiyor. 6, koşumun 2 makale
    // hedefini bir redde rağmen tutturmaya yeten gerçek çağrı sayısıdır.
    maxWriterCallsPerRun: boundedInteger(env.ARTICLE_MAX_WRITER_CALLS_PER_RUN, 6, 1, 12),
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
