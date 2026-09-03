/**
 * Google'a "bu adres güncellendi" bildirimi (Web Search Indexing API).
 *
 * Neden var: sitenin en iyi sıralayan sayfası (`…egem-eraslan-acikladi`)
 * Ağustos'ta silinmiş, 1 Eylül'de `sayfa-kurtar` ile geri getirilmişti — ama
 * Google'ın kaydı 30 Ağustos taramasından kalma 404'te takılı kaldı. Sayfa
 * canlı, sıralaması duruyor, trafiği karşılayan yok. Aynısı sitemap'teki 23
 * "URL is unknown to Google" adresi için de geçerli: yeni alan adının tarama
 * bütçesi yetmiyor.
 *
 * GSC panelinden tek tek "dizine ekleme isteği" tıklamak bunu ölçeklemiyor;
 * bildirim yayın anında otomatik gitmeli.
 *
 * ⚠️ Kurulum: GCP projesinde "Web Search Indexing API" açık olmalı ve servis
 * hesabı GSC'de mülkün SAHİBİ (owner) olarak ekli olmalı. Açık değilse çağrı
 * 403 döner; bu hata bilerek YUTULUR — makale zaten kaydedildi, bildirim
 * tutmadı diye yayın geri alınmaz.
 *
 * Kota: günde 200 bildirim (varsayılan).
 */
import { google } from "googleapis";

export type IndexingPingResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "api-disabled" | "forbidden" | "error"; detail?: string };

function indexingClient() {
  const email = process.env.GSC_CLIENT_EMAIL;
  const key = process.env.GSC_PRIVATE_KEY;
  if (!email || !key) return null;
  const auth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  return google.indexing({ version: "v3", auth });
}

/** Tek adresi Google'a bildirir. Hata fırlatmaz; sonucu döner. */
export async function notifyGoogleUrlUpdated(url: string): Promise<IndexingPingResult> {
  const client = indexingClient();
  if (!client) return { ok: false, reason: "not-configured" };
  try {
    await client.urlNotifications.publish({ requestBody: { url, type: "URL_UPDATED" } });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = (error as { code?: number }).code;
    if (status === 403 && /has not been used in project|is disabled/i.test(message)) {
      return { ok: false, reason: "api-disabled", detail: message.slice(0, 200) };
    }
    if (status === 403) return { ok: false, reason: "forbidden", detail: message.slice(0, 200) };
    return { ok: false, reason: "error", detail: message.slice(0, 200) };
  }
}
