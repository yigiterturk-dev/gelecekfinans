import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizePreferences, signOptInToken, hashOptInToken, hasNewsletterSecret } from "@/lib/newsletter";
import { mailEnabled, sendOptInConfirmation } from "@/lib/mail";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hizFreniPaylasimli } from "@/lib/rate-limit-store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY_BYTES = 8 * 1024;
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };

async function readJsonLimited(req: NextRequest): Promise<{ body: unknown } | { error: "too-large" | "invalid" }> {
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return { error: "too-large" };
  if (!req.body) return { error: "invalid" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { error: "too-large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    await reader.cancel().catch(() => {});
    return { error: "invalid" };
  }
}

export async function POST(req: NextRequest) {
  // Rate limit: IP başına dakikada 5 abonelik denemesi.
  const ip = clientIp(req);
  // Sayac VERITABANINDA: Vercel'de her instance kendi bellegini tutar,
  // dolayisiyla surec-ici sayac sinirlari instance sayisi kadar gevsetirdi.
  // Bellek yedeği diğer rotalarda kullanılabilir; e-posta gönderen bu uç
  // paylaşımlı sayacın çalıştığı doğrulanmadan devam etmez.
  const rl = await hizFreniPaylasimli(`newsletter:${ip}`, 5, 60_000, () =>
    rateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 60_000 })
  );
  if (rl.kaynak !== "db") {
    return NextResponse.json(
      { error: "Bülten koruması geçici olarak kullanılamıyor. Lütfen biraz sonra tekrar deneyin." },
      { status: 503, headers: { ...PRIVATE_HEADERS, "Retry-After": "30" } },
    );
  }
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." },
      { status: 429, headers: { ...PRIVATE_HEADERS, "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const parsed = await readJsonLimited(req);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error === "too-large" ? "İstek çok büyük." : "Geçersiz istek" },
      { status: parsed.error === "too-large" ? 413 : 400, headers: PRIVATE_HEADERS }
    );
  }
  const body = parsed.body;

  const { email, preferences, source } = (body || {}) as {
    email?: unknown;
    preferences?: unknown;
    source?: unknown;
  };

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || normalizedEmail.length > 254 || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "Geçersiz email" }, { status: 400, headers: PRIVATE_HEADERS });
  }

  const prefs = sanitizePreferences(preferences);
  const safeSource =
    typeof source === "string" ? source.slice(0, 40).replace(/[^\w-]/g, "") : "site-form";

  if (!hasNewsletterSecret() || !mailEnabled()) {
    return NextResponse.json(
      { error: "Bülten teslimatı yapılandırılmamış" },
      { status: 503, headers: PRIVATE_HEADERS }
    );
  }

  try {
    const safeSourceValue = safeSource || "site-form";
    const token = signOptInToken(normalizedEmail);
    if (!token) {
      return NextResponse.json({ error: "Onay bağlantısı üretilemedi" }, { status: 503, headers: PRIVATE_HEADERS });
    }
    const confirmationTokenHash = hashOptInToken(token);

    // Aktif ve daha önce onaylanmış abonelerin durumu, yeniden onay e-postası
    // gönderilemese bile korunmalı. Pasif/yeni/doğrulanmamış kayıtlar ise
    // aşağıdaki çift-onay akışında onaysız kalır.
    const existingConfirmed = await prisma.subscriber.updateMany({
      where: { email: normalizedEmail, active: true, confirmed: true },
      data: {
        preferences: prefs,
        source: safeSourceValue,
        confirmationTokenHash,
      },
    });
    if (existingConfirmed.count === 0) {
      await prisma.subscriber.upsert({
        where: { email: normalizedEmail },
        update: {
          active: true,
          confirmed: false,
          confirmedAt: null,
          confirmationTokenHash,
          preferences: prefs,
          source: safeSourceValue,
        },
        create: {
          email: normalizedEmail,
          preferences: prefs,
          source: safeSourceValue,
          confirmed: false,
          confirmationTokenHash,
        },
      });
    }

    // Double opt-in: imzalı token ile onay maili gönder (env-gated).
    const confirmationSent = await sendOptInConfirmation(normalizedEmail, token);
    if (!confirmationSent) {
      return NextResponse.json({ error: "Onay e-postası gönderilemedi" }, { status: 502, headers: PRIVATE_HEADERS });
    }

    return NextResponse.json({
      ok: true,
      requiresConfirmation: true,
      confirmationSent,
    }, { status: 202, headers: PRIVATE_HEADERS });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500, headers: PRIVATE_HEADERS });
  }
}
