import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeExpiry, effectiveExpiry, isBreakingLive, DEFAULT_BREAKING_TTL_HOURS } from "@/lib/breaking";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const createBreakingNewsSchema = z.object({
  text: z.string().trim().min(1).max(280),
  url: z.string().trim().max(2_048).url().refine((value) => /^https?:\/\//i.test(value)).nullable().optional(),
  ttlHours: z.number().int().min(1).max(168).optional(),
}).strict();
const deleteBreakingNewsSchema = z.object({ id: z.string().trim().min(1).max(64).optional() }).strict();

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:breaking-news:get:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const rows = await prisma.breakingNews.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  const now = new Date();

  // Süresi dolmuş ama hâlâ active=true görünen kayıtları pasifleştir (otomatik temizlik).
  const expiredIds = rows.filter((r) => r.active && !isBreakingLive(r, now)).map((r) => r.id);
  if (expiredIds.length > 0) {
    await prisma.breakingNews.updateMany({ where: { id: { in: expiredIds } }, data: { active: false } });
  }

  const items = rows.map((r) => ({
    ...r,
    active: r.active && !expiredIds.includes(r.id),
    live: isBreakingLive(r, now),
    expiresAt: effectiveExpiry(r).toISOString(),
  }));

  return NextResponse.json({ items, defaultTtlHours: DEFAULT_BREAKING_TTL_HOURS }, { headers: PRIVATE_HEADERS });
}

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:breaking-news:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = createBreakingNewsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Son dakika alanları geçersiz" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { text, url, ttlHours } = parsed.data;

  const expiresAt = computeExpiry(ttlHours);
  const item = await prisma.$transaction(async (tx) => {
    // Yeni kayıt oluşmazsa önceki aktif duyuru da açık kalır.
    await tx.breakingNews.updateMany({ where: { active: true }, data: { active: false } });
    return tx.breakingNews.create({ data: { text, url, active: true, expiresAt } });
  });
  return NextResponse.json({ ...item, expiresAt: expiresAt.toISOString() }, { headers: PRIVATE_HEADERS });
}

export async function DELETE(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const limit = rateLimit(`admin:breaking-news:delete:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON gövdesi" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const parsed = deleteBreakingNewsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Son dakika kimliği geçersiz" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const { id } = parsed.data;
  if (id) {
    const deleted = await prisma.breakingNews.deleteMany({ where: { id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404, headers: PRIVATE_HEADERS });
  } else {
    await prisma.breakingNews.updateMany({ where: { active: true }, data: { active: false } });
  }
  return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
}
