import Parser from "rss-parser";
import { RSS_FEEDS } from "@/lib/bot/config";
import { classifyTopicText } from "@/lib/bot/topics";

const parser = new Parser({ timeout: 15000 });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await parser.parseString(await res.text());
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  let total = 0, classified = 0, feedErrors = 0;
  const dropped: string[] = [];
  const kept: string[] = [];
  const perFeed: Record<string, [number, number]> = {};
  await Promise.allSettled(RSS_FEEDS.map(async (url) => {
    try {
      const feed = await fetchFeed(url);
      const name = feed.title || url;
      for (const entry of (feed.items || []).slice(0, 40)) {
        const title = (entry.title || "").trim();
        if (!title) continue;
        total++;
        perFeed[name] = perFeed[name] || [0, 0];
        perFeed[name][0]++;
        const summary = (entry.contentSnippet || entry.content || "").slice(0, 300);
        const c = classifyTopicText(title, summary);
        if (c.category) { classified++; perFeed[name][1]++; kept.push(`[${c.category}] ${title}`); }
        else dropped.push(title);
      }
    } catch { feedErrors++; }
  }));
  console.log(`FEED: ${RSS_FEEDS.length} adet, ${feedErrors} hata`);
  console.log(`HAVUZ: ${total} item -> ${classified} sınıflandı (%${(100*classified/total).toFixed(0)}), ${dropped.length} DÜŞTÜ`);
  console.log("\n── HAVUZA GİREN (rastgele 30) ──");
  for (const t of kept.sort(() => Math.random() - 0.5).slice(0, 30)) console.log("  ✓", t.slice(0, 100));
  console.log("\n── HÂLÂ DÜŞEN (rastgele 25) ──");
  for (const t of dropped.sort(() => Math.random() - 0.5).slice(0, 25)) console.log("  ×", t.slice(0, 100));
}
main();
