import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveArticleAIConfig } from "@/lib/bot/writer";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "@/lib/bot/ai-budget";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(body, { ...init, headers });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const budget = resolveArticleAIBudgetConfig();
  const dailyWriterCalls = await prisma.automationEvent.count({
    where: {
      stage: "writer_call_reserved",
      createdAt: { gte: startOfIstanbulDay() },
    },
  });

  try {
    const config = resolveArticleAIConfig();
    return json({
      connected: true,
      provider: config.provider,
      providerLabel: config.provider === "openai" ? "OpenAI API" : "Claude API",
      writerModel: config.writerModel,
      verifierModel: config.verifierModel,
      billingUrl: config.provider === "openai"
        ? "https://platform.openai.com/settings/organization/billing/overview"
        : "https://platform.claude.com/settings/billing",
      dailyWriterCalls,
      ...budget,
    });
  } catch {
    const provider = process.env.ARTICLE_AI_PROVIDER === "anthropic" ? "anthropic" : "openai";
    return json({
      connected: false,
      provider,
      providerLabel: provider === "openai" ? "OpenAI API" : "Claude API",
      writerModel: provider === "openai"
        ? process.env.OPENAI_ARTICLE_MODEL || "gpt-5.6-luna"
        : process.env.ANTHROPIC_ARTICLE_MODEL || "claude-haiku-4-5",
      verifierModel: provider === "openai"
        ? process.env.OPENAI_VERIFIER_MODEL || "gpt-5.6-luna"
        : process.env.ANTHROPIC_VERIFIER_MODEL || "claude-haiku-4-5",
      billingUrl: provider === "openai"
        ? "https://platform.openai.com/settings/organization/billing/overview"
        : "https://platform.claude.com/settings/billing",
      dailyWriterCalls,
      ...budget,
    });
  }
}
