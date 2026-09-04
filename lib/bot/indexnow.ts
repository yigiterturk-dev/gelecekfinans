/**
 * IndexNow bildirimi — Bing, Yandex, Seznam ve Naver'a "bu adres değişti".
 *
 * Neden var: Google tarafında Indexing API bağlıydı ama diğer arama
 * motorlarına hiçbir sinyal gitmiyordu. 2026-09-04 indeks taramasında
 * sitemap'in 85 adresinin 37'si "unknown to Google" çıktı; aynı keşif
 * sorunu Bing'de de yaşanıyor ve orada çözümü bedava: IndexNow hesap,
 * kota ve OAuth istemez, tek şart anahtarın site kökünde yayımlanması.
 *
 * Anahtar `public/<anahtar>.txt` içinde duruyor ve içeriği anahtarın
 * kendisi. Arama motoru bildirimi alınca o dosyayı okuyup adresin
 * gerçekten bu sitenin sahibinden geldiğini doğruluyor.
 *
 * ⚠️ Hata YUTULUR (Google bildirimindeki kararla aynı): makale zaten
 * kaydedildi, bildirim tutmadı diye yayın geri alınmaz.
 */

const ENDPOINT = "https://api.indexnow.org/indexnow";

export type IndexNowResult =
  | { ok: true; count: number }
  | { ok: false; reason: "not-configured" | "rejected" | "error"; detail?: string };

function config() {
  const key = process.env.INDEXNOW_KEY;
  const site = process.env.SITE_URL || "https://gelecekfinans.com";
  if (!key) return null;
  return { key, site, host: new URL(site).host };
}

/**
 * Bir veya daha çok adresi bildirir. IndexNow tek istekte 10.000 adrese
 * izin veriyor; bu sitenin sitemap'i o sınırın çok altında olduğu için
 * parçalamaya gerek yok.
 */
export async function notifyIndexNow(urls: string[]): Promise<IndexNowResult> {
  const cfg = config();
  if (!cfg) return { ok: false, reason: "not-configured" };
  const list = urls.filter((u) => u.startsWith(cfg.site));
  if (list.length === 0) return { ok: true, count: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      signal: controller.signal,
      body: JSON.stringify({
        host: cfg.host,
        key: cfg.key,
        keyLocation: `${cfg.site}/${cfg.key}.txt`,
        urlList: list,
      }),
    });
    // 200 = alındı, 202 = alındı ama anahtar doğrulaması beklemede.
    if (res.status === 200 || res.status === 202) return { ok: true, count: list.length };
    return { ok: false, reason: "rejected", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, reason: "error", detail: (e as Error).message.slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}
