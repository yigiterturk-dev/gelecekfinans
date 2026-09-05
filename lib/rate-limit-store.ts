import "server-only";
import { prisma } from "@/lib/db";

/**
 * Hız freni sayacının PAYLAŞILAN deposu.
 *
 * lib/rate-limit.ts'teki sayaç süreç belleğinde; Vercel'de her instance kendi
 * sayacını tutar, dolayısıyla sınır instance sayısı kadar gevşer. O dosyadaki
 * yorum "serverless tek-instance için yeterli" diyor — Vercel tek instance
 * DEĞİLDİR, varsayım yanlıştı.
 *
 * Burada karar mantığı değişmiyor; yalnız sayaç veritabanında tutuluyor.
 *
 * FAIL-OPEN, bilinçli: veritabanı erişilemezse istek REDDEDİLMEZ, süreç-içi
 * sayaca düşülür. Bir bülten aboneliğini DB arızasında tamamen kapatmak,
 * sınırın gevşemesinden daha büyük zarar olurdu.
 */
export type PaylasimliSonuc = { ok: boolean; retryAfterSec: number; kaynak: "db" | "bellek" };

export async function hizFreniPaylasimli(
  anahtar: string,
  limit: number,
  pencereMs: number,
  bellekYedegi: () => { ok: boolean; retryAfterSec: number },
): Promise<PaylasimliSonuc> {
  const simdi = new Date();
  try {
    const mevcut = await prisma.rateLimit.findUnique({ where: { key: anahtar } });

    // Pencere dolmuşsa (veya hiç yoksa) sayacı sıfırdan başlat.
    if (!mevcut || mevcut.resetAt <= simdi) {
      const resetAt = new Date(simdi.getTime() + pencereMs);
      await prisma.rateLimit.upsert({
        where: { key: anahtar },
        create: { key: anahtar, hits: 1, resetAt },
        update: { hits: 1, resetAt },
      });
      return { ok: true, retryAfterSec: 0, kaynak: "db" };
    }

    if (mevcut.hits >= limit) {
      const kalan = Math.ceil((mevcut.resetAt.getTime() - simdi.getTime()) / 1000);
      return { ok: false, retryAfterSec: Math.max(kalan, 1), kaynak: "db" };
    }

    // Artırma ATOMİK: iki eşzamanlı istek aynı değeri okuyup ikisi de
    // "sınır aşılmadı" diyemesin.
    await prisma.rateLimit.update({
      where: { key: anahtar },
      data: { hits: { increment: 1 } },
    });
    return { ok: true, retryAfterSec: 0, kaynak: "db" };
  } catch {
    const y = bellekYedegi();
    return { ...y, kaynak: "bellek" };
  }
}
