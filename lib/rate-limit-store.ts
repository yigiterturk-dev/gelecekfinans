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
 * DB sayacı kullanılamazsa yardımcı süreç-içi sayacı döndürür. Bu yedeğin
 * isteği açıp açmayacağı rota politikasına bağlıdır: bülten POST'u e-posta
 * maliyetini korumak için DB sayacı olmadan kapalı kalır; pageView sayacı ise
 * düşük önem nedeniyle yerel yedekle çalışabilir.
 */
export type PaylasimliSonuc = { ok: boolean; retryAfterSec: number; kaynak: "db" | "bellek" };

const TEMIZLEME_ARALIGI_MS = 60_000;
let sonTemizlemeMs = 0;

async function suresiDolmusSayaclariTemizle(simdi: Date) {
  const zaman = simdi.getTime();
  if (zaman - sonTemizlemeMs < TEMIZLEME_ARALIGI_MS) return;
  // Eşzamanlı çağrılarda aynı process içinde yalnızca bir temizlik sorgusu çalıştır.
  sonTemizlemeMs = zaman;
  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lte: simdi } } });
  } catch {
    // Temizlik arızası asıl hız sınırını devre dışı bırakmamalı.
  }
}

export async function hizFreniPaylasimli(
  anahtar: string,
  limit: number,
  pencereMs: number,
  bellekYedegi: () => { ok: boolean; retryAfterSec: number },
): Promise<PaylasimliSonuc> {
  const simdi = new Date();
  try {
    await suresiDolmusSayaclariTemizle(simdi);
    // Tek SQL upsert'i ilk oluşturma ve pencere sıfırlama yarışlarını da
    // atomik çözer. Sayaç limit+1'de doyurulur; aşım süresince gereksiz
    // büyümez ve Int sınırına yaklaşmaz.
    const [counter] = await prisma.$queryRaw<Array<{ hits: number; resetAt: Date }>>`
      INSERT INTO "rate_limits" ("key", "hits", "resetAt", "updatedAt")
      VALUES (
        ${anahtar},
        1,
        NOW() + (${pencereMs} * INTERVAL '1 millisecond'),
        NOW()
      )
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE
          WHEN "rate_limits"."resetAt" <= NOW() THEN 1
          ELSE LEAST("rate_limits"."hits" + 1, ${limit + 1})
        END,
        "resetAt" = CASE
          WHEN "rate_limits"."resetAt" <= NOW() THEN EXCLUDED."resetAt"
          ELSE "rate_limits"."resetAt"
        END,
        "updatedAt" = NOW()
      RETURNING "hits", "resetAt"
    `;

    if (counter.hits <= limit) return { ok: true, retryAfterSec: 0, kaynak: "db" };
    const kalan = Math.ceil((counter.resetAt.getTime() - simdi.getTime()) / 1000);
    return { ok: false, retryAfterSec: Math.max(kalan, 1), kaynak: "db" };
  } catch {
    const y = bellekYedegi();
    return { ...y, kaynak: "bellek" };
  }
}
