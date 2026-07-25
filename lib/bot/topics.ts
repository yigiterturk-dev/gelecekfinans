import Parser from "rss-parser";
import { RSS_FEEDS, CATEGORIES } from "./config";

export interface Topic {
  title: string;
  summary: string;
  category: string;
  source: string;
  sourceUrl?: string;
  imageUrl?: string;
}

const parser = new Parser({ timeout: 10000 });

// Bazı Türk siteleri User-Agent'sız isteği bloklar; gerçek tarayıcı UA ile çekiyoruz.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function extractImageFromContent(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

// Feed'i önce UA'lı fetch ile çek, parseString'e ver; olmazsa parser.parseURL fallback.
async function fetchFeed(url: string) {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return await parser.parseString(xml);
  } catch {
    return await parser.parseURL(url);
  }
}

interface RawTopic extends Topic {
  pubDate: number;
}

// Kategori anahtarları tutmadığında "bu haber finans/ekonomiyle ilgili mi?" kontrolü.
// Geniş tutuldu ki gerçek ekonomi haberi elenmesin, ama asayiş/spor/magazin/kaza elensin.
const ECONOMY_RELEVANCE = [
  "ekonomi", "ekonomik", "finans", "piyasa", "borsa", "hisse", "endeks", "yatırım", "yatırımcı",
  "dolar", "euro", "sterlin", "kur", "döviz", "altın", "gram", "ons",
  "faiz", "enflasyon", "merkez bankası", "tcmb", "fed", "büyüme", "resesyon", "durgunluk",
  "ihracat", "ithalat", "ticaret", "gümrük", "tarife", "bütçe", "vergi", "teşvik",
  "istihdam", "işsizlik", "asgari ücret", "maaş", "zam", "sanayi", "üretim", "kapasite",
  "gsyih", "gsyh", "üfe", "tüfe", "gfe", "cari açık", "rezerv", "kredi", "borç", "tahvil",
  "banka", "bankacılık", "şirket", "bilanço", "temettü", "halka arz", "imf", "dünya bankası",
  "petrol", "doğalgaz", "enerji", "emtia", "konut", "kira", "fiyat", "güven endeksi", "tüketici",
];

export async function getTopics(limit = 20, category?: string): Promise<Topic[]> {
  const all: RawTopic[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const feed = await fetchFeed(url);
      for (const entry of (feed.items || []).slice(0, 20)) {
        const title = (entry.title || "").trim();
        if (!title) continue;

        const pubDate = entry.pubDate ? new Date(entry.pubDate).getTime() : 0;
        const summary = (entry.contentSnippet || entry.content || "").slice(0, 300);

        const e = entry as Record<string, unknown>;
        const enclosure = e.enclosure as Record<string, string> | undefined;
        const media = e["media:content"] as Record<string, Record<string, string>> | undefined;
        const imageUrl =
          enclosure?.url ||
          media?.["$"]?.url ||
          extractImageFromContent(entry.content || "") ||
          undefined;

        const text = (title + " " + summary).toLowerCase();

        // Önce 4 fiyat kategorisi (kripto/borsa/doviz/altin) + ekonomi anahtarları.
        let cat = "";
        for (const [c, keywords] of Object.entries(CATEGORIES)) {
          if (keywords.some((kw) => text.includes(kw))) {
            cat = c;
            break;
          }
        }

        // Kategori tutmadıysa: finans/ekonomi ile gerçekten ilgili mi? Değilse ATLA.
        // (Metro kazası, magazin, spor, asayiş gibi haberler finans sitesine konu değil —
        //  eskiden default 'ekonomi'ye düşüp absürt "ekonomik analiz" makalesi oluyordu.)
        if (!cat) {
          if (ECONOMY_RELEVANCE.some((kw) => text.includes(kw))) cat = "ekonomi";
          else continue;
        }

        all.push({
          title,
          summary,
          category: cat,
          source: feed.title || url,
          sourceUrl: entry.link || url,
          imageUrl,
          pubDate,
        });
      }
    })
  );

  const errors = results.filter((r) => r.status === "rejected").length;
  if (errors > 0) console.log(`[topics] ${errors}/${RSS_FEEDS.length} RSS feed hata verdi`);

  // Kademeli zaman penceresi: 48h yetmezse 96h, en kötü ihtimalde tümü.
  // Böylece "altın" gibi az haberli kategorilerde "konu bulunamadı" olmaz.
  const windows = [48, 96, 0]; // saat (0 = sınırsız)
  const now = Date.now();
  let unique: Topic[] = [];

  for (const hours of windows) {
    const cutoff = hours > 0 ? now - hours * 60 * 60 * 1000 : 0;
    const inWindow = all.filter((t) => !t.pubDate || t.pubDate >= cutoff);
    const filtered =
      category && category !== "otomatik"
        ? inWindow.filter((t) => t.category === category)
        : inWindow;

    const seen = new Set<string>();
    unique = [];
    for (const t of filtered) {
      const key = t.title.slice(0, 40).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          title: t.title,
          summary: t.summary,
          category: t.category,
          source: t.source,
          sourceUrl: t.sourceUrl,
          imageUrl: t.imageUrl,
        });
      }
    }
    if (unique.length >= 5) break; // yeterli konu bulundu, pencereyi genişletme
  }

  return unique.slice(0, limit);
}
