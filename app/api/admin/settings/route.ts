import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSettingsStrict, updateSettings } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const adSlotsSchema = z.object({
  headerBanner: z.boolean().optional(),
  inArticle: z.boolean().optional(),
  sidebar: z.boolean().optional(),
  afterArticle: z.boolean().optional(),
}).strict().optional();
const adSlotIdsSchema = z.object({
  headerBanner: z.string().max(20).regex(/^\d*$/).optional(),
  inArticle: z.string().max(20).regex(/^\d*$/).optional(),
  sidebar: z.string().max(20).regex(/^\d*$/).optional(),
  afterArticle: z.string().max(20).regex(/^\d*$/).optional(),
}).strict().optional();
const settingsPatchSchema = z.object({
  ga4Id: z.string().max(100).regex(/^(?:G-[A-Z0-9]+)?$/i).optional(),
  adsenseId: z.string().max(30).regex(/^(?:(?:ca-)?pub-\d{10,20})?$/i).optional(),
  searchConsoleVerification: z.string().max(256).regex(/^[A-Za-z0-9_-]*$/).optional(),
  adSlots: adSlotsSchema,
  adSlotIds: adSlotIdsSchema,
  breakingNewsEnabled: z.boolean().optional(),
  autonomy: z.object({
    cronEnabled: z.boolean().optional(),
    enabled: z.boolean().optional(),
    dailyArticleCount: z.number().int().min(1).max(2).optional(),
    targetWords: z.number().int().min(450).max(900).optional(),
  }).strict().optional(),
}).strict();

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }

  const limit = rateLimit(`admin:settings:get:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const settings = await getSettingsStrict();
    return NextResponse.json(settings, { headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "Ayarlar şu anda okunamıyor." },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }
}

export async function PATCH(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) {
    kokenReddi.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
    return kokenReddi;
  }

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  }

  const limit = rateLimit(`admin:settings:patch:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = settingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ayar alanları geçersiz." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Ayar alanları geçersiz veya boş." }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const settings = await updateSettings(parsed.data);
  return NextResponse.json(settings, { headers: PRIVATE_HEADERS });
}
