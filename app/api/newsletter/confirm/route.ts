import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashOptInToken, verifyOptInToken } from "@/lib/newsletter";

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function html(title: string, body: string, ok: boolean, form = "", status?: number) {
  return new Response(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;background:#fff;padding:40px;border-radius:12px;max-width:420px">
<h1 style="font-size:20px;color:${ok ? "#16a34a" : "#dc2626"}">${title}</h1>
<p style="color:#666;font-size:14px">${body}</p>${form}
<a href="https://gelecekfinans.com" style="color:#c73030;font-size:13px">Ana sayfaya dön</a>
</div></body></html>`,
    { status: status ?? (ok ? 200 : 400), headers: { ...PRIVATE_HEADERS, "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const email = verifyOptInToken(token);

  if (!email) {
    return html("Onay başarısız", "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar abone olun.", false);
  }

  const safeToken = encodeURIComponent(token!);
  const form = `<form method="post" action="/api/newsletter/confirm?token=${safeToken}" style="margin:24px 0"><button type="submit" style="padding:12px 20px;border:0;border-radius:6px;background:#0f3d6b;color:#fff;font:inherit;cursor:pointer">Bülten aboneliğini onayla</button></form>`;
  return html("Aboneliği onayla", "Bülten e-postalarını almak için onayınızı tamamlayın.", true, form);
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = verifyOptInToken(token);
  if (!email) {
    return html("Onay başarısız", "Bağlantı geçersiz veya süresi dolmuş. Lütfen tekrar abone olun.", false);
  }

  try {
    // Null fingerprint is the compatibility path for confirmation mails sent
    // before the fingerprint column existed; it is consumed by this update.
    const result = await prisma.subscriber.updateMany({
      where: {
        email,
        OR: [
          { confirmationTokenHash: hashOptInToken(token!) },
          { confirmationTokenHash: null, confirmed: false },
        ],
      },
      data: {
        active: true,
        confirmed: true,
        confirmedAt: new Date(),
        confirmationTokenHash: null,
      },
    });
    if (result.count === 0) {
      return html("Onay tamamlanamadı", "Abonelik kaydı bulunamadı. Lütfen yeniden abone olun.", false, "", 410);
    }
  } catch {
    return html("Onay şu anda tamamlanamıyor", "Geçici bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.", false, "", 503);
  }

  return html("Aboneliğiniz onaylandı", "Artık GelecekFinans bültenlerini alacaksınız. Teşekkürler!", true);
}
