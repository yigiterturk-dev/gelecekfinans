import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:revalidate:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }
  const rawPaths = (payload as Record<string, unknown>).paths;
  if (
    rawPaths !== undefined && (
      !Array.isArray(rawPaths) || rawPaths.length > 20
      || !rawPaths.every((path) => typeof path === "string" && path.startsWith("/")
        && !path.startsWith("//") && path.length <= 512 && !path.includes("\\")
        && !path.includes("?") && !path.includes("#") && !/[\u0000-\u001f\u007f]/.test(path))
    )
  ) {
    return NextResponse.json({ error: "Geçersiz yenileme yolları" }, { status: 400 });
  }
  const paths = Array.isArray(rawPaths) ? rawPaths as string[] : [];

  const defaultPaths = ["/", "/sitemap.xml", "/feed.xml"];
  const allPaths = [...new Set([...defaultPaths, ...paths])];

  for (const p of allPaths) {
    revalidatePath(p);
  }

  return NextResponse.json({ ok: true, revalidated: allPaths });
}
