import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hizFreniPaylasimli } from "@/lib/rate-limit-store";

export async function POST(req: NextRequest) {
  // Otomatik isteklerle pageView tablosunun şişirilmesini önle.
  // Sayac VERITABANINDA: Vercel'de her instance kendi bellegini tutar,
  // dolayisiyla surec-ici sayac sinirlari instance sayisi kadar gevsetirdi.
  // DB erisilemezse surec-ici sayaca duser (fail-open, bilincli).
  const rl = await hizFreniPaylasimli(`track:${clientIp(req)}`, 60, 60_000, () =>
    rateLimit(`track:${clientIp(req)}`, { limit: 60, windowMs: 60_000 })
  );
  if (!rl.ok) return NextResponse.json(null, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(null, { status: 400 });
  }

  const rawPath = (body as { path?: unknown })?.path;
  if (typeof rawPath !== "string" || !rawPath.startsWith("/")) {
    return NextResponse.json(null, { status: 400 });
  }
  // Aşırı uzun/garip path'leri kırp.
  const path = rawPath.slice(0, 512);

  try {
    await prisma.pageView.create({ data: { path } });
  } catch {
    // Analitik kaydı kritik değil — DB hatasında sessizce geç.
    return NextResponse.json(null, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}
