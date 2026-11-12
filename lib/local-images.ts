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

export async function storeImageBytes(bytes: Buffer, prefix: string, contentType: string): Promise<string | null> {
  try {
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
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

export async function storeRemoteImage(src: string, prefix: string, allowExternalFallback: boolean): Promise<string | null> {
  try {
    const response = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return allowExternalFallback ? src : null;
    const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    return storeImageBytes(Buffer.from(await response.arrayBuffer()), prefix, contentType);
  } catch {
    return null;
  }
}
