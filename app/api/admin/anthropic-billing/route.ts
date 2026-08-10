import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ANTHROPIC_BILLING_URL,
  getAnthropicMonthWindow,
  getAnthropicPagination,
  sumAnthropicCostCents,
} from "@/lib/anthropic-billing";

const ANTHROPIC_COST_REPORT_URL = "https://api.anthropic.com/v1/organizations/cost_report";

export const dynamic = "force-dynamic";

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(body, { ...init, headers });
}

async function fetchCurrentMonthCost(adminKey: string) {
  const { startingAt, endingAt } = getAnthropicMonthWindow();
  let nextPage: string | null = null;
  let totalCents = 0;

  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    const url = new URL(ANTHROPIC_COST_REPORT_URL);
    url.searchParams.set("starting_at", startingAt);
    url.searchParams.set("ending_at", endingAt);
    url.searchParams.set("limit", "31");
    if (nextPage) url.searchParams.set("page", nextPage);

    const response = await fetch(url, {
      headers: {
        "anthropic-version": "2023-06-01",
        "x-api-key": adminKey,
        "User-Agent": "GelecekFinans/1.0 (https://gelecekfinans.com)",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) throw new Error(`Anthropic cost report returned ${response.status}`);

    const payload: unknown = await response.json();
    totalCents += sumAnthropicCostCents(payload);
    const pagination = getAnthropicPagination(payload);
    if (!pagination.hasMore || !pagination.nextPage) break;
    nextPage = pagination.nextPage;
  }

  return Math.round(totalCents) / 100;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return json({ error: "Unauthorized" }, { status: 401 });

  const standardKeyConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const adminKey = process.env.ANTHROPIC_ADMIN_KEY?.trim();
  const base = {
    connected: standardKeyConfigured,
    writerModel: process.env.ANTHROPIC_ARTICLE_MODEL || "claude-sonnet-5",
    verifierModel: process.env.ANTHROPIC_VERIFIER_MODEL || "claude-haiku-4-5",
    billingUrl: ANTHROPIC_BILLING_URL,
    balanceSource: "console" as const,
    adminReportingConfigured: Boolean(adminKey),
  };

  if (!adminKey) {
    return json({
      ...base,
      currentMonthCostUsd: null,
      costStatus: "ADMIN_KEY_REQUIRED" as const,
    });
  }

  try {
    const currentMonthCostUsd = await fetchCurrentMonthCost(adminKey);
    return json({ ...base, currentMonthCostUsd, costStatus: "AVAILABLE" as const });
  } catch {
    return json({
      ...base,
      currentMonthCostUsd: null,
      costStatus: "UNAVAILABLE" as const,
    });
  }
}
