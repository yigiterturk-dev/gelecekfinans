/**
 * Kanıt kapısının GERÇEK geçiş oranını ölçer: kaç konu hakemsiz doğrulanıyor,
 * kaç konuya hakem sorulabiliyor, kaç konu hiç şansı olmadan ölüyor.
 * Ağ maliyeti yalnızca RSS; içerik çekimi yapılmaz.
 */
import Parser from "rss-parser";
import { RSS_FEEDS } from "@/lib/bot/config";
import { classifyTopicText } from "@/lib/bot/topics";
import { buildEvidencePacket, grayBandCandidates, storySimilarity, type ResearchCandidate } from "@/lib/bot/research";


const parser = new Parser({ timeout: 15000 });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    return await parser.parseString(await res.text());
  } finally { clearTimeout(timer); }
}

async function main() {
  const all: ResearchCandidate[] = [];
  await Promise.allSettled(RSS_FEEDS.map(async (url) => {
    const feed = await fetchFeed(url);
    for (const entry of (feed.items || []).slice(0, 40)) {
      const title = (entry.title || "").trim();
      if (!title) continue;
      const summary = (entry.contentSnippet || entry.content || "").slice(0, 300);
      const c = classifyTopicText(title, summary);
      if (!c.category) continue;
      const sourceUrl = entry.link || url;
      all.push({
        title, summary, category: c.category, source: feed.title || url, sourceUrl,
        pubDate: entry.pubDate ? new Date(entry.pubDate).getTime() : 0,
        sourcePriority: 50,
      } as ResearchCandidate);
    }
  }));

  const seen: ResearchCandidate[] = [];
  for (const t of all.sort((a, b) => b.sourcePriority - a.sourcePriority || b.pubDate - a.pubDate)) {
    if (!seen.some((s) => storySimilarity(s.title, t.title) >= 0.72)) seen.push(t);
  }
  const topics = seen;

  let verified = 0, grayOnly = 0, dead = 0;
  const deadTitles: string[] = [];
  for (const topic of topics) {
    const packet = buildEvidencePacket(topic, all);
    if (packet.status === "VERIFIED" && packet.independentSourceCount >= 2) { verified++; continue; }
    const gray = grayBandCandidates(topic, all);
    if (gray.length) grayOnly++;
    else { dead++; deadTitles.push(topic.title); }
  }
  console.log(`HAVUZ: ${all.length} aday, ${seen.length} tekil konu`);
  console.log(`TÜM KONULAR:`);
  console.log(`  hakemsiz DOĞRULANDI : ${verified}  (%${(100*verified/topics.length).toFixed(0)})`);
  console.log(`  hakeme sorulabilir  : ${grayOnly}  (%${(100*grayOnly/topics.length).toFixed(0)})`);
  console.log(`  ADAYSIZ ÖLÜ         : ${dead}  (%${(100*dead/topics.length).toFixed(0)})`);
  console.log("\nAdaysız ölenler:");
  for (const t of deadTitles.slice(0, 12)) console.log("  ×", t.slice(0, 90));
}
main();
