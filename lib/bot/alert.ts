import { Resend } from "resend";

/**
 * Operasyon alarmı.
 *
 * Bot 7-10 Ağustos 2026 arasında dört gün boyunca "OpenAI kredisi tükendi"
 * hatasıyla her sabah sessizce öldü ve kimse fark etmedi; site tek makaleyle
 * kaldı. Ölümcül bir yapılandırma hatası (kredi bitti, model bulunamadı,
 * anahtar geçersiz) tek bir koşuyu değil bütün yayın akışını durdurduğu için
 * insana haber vermek zorunda.
 *
 * Alarm gönderimi asla akışı bozmamalı: her hata yutulur, yalnızca loglanır.
 */

const FROM = process.env.MAIL_FROM || "GelecekFinans <bulten@gelecekfinans.com>";
const TO = process.env.ALERT_EMAIL || "sales@nocturndev.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export interface BotAlert {
  /** Kısa başlık, ör. "Yazar modeli çağrılamıyor". */
  title: string;
  /** Ölümcül hata kodu (AIProviderFatalError.code) ya da null. */
  code?: string | null;
  /** Koşudan toplanan hata satırları. */
  errors?: string[];
  runId?: string;
  /** O koşuda kaç makale eklendi (0 ise akış tamamen durmuş demektir). */
  added?: number;
}

export async function sendBotAlert(alert: BotAlert): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const summary = [
    alert.code ? `Kod: ${alert.code}` : null,
    alert.runId ? `Koşu: ${alert.runId}` : null,
    `Eklenen makale: ${alert.added ?? 0}`,
    ...(alert.errors || []).slice(0, 10),
  ]
    .filter(Boolean)
    .join("\n");

  if (!key) {
    console.error(`[bot-alert] RESEND_API_KEY yok — mail atlandı. ${alert.title}\n${summary}`);
    return false;
  }

  try {
    await new Resend(key).emails.send({
      from: FROM,
      to: TO,
      subject: `GelecekFinans bot durdu: ${alert.title}`,
      html:
        `<h2>Yayın akışı durdu</h2>` +
        `<p><strong>${escapeHtml(alert.title)}</strong></p>` +
        `<pre style="background:#f4f4f5;padding:12px;border-radius:6px;white-space:pre-wrap">${escapeHtml(summary)}</pre>` +
        `<p>Bot durumu: <a href="https://gelecekfinans.com/sys-k3m8p/bot">yönetim paneli</a></p>`,
    });
    return true;
  } catch (error) {
    console.error(`[bot-alert] gönderilemedi: ${(error as Error).message}`);
    return false;
  }
}
