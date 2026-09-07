import { NextRequest, NextResponse } from "next/server";
import { notifyGoogleUrlUpdated } from "@/lib/bot/indexing";
import { notifyIndexNow } from "@/lib/bot/indexnow";

export const maxDuration = 300;

/**
 * Sitemap'teki HER adresi günde bir kez Google ve IndexNow'a bildirir.
 *
 * Neden var: bildirim şimdiye kadar yalnız `orchestrator` içinden, yani
 * bot YENİ yazı ürettiğinde gidiyordu. `/altin/*` ve `/araclar/*` gibi
 * elle yazılmış sayfalar hiç bildirilmedi ve GSC'de "Discovered –
 * currently not indexed" (Last crawled: N/A) hâlinde takılı kaldı: Google
 * adresi sitemap'ten biliyor ama taramaya hiç sıra gelmedi.
 *
 * Kota günde 200 bildirim; sitemap ~93 adres olduğu için hepsi tek turda
 * rahat sığıyor. Sitemap büyürse LIMIT kotayı korur.
 *
 * ⚠️ Google Indexing API'yi resmen yalnız JobPosting/BroadcastEvent için
 * destekliyor. Diğer sayfalarda çağrı 200 döner ama taramayı garanti
 * ETMEZ — sadece kuyruğa güçlü bir sinyal olur. Asıl kaldıraç yine dış
 * bağlantı ve iç link. Bu yüzden başarısızlık sessizce yutulur.
 */
const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";
const LIMIT = 180;

async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, { cache: "no-store" });
  if (!res.ok) return [];
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const all = await sitemapUrls();
  if (!all.length) {
    return NextResponse.json({ skipped: true, reason: "sitemap boş ya da okunamadı" });
  }
  const urls = all.slice(0, LIMIT);

  let ok = 0;
  const failures: Record<string, number> = {};
  for (const url of urls) {
    const result = await notifyGoogleUrlUpdated(url);
    if (result.ok) {
      ok++;
      continue;
    }
    failures[result.reason] = (failures[result.reason] ?? 0) + 1;
    // Kurulum eksikse kalan adresler de aynı hatayı verir; kotayı yakmadan çık.
    if (result.reason === "not-configured" || result.reason === "api-disabled") break;
  }

  const indexNow = await notifyIndexNow(urls);

  return NextResponse.json({
    sitemapUrls: all.length,
    attempted: urls.length,
    googleNotified: ok,
    failures,
    indexNow,
  });
}
