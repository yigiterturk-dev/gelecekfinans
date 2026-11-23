import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { REVOKED_OPT_IN_TOKEN_HASH } from "@/lib/newsletter";
import { z } from "zod";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const idSchema = z.string().min(1).max(64);

function invalidBody() {
  return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400, headers: PRIVATE_HEADERS });
}

function limited(req: NextRequest, action: string, limit: number) {
  const result = rateLimit(`admin:subscribers:${action}:${clientIp(req)}`, { limit, windowMs: 60_000 });
  return result.ok ? null : NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(result.retryAfterSec) } },
  );
}

function mutationFailure(error: unknown, action: string) {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  return code === "P2025"
    ? NextResponse.json({ error: "Abone bulunamadı." }, { status: 404, headers: PRIVATE_HEADERS })
    : NextResponse.json({ error: `Abone ${action} işlemi tamamlanamadı.` }, { status: 500, headers: PRIVATE_HEADERS });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const rateLimitResponse = limited(req, "get", 60);
  if (rateLimitResponse) return rateLimitResponse;

  const rawFilter = req.nextUrl.searchParams.get("filter") || "all";
  const filter = z.enum(["all", "active", "inactive"]).safeParse(rawFilter);
  if (!filter.success) return invalidBody();
  const take = z.coerce.number().int().min(1).max(1000)
    .safeParse(req.nextUrl.searchParams.get("take") ?? "200");
  const offset = z.coerce.number().int().min(0).max(1_000_000)
    .safeParse(req.nextUrl.searchParams.get("offset") ?? "0");
  if (!take.success || !offset.success) return invalidBody();
  const rawCursor = req.nextUrl.searchParams.get("cursor");
  let cursor: { id: string; createdAt: Date } | null = null;
  if (rawCursor !== null) {
    let cursorValue: unknown;
    try { cursorValue = JSON.parse(rawCursor); } catch { return invalidBody(); }
    const parsedCursor = z.object({ id: idSchema, createdAt: z.string().datetime() }).strict().safeParse(cursorValue);
    if (!parsedCursor.success || offset.data !== 0) return invalidBody();
    cursor = { id: parsedCursor.data.id, createdAt: new Date(parsedCursor.data.createdAt) };
  }
  const baseWhere = filter.data === "active" ? { active: true } : filter.data === "inactive" ? { active: false } : {};
  const where = cursor
    ? {
        ...baseWhere,
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      }
    : baseWhere;

  const [subscribers, total, activeCount, confirmedCount] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take.data,
      ...(cursor ? {} : { skip: offset.data }),
      select: {
        id: true,
        email: true,
        active: true,
        confirmed: true,
        preferences: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.subscriber.count({ where: { confirmed: true } }),
  ]);

  const lastSubscriber = subscribers.at(-1);
  const nextCursor = subscribers.length === take.data && lastSubscriber
    ? { createdAt: lastSubscriber.createdAt.toISOString(), id: lastSubscriber.id }
    : null;
  return NextResponse.json({ subscribers, total, activeCount, confirmedCount, nextCursor }, { headers: PRIVATE_HEADERS });
}

export async function PATCH(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) {
    kokenReddi.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
    return kokenReddi;
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const rateLimitResponse = limited(req, "patch", 10);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try { body = await req.json(); } catch { return invalidBody(); }
  const parsed = z.object({ id: idSchema, active: z.boolean() }).strict().safeParse(body);
  if (!parsed.success) return invalidBody();
  try {
    await prisma.subscriber.update({
      where: { id: parsed.data.id },
      data: {
        active: parsed.data.active,
        ...(parsed.data.active ? {} : { confirmationTokenHash: REVOKED_OPT_IN_TOKEN_HASH }),
      },
    });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return mutationFailure(error, "güncelleme");
  }
}

export async function DELETE(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) {
    kokenReddi.headers.set("Cache-Control", PRIVATE_HEADERS["Cache-Control"]);
    return kokenReddi;
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });
  const rateLimitResponse = limited(req, "delete", 10);
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try { body = await req.json(); } catch { return invalidBody(); }
  const parsed = z.object({ id: idSchema }).strict().safeParse(body);
  if (!parsed.success) return invalidBody();
  try {
    await prisma.subscriber.delete({ where: { id: parsed.data.id } });
    return NextResponse.json({ ok: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return mutationFailure(error, "silme");
  }
}
