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

type ProviderId = "openai" | "anthropic" | "deepseek" | "gemini";

type OpenAICostResult = {
  amount?: { value?: number; currency?: string } | null;
};

type OpenAICostPage = {
  data?: Array<{ results?: OpenAICostResult[] }>;
  has_more?: boolean;
  next_page?: string | null;
};

async function currentOpenAIMonthCost() {
  const adminKey = process.env.OPENAI_ADMIN_KEY?.trim();
  if (!adminKey) return { openAICostStatus: "ADMIN_KEY_REQUIRED" as const, openAIMonthToDateUsd: null };

  const now = new Date();
  const startTime = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
  const endTime = Math.floor(now.getTime() / 1000);
  let page: string | null = null;
  let totalUsd = 0;

  try {
    for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
      const url = new URL("https://api.openai.com/v1/organization/costs");
      url.searchParams.set("start_time", String(startTime));
      url.searchParams.set("end_time", String(endTime));
      url.searchParams.set("bucket_width", "1d");
      url.searchParams.set("limit", "180");
      if (page) url.searchParams.set("page", page);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${adminKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`OpenAI costs returned ${response.status}`);

      const payload = await response.json() as OpenAICostPage;
      for (const bucket of payload.data || []) {
        for (const result of bucket.results || []) {
          if (!result.amount) continue;
          const currency = result.amount.currency?.toLocaleLowerCase("en-US");
          const value = result.amount.value;
          if (currency !== "usd" || typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("Invalid OpenAI cost amount");
          }
          totalUsd += value;
        }
      }

      if (!payload.has_more) {
        return { openAICostStatus: "AVAILABLE" as const, openAIMonthToDateUsd: Number(totalUsd.toFixed(4)) };
      }
      if (!payload.next_page) throw new Error("OpenAI costs pagination cursor missing");
      page = payload.next_page;
    }
    throw new Error("OpenAI costs pagination limit reached");
  } catch {
    return { openAICostStatus: "UNAVAILABLE" as const, openAIMonthToDateUsd: null };
  }
}

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
  if (provider === "gemini") {
    return {
      providerLabel: "Google Gemini API",
      billingUrl: "https://aistudio.google.com/",
      billingLabel: "Google AI Studio'yu Aç ↗",
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
  // The Admin API key is optional. This read-only report never calls a model.
  const openAICost = await currentOpenAIMonthCost();

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
      ...openAICost,
      ...budget,
    });
  } catch {
    const requested = process.env.ARTICLE_AI_PROVIDER?.trim().toLocaleLowerCase("en-US");
    const provider: ProviderId = requested === "anthropic"
      ? "anthropic"
      : requested === "deepseek"
        ? "deepseek"
        : requested === "gemini"
          ? "gemini"
          : "openai";
    const writerModel = provider === "gemini"
      ? process.env.GEMINI_ARTICLE_MODEL || "gemini-2.5-flash"
      : provider === "deepseek"
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
          : provider === "gemini"
            ? process.env.GEMINI_VERIFIER_MODEL || "gemini-2.5-flash"
            : process.env.DEEPSEEK_VERIFIER_MODEL || "deepseek-chat",
      dailyWriterCalls,
      ...openAICost,
      ...budget,
    });
  }
}
