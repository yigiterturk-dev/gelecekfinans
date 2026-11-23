type SiteConfigResponse = {
  ga4Id?: unknown;
  adsenseId?: unknown;
  adSlots?: Record<string, unknown>;
  adSlotIds?: Record<string, unknown>;
};

export type PublicSiteConfig = {
  ga4Id: string;
  adsenseId: string;
  adSlots: Record<string, boolean>;
  adSlotIds: Record<string, string>;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedConfig: { value: PublicSiteConfig; expiresAt: number } | null = null;
let pendingRequest: Promise<PublicSiteConfig> | null = null;

function normalizeConfig(value: unknown): PublicSiteConfig {
  if (!value || typeof value !== "object") throw new Error("Invalid site config response");
  const data = value as SiteConfigResponse;
  const adSlots: Record<string, boolean> = {};
  const adSlotIds: Record<string, string> = {};

  for (const [position, enabled] of Object.entries(data.adSlots ?? {})) {
    if (/^[a-zA-Z]+$/.test(position)) adSlots[position] = enabled === true;
  }
  for (const [position, rawId] of Object.entries(data.adSlotIds ?? {})) {
    if (!/^[a-zA-Z]+$/.test(position)) continue;
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (/^\d{1,20}$/.test(id)) adSlotIds[position] = id;
  }

  return {
    ga4Id: typeof data.ga4Id === "string" && /^G-[A-Z0-9]+$/i.test(data.ga4Id) ? data.ga4Id.toUpperCase() : "",
    adsenseId: typeof data.adsenseId === "string" && /^ca-pub-\d{10,20}$/.test(data.adsenseId) ? data.adsenseId : "",
    adSlots,
    adSlotIds,
  };
}

export function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  if (cachedConfig && cachedConfig.expiresAt > Date.now()) return Promise.resolve(cachedConfig.value);
  if (pendingRequest) return pendingRequest;

  const request = fetch("/api/site-config")
    .then((response) => {
      if (!response.ok) throw new Error("Site config request failed");
      return response.json() as Promise<unknown>;
    })
    .then((data) => {
      const value = normalizeConfig(data);
      cachedConfig = { value, expiresAt: Date.now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      if (pendingRequest === request) pendingRequest = null;
    });

  pendingRequest = request;
  return request;
}
