import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendDailyDigest, lastBatchResult } from "@/lib/mail";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  // Secret yapılandırılmamışsa "Bearer undefined" ile bypass'ı önle (fail-closed).
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [subscribers, articles] = await Promise.all([
    prisma.subscriber.findMany({ where: { active: true, confirmed: true }, select: { email: true } }),
    prisma.article.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: { title: true, slug: true, meta: true, category: true },
    }),
  ]);

  /**
   * ⚠️ Bu koşum 4 Eylül'e kadar HİÇBİR kayıt bırakmıyordu: bülten gidiyor mu,
   * kaç kişiye gidiyor, hata mı alıyor — dışarıdan görmenin yolu yoktu.
   * Aynı gün üç ayrı "sessiz ray" bulunduktan sonra buraya da kayıt kondu.
   * Kayıt yazımı gönderimi etkilemez; hatası yutulur.
   */
  const kaydet = async (message: string, metadata: object, level = "info") => {
    try {
      await prisma.automationEvent.create({ data: { stage: "newsletter", level, message, metadata } });
    } catch (e) {
      console.error("[newsletter] olay kaydı yazılamadı:", e);
    }
  };

  if (subscribers.length === 0 || articles.length === 0) {
    const reason = articles.length === 0 ? "yayınlanmış yeni makale yok" : "onaylı abone yok";
    await kaydet(`Bülten atlandı: ${reason}`, {
      subscribers: subscribers.length,
      articles: articles.length,
    });
    return NextResponse.json({ sent: 0, reason: articles.length === 0 ? "no articles" : "no subscribers" });
  }

  const emails = subscribers.map((s) => s.email);
  const sent = await sendDailyDigest(emails, articles);
  const { failed, reasons } = lastBatchResult;

  await kaydet(
    failed > 0 ? `Bülten kısmen gönderildi: ${sent} başarılı, ${failed} başarısız` : `Bülten gönderildi: ${sent} alıcı`,
    { sent, failed, reasons, recipients: emails.length, articles: articles.length },
    failed > 0 ? "warning" : "info",
  );

  return NextResponse.json({ sent, failed, recipients: emails.length, articles: articles.length });
}
