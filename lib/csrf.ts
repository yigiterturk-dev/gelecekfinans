/**
 * Aynı köken (same-origin) kapısı — durum değiştiren admin uçları için.
 *
 * Neden var: 2026-09-09 nocturn-audit taraması `app/api/admin/upload-image`
 * için "State-changing route has no CSRF protection" dedi ve haklıydı —
 * 11 admin ucunun HİÇBİRİNDE köken kontrolü yoktu. Oturum çerezi NextAuth
 * varsayılanıyla SameSite=Lax olduğu için klasik form CSRF'i zaten
 * engelleniyor; bu katman onun üstüne konan ikinci kilit. Tek bir çerez
 * ayarının (ya da ileride bir sürümün) değişmesi bütün admin yüzeyini
 * açmasın diye kapı kodda duruyor.
 *
 * ⚠️ Tasarım kararı: Origin/Referer YOKSA istek REDDEDİLMEZ. Tarayıcı
 * durum değiştiren isteklerde Origin'i her zaman gönderir; göndermeyenler
 * curl, cron ve sunucu-sunucu çağrılarıdır ve onlar zaten oturum çerezi
 * taşımaz. Yoklukta reddetmek Vercel Cron çağrılarını ve elle bakım
 * scriptlerini kırardı — güvenlik kazancı olmadan.
 */
import { NextRequest, NextResponse } from "next/server";

/** İsteğin geldiği kökeni Origin, yoksa Referer başlığından çıkarır. */
function istekKokeni(req: NextRequest): string | null {
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null; // Bozuk Origin başlığı = güvenilmez, reddedilir.
    }
  }
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }
  return null;
}

/** Sunucunun kendi kökeni — proxy arkasında Host başlığından türetilir. */
function sunucuKokeni(req: NextRequest): string | null {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
}

/**
 * Farklı kökenden gelen durum değiştiren istekleri reddeder.
 *
 * @returns Reddedilecekse hazır 403 yanıtı, sorun yoksa `null`.
 */
export function farkliKokenReddi(req: NextRequest): NextResponse | null {
  const gelen = istekKokeni(req);
  if (gelen === null) {
    // Origin ve Referer yok: tarayıcı değil. Bkz. yukarıdaki tasarım kararı.
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    // Başlık VARDI ama ayrıştırılamadıysa bu bir tarayıcı isteği olamaz, reddet.
    if (origin !== null || referer !== null) {
      return NextResponse.json({ error: "Geçersiz istek kökeni." }, { status: 403 });
    }
    return null;
  }

  const beklenen = sunucuKokeni(req);
  if (beklenen === null) return null; // Host okunamıyorsa karar veremeyiz, akışı bozma.
  if (gelen === beklenen) return null;

  return NextResponse.json({ error: "Geçersiz istek kökeni." }, { status: 403 });
}
