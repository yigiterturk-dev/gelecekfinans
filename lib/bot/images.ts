import React from "react";
import { ImageResponse } from "next/og";
import { storeImageBytes, storeRemoteImage } from "@/lib/local-images";
import { getEvdsSeriesUntil, getYahooSeriesUntil, CRYPTO_COINS, type DatedPoint } from "@/lib/market";
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
  /** Grafiğin bittiği gün = makalenin yayın günü. Verilmezse bugün. */
  asOf?: Date | string | null;
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

export async function getArticleImage(article: ArticleImageInput): Promise<string | null> {
  return (await getArticleImageResult(article)).url;
}

export async function getArticleImageResult(article: ArticleImageInput): Promise<ArticleImageResult> {
  const brief = createVisualBrief(article);

  if (brief.mode === "DATA_CHART") {
    const chart = await buildMarketSeries(article.category, article);
    if (chart) {
      const card = await createChartCard(article, chart);
      const stored = await storeImageBytes(card, article.slug || `chart-${article.category}`, "image/png");
      if (stored) return {
        url: stored,
        strategy: "MARKET_CHART",
        brief,
        audit: {
          approved: true,
          method: "REAL_DATA",
          reasons: [`${chart.label} serisi (${chart.points.length} kapanış, ${chart.points[0].date}→${chart.points.at(-1)!.date}) markalı şablona çizildi`],
        },
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
      const stored = await storeRemoteImage(
        asset.downloadUrl,
        article.slug || `licensed-${asset.provider}-${asset.assetId}`,
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
    ? await storeImageBytes(card, article.slug || `branded-${article.category}`, "image/png")
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

export interface MarketSeries { points: DatedPoint[]; label: string; unit: string; source: string }

/**
 * Kategoriye göre GERÇEK günlük kapanış serisi, makalenin yayın gününde biter.
 * Kaynak: döviz ve BIST 100 TCMB EVDS (resmî), altın/kripto/banka endeksi Yahoo. Kripto için
 * eskiden CoinGecko'nun "son 7 gün" sparkline'ı kullanılıyordu, o da tarih
 * alamadığı için geçmiş makalelere bugünün grafiğini basıyordu.
 */
export async function buildMarketSeries(cat: string, article: ArticleImageInput): Promise<MarketSeries | null> {
  const text = `${article.title} ${article.keyword || ""}`.toLocaleLowerCase("tr-TR");
  const asOf = article.asOf ? new Date(article.asOf) : new Date();
  const end = Number.isNaN(asOf.getTime()) ? new Date() : asOf;
  const pick = async (symbol: string, label: string, unit: string): Promise<MarketSeries | null> => {
    const points = await getYahooSeriesUntil(symbol, end);
    return points ? { points, label, unit, source: "Yahoo Finance, günlük kapanış" } : null;
  };
  if (cat === "kripto") {
    const slug = pickCryptoSlug(text);
    const cfg = CRYPTO_COINS[slug === "tether" ? "bitcoin" : slug] || CRYPTO_COINS.bitcoin;
    return pick(`${cfg.symbol}-USD`, `${cfg.label} / USD`, "$");
  }
  // Döviz ve BIST 100 önce TCMB EVDS'ten (resmî); ulaşılamazsa Yahoo.
  const official = async (code: string, label: string, unit: string, source: string): Promise<MarketSeries | null> => {
    const points = await getEvdsSeriesUntil(code, end);
    return points ? { points, label, unit, source } : null;
  };
  if (cat === "doviz") {
    const base = pickFxBase(text);
    return (await official(`TP.DK.${base}.S.YTL`, `${base}/TRY`, "₺", "TCMB EVDS, döviz satış kuru"))
      || pick(`${base}TRY=X`, `${base}/TRY`, "₺");
  }
  if (cat === "borsa") {
    if (/\bbanka/.test(text)) {
      const bank = await pick("XBANK.IS", "BIST Banka Endeksi", "");
      if (bank) return bank;
    }
    return (await official("TP.MK.F.BILESIK", "BIST 100 Endeksi", "", "TCMB EVDS (Borsa İstanbul), günlük kapanış"))
      || pick("XU100.IS", "BIST 100 Endeksi", "");
  }
  if (cat === "altin") {
    /**
     * TL cinsinden gram altın çizilmiyor: ons/USD × tarihsel USD/TRY gün gün
     * çarpılınca tatil günleri örtüşmüyor, sonuç sessizce yanlış çıkıyordu.
     * GERÇEK olan seri, birimi açıkça yazılarak çiziliyor: ons altın / USD.
     */
    return pick("GC=F", "Ons Altın / USD", "$");
  }
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

function greedyWrap(words: string[], max: number): string[] {
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
  return lines;
}

/**
 * Başlığı DENGELİ satırlara böler.
 *
 * Açgözlü sarma her satırı sonuna kadar doldurduğu için son satırda tek bir
 * sözcük kalabiliyordu — "Kripto para nedir? Tanım, çalışma / prensipleri,
 * kullanım ve riskler" kapağında "çalışma" ortada yapayalnız durdu.
 * Önce satır sayısını açgözlü sarmayla buluyoruz, sonra AYNI satır sayısını
 * koruyan en dar genişliği arıyoruz: satırlar birbirine yakın uzunlukta çıkıyor.
 *
 * ⚠️ `max` KARTIN GENİŞLİĞİNE bağlı, keyfi değil: 820px kutuda 58px Geist Bold
 * ile satır başına ~27 karakter sığıyor. Eskiden 34'tü; sığmayan satırı görsel
 * motoru ikinci kez kırıyor ve dengeleme boşa gidiyordu — kripto kapağında
 * "çalışma" tek başına satırda kalmasının sebebi buydu.
 */
export function wrapHeadline(value: string, max = 26): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const target = greedyWrap(words, max).length;
  let best = greedyWrap(words, max);
  for (let width = max - 1; width >= 12; width--) {
    const candidate = greedyWrap(words, width);
    if (candidate.length !== target) break;
    best = candidate;
  }
  return best.slice(0, 4);
}

/**
 * Kategoriye göre vurgu rengi.
 *
 * Kartın düzeni sabit kalır ama renk değişir: aynı gün yayımlanan altı haberin
 * kapağı birbirinin tıpatıp aynı olduğunda sosyal paylaşımda ve Google
 * Discover'da hiçbiri ayırt edilemiyor. Renk, marka kimliğini bozmadan
 * kategoriyi bir bakışta ayıran en ucuz sinyal.
 */
const CATEGORY_ACCENTS: Record<string, { accent: string; deep: string; soft: string }> = {
  borsa: { accent: "#38bdf8", deep: "#0f2c46", soft: "#123b54" },
  kripto: { accent: "#a78bfa", deep: "#2a1f4d", soft: "#3b2b63" },
  altin: { accent: "#fbbf24", deep: "#3d2f10", soft: "#4d3c16" },
  doviz: { accent: "#34d399", deep: "#0f3a30", soft: "#154c3e" },
  ekonomi: { accent: "#60a5fa", deep: "#152a4d", soft: "#1d3a63" },
};
const DEFAULT_ACCENT = CATEGORY_ACCENTS.ekonomi;

export function accentForCategory(category: string) {
  return CATEGORY_ACCENTS[category.toLocaleLowerCase("tr-TR")] ?? DEFAULT_ACCENT;
}

const TR_MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
function shortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${TR_MONTHS[m - 1]} ${y}`;
}

/**
 * Gerçek piyasa serisini MARKALI kartın içine gömer.
 *
 * 17 Kasım 2026 yenilemesi: eski kart 60 sütunluk tek tip bar grafikti ve
 * başlık küçücük alttaydı; aynı kategori sayfasında kartlar ayırt edilemiyordu.
 * Artık: haber başlığı en üstte büyük (asıl ayırt edici), altında gerçek çizgi
 * + alan grafiği (SVG), yatay kılavuz çizgileri ve değerleri, başlangıç/bitiş
 * TARİHİ ve kaynak satırı. Seri makalenin yayın gününde biter.
 */
export async function createChartCard(article: ArticleImageInput, chart: MarketSeries): Promise<Buffer> {
  const palette = accentForCategory(article.category);
  const values = chart.points.map((p) => p.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.12 || max * 0.01 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const last = values.at(-1)!;
  const first = values[0];
  const changePct = ((last - first) / first) * 100;
  const up = changePct >= 0;
  const lineColor = up ? "#34d399" : "#f87171";
  const decimals = last >= 1000 ? 0 : last >= 10 ? 2 : 4;
  const format = (value: number) =>
    `${chart.unit}${value.toLocaleString("tr-TR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const W = 1056;
  const H = 250;
  const plotW = W - 110; // sağda değer etiketleri
  const x = (i: number) => (i / (values.length - 1)) * plotW;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${plotW},${H} L0,${H} Z`;
  const grid = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * (k + 0.5)) / 4);

  const h = React.createElement;
  const svg = h("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` },
    h("defs", null,
      h("linearGradient", { id: "fill", x1: "0", y1: "0", x2: "0", y2: "1" },
        h("stop", { offset: "0%", stopColor: lineColor, stopOpacity: 0.35 }),
        h("stop", { offset: "100%", stopColor: lineColor, stopOpacity: 0 }),
      ),
    ),
    ...grid.map((g, k) => h("line", {
      key: `g${k}`, x1: 0, x2: plotW, y1: y(g), y2: y(g), stroke: "#1e293b", strokeWidth: 1, strokeDasharray: "4 6",
    })),
    h("path", { d: area, fill: "url(#fill)" }),
    h("path", { d: line, fill: "none", stroke: lineColor, strokeWidth: 4, strokeLinejoin: "round", strokeLinecap: "round" }),
    h("circle", { cx: x(values.length - 1), cy: y(last), r: 9, fill: lineColor, stroke: "#08111f", strokeWidth: 4 }),
  );

  const element = h("div", {
    style: {
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: "#08111f", color: "#f8fafc", fontFamily: "Geist", padding: "44px 72px 36px",
    },
  },
    h("div", { style: { display: "flex", alignItems: "center", fontSize: 19 } },
      h("div", { style: { display: "flex", fontWeight: 700, color: palette.accent, letterSpacing: 3 } }, "GELECEK FİNANS"),
      h("div", {
        style: {
          display: "flex", marginLeft: "auto", color: "#cbd5e1", border: "1px solid #334155",
          borderRadius: 999, padding: "4px 14px", letterSpacing: 2,
        },
      }, article.category.toLocaleUpperCase("tr-TR")),
    ),
    h("div", {
      style: {
        display: "flex", flexDirection: "column", marginTop: 20, fontSize: 42, fontWeight: 700,
        lineHeight: 1.15, letterSpacing: -1, color: "#f8fafc",
      },
    }, ...wrapHeadline(article.title, 46).slice(0, 2).map((text, index) =>
      h("div", { key: `t-${index}`, style: { display: "flex" } }, text))),
    h("div", { style: { display: "flex", alignItems: "flex-end", marginTop: 18 } },
      h("div", { style: { display: "flex", flexDirection: "column" } },
        h("div", { style: { display: "flex", fontSize: 20, color: "#94a3b8" } }, chart.label),
        h("div", { style: { display: "flex", fontSize: 46, fontWeight: 700, letterSpacing: -1 } }, format(last)),
      ),
      h("div", {
        style: {
          display: "flex", marginLeft: 20, marginBottom: 8, fontSize: 24, fontWeight: 700, color: lineColor,
          background: up ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", borderRadius: 8, padding: "4px 12px",
        },
      }, `${up ? "▲" : "▼"} %${Math.abs(changePct).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
      h("div", { style: { display: "flex", marginLeft: "auto", marginBottom: 10, fontSize: 18, color: "#64748b" } },
        `${values.length} işlem günü`),
    ),
    h("div", { style: { display: "flex", position: "relative", marginTop: 14, width: W, height: H } },
      svg,
      ...grid.map((g, k) => h("div", {
        key: `l${k}`,
        style: {
          display: "flex", position: "absolute", right: 0, top: y(g) - 11, fontSize: 16, color: "#64748b",
        },
      }, format(g))),
    ),
    h("div", { style: { display: "flex", marginTop: 8, width: W - 110, fontSize: 16, color: "#94a3b8" } },
      h("div", { style: { display: "flex" } }, shortDate(chart.points[0].date)),
      h("div", { style: { display: "flex", marginLeft: "auto" } }, shortDate(chart.points.at(-1)!.date)),
    ),
    h("div", { style: { display: "flex", marginTop: "auto", fontSize: 15, color: "#475569" } },
      h("div", { style: { display: "flex" } }, `Kaynak: ${chart.source}`),
      h("div", { style: { display: "flex", marginLeft: "auto" } }, "gelecekfinans.com"),
    ),
  );
  const response = new ImageResponse(element, { width: 1200, height: 675 });
  return Buffer.from(await response.arrayBuffer());
}

export async function createBrandedCard(article: ArticleImageInput): Promise<Buffer> {
  const lines = wrapHeadline(article.title);
  const palette = accentForCategory(article.category);
  /**
   * Rozet YALNIZCA kanıt sayısı bilindiğinde basılır.
   *
   * Eski davranış: sayı gelmediğinde "Editoryal inceleme bekliyor" yazıyordu.
   * Görsel onarım scriptleri (`backfill-images`, `taslak-onar`) bu alanı hiç
   * geçmiyor; sonuç olarak YAYINDAKİ makalelerin kapağında "inceleme bekliyor"
   * ibaresi kaldı (1 Eylül 2026: BIST ve kripto kapaklarında canlı görüldü).
   * Okura yanlış bilgi vermektense rozeti hiç basmamak doğru: bilinmeyen bir
   * durumu uydurmuyoruz.
   */
  const sourceLabel = article.evidenceSourceCount && article.evidenceSourceCount >= 2
    ? `${article.evidenceSourceCount} bağımsız kaynakla doğrulandı`
    : null;
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
        right: -130, top: -140, background: palette.deep,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute", width: 380, height: 380, borderRadius: 190,
        right: -40, bottom: -220, background: palette.soft, opacity: 0.72,
      },
    }),
    React.createElement("div", {
      style: {
        position: "absolute", width: 430, height: 220, right: 28, top: 120,
        borderBottom: `3px solid ${palette.accent}`, borderRadius: "0 0 100% 0",
        transform: "rotate(18deg)", opacity: 0.55,
      },
    }),
    React.createElement("div", {
      style: { display: "flex", fontSize: 24, fontWeight: 700, color: palette.accent, letterSpacing: 3 },
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
    sourceLabel
      ? React.createElement("div", {
        style: {
          display: "flex", position: "absolute", left: 86, bottom: 68,
          alignItems: "center", fontSize: 20, color: "#cbd5e1",
        },
      },
      React.createElement("div", {
        style: { width: 12, height: 12, borderRadius: 6, background: palette.accent, marginRight: 14 },
      }), sourceLabel)
      : null,
    React.createElement("div", {
      style: { display: "flex", position: "absolute", right: 54, bottom: 68, fontSize: 18, color: "#64748b" },
    }, "gelecekfinans.com"),
  );
  const response = new ImageResponse(element, { width: 1200, height: 675 });
  return Buffer.from(await response.arrayBuffer());
}
