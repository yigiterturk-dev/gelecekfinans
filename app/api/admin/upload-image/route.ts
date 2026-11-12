import { NextRequest, NextResponse } from "next/server";
import { farkliKokenReddi } from "@/lib/csrf";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeImageBytes } from "@/lib/local-images";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

// Makale düzenleme ekranından gelen görsel dosyasını sunucudaki
// public/gorseller dizinine yazar. Sadece resim, max ~8MB. Dönen public URL
// form.imageUrl'e yazılır.
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(req: NextRequest) {
  const kokenReddi = farkliKokenReddi(req);
  if (kokenReddi) return kokenReddi;

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:upload-image:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  let file: File | null = null;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Geçersiz form verisi." }, { status: 400 });
  }

  if (!file) return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });

  // Tip doğrulaması
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Sadece resim dosyası yüklenebilir (JPEG, PNG, WebP, GIF, AVIF)." }, { status: 400 });
  }

  // Boyut doğrulaması
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Dosya çok büyük (en fazla 8MB)." }, { status: 400 });
  }

  try {
    // Dosya adını güvenli hale getir (yol/garip karakter kalmasın).
    const safeName = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const prefix = `${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}`;
    const url = await storeImageBytes(Buffer.from(await file.arrayBuffer()), prefix, file.type);
    if (!url) {
      return NextResponse.json({ error: "Görsel kaydedilemedi." }, { status: 500 });
    }
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: `Yükleme başarısız: ${(e as Error).message}` }, { status: 500 });
  }
}
