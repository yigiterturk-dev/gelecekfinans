import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hizFreniPaylasimli } from "@/lib/rate-limit-store";

const MAX_BODY_BYTES = 1024;

async function readBody(req: NextRequest): Promise<{ body: unknown } | { error: "invalid" | "too-large" }> {
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return { error: "too-large" };
  if (!req.body) return { error: "invalid" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: "too-large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    await reader.cancel().catch(() => {});
    return { error: "invalid" };
  }
}

export async function POST(req: NextRequest) {
  // Otomatik isteklerle pageView tablosunun şişirilmesini önle.
  // Sayac VERITABANINDA: Vercel'de her instance kendi bellegini tutar,
  // dolayisiyla surec-ici sayac sinirlari instance sayisi kadar gevsetirdi.
  // DB erisilemezse surec-ici sayaca duser (fail-open, bilincli).
  const rl = await hizFreniPaylasimli(`track:${clientIp(req)}`, 60, 60_000, () =>
    rateLimit(`track:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })
  );
  if (!rl.ok) return NextResponse.json(null, { status: 429 });

  const parsed = await readBody(req);
  if ("error" in parsed) return NextResponse.json(null, { status: parsed.error === "too-large" ? 413 : 400 });
  const body = parsed.body;

  const rawPath = (body as { path?: unknown })?.path;
  if (
    typeof rawPath !== "string" || !rawPath.startsWith("/") || rawPath.startsWith("//")
    || rawPath.length > 512 || rawPath.includes("\\") || rawPath.includes("?") || rawPath.includes("#")
    || /[\u0000-\u001f\u007f]/.test(rawPath)
  ) {
    return NextResponse.json(null, { status: 400 });
  }
  const path = rawPath;

  try {
    await prisma.pageView.create({ data: { path } });
  } catch {
    // Analitik kaydı kritik değil — DB hatasında sessizce geç.
    return NextResponse.json(null, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}
