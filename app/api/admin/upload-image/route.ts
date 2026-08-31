import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { put } from "@vercel/blob";
import { rateLimit, clientIp } from "@/lib/rate-limit";

function rateLimitResponse(result: ReturnType<typeof rateLimit>) {
  return NextResponse.json(
    { error: "Too many requests", retryAfter: result.retryAfterSec },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } }
  );
}

// Makale düzenleme ekranından gelen görsel dosyasını Vercel Blob'a yükler.
// Sadece resim, max ~8MB. Dönen public URL form.imageUrl'e yazılır.
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = rateLimit(`admin:upload-image:post:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Blob deposu yapılandırılmamış (BLOB_READ_WRITE_TOKEN yok)." }, { status: 500 });
  }

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
    const blob = await put(`gorseller/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: `Yükleme başarısız: ${(e as Error).message}` }, { status: 500 });
  }
}
