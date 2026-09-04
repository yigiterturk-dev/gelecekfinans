import { Resend } from "resend";
import { hasNewsletterSecret, signUnsubToken } from "@/lib/newsletter";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

/** Mail sağlayıcısı veya imza anahtarı yoksa gönderim fail-closed davranır. */
export function mailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY && hasNewsletterSecret();
}

const FROM = process.env.MAIL_FROM || "GelecekFinans <bulten@gelecekfinans.com>";
const BASE = process.env.SITE_URL || "https://gelecekfinans.com";

/**
 * Alıcıya özel abonelikten çıkma URL'i. Yalnızca imzalı token kullanır;
 * secret yoksa URL üretmez ve gönderim yapılmaz.
 */
function unsubUrl(email: string): string | null {
  const token = signUnsubToken(email);
  return token
    ? `${BASE}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
    : null;
}

interface ArticleSummary {
  title: string;
  slug: string;
  meta: string;
  category: string;
}

function digestHtml(
  articles: ArticleSummary[],
  today: string,
  opts: { campaignId?: string; variant?: "A" | "B" } = {}
): string {
  const articleHtml = articles
    .map(
      (a) => `
      <tr>
        <td style="padding:16px 0;border-bottom:1px solid #f0f0f0">
          <span style="font-size:10px;color:#0f3d6b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">${a.category.toUpperCase()}</span>
          <a href="${BASE}/${a.slug}" style="display:block;font-size:16px;font-weight:700;color:#111;text-decoration:none;margin-top:4px;line-height:1.4">${a.title}</a>
          <p style="font-size:13px;color:#666;margin-top:6px;line-height:1.5">${a.meta}</p>
        </td>
      </tr>`
    )
    .join("");

  // Açılma takip pikseli (A/B kampanyaları için)
  const tracker =
    opts.campaignId && opts.variant
      ? `<img src="${BASE}/api/newsletter/open?c=${encodeURIComponent(opts.campaignId)}&v=${opts.variant}" width="1" height="1" alt="" style="display:none" />`
      : "";

  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:100%">
        <tr><td style="background:#0f3d6b;padding:24px 32px;text-align:center">
          <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.02em">Gelecek</span><span style="font-size:22px;font-weight:800;color:#7fb0e3;letter-spacing:-0.02em">Finans</span>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="font-size:13px;color:#888;margin:0 0 4px">${today}</p>
          <h1 style="font-size:20px;color:#111;margin:0 0 24px;font-weight:800">Günlük Finans Bülteni</h1>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${articleHtml}
          </table>
          <div style="text-align:center;margin-top:28px">
            <a href="${BASE}" style="display:inline-block;padding:12px 28px;background:#0f3d6b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Tüm Haberleri Oku</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e5e5e5;text-align:center">
          <p style="font-size:11px;color:#999;margin:0">Bu e-postayı ${BASE} üzerinden abone olduğunuz için alıyorsunuz.</p>
          <a href="{{unsub}}" style="font-size:11px;color:#0f3d6b;text-decoration:underline">Abonelikten çık</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
  ${tracker}
</body>
</html>`;
}

/** Son gönderimin sonucu — çağıran taraf kayda düşebilsin diye. */
export interface BatchResult {
  sent: number;
  failed: number;
  /** İlk birkaç hata sebebi; kayda düşmek için (tamamı değil, kısa tutulur). */
  reasons: string[];
}

export let lastBatchResult: BatchResult = { sent: 0, failed: 0, reasons: [] };

async function sendBatch(
  recipients: string[],
  subject: string,
  html: string
): Promise<number> {
  const client = getResend();
  if (!client || !hasNewsletterSecret()) {
    console.log(`[mail] Mail yapılandırması eksik — ${recipients.length} alıcıya gönderim atlandı.`);
    lastBatchResult = {
      sent: 0,
      failed: recipients.length,
      reasons: ["mail yapılandırması eksik (RESEND_API_KEY / NEWSLETTER_SECRET)"],
    };
    return 0;
  }
  let sent = 0;
  let failed = 0;
  const reasons: string[] = [];
  const not = (sebep: string) => {
    failed++;
    if (reasons.length < 3 && !reasons.includes(sebep)) reasons.push(sebep);
  };

  const BATCH_SIZE = 50;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((email) =>
        client.emails
          .send({
            from: FROM,
            to: email,
            subject,
            html: html.replace("{{unsub}}", unsubUrl(email)!),
          })
          .then((res) => {
            /**
             * 🔴 Resend SDK API hatasında EXCEPTION FIRLATMAZ; `{ data, error }`
             * döndürür. Eski kod `.then()` içinde koşulsuz `sent++` yapıyordu —
             * yani alan adı doğrulanmamış, kota dolmuş ya da adres reddedilmiş
             * gönderimler BAŞARILI sayılıyordu. Rapor "gönderildi" derken
             * kimseye mail gitmemiş olabilirdi.
             */
            const hata = (res as { error?: { message?: string; name?: string } } | null)?.error;
            if (hata) {
              not(hata.name || hata.message || "bilinmeyen Resend hatası");
              console.error(`[mail] Resend reddetti (${email}):`, hata);
              return;
            }
            sent++;
          })
          .catch((err) => {
            not((err as Error)?.message?.slice(0, 80) || "istek başarısız");
            console.error(`[mail] send failed for ${email}:`, err);
          })
      )
    );
  }
  lastBatchResult = { sent, failed, reasons };
  return sent;
}

/** Geriye dönük uyumlu basit günlük digest (tek konu satırı). */
export async function sendDailyDigest(emails: string[], articles: ArticleSummary[]): Promise<number> {
  if (emails.length === 0 || articles.length === 0) return 0;
  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const html = digestHtml(articles, today);
  return sendBatch(emails, `GelecekFinans Günlük Bülten — ${today}`, html);
}

export interface SegmentDigestOptions {
  emails: string[];
  articles: ArticleSummary[];
  subjectA: string;
  subjectB?: string;
  campaignId?: string;
}

export interface SegmentDigestResult {
  recipients: number;
  recipientsA: number;
  recipientsB: number;
  sentA: number;
  sentB: number;
}

/**
 * Segment hedefli + A/B konu satırı testli digest.
 * subjectB verilirse alıcılar deterministik (email karakter toplamı) olarak
 * iki gruba bölünür; her gruba açılma takip pikseli gömülür.
 */
export async function sendSegmentDigest(
  opts: SegmentDigestOptions
): Promise<SegmentDigestResult> {
  const { emails, articles, subjectA, subjectB, campaignId } = opts;
  const empty: SegmentDigestResult = {
    recipients: emails.length,
    recipientsA: 0,
    recipientsB: 0,
    sentA: 0,
    sentB: 0,
  };
  if (emails.length === 0 || articles.length === 0) return empty;

  const today = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  if (!subjectB) {
    const html = digestHtml(articles, today, campaignId ? { campaignId, variant: "A" } : {});
    const sentA = await sendBatch(emails, subjectA, html);
    return { ...empty, recipientsA: emails.length, sentA };
  }

  // Deterministik A/B bölme
  const groupA: string[] = [];
  const groupB: string[] = [];
  for (const e of emails) {
    let sum = 0;
    for (let i = 0; i < e.length; i++) sum += e.charCodeAt(i);
    (sum % 2 === 0 ? groupA : groupB).push(e);
  }

  const htmlA = digestHtml(articles, today, { campaignId, variant: "A" });
  const htmlB = digestHtml(articles, today, { campaignId, variant: "B" });
  const [sentA, sentB] = await Promise.all([
    sendBatch(groupA, subjectA, htmlA),
    sendBatch(groupB, subjectB, htmlB),
  ]);

  return {
    recipients: emails.length,
    recipientsA: groupA.length,
    recipientsB: groupB.length,
    sentA,
    sentB,
  };
}

/** Double opt-in onay maili. Yapılandırma eksikse false döner. */
export async function sendOptInConfirmation(email: string, token: string): Promise<boolean> {
  const confirmUrl = `${BASE}/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const client = getResend();
  if (!client || !hasNewsletterSecret()) return false;
  const html = `
<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"></head>
<body style="font-family:system-ui;background:#f5f5f5;padding:24px">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#0f3d6b;padding:20px 28px;text-align:center">
        <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.02em">Gelecek</span><span style="font-size:20px;font-weight:800;color:#7fb0e3;letter-spacing:-0.02em">Finans</span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="font-size:18px;color:#111">Aboneliğinizi onaylayın</h1>
        <p style="font-size:14px;color:#555;line-height:1.6">GelecekFinans bültenine kaydolduğunuz için teşekkürler. Almaya başlamak için aşağıdaki butona tıklayın.</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${confirmUrl}" style="display:inline-block;padding:12px 28px;background:#0f3d6b;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Aboneliği Onayla</a>
        </div>
        <p style="font-size:11px;color:#999">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  try {
    const res = await client.emails.send({
      from: FROM,
      to: email,
      subject: "GelecekFinans — Aboneliğinizi onaylayın",
      html,
    });
    // Resend API hatasında fırlatmaz, `{ error }` döndürür (bkz. sendBatch).
    // Kontrol edilmezse gönderilemeyen onay maili "gönderildi" sayılır ve
    // abone neden onay maili almadığını kimse anlamaz.
    const hata = (res as { error?: { message?: string; name?: string } } | null)?.error;
    if (hata) {
      console.error("[mail] onay maili reddedildi:", hata);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail] onay maili gönderilemedi:", e);
    return false;
  }
}
