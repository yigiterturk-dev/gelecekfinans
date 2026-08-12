import { createHmac, timingSafeEqual } from "crypto";

/**
 * Bülten kategori segmentleri. ASCII anahtarlar (doviz/altin) URL ve
 * Article.category ile uyumlu olacak şekilde kullanılır.
 */
export const SEGMENTS = ["kripto", "borsa", "doviz", "altin", "ekonomi"] as const;
export type Segment = (typeof SEGMENTS)[number];

export const SEGMENT_LABELS: Record<Segment, string> = {
  kripto: "Kripto",
  borsa: "Borsa",
  doviz: "Döviz",
  altin: "Altın",
  ekonomi: "Ekonomi",
};

export function isSegment(v: unknown): v is Segment {
  return typeof v === "string" && (SEGMENTS as readonly string[]).includes(v);
}

/** Gelen tercih listesini geçerli segmentlere indirger (sanitize). */
export function sanitizePreferences(input: unknown): Segment[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<Segment>();
  for (const v of input) {
    if (isSegment(v)) out.add(v);
  }
  return [...out];
}

function newsletterSecret(): string {
  return (
    process.env.NEWSLETTER_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.CRON_SECRET ||
    ""
  );
}

/**
 * E-posta için imzalı double-opt-in token üretir.
 * Format: base64url(payload).hmac  — payload = email + "|" + exp(ms)
 * Anahtar yoksa fail-closed: imzalama yapılmaz, çağıran tarafın no-op
 * davranışına düşmesi beklenir.
 */
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function hasNewsletterSecret(): boolean {
  return newsletterSecret().length > 0;
}

export function signOptInToken(email: string, ttlMs = 1000 * 60 * 60 * 48): string | null {
  const secret = newsletterSecret();
  if (!secret) return null;
  const exp = Date.now() + ttlMs;
  const payload = b64url(Buffer.from(`${email}|${exp}`, "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Token doğrular; geçerli ve süresi geçmemişse email döner, aksi halde null.
 * Sabit-zaman karşılaştırma kullanır.
 */
export function verifyOptInToken(token: string | null | undefined): string | null {
  const secret = newsletterSecret();
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(createHmac("sha256", secret).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let decoded: string;
  try {
    decoded = fromB64url(payload).toString("utf8");
  } catch {
    return null;
  }
  const sep = decoded.lastIndexOf("|");
  if (sep === -1) return null;
  const email = decoded.slice(0, sep);
  const exp = Number(decoded.slice(sep + 1));
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  if (!email.includes("@")) return null;
  return email;
}

/**
 * Abonelikten çıkma (unsubscribe) için imzalı token üretir. Onay token'ından
 * ayrı bir "amaç" (purpose) öneki kullanır, böylece confirm token'ı unsubscribe
 * için (veya tersi) yeniden kullanılamaz. CAN-SPAM gereği unsubscribe linki
 * süresiz çalışmalı, bu yüzden son kullanma tarihi içermez.
 * Anahtar yoksa null döner (çağıran taraf eski/no-op davranışına düşer).
 */
export function signUnsubToken(email: string): string | null {
  const secret = newsletterSecret();
  if (!secret) return null;
  const payload = b64url(Buffer.from(`unsub|${email}`, "utf8"));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/** Unsubscribe token'ı doğrular; geçerliyse email döner, aksi halde null. */
export function verifyUnsubToken(token: string | null | undefined): string | null {
  const secret = newsletterSecret();
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = b64url(createHmac("sha256", secret).update(payload).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let decoded: string;
  try {
    decoded = fromB64url(payload).toString("utf8");
  } catch {
    return null;
  }
  if (!decoded.startsWith("unsub|")) return null;
  const email = decoded.slice("unsub|".length);
  if (!email.includes("@")) return null;
  return email;
}
