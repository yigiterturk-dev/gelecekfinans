import React from "react";
import { ImageResponse } from "next/og";
import { put } from "@vercel/blob";
import { getCrypto, getFxHistory, CRYPTO_COINS } from "@/lib/market";
import { createVisualBrief, type VisualBrief } from "./visual-director";
import { searchLicensedMedia, type LicensedMediaAsset } from "./licensed-media";

export interface ArticleImageInput {
  title: string;
  /**
   * Makalenin slug'ı. Verilirse görsel dosya adı bundan üretilir:
   * `gorseller/altin-yedi-haftanin-zirvesinde.png`. Zaman damgalı rastgele ad
   * (`branded-altin-1785998325947-3hac6j.png`) arama motoruna hiçbir şey
   * anlatmıyordu; dosya adı görsel aramada sıralama sinyalidir.
   */
  slug?: string | null;
  keyword?: string | null;
  category: string;
  recentConcepts?: string[];
  maxAttempts?: number;
  evidenceSourceCount?: number;
}

export interface VisualAudit {
  approved: boolean;
  method: "LICENSE_METADATA" | "REAL_DATA" | "DETERMINISTIC_TEMPLATE";
  reasons: string[];
}

export interface ArticleImageResult {
  url: string | null;
  strategy: "MARKET_CHART" | "LICENSED_MEDIA" | "BRANDED_EDITORIAL" | "NONE";
  brief: VisualBrief;
  audit: VisualAudit | null;
  attempts: number;
  licensedAsset: LicensedMediaAsset | null;
}

const CHART_BG = "#0b1220";
const CHART_LINE = "#38bdf8";
const CHART_LINE_DOWN = "#f87171";
const CHART_GRID = "rgba(148,163,184,0.12)";
const CHART_TEXT = "#cbd5e1";

export async function getArticleImage(article: ArticleImageInput): Promise<string | null> {
  return (await getArticleImageResult(article)).url;
}

export async function getArticleImageResult(article: ArticleImageInput): Promise<ArticleImageResult> {
  const brief = createVisualBrief(article);

  if (brief.mode === "DATA_CHART") {
    const chartUrl = await buildMarketChart(article.category, article);
    if (chartUrl) {
      const stored = await uploadRemoteToBlob(chartUrl, article.slug || `chart-${article.category}`, true);
      if (stored) return {
        url: stored,
        strategy: "MARKET_CHART",
        brief,
        audit: { approved: true, method: "REAL_DATA", reasons: ["Doğrulanmış piyasa serisinden üretildi"] },
        attempts: 1,
        licensedAsset: null,
      };
    }
  }

  if (brief.mode === "LICENSED_MEDIA") {
    const asset = await searchLicensedMedia({
      query: brief.searchQuery,
      category: article.category,
      headline: article.title,
    });
    if (asset) {
      const stored = await uploadRemoteToBlob(
        asset.downloadUrl,
        article.slug || `licensed-${asset.provider}-${asset.assetId}`,
        false,
      );
      if (stored) return {
        url: stored,
        strategy: "LICENSED_MEDIA",
        brief,
        audit: {
          approved: true,
          method: "LICENSE_METADATA",
          reasons: [`Lisans kaydı: ${asset.provider}/${asset.licenseId}`, `Atıf: ${asset.attribution}`],
        },
        attempts: 1,
        licensedAsset: asset,
      };
    }
  }

  const card = await createBrandedCard(article);
  const stored = card
    ? await uploadBufferToBlob(card, article.slug || `branded-${article.category}`, "image/png")
    : null;
  if (stored) return {
    url: stored,
    strategy: "BRANDED_EDITORIAL",
    brief: { ...brief, mode: "BRANDED_CARD" },
    audit: {
      approved: true,
      method: "DETERMINISTIC_TEMPLATE",
      reasons: ["Sentetik kişi/olay yok", "Başlık ve kaynak sayısı deterministik şablondan üretildi"],
    },
    attempts: 1,
    licensedAsset: null,
  };

  return { url: null, strategy: "NONE", brief, audit: null, attempts: 0, licensedAsset: null };
}

async function buildMarketChart(cat: string, article: ArticleImageInput): Promise<string | null> {
  const text = `${article.title} ${article.keyword || ""}`.toLocaleLowerCase("tr-TR");
  if (cat === "kripto") {
    const data = await getCrypto(pickCryptoSlug(text));
    if (!data?.sparkline || data.sparkline.length < 5) return null;
    return quickChartUrl(downsample(data.sparkline, 60), `${data.name} (₺) — Son 7 Gün`, "₺");
  }
  if (cat === "doviz") {
    const base = pickFxBase(text);
    const series = await getFxHistory(base);
    if (!series || series.length < 5) return null;
    return quickChartUrl(downsample(series, 60), `${base}/TRY — Son 30 Gün`, "₺");
  }
  // Tarihsel USD/TRY olmadan gram-altın TL grafiği kesin değer izlenimi
  // veriyordu. Güvenilir birleşik seri eklenene kadar altın haberi kart kullanır.
  return null;
}

function pickCryptoSlug(text: string): string {
  for (const [slug, cfg] of Object.entries(CRYPTO_COINS)) {
    if (text.includes(slug) || text.includes(cfg.label.toLocaleLowerCase("tr-TR")) || text.includes(cfg.symbol.toLowerCase())) return slug;
  }
  return "bitcoin";
}

function pickFxBase(text: string): string {
  if (text.includes("euro") || text.includes("eur")) return "EUR";
  if (text.includes("sterlin") || text.includes("gbp")) return "GBP";
  return "USD";
}

function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const output: number[] = [];
  const step = values.length / max;
  for (let index = 0; index < max; index++) output.push(values[Math.floor(index * step)]);
  output.push(values.at(-1)!);
  return output;
}

function quickChartUrl(points: number[], label: string, unit: string): string {
  const up = points.at(-1)! >= points[0];
  const line = up ? CHART_LINE : CHART_LINE_DOWN;
  const fill = up ? "rgba(56,189,248,0.18)" : "rgba(248,113,113,0.16)";
  const config = {
    type: "line",
    data: { labels: points.map(() => ""), datasets: [{
      label, data: points, borderColor: line, backgroundColor: fill,
      borderWidth: 3, pointRadius: 0, fill: true, tension: 0.35,
    }] },
    options: {
      plugins: {
        legend: { display: true, labels: { color: CHART_TEXT, font: { size: 18, weight: "bold" } } },
        title: { display: true, text: "gelecekfinans.com", color: "rgba(203,213,225,0.55)", font: { size: 13 }, position: "bottom" },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { ticks: { color: CHART_TEXT, font: { size: 13 }, callback: "__CB__" }, grid: { color: CHART_GRID } },
      },
    },
  };
  const json = JSON.stringify(config).replace('"__CB__"', `function(v){return '${unit}'+v.toLocaleString('tr-TR')}`);
  return `https://quickchart.io/chart?width=1200&height=675&devicePixelRatio=2&backgroundColor=${encodeURIComponent(CHART_BG)}&c=${encodeURIComponent(json)}`;
}

function wrapHeadline(value: string, max = 34): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export async function createBrandedCard(article: ArticleImageInput): Promise<Buffer> {
  const lines = wrapHeadline(article.title);
  const sourceLabel = article.evidenceSourceCount && article.evidenceSourceCount >= 2
    ? `${article.evidenceSourceCount} bağımsız kaynakla doğrulandı`
    : "Editoryal inceleme bekliyor";
  const element = React.createElement(
    "div",
    {
      style: {
        width: "100%", height: "100%", display: "flex", position: "relative",
        flexDirection: "column", background: "#08111f", color: "#f8fafc",
        fontFamily: "Geist", padding: "68px 86px",
      },
    },
    React.createElement("div", {
      style: {
        position: "absolute", width: 500, height: 500, borderRadius: 250,
        right: -130, top: -140, background: "#0f2c46",
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute", width: 380, height: 380, borderRadius: 190,
        right: -40, bottom: -220, background: "#123b54", opacity: 0.72,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute", width: 430, height: 220, right: 28, top: 120,
        borderBottom: "3px solid #38bdf8", borderRadius: "0 0 100% 0",
        transform: "rotate(18deg)", opacity: 0.55,
      },
    }),
    React.createElement("div", {
      style: { display: "flex", fontSize: 24, fontWeight: 700, color: "#38bdf8", letterSpacing: 3 },
    }, "GELECEK FİNANS"),
    React.createElement("div", {
      style: { display: "flex", marginTop: 34, fontSize: 22, fontWeight: 700, color: "#94a3b8" },
    }, article.category.toLocaleUpperCase("tr-TR")),
    React.createElement("div", {
      style: {
        display: "flex", flexDirection: "column", marginTop: 72, width: 820,
        fontSize: 58, lineHeight: 1.16, fontWeight: 700, letterSpacing: -1.5,
      },
    }, ...lines.map((line, index) => React.createElement("div", { key: `${index}-${line}`, style: { display: "flex" } }, line))),
    React.createElement("div", {
      style: {
        display: "flex", position: "absolute", left: 86, bottom: 68,
        alignItems: "center", fontSize: 20, color: "#cbd5e1",
      },
    },
    React.createElement("div", {
      style: { width: 12, height: 12, borderRadius: 6, background: "#38bdf8", marginRight: 14 },
    }), sourceLabel),
    React.createElement("div", {
      style: { display: "flex", position: "absolute", right: 54, bottom: 68, fontSize: 18, color: "#64748b" },
    }, "gelecekfinans.com"),
  );
  const response = new ImageResponse(element, { width: 1200, height: 675 });
  return Buffer.from(await response.arrayBuffer());
}

async function uploadRemoteToBlob(src: string, prefix: string, allowExternalFallback: boolean): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return allowExternalFallback ? src : null;
  try {
    const response = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    return uploadBufferToBlob(Buffer.from(await response.arrayBuffer()), prefix, contentType);
  } catch {
    return null;
  }
}

async function uploadBufferToBlob(bytes: Buffer, prefix: string, contentType: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const extension = contentType === "image/png" ? "png" : "jpg";
    const safePrefix = prefix
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9-]+/gi, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "gorsel";
    // Aynı makale yeniden üretilirse aynı adrese yazılır; böylece hem dosya adı
    // okunur kalır hem de eski görsel çöp olarak birikmez.
    const key = `gorseller/${safePrefix}.${extension}`;
    /**
     * `allowOverwrite` şart: aynı makale ikinci kez işlendiğinde (görsel
     * onarımı, yeniden üretim, elle tetikleme) `put` aynı adrese yazmayı
     * "This blob already exists" ile reddediyordu. Hata aşağıdaki catch'te
     * yutulduğu için sonuç sessizce `null` oluyor, makale de "kapak görseli
     * yok" gerekçesiyle yayımlanmayıp inceleme kuyruğunda kalıyordu —
     * ilk üretim başarılı olsa bile. Ölçüldü: aynı taslakta 1. deneme
     * BRANDED_EDITORIAL, 2. deneme NONE.
     */
    const blob = await put(key, bytes, {
      access: "public", contentType, addRandomSuffix: false, allowOverwrite: true,
    });
    return blob.url;
  } catch (error) {
    // Sessiz null, canlıda saatlerce yanlış yere baktırdı. Sebep artık kayıtta.
    console.warn(`[gorsel] blob yüklemesi başarısız (${prefix}):`, (error as Error).message);
    return null;
  }
}
