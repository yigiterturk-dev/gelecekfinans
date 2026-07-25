// ============================================================================
// HİBRİT GÖRSEL MOTORU
// ----------------------------------------------------------------------------
// Tek giriş noktası: getArticleImage(article)
//
//  - Fiyat kategorileri (kripto / doviz / altin): GERÇEK piyasa serisinden
//    markalı (navy temalı) çizgi grafik üretir → Vercel Blob'a yükler.
//      • kripto: CoinGecko 7g sparkline (lib/market.ts getCrypto)
//      • doviz:  exchangerate.host 30g seri (lib/market.ts getFxHistory)
//      • altin:  Yahoo GC=F 30g ons geçmişi × USDTRY → gram altın TL serisi
//    Grafik PNG'si QuickChart.io (anahtarsız, ücretsiz) ile çizilir.
//
//  - borsa: güvenilir ücretsiz BIST zaman serisi olmadığından AI'a düşer.
//  - ekonomi: AI editoryal görsel (gpt-image-1).
//  - Grafik/AI başarısız olursa → mevcut fetchUnsplashImage zincirine düşer
//    (sistem ASLA görselsiz/çökmüş kalmaz).
//
// Bağımlılıklar: OPENAI_API_KEY (AI görsel) ve BLOB_READ_WRITE_TOKEN (kalıcı
// depolama). İkisi de yoksa graceful biçimde Unsplash'e düşülür; build/deploy
// kırılmaz.
// ============================================================================

import OpenAI from "openai";
import { put } from "@vercel/blob";
import { getCrypto, getFxHistory, getFx, CRYPTO_COINS } from "@/lib/market";

export interface ArticleImageInput {
  title: string;
  keyword?: string | null;
  category: string;
}

const TROY_OUNCE_GRAMS = 31.1035;

// Markalı navy tema — site paletiyle uyumlu (cream+gold AI-tell klişesinden uzak).
const CHART_BG = "#0b1220"; // koyu lacivert
const CHART_LINE = "#38bdf8"; // canlı camgöbeği (yükseliş vurgusu)
const CHART_LINE_DOWN = "#f87171"; // düşüşte kırmızımsı
const CHART_GRID = "rgba(148,163,184,0.12)";
const CHART_TEXT = "#cbd5e1";

/**
 * Tek giriş noktası. Kategoriye göre gerçek grafik veya AI görseli üretir,
 * Vercel Blob'a yükler, public URL döndürür. Her şey başarısızsa Unsplash'e
 * düşer; o da yoksa null döner (çağıran null'ı imageUrl=null olarak yazar).
 */
export async function getArticleImage(article: ArticleImageInput): Promise<string | null> {
  const cat = article.category;

  try {
    // 1) Fiyat kategorileri → gerçek piyasa grafiği
    if (cat === "kripto" || cat === "doviz" || cat === "altin") {
      const chartUrl = await buildMarketChart(cat, article);
      if (chartUrl) {
        const stored = await uploadToBlob(chartUrl, `chart-${cat}`);
        if (stored) return stored;
      }
      // Grafik üretilemedi → borsa gibi AI'a düşürmek yerine bu kategorilerde
      // doğrudan AI editoryal görsele geç (konuya daha alakalı durur).
      const ai = await tryAiImage(article);
      if (ai) return ai;
    }

    // 2) borsa + ekonomi (ve grafik üretilemeyen fiyat kategorileri) → AI
    if (cat === "borsa" || cat === "ekonomi") {
      const ai = await tryAiImage(article);
      if (ai) return ai;
    }
  } catch {
    // sessizce fallback'e düş
  }

  // Alakasız stok görsel, görselsiz içerikten daha zararlıdır. Görsel üretimi
  // ve denetimi başarısızsa null dön; yayın kapısı makaleyi incelemeye bıraksın.
  return null;
}

/** AI görsel üretir, ayrı bir vision modeliyle denetler; yalnızca onaylıysa yükler. */
async function tryAiImage(article: ArticleImageInput): Promise<string | null> {
  let correction = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const dataUrl = await generateAiImage(article, correction);
    if (!dataUrl) return null;
    const audit = await auditAiImage(article, dataUrl);
    if (audit.approved) return uploadToBlob(dataUrl, `ai-${article.category}`);
    correction = audit.feedback;
  }
  return null;
}

/* --------------------------------------------------------------------------
 * GERÇEK PİYASA GRAFİĞİ
 * ------------------------------------------------------------------------ */

/** Kategoriye göre zaman serisi toplar ve QuickChart PNG URL'i döndürür. */
async function buildMarketChart(
  cat: string,
  article: ArticleImageInput,
): Promise<string | null> {
  const text = `${article.title} ${article.keyword || ""}`.toLowerCase();

  if (cat === "kripto") {
    const slug = pickCryptoSlug(text);
    const data = await getCrypto(slug);
    const series = data?.sparkline;
    if (!series || series.length < 5) return null;
    // 7 günlük seriyi makul nokta sayısına indir (QuickChart URL'i şişmesin)
    const pts = downsample(series, 60);
    const label = `${data!.name} (₺) — Son 7 Gün`;
    return quickChartUrl(pts, label, "₺");
  }

  if (cat === "doviz") {
    const base = pickFxBase(text); // USD / EUR / GBP
    const series = await getFxHistory(base);
    if (!series || series.length < 5) return null;
    const pts = downsample(series, 60);
    const label = `${base}/TRY — Son 30 Gün`;
    return quickChartUrl(pts, label, "₺");
  }

  if (cat === "altin") {
    const series = await getGoldGramHistory();
    if (!series || series.length < 5) return null;
    const pts = downsample(series, 60);
    const label = "Gram Altın (₺) — Son 30 Gün";
    return quickChartUrl(pts, label, "₺");
  }

  return null;
}

/** Metinden kripto coin slug'ı seçer; bulunamazsa bitcoin. */
function pickCryptoSlug(text: string): string {
  for (const [slug, cfg] of Object.entries(CRYPTO_COINS)) {
    if (text.includes(slug) || text.includes(cfg.label.toLowerCase()) || text.includes(cfg.symbol.toLowerCase())) {
      return slug;
    }
  }
  if (text.includes("eth")) return "ethereum";
  if (text.includes("sol")) return "solana";
  return "bitcoin";
}

/** Metinden döviz baz para birimini seçer; bulunamazsa USD. */
function pickFxBase(text: string): string {
  if (text.includes("euro") || text.includes("eur")) return "EUR";
  if (text.includes("sterlin") || text.includes("gbp") || text.includes("pound")) return "GBP";
  return "USD";
}

/**
 * Gram altın TL geçmişi: Yahoo GC=F (ons altın USD, 30g) × güncel USDTRY.
 * Tarihsel USDTRY ücretsiz uçta güvenilir olmadığından güncel kur sabiti
 * kullanılır — serinin ŞEKLİ (trend) doğru kalır, eksen göreli okunur.
 */
async function getGoldGramHistory(): Promise<number[] | null> {
  try {
    const usdTry = await getFx("usd-try");
    if (!usdTry?.rate) return null;
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1mo",
      { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: { result?: { indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes)) return null;
    const gram = closes
      .filter((v): v is number => typeof v === "number" && v > 0)
      .map((onsUsd) => Math.round((onsUsd / TROY_OUNCE_GRAMS) * usdTry.rate));
    return gram.length > 1 ? gram : null;
  } catch {
    return null;
  }
}

/** Seriyi en fazla `max` noktaya seyreltir (ilk/son korunur). */
function downsample(arr: number[], max: number): number[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: number[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

/**
 * QuickChart.io ile navy temalı temiz çizgi grafik PNG URL'i üretir.
 * Anahtarsız, ücretsiz. Yükseliş/düşüşe göre çizgi rengi değişir.
 */
function quickChartUrl(points: number[], label: string, unit: string): string {
  const up = points[points.length - 1] >= points[0];
  const line = up ? CHART_LINE : CHART_LINE_DOWN;
  const fill = up ? "rgba(56,189,248,0.18)" : "rgba(248,113,113,0.16)";
  const labels = points.map(() => ""); // eksen kalabalığı olmasın (AI-tell temiz)

  const config = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: points,
          borderColor: line,
          backgroundColor: fill,
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: { color: CHART_TEXT, font: { size: 18, weight: "bold" } },
        },
        title: {
          display: true,
          text: "gelecekfinans.com",
          color: "rgba(203,213,225,0.55)",
          font: { size: 13 },
          position: "bottom",
        },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: {
          ticks: { color: CHART_TEXT, font: { size: 13 }, callback: `__CB__` },
          grid: { color: CHART_GRID },
        },
      },
    },
  };

  // y ekseni etiketine birim ekle (₺) — QuickChart fonksiyon stringi destekler
  let json = JSON.stringify(config);
  json = json.replace(
    '"__CB__"',
    `function(v){return '${unit}'+v.toLocaleString('tr-TR')}`,
  );

  return (
    "https://quickchart.io/chart?width=1200&height=675&devicePixelRatio=2" +
    `&backgroundColor=${encodeURIComponent(CHART_BG)}` +
    `&c=${encodeURIComponent(json)}`
  );
}

/* --------------------------------------------------------------------------
 * AI EDİTORYAL GÖRSEL (gpt-image-1)
 * ------------------------------------------------------------------------ */

/**
 * gpt-image-1 ile makale başlığına özgü GERÇEKÇİ EDİTORYAL HABER FOTOĞRAFI
 * üretir (foto-gazetecilik / Reuters-AP-Bloomberg estetiği). Klişe finans
 * clipart'ı (coin, $€₺ sembolü, 3D dashboard) değil; haberin gerçek konusunu
 * betimleyen, magazin kalitesinde fotoğraf.
 * 1536x1024 (yatay), 'medium' kalite (~$0.04-0.07). base64 (data URL) döner.
 * Görselde METİN/SEMBOL/LOGO YASAK (AI bozuk yazı üretir). Env yok/hata → null.
 */
async function generateAiImage(article: ArticleImageInput, correction = ""): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = [
      "A realistic editorial news photograph for a Turkish financial news article,",
      "in the documentary photojournalism style of Reuters, AP or Bloomberg.",
      `NEWS HEADLINE (this is the single source of truth): "${article.title}".`,
      "First infer the concrete real-world event, industry, place and objects named",
      "in that headline. Depict those specific elements literally and visibly.",
      "Never substitute a generic stock exchange, currency exchange office, trading",
      "screen, bank counter or business meeting unless the headline explicitly concerns it.",
      "Style: authentic press photography — natural lighting, cinematic, shallow",
      "depth of field, candid and grounded, true-to-life colors with a slightly",
      "muted, restrained, corporate tone. Magazine / newswire quality.",
      "It must read as a real photograph that genuinely fits the news topic,",
      "NOT a generic finance stock image.",
      "STRICT — do NOT include any of the following anywhere in the image:",
      "no text, no letters, no numbers, no words, no logos, no watermarks;",
      "no currency symbols ($ € ₺) and no money-symbol clipart;",
      "no 3D renders, no vector illustrations, no glossy fintech graphics;",
      "no floating coins, no abstract dashboards, no arrows or chart cliches;",
      "no cream-and-gold luxury kitsch; no person looking at the camera;",
      "no distorted hands or faces.",
      correction ? `A previous image was rejected. Correct these exact problems: ${correction}` : "",
      "Wide landscape composition suitable as an article header photo.",
    ].filter(Boolean).join(" ");

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      quality: "medium",
      n: 1,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

interface ImageAudit {
  approved: boolean;
  feedback: string;
}

async function auditAiImage(article: ArticleImageInput, dataUrl: string): Promise<ImageAudit> {
  if (!process.env.OPENAI_API_KEY) return { approved: false, feedback: "Görsel denetçisi yapılandırılmamış." };
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 300,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `Başlık: "${article.title}"`,
              "Bu görseli sert bir ekonomi haber editörü gibi denetle.",
              "0-100 konu alakası puanı ver. Görsel başlıktaki somut olayı/kurumu/sektörü",
              "yansıtmıyorsa; jenerik borsa/döviz/banka klişesiyse; okunabilir veya bozuk",
              "yazı/rakam/logo içeriyorsa; belirgin AI yüz/el/nesne hatası varsa reddet.",
              "Onay için relevanceScore >= 85, textArtifacts=false, visualArtifacts=false",
              "ve genericFinanceCliche=false şartlarının tamamı gerekir.",
              'Yalnız JSON: {"relevanceScore":0,"textArtifacts":false,"visualArtifacts":false,"genericFinanceCliche":false,"feedback":"kısa düzeltme"}',
            ].join(" "),
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
        ],
      }],
    });
    const raw = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(raw) as {
      relevanceScore?: number;
      textArtifacts?: boolean;
      visualArtifacts?: boolean;
      genericFinanceCliche?: boolean;
      feedback?: string;
    };
    const approved =
      (result.relevanceScore || 0) >= 85 &&
      result.textArtifacts === false &&
      result.visualArtifacts === false &&
      result.genericFinanceCliche === false;
    return {
      approved,
      feedback: result.feedback || "Başlıktaki somut olayla daha doğrudan ve yazısız bir sahne üret.",
    };
  } catch {
    // Denetçi hata verirse fail-open değil fail-closed: görsel kullanılmaz.
    return { approved: false, feedback: "Başlığa doğrudan bağlı, tamamen yazısız ve klişesiz sahne üret." };
  }
}

/* --------------------------------------------------------------------------
 * VERCEL BLOB DEPOLAMA
 * ------------------------------------------------------------------------ */

/**
 * Bir kaynağı (data URL veya http URL) indirip Vercel Blob'a yükler, kalıcı
 * public URL döndürür. Token yoksa veya hata olursa null (fallback'e düşülür).
 *
 * Not: QuickChart PNG'leri zaten kalıcı bir URL'dir; yine de Blob'a kopyalamak
 * harici servise bağımlılığı kaldırır (görsel kalıcılığı garanti).
 */
async function uploadToBlob(src: string, prefix: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Token yoksa: AI base64'ü kalıcılaştıramayız → null (fallback).
    // QuickChart için harici URL'i geçici çözüm olarak döndürürüz.
    return src.startsWith("http") ? src : null;
  }
  try {
    let bytes: Buffer;
    if (src.startsWith("data:")) {
      const b64 = src.split(",")[1] || "";
      bytes = Buffer.from(b64, "base64");
    } else {
      const res = await fetch(src, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return src.startsWith("http") ? src : null;
      bytes = Buffer.from(await res.arrayBuffer());
    }
    const key = `articles/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const blob = await put(key, bytes, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });
    return blob.url;
  } catch {
    // Yükleme başarısız → http kaynağı varsa onu döndür, yoksa fallback.
    return src.startsWith("http") ? src : null;
  }
}

const QUERY_MAP: Record<string, string[]> = {
  kripto: [
    "bitcoin digital abstract neon",
    "cryptocurrency neon chart dark",
    "blockchain technology abstract",
    "crypto trading dark screen chart",
    "digital currency futuristic",
    "bitcoin ethereum neon glow",
  ],
  borsa: [
    "stock market chart candlestick dark",
    "trading screen multiple monitors",
    "stock exchange graph green red dark",
    "financial chart analysis dark",
    "bull bear market abstract",
    "investment portfolio chart screen",
  ],
  doviz: [
    "forex trading chart screen dark",
    "currency exchange rate board",
    "global finance world map",
    "dollar euro exchange digital",
    "foreign exchange market screen",
    "currency trading chart analysis",
  ],
  altin: [
    "gold bars dark background luxury",
    "gold bullion vault dark",
    "gold investment dark luxury",
    "gold bar close up dark",
    "precious metal gold dark",
    "gold reserve bank vault",
  ],
  ekonomi: [
    "economy growth chart abstract",
    "financial data analytics dark",
    "business finance chart dark screen",
    "economic data graph screen",
    "central bank building modern",
    "inflation economy abstract chart",
  ],
};

const FALLBACK_QUERIES = [
  "financial technology abstract dark",
  "fintech digital abstract",
  "business analytics dark screen",
];

export async function fetchUnsplashImage(keyword: string, category: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const pool = QUERY_MAP[category] || QUERY_MAP.ekonomi;
  const query = pool[Math.floor(Math.random() * pool.length)];

  const result = await searchUnsplash(query, key);
  if (result) return result;

  const fallback = FALLBACK_QUERIES[Math.floor(Math.random() * FALLBACK_QUERIES.length)];
  return searchUnsplash(fallback, key);
}

async function searchUnsplash(query: string, key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape&content_filter=high&order_by=relevant`,
      {
        headers: { Authorization: `Client-ID ${key}` },
        signal: AbortSignal.timeout(8000),
      }
    );
    const data = await res.json();
    const results = (data.results || []).filter((r: Record<string, unknown>) => {
      const w = (r as { width?: number }).width || 0;
      const h = (r as { height?: number }).height || 0;
      return w > 800 && h > 400 && w / h > 1.2;
    });
    if (results.length === 0) return null;
    const pick = results[Math.floor(Math.random() * Math.min(8, results.length))];
    return (pick as { urls?: { regular?: string } }).urls?.regular || null;
  } catch {
    return null;
  }
}
