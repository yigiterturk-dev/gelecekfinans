import { NextRequest, NextResponse } from "next/server";
import { notifyIndexNow } from "@/lib/bot/indexnow";

export const maxDuration = 300;

/**
 * Sitemap'ten günlük bir dilimi Bing/Yandex ve diğer IndexNow katılımcılarına
 * bildirir. Google Indexing API burada kullanılmaz; normal makale ve rehber
 * URL'leri o API'nin desteklediği içerik türleri değildir.
 */
const SITE_URL = process.env.SITE_URL || "https://gelecekfinans.com";

/**
 * Günlük dilim sayısı. Sitemap 200 adresi geçtiği için her koşumda ilk 180'i
 * bildirmek kuyruğun SONUNDAKİ sayfaları (makaleler) hiç bildirmiyordu.
 * Şimdi adresler üç dilime bölünüyor ve her gün yalnızca bir dilim gidiyor:
 * her adres ~3 günde bir sinyal alır, kotanın tamamı boşa yanmaz.
 */
const SLICES = 3;
const LIMIT = 200;

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
  const dayIndex = Math.floor(Date.now() / 86400000);
  const urls = all.filter((_, i) => i % SLICES === dayIndex % SLICES).slice(0, LIMIT);

  const indexNow = await notifyIndexNow(urls);

  return NextResponse.json({
    sitemapUrls: all.length,
    attempted: urls.length,
    googleNotified: 0,
    googleSkippedUnsupported: urls.length,
    indexNow,
  });
}
