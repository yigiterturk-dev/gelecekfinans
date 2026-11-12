import React from "react";
import { ImageResponse } from "next/og";
import { storeImageBytes, storeRemoteImage } from "@/lib/local-images";
import { getBistHistory, getCrypto, getFxHistory, getGoldUsdHistory, CRYPTO_COINS } from "@/lib/market";
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

export async function getArticleImage(article: ArticleImageInput): Promise<string | null> {
  return (await getArticleImageResult(article)).url;
}

export async function getArticleImageResult(article: ArticleImageInput): Promise<ArticleImageResult> {
  const brief = createVisualBrief(article);

  if (brief.mode === "DATA_CHART") {
    const chart = await buildMarketSeries(article.category, article);
    if (chart) {
      const card = await createChartCard(article, downsample(chart.series, 60), chart.label, chart.unit);
      const stored = await storeImageBytes(card, article.slug || `chart-${article.category}`, "image/png");
      if (stored) return {
        url: stored,
        strategy: "MARKET_CHART",
        brief,
        audit: {
          approved: true,
          method: "REAL_DATA",
          reasons: [`${chart.label} serisi (${chart.series.length} kapanış) markalı şablona çizildi`],
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

interface MarketSeries { series: number[]; label: string; unit: string }

async function buildMarketSeries(cat: string, article: ArticleImageInput): Promise<MarketSeries | null> {
  const text = `${article.title} ${article.keyword || ""}`.toLocaleLowerCase("tr-TR");
  if (cat === "kripto") {
    const data = await getCrypto(pickCryptoSlug(text));
    if (!data?.sparkline || data.sparkline.length < 5) return null;
    return { series: data.sparkline, label: `${data.name} — Son 7 Gün`, unit: "₺" };
  }
  if (cat === "doviz") {
    const base = pickFxBase(text);
    const series = await getFxHistory(base);
    if (!series || series.length < 5) return null;
    return { series, label: `${base}/TRY — Son 30 Gün`, unit: "₺" };
  }
  if (cat === "borsa") {
    const series = await getBistHistory();
    if (!series || series.length < 5) return null;
    return { series, label: "BIST 100 — Son 1 Ay", unit: "" };
  }
  if (cat === "altin") {
    /**
     * TL cinsinden gram altın çizilmiyor: onu üretmek için ons/USD serisini
     * tarihsel USD/TRY ile gün gün çarpmak gerekir ve iki serinin tatil
     * günleri örtüşmediği için sonuç sessizce yanlış çıkıyordu. Bunun yerine
     * GERÇEK olan seri, birimi açıkça yazılarak çiziliyor: ons altın / USD.
     */
    const series = await getGoldUsdHistory();
    if (!series || series.length < 5) return null;
    return { series, label: "Ons Altın — Son 1 Ay", unit: "$" };
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

function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const output: number[] = [];
  const step = values.length / max;
  for (let index = 0; index < max; index++) output.push(values[Math.floor(index * step)]);
  output.push(values.at(-1)!);
  return output;
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

/**
 * Gerçek piyasa serisini MARKALI kartın içine gömer.
 *
 * Önceki hâl: quickchart.io'dan gelen çıplak PNG doğrudan kapak yapılıyordu.
 * Veri gerçekti ama görselde ne logo, ne kaynak, ne tarih vardı — sosyal
 * paylaşımda kimin ürettiği belirsizdi ve "hangi tarihe ait" sorusunun cevabı
 * yoktu. Artık aynı seri kendi şablonumuzda çiziliyor: dış servise bağımlılık
 * da kalkıyor (quickchart bozulursa kapak üretimi durmuyor).
 *
 * Çizim sütunlarla yapılır; satori (`ImageResponse`) SVG path'i değil ama
 * flex kutularını güvenilir basıyor. 60 ince sütun çizgi grafik izlenimi verir.
 */
export async function createChartCard(
  article: ArticleImageInput,
  series: number[],
  label: string,
  unit: string,
): Promise<Buffer> {
  const palette = accentForCategory(article.category);
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const last = series.at(-1)!;
  const first = series[0];
  const changePct = ((last - first) / first) * 100;
  const yukseldi = changePct >= 0;
  const format = (value: number) =>
    `${unit}${value.toLocaleString("tr-TR", { maximumFractionDigits: value >= 100 ? 0 : 2 })}`;

  const element = React.createElement(
    "div",
    {
      style: {
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        background: "#08111f", color: "#f8fafc", fontFamily: "Geist", padding: "56px 72px",
      },
    },
    React.createElement("div", { style: { display: "flex", alignItems: "center" } },
      React.createElement("div", {
        style: { display: "flex", fontSize: 22, fontWeight: 700, color: palette.accent, letterSpacing: 3 },
      }, "GELECEK FİNANS"),
      React.createElement("div", {
        style: { display: "flex", marginLeft: "auto", fontSize: 20, color: "#94a3b8" },
      }, article.category.toLocaleUpperCase("tr-TR")),
    ),
    React.createElement("div", {
      style: { display: "flex", marginTop: 26, fontSize: 40, fontWeight: 700, letterSpacing: -1 },
    }, label),
    React.createElement("div", { style: { display: "flex", alignItems: "flex-end", marginTop: 10 } },
      React.createElement("div", {
        style: { display: "flex", fontSize: 62, fontWeight: 700, letterSpacing: -2 },
      }, format(last)),
      React.createElement("div", {
        style: {
          display: "flex", marginLeft: 22, marginBottom: 14, fontSize: 28, fontWeight: 700,
          color: yukseldi ? "#34d399" : "#f87171",
        },
      }, `${yukseldi ? "▲" : "▼"} %${Math.abs(changePct).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
    ),
    /**
     * Haber başlığı grafiğin ALTINDA: paylaşım önizlemesinde rakam ve yön
     * bir bakışta okunur, başlık bağlamı verir. Başlıksız grafik "hangi haber"
     * sorusunu cevapsız bırakıyordu.
     */
    React.createElement("div", {
      style: {
        display: "flex", alignItems: "flex-end", marginTop: 24,
        height: 230, width: "100%", gap: 3,
      },
    }, ...series.map((value, index) => React.createElement("div", {
      key: index,
      style: {
        display: "flex", flexGrow: 1,
        height: `${8 + ((value - min) / span) * 92}%`,
        background: palette.accent,
        opacity: 0.35 + (index / series.length) * 0.65,
        borderRadius: 2,
      },
    }))),
    React.createElement("div", {
      style: {
        display: "flex", flexDirection: "column", marginTop: 22, width: 1000,
        fontSize: 30, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5, color: "#e2e8f0",
      },
    }, ...wrapHeadline(article.title, 52).slice(0, 2).map((line, index) =>
      React.createElement("div", { key: `t-${index}`, style: { display: "flex" } }, line))),
    React.createElement("div", {
      style: { display: "flex", marginTop: "auto", alignItems: "center", fontSize: 18, color: "#64748b" },
    },
      React.createElement("div", { style: { display: "flex" } },
        `En düşük ${format(min)} · En yüksek ${format(max)}`),
      React.createElement("div", { style: { display: "flex", marginLeft: "auto" } }, "gelecekfinans.com"),
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
