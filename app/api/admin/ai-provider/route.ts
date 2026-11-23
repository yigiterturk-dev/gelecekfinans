import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveArticleAIConfig } from "@/lib/bot/writer";
import { isAIAutomationEnabled, resolveArticleAIBudgetConfig, startOfIstanbulDay } from "@/lib/bot/ai-budget";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(body, { ...init, headers });
}

type ProviderId = "openai" | "anthropic" | "deepseek";

function providerPresentation(provider: ProviderId, model: string) {
  if (provider === "openai") {
    return {
      providerLabel: "OpenAI API",
      billingUrl: "https://platform.openai.com/settings/organization/billing/overview",
      billingLabel: "OpenAI Billing'i Aç ↗",
    };
  }
  if (provider === "anthropic") {
    return {
      providerLabel: "Claude API",
      billingUrl: "https://platform.claude.com/settings/billing",
      billingLabel: "Claude Billing'i Aç ↗",
    };
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "").toLocaleLowerCase("en-US");
  if (baseUrl.includes("generativelanguage.googleapis.com")) {
    return {
      providerLabel: "Google Gemini API (uyumlu uç)",
      billingUrl: "https://aistudio.google.com/",
      billingLabel: "Google AI Studio'yu Aç ↗",
    };
  }
  if (baseUrl.includes("127.0.0.1:11434") && model.endsWith(":cloud")) {
    return {
      providerLabel: "Ollama Cloud · DeepSeek",
      billingUrl: "https://ollama.com/settings",
      billingLabel: "Ollama hesabını aç ↗",
    };
  }
  return {
    providerLabel: "DeepSeek API",
    billingUrl: "https://platform.deepseek.com",
    billingLabel: "DeepSeek panelini aç ↗",
  };
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
    const presentation = providerPresentation(config.provider, config.writerModel);
    return json({
      connected: true,
      automationEnabled: isAIAutomationEnabled(),
      provider: config.provider,
      ...presentation,
      writerModel: config.writerModel,
      verifierModel: config.verifierModel,
      dailyWriterCalls,
      ...budget,
    });
  } catch {
    const requested = process.env.ARTICLE_AI_PROVIDER?.trim().toLocaleLowerCase("en-US");
    const provider: ProviderId = requested === "anthropic" ? "anthropic" : requested === "deepseek" ? "deepseek" : "openai";
    const writerModel = provider === "deepseek"
      ? process.env.DEEPSEEK_ARTICLE_MODEL || "deepseek-chat"
      : provider === "anthropic"
        ? process.env.ANTHROPIC_ARTICLE_MODEL || "claude-haiku-4-5"
        : process.env.OPENAI_ARTICLE_MODEL || "gpt-5.6-luna";
    const presentation = providerPresentation(provider, writerModel);
    return json({
      connected: false,
      automationEnabled: isAIAutomationEnabled(),
      provider,
      ...presentation,
      writerModel,
      verifierModel: provider === "openai"
        ? process.env.OPENAI_VERIFIER_MODEL || "gpt-5.6-luna"
        : provider === "anthropic"
          ? process.env.ANTHROPIC_VERIFIER_MODEL || "claude-haiku-4-5"
          : process.env.DEEPSEEK_VERIFIER_MODEL || "deepseek-chat",
      dailyWriterCalls,
      ...budget,
    });
  }
}
