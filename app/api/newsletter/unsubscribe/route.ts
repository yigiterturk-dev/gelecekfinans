import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { REVOKED_OPT_IN_TOKEN_HASH, verifyUnsubToken } from "@/lib/newsletter";

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const MAX_POST_BYTES = 4096;

function page(title: string, message: string, form?: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5">
<main style="text-align:center;background:#fff;padding:40px;border-radius:12px;max-width:420px">
<h1 style="font-size:20px;color:${status === 200 ? "#111" : "#dc2626"}">${title}</h1>
<p style="color:#666;font-size:14px">${message}</p>${form ?? ""}
<a href="https://gelecekfinans.com" style="color:#c73030;font-size:13px">Ana sayfaya dön</a>
</main></body></html>`,
    { status, headers: { ...NO_STORE, "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function hasOneClickBody(req: NextRequest): Promise<boolean> {
  const contentType = req.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/x-www-form-urlencoded" && contentType !== "multipart/form-data") return false;
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_POST_BYTES) return false;
  if (!req.body) return false;

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_POST_BYTES) {
        await reader.cancel();
        return false;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const headers = new Headers({ "content-type": req.headers.get("content-type")! });
    const boundedRequest = new Request(req.url, { method: "POST", headers, body: bytes });
    const form = await boundedRequest.formData();
    return form.get("List-Unsubscribe") === "One-Click";
  } catch {
    await reader.cancel().catch(() => {});
    return false;
  }
}

export async function GET(req: NextRequest) {
  // GET is intentionally read-only so mail-security link scanners cannot unsubscribe users.
  const token = req.nextUrl.searchParams.get("token");
  if (!verifyUnsubToken(token)) {
    return page("Bağlantı geçersiz", "Abonelikten çıkma bağlantısı geçersiz veya eksik.", undefined, 400);
  }
  const safeToken = encodeURIComponent(token!);
  const form = `<form method="post" action="/api/newsletter/unsubscribe?token=${safeToken}" style="margin:24px 0"><input type="hidden" name="List-Unsubscribe" value="One-Click"><button type="submit" style="padding:12px 20px;border:0;border-radius:6px;background:#c73030;color:#fff;font:inherit;cursor:pointer">Abonelikten çık</button></form>`;
  return page("Abonelikten çık", "Bülten e-postalarını almayı durdurmak için onaylayın.", form);
}

export async function POST(req: NextRequest) {
  const email = verifyUnsubToken(req.nextUrl.searchParams.get("token"));
  if (!email || !(await hasOneClickBody(req))) {
    return new Response("Geçersiz abonelikten çıkma isteği.", {
      status: 400,
      headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    await prisma.subscriber.updateMany({
      where: { email },
      data: { active: false, confirmationTokenHash: REVOKED_OPT_IN_TOKEN_HASH },
    });
  } catch {
    return new Response("Abonelikten çıkma işlemi şu anda tamamlanamıyor.", {
      status: 503,
      headers: {
        ...NO_STORE,
        "Retry-After": "30",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  // RFC 8058 requires a direct successful response; do not redirect this POST.
  return new Response("Abonelikten çıkıldı.", {
    status: 200,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}
