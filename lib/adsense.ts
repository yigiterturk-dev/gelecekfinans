export function normalizeAdsensePublisherId(value?: string | null): string | null {
  const raw = (value || "").trim().toLowerCase();
  const digits = raw.replace(/^ca-/, "").match(/^pub-(\d{10,20})$/)?.[1];
  return digits ? `ca-pub-${digits}` : null;
}

export function adsTxtRecord(value?: string | null): string | null {
  const normalized = normalizeAdsensePublisherId(value);
  if (!normalized) return null;
  return `google.com, ${normalized.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`;
}
