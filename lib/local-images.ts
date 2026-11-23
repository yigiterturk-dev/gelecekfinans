import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Görselleri Vercel Blob yerine sunucunun kendi diskine yazar.
 *
 * Site netcup VPS'te self-hosted çalıştığı için `public/gorseller` kalıcıdır ve
 * Next.js bu dosyaları doğrudan servis eder. Dönen yol her zaman site içidir
 * (`/gorseller/<ad>.<uzantı>`), böylece Google Görseller'de görsel
 * gelecekfinans.com'a atfedilir.
 */
const IMAGE_DIR = path.join(process.cwd(), "public", "gorseller");
const MAX_STORED_IMAGE_BYTES = 25 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function matchesImageSignature(bytes: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (contentType === "image/gif") return bytes.toString("ascii", 0, 3) === "GIF" && (bytes.toString("ascii", 0, 6) === "GIF87a" || bytes.toString("ascii", 0, 6) === "GIF89a");
  if (contentType === "image/avif") {
    if (bytes.length < 16 || bytes.toString("ascii", 4, 8) !== "ftyp") return false;
    const boxSize = bytes.readUInt32BE(0);
    if (boxSize < 16 || boxSize > bytes.length || (boxSize - 16) % 4 !== 0) return false;
    const brands = [bytes.toString("ascii", 8, 12)];
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
      brands.push(bytes.toString("ascii", offset, offset + 4));
    }
    return brands.some((brand) => brand === "avif" || brand === "avis");
  }
  return false;
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<Buffer | null> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  } catch {
    await reader.cancel().catch(() => {});
    return null;
  }
}

export async function storeImageBytes(bytes: Buffer, prefix: string, contentType: string): Promise<string | null> {
  const normalizedType = contentType.split(";")[0].trim().toLowerCase();
  const extension = IMAGE_EXTENSIONS[normalizedType];
  if (!extension || bytes.length === 0 || bytes.length > MAX_STORED_IMAGE_BYTES || !matchesImageSignature(bytes, normalizedType)) {
    return null;
  }

  try {
    const safePrefix = prefix
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "gorsel";
    // Aynı makale yeniden üretilirse aynı adrese yazılır; dosya adı okunur kalır
    // ve eski görsel çöp olarak birikmez.
    const name = `${safePrefix}.${extension}`;
    await mkdir(IMAGE_DIR, { recursive: true });
    await writeFile(path.join(IMAGE_DIR, name), bytes);
    return `/gorseller/${name}`;
  } catch (error) {
    // Sessiz null, canlıda saatlerce yanlış yere baktırdı. Sebep artık kayıtta.
    console.warn(`[gorsel] diske yazma başarısız (${prefix}):`, (error as Error).message);
    return null;
  }
}

export async function storeRemoteImage(src: string, prefix: string): Promise<string | null> {
  try {
    const imageUrl = new URL(src);
    if (imageUrl.protocol !== "https:" || imageUrl.username || imageUrl.password) return null;
    // Wikimedia UA'sız istekleri reddedebiliyor (bot politikası).
    const response = await fetch(imageUrl, {
      // Görsel sağlayıcı URL'leri başka bir hedefe yönlendirerek bu sunucudan
      // iç ağa istek attırmamalı. Sağlayıcı CDN'leri doğrudan görsel döndürür;
      // yönlendirme gerekirse çağrı reddedilip markalı kapak kullanılır.
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "GelecekFinansBot/1.0 (+https://gelecekfinans.com)" },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
    if (!IMAGE_EXTENSIONS[contentType]) return null;
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_STORED_IMAGE_BYTES) return null;
    const bytes = await readLimitedResponse(response, MAX_STORED_IMAGE_BYTES);
    if (!bytes) return null;
    return storeImageBytes(bytes, prefix, contentType);
  } catch {
    return null;
  }
}
