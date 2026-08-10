export const ANTHROPIC_BILLING_URL = "https://platform.claude.com/settings/billing";

interface AnthropicCostResult {
  amount?: unknown;
}

interface AnthropicCostBucket {
  results?: unknown;
}

interface AnthropicCostPage {
  data?: unknown;
  has_more?: unknown;
  next_page?: unknown;
}

export function getAnthropicMonthWindow(now = new Date()) {
  const startingAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return {
    startingAt: startingAt.toISOString(),
    endingAt: now.toISOString(),
  };
}

export function sumAnthropicCostCents(payload: unknown) {
  if (!payload || typeof payload !== "object") return 0;

  const data = (payload as AnthropicCostPage).data;
  if (!Array.isArray(data)) return 0;

  return data.reduce((pageTotal, bucket) => {
    if (!bucket || typeof bucket !== "object") return pageTotal;
    const results = (bucket as AnthropicCostBucket).results;
    if (!Array.isArray(results)) return pageTotal;

    return pageTotal + results.reduce((bucketTotal, result) => {
      if (!result || typeof result !== "object") return bucketTotal;
      const amount = (result as AnthropicCostResult).amount;
      const parsed = typeof amount === "number" ? amount : Number.parseFloat(String(amount));
      return Number.isFinite(parsed) ? bucketTotal + parsed : bucketTotal;
    }, 0);
  }, 0);
}

export function getAnthropicPagination(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { hasMore: false, nextPage: null };
  }

  const page = payload as AnthropicCostPage;
  return {
    hasMore: page.has_more === true,
    nextPage: typeof page.next_page === "string" && page.next_page ? page.next_page : null,
  };
}
