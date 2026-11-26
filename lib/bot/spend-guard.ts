import { prisma } from "@/lib/db";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "./ai-budget";
import { AIBudgetLimitError } from "./errors";
import { estimateCostUsd } from "./usage";

function metadataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Pre-authorize one provider request against the configured daily application
 * estimate. Prompt bytes are used as a conservative token upper bound; input
 * caching discounts are deliberately ignored. This is not a provider invoice
 * limit. Unknown prices or incomplete same-day accounting stop closed.
 */
export async function reserveModelSpend(args: {
  stage: "writer" | "verifier" | "judge" | "entity";
  model: string;
  endpointHost: string;
  prompts: string[];
  maxOutputTokens: number;
}): Promise<number> {
  const limitUsd = resolveArticleAIBudgetConfig().dailySpendLimitUsd;
  if (limitUsd <= 0) {
    throw new AIBudgetLimitError(
      "Günlük model harcama tavanı 0 USD; yeni model çağrısı yapılmadı. Açmak için AI_DAILY_SPEND_LIMIT_USD değerini açıkça belirleyin.",
    );
  }

  const inputBytes = args.prompts.reduce((sum, prompt) => sum + new TextEncoder().encode(prompt).byteLength, 0);
  const estimate = estimateCostUsd({
    model: args.model,
    inputTokens: inputBytes,
    outputTokens: Math.max(0, args.maxOutputTokens),
  });
  if (!estimate.priced) {
    throw new AIBudgetLimitError(
      `Model ${args.model} için güvenilir fiyat tablosu yok; harcama tavanı nedeniyle istek gönderilmedi.`,
    );
  }

  const dayStart = startOfIstanbulDay();
  const dayKey = dayStart.toISOString().slice(0, 10);
  return prisma.$transaction(async (tx) => {
    // Serialize the read-check-write so concurrent pipelines cannot both
    // observe the same headroom and over-reserve it.
    // ::text: Prisma void sütunu okuyamıyor ("Failed to deserialize column of type void").
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`gelecekfinans-ai-spend:${dayKey}`}))::text`;
    const events = await tx.automationEvent.findMany({
      where: {
        stage: { in: ["cost", "model_spend_reservation"] },
        createdAt: { gte: dayStart },
      },
      select: { stage: true, metadata: true },
    });
    let spentTodayUsd = 0;
    for (const event of events) {
      const metadata = metadataRecord(event.metadata);
      if (event.stage === "model_spend_reservation") {
        const reservedCostUsd = metadata?.reservedCostUsd;
        if (typeof reservedCostUsd !== "number" || !Number.isFinite(reservedCostUsd) || reservedCostUsd < 0) {
          throw new AIBudgetLimitError(
            "Bugünkü model harcama rezervasyonu bozuk; yeni istek gönderilmedi.",
          );
        }
        spentTodayUsd += reservedCostUsd;
        continue;
      }

      const costUsd = metadata?.costUsd;
      const unpricedModels = metadata?.unpricedModels;
      if (
        metadata?.costIsComplete !== true ||
        metadata.callsWithoutUsage !== 0 ||
        !Array.isArray(unpricedModels) || unpricedModels.length > 0 ||
        typeof costUsd !== "number" || !Number.isFinite(costUsd) || costUsd < 0
      ) {
        throw new AIBudgetLimitError(
          "Bugünkü geçmiş kullanım kaydı eksik; doğru toplam bilinmediği için yeni model isteği gönderilmedi.",
        );
      }
      // Calls made by this version were already charged at their full
      // preflight reservation. Legacy cost events have no such reservation.
      if (metadata.spendGuardVersion !== 1) spentTodayUsd += costUsd;
    }

    const nextTotalUsd = spentTodayUsd + estimate.costUsd;
    if (nextTotalUsd > limitUsd + 1e-9) {
      throw new AIBudgetLimitError(
        `Günlük tahmini harcama tavanı aşılacaktı ($${nextTotalUsd.toFixed(4)} / $${limitUsd.toFixed(2)}); yeni istek gönderilmedi.`,
      );
    }

    // Keep the full maximum reserved for the rest of the Istanbul day. This
    // deliberately overcounts unused output tokens, but survives crashes and
    // prevents later runs from spending headroom that was already promised.
    await tx.automationEvent.create({
      data: {
        stage: "model_spend_reservation",
        message: "Model isteği öncesi günlük maliyet rezervasyonu",
        metadata: {
          stage: args.stage,
          model: args.model,
          endpointHost: args.endpointHost,
          reservedCostUsd: estimate.costUsd,
          spendGuardVersion: 1,
        },
      },
    });
    return estimate.costUsd;
  });
}
