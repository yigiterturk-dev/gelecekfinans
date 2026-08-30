/**
 * Google Haberler RSS'i asıl haberin adresini değil kendi yönlendirme linkini
 * verir (`news.google.com/rss/articles/CBMi...`). Bu link boru hattında iki
 * kapıyı birden kapatıyordu:
 *
 *  1. `scoreSource` domaini `news.google.com` görüp 58 puan veriyor, karar
 *     eşiği 75 olduğu için hiçbir makale AUTO_PUBLISH'e geçemiyordu.
 *  2. `fetchEvidenceContent` bu domaini atladığı için elimizde yalnızca RSS
 *     özeti kalıyor, kanıt metni 800 karakter eşiğinin altında kalıp konu
 *     yazara hiç ulaşmıyordu.
 *
 * Yönlendirme linki HTTP 3xx ile açılmıyor; asıl adres Google'ın kendi
 * `batchexecute` uç noktasından, makale sayfasındaki imza (`data-n-a-sg`) ve
 * zaman damgası (`data-n-a-ts`) ile isteniyor. Çözüm başarısız olursa çağıran
 * taraf null alır ve eski davranışa döner: hiçbir şey kırılmaz, sadece o konu
 * eskisi gibi elenir.
 */

const GOOGLE_NEWS_HOST = "news.google.com";
const BATCH_ENDPOINT = "https://news.google.com/_/DotsSplashUi/data/batchexecute";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Her çözümleme bir sayfa indirmesi + bir POST demek. Cron işi 300 saniyeye
 * sığmak zorunda olduğu için koşum başına üst sınır konur; sınır dolunca
 * kalan konular sessizce eski yoldan (RSS özeti) devam eder.
 */
const MAX_RESOLUTIONS_PER_RUN = Number(process.env.GOOGLE_NEWS_MAX_RESOLUTIONS) || 24;
const CACHE_LIMIT = 500;

const cache = new Map<string, string | null>();
let remainingBudget = MAX_RESOLUTIONS_PER_RUN;

export function resetGoogleNewsBudget(): void {
  remainingBudget = MAX_RESOLUTIONS_PER_RUN;
}

export function isGoogleNewsUrl(url?: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, "") === GOOGLE_NEWS_HOST;
  } catch {
    return false;
  }
}

/** `/rss/articles/<id>` veya `/articles/<id>` yolundan makale kimliğini alır. */
export function googleNewsArticleId(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/articles\/([^/?#]+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

/** Makale sayfasındaki imza + zaman damgası çifti; ikisi de yoksa istek reddedilir. */
export function extractSignature(html: string): { ts: string; sg: string } | null {
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  return ts && sg ? { ts, sg } : null;
}

/** batchexecute yanıtı kaçışlı JSON yığınıdır; içinden Google dışı ilk adresi alırız. */
export function extractResolvedUrl(payload: string): string | null {
  // Yanıt kaçışlı JSON içinde geldiği için önce `\/` dizileri düzeltilir,
  // yoksa adres ilk ters bölü işaretinde kesilir.
  const unescaped = payload.replace(/\\\//g, "/");
  const matches = unescaped.match(/https?:\/\/[^"\\\s]+/g) || [];
  for (const url of matches) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      if (host === GOOGLE_NEWS_HOST || host.endsWith("google.com") || host.endsWith("gstatic.com")) continue;
      return url;
    } catch {
      continue;
    }
  }
  return null;
}

function buildRequestBody(articleId: string, ts: string, sg: string): string {
  const inner = JSON.stringify([
    "garturlreq",
    [
      ["tr", "TR", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], null, null, 1, 1, "TR:tr", null, 180,
        null, null, null, null, null, 0, null, null, [1608992183, 723341000]],
      "tr", "TR", 1, [2, 3, 4, 8], 1, 0, "655000234", 0, 0, null, 0,
    ],
    articleId,
    ts,
    sg,
  ]);
  return new URLSearchParams({
    "f.req": JSON.stringify([[["Fbv4je", inner, null, "generic"]]]),
  }).toString();
}

function remember(url: string, resolved: string | null): string | null {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, resolved);
  return resolved;
}

/**
 * Google Haberler yönlendirme linkini yayıncının asıl haber adresine çevirir.
 * Google dışı bir link verilirse olduğu gibi döner; çözülemezse null.
 */
export async function resolveGoogleNewsUrl(url: string): Promise<string | null> {
  if (!isGoogleNewsUrl(url)) return url;
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  const articleId = googleNewsArticleId(url);
  if (!articleId) return remember(url, null);
  if (remainingBudget <= 0) return null; // bütçe geri gelebilir; kalıcı olarak önbelleğe yazma
  remainingBudget -= 1;

  try {
    const page = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!page.ok) return remember(url, null);
    const signature = extractSignature(await page.text());
    if (!signature) return remember(url, null);

    const response = await fetch(BATCH_ENDPOINT, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: buildRequestBody(articleId, signature.ts, signature.sg),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return remember(url, null);
    return remember(url, extractResolvedUrl(await response.text()));
  } catch {
    return remember(url, null);
  }
}
