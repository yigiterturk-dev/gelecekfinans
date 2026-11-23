import { prisma } from "@/lib/db";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type OpenAIQuotaGuardResult =
  | { blocked: false }
  | { blocked: true; reason: "recent_quota_failure" | "state_unavailable" };

/** Prevent repeated OpenAI requests after quota exhaustion; fail closed if state cannot be read. */
export async function getOpenAIQuotaGuard(provider: string): Promise<OpenAIQuotaGuardResult> {
  if (provider !== "openai") return { blocked: false };

  try {
    const failure = await prisma.automationEvent.findFirst({
      where: {
        stage: "configuration",
        createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
        metadata: { path: ["code"], equals: "OPENAI_QUOTA_EXHAUSTED" },
      },
      select: { id: true },
    });
    return failure ? { blocked: true, reason: "recent_quota_failure" } : { blocked: false };
  } catch {
    return { blocked: true, reason: "state_unavailable" };
  }
}

export function openAIQuotaGuardMessage(reason: "recent_quota_failure" | "state_unavailable"): string {
  return reason === "recent_quota_failure"
    ? "Son 24 saatte OpenAI kota hatası kaydı bulundu; yeni model çağrısı 24 saatliğine durduruldu."
    : "OpenAI kota koruması için hata kaydı okunamadı; güvenlik için yeni model çağrısı durduruldu.";
}
