import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizePreferences, signOptInToken, hasNewsletterSecret } from "@/lib/newsletter";
import { mailEnabled, sendOptInConfirmation } from "@/lib/mail";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hizFreniPaylasimli } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  // Rate limit: IP başına dakikada 5 abonelik denemesi.
  const ip = clientIp(req);
  // Sayac VERITABANINDA: Vercel'de her instance kendi bellegini tutar,
  // dolayisiyla surec-ici sayac sinirlari instance sayisi kadar gevsetirdi.
  // DB erisilemezse surec-ici sayaca duser (fail-open, bilincli).
  const rl = await hizFreniPaylasimli(`newsletter:${ip}`, 5, 60_000, () =>
    rateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 60_000 })
  );
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const { email, preferences, source } = (body || {}) as {
    email?: unknown;
    preferences?: unknown;
    source?: unknown;
  };

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "Geçersiz email" }, { status: 400 });
  }

  const prefs = sanitizePreferences(preferences);
  const safeSource =
    typeof source === "string" ? source.slice(0, 40).replace(/[^\w-]/g, "") : "site-form";

  if (!hasNewsletterSecret() || !mailEnabled()) {
    return NextResponse.json(
      { error: "Bülten teslimatı yapılandırılmamış" },
      { status: 503 }
    );
  }

  try {
    // Çift-onay: yeni veya doğrulanmamış aboneler confirmed=false kalır.
    await prisma.subscriber.upsert({
      where: { email: normalizedEmail },
      update: {
        active: true,
        confirmed: false,
        confirmedAt: null,
        preferences: prefs,
        source: safeSource || "site-form",
      },
      create: {
        email: normalizedEmail,
        preferences: prefs,
        source: safeSource || "site-form",
        confirmed: false,
      },
    });

    // Double opt-in: imzalı token ile onay maili gönder (env-gated).
    const token = signOptInToken(normalizedEmail);
    if (!token) {
      return NextResponse.json({ error: "Onay bağlantısı üretilemedi" }, { status: 503 });
    }
    const confirmationSent = await sendOptInConfirmation(normalizedEmail, token);
    if (!confirmationSent) {
      return NextResponse.json({ error: "Onay e-postası gönderilemedi" }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      requiresConfirmation: true,
      confirmationSent,
    }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
