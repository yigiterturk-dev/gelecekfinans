import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubToken } from "@/lib/newsletter";

export async function GET(req: NextRequest) {
  // Tercih edilen yol: imzalı token (IDOR'a kapalı — yalnızca kendi adresini iptal edebilirsin).
  const token = req.nextUrl.searchParams.get("token");
  const email = verifyUnsubToken(token);

  if (!email) {
    return new Response(
      `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Geçersiz Bağlantı</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;background:#fff;padding:40px;border-radius:12px;max-width:420px">
<h1 style="font-size:20px;color:#dc2626">Bağlantı geçersiz</h1>
<p style="color:#666;font-size:14px">Abonelikten çıkma bağlantısı geçersiz veya eksik.</p>
<a href="https://gelecekfinans.com" style="color:#c73030;font-size:13px">Ana sayfaya dön</a>
</div></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  await prisma.subscriber.updateMany({
    where: { email },
    data: { active: false },
  });

  return new Response(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Abonelik İptal</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;background:#fff;padding:40px;border-radius:12px;max-width:400px">
<h1 style="font-size:20px;color:#111">Aboneliğiniz iptal edildi</h1>
<p style="color:#666;font-size:14px">Artık GelecekFinans bültenlerini almayacaksınız.</p>
<a href="https://gelecekfinans.com" style="color:#c73030;font-size:13px">Ana sayfaya dön</a>
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
