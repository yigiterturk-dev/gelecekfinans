import "server-only";
import { prisma } from "@/lib/db";

export interface CronLockLease {
  key: string;
  resetAt: Date;
}

/** PostgreSQL'de kısa süreli, instance'lar arası cron kilidi alır. */
export async function acquireCronLock(key: string, leaseMs = 6 * 60_000): Promise<CronLockLease | null> {
  const rows = await prisma.$queryRaw<Array<{ resetAt: Date }>>`
    INSERT INTO "rate_limits" ("key", "hits", "resetAt", "updatedAt")
    VALUES (
      ${key},
      1,
      NOW() + (${leaseMs} * INTERVAL '1 millisecond'),
      NOW()
    )
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = 1,
      "resetAt" = EXCLUDED."resetAt",
      "updatedAt" = NOW()
    WHERE "rate_limits"."resetAt" <= NOW()
    RETURNING "resetAt"
  `;
  return rows[0] ? { key, resetAt: rows[0].resetAt } : null;
}

/** Eski bir çalışmanın kilidi, süresi dolup yeniden alınmışsa silememesini sağlar. */
export async function releaseCronLock(lease: CronLockLease): Promise<void> {
  await prisma.$executeRaw`
    DELETE FROM "rate_limits"
    WHERE "key" = ${lease.key} AND "resetAt" = ${lease.resetAt}
  `;
}
