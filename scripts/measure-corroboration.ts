/**
 * Kanıt kapısının GERÇEK geçiş oranını ölçer: kaç konu hakemsiz doğrulanıyor,
 * kaç konuya hakem sorulabiliyor, kaç konu hiç şansı olmadan ölüyor.
 * Ağ maliyeti yalnızca RSS; içerik çekimi yapılmaz.
 */
import Parser from "rss-parser";
import { RSS_FEEDS } from "@/lib/bot/config";
import { classifyTopicText } from "@/lib/bot/topics";
import {
  buildEvidencePacket, grayBandCandidates, hasConflictingStoryPhase, hasSameStoryPhase,
  publisherKey, STORY_MATCH_THRESHOLD, storySimilarity, storyTokens, type ResearchCandidate,
} from "@/lib/bot/research";


const parser = new Parser({ timeout: 15000 });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

async function fetchFeed(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const xml = await res.text();
    try {
      return await parser.parseString(xml);
    } catch {
      // Production retries through rss-parser with its own request headers.
      // Some feeds intermittently answer browser fetches with an HTML page.
      return await parser.parseURL(url);
    }
  } finally { clearTimeout(timer); }
}

function host(url?: string): string {
  try { return url ? new URL(url).hostname.replace(/^www\./, "") : "unknown"; }
  catch { return "unknown"; }
}

function eventTokenProfile(value: string): Set<string> {
  return new Set(storyTokens(value).map((token) => {
    if (token.startsWith("emekl")) return "retired";
    if (token.startsWith("aylig") || token.startsWith("aylik") || token.startsWith("maas")) return "income";
    if (token.startsWith("kesil") || token.startsWith("kesint")) return "cut";
    return token;
  }));
}

function eventTokenSimilarity(a: string, b: string) {
  const left = eventTokenProfile(a);
  const right = eventTokenProfile(b);
  const shared = [...left].filter((token) => right.has(token));
  const union = new Set([...left, ...right]).size;
  const jaccard = union ? shared.length / union : 0;
  const containment = shared.length / Math.max(1, Math.min(left.size, right.size));
  return { jaccard, similarity: Math.max(jaccard, containment * 0.82), shared };
}

function legacyGrayCandidates(primary: ResearchCandidate, candidates: ResearchCandidate[], limit = 3) {
  const eventWindowMs = 14 * 24 * 60 * 60 * 1000;
  const marketSessionWindowMs = 36 * 60 * 60 * 1000;
  const ranked = candidates
    .filter((candidate) => candidate === primary || !hasConflictingStoryPhase(primary.title, candidate.title))
    .filter((candidate) => {
      if (candidate === primary || !primary.pubDate || !candidate.pubDate) return true;
      const window = hasSameStoryPhase(primary.title, candidate.title) ? marketSessionWindowMs : eventWindowMs;
      return Math.abs(primary.pubDate - candidate.pubDate) <= window;
    })
    .map((candidate) => ({ candidate, title: storySimilarity(primary.title, candidate.title) }))
    .filter(({ candidate, title }) => candidate !== primary && Boolean(candidate.sourceUrl) && title < STORY_MATCH_THRESHOLD)
    .map(({ candidate }) => ({ candidate, score: storySimilarity(`${primary.title} ${primary.summary}`, `${candidate.title} ${candidate.summary}`) }))
    .filter(({ score }) => score >= 0.2)
    .sort((a, b) => b.score - a.score || b.candidate.sourcePriority - a.candidate.sourcePriority);
  const seen = new Set([publisherKey(primary)]);
  const output: ResearchCandidate[] = [];
  for (const { candidate } of ranked) {
    const key = publisherKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(candidate);
    if (output.length >= limit) break;
  }
  return output;
}

async function main() {
  const all: ResearchCandidate[] = [];
  const feedResults = await Promise.allSettled(RSS_FEEDS.map(async (url) => {
    const host = new URL(url).hostname;
    const feed = await fetchFeed(url);
    let financeCandidates = 0;
    for (const entry of (feed.items || []).slice(0, 40)) {
      const title = (entry.title || "").trim();
      if (!title) continue;
      const summary = (entry.contentSnippet || entry.content || "").slice(0, 300);
      const c = classifyTopicText(title, summary);
      if (!c.category) continue;
      financeCandidates++;
      const sourceUrl = entry.link || url;
      all.push({
        title, summary, category: c.category, source: feed.title || url, sourceUrl,
        pubDate: entry.pubDate ? new Date(entry.pubDate).getTime() : 0,
        sourcePriority: 50,
      } as ResearchCandidate);
    }
    return { host, itemCount: (feed.items || []).length, financeCandidates };
  }));
  const successfulFeeds = feedResults.filter((result) => result.status === "fulfilled");
  const failedFeeds = feedResults.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  console.log(`FEEDS: ${RSS_FEEDS.length} configured, ${successfulFeeds.length} fetched, ${failedFeeds.length} failed`);
  for (const [index, result] of feedResults.entries()) {
    if (result.status === "fulfilled") {
      console.log(`  OK ${result.value.host}: ${result.value.itemCount} items, ${result.value.financeCandidates} finance candidates`);
    } else {
      const host = new URL(RSS_FEEDS[index]).hostname;
      const detail = result.reason instanceof Error
        ? result.reason.message.replace(/https?:\/\/\S+/g, "[URL]")
        : "unknown error";
      console.log(`  FAIL ${host}: ${detail}`);
    }
  }

  const seen: ResearchCandidate[] = [];
  for (const t of all.sort((a, b) => b.sourcePriority - a.sourcePriority || b.pubDate - a.pubDate)) {
    if (!seen.some((s) => storySimilarity(s.title, t.title) >= 0.72)) seen.push(t);
  }
  const topics = seen;

  let verified = 0, grayOnly = 0, dead = 0;
  const deadTopics: ResearchCandidate[] = [];
  const unverifiableTopics: ResearchCandidate[] = [];
  for (const topic of topics) {
    const packet = buildEvidencePacket(topic, all);
    if (packet.status === "VERIFIED" && packet.independentSourceCount >= 2) { verified++; continue; }
    unverifiableTopics.push(topic);
    const gray = grayBandCandidates(topic, all);
    if (gray.length) grayOnly++;
    else { dead++; deadTopics.push(topic); }
  }
  console.log(`HAVUZ: ${all.length} aday, ${seen.length} tekil konu`);
  console.log(`TÜM KONULAR:`);
  console.log(`  hakemsiz DOĞRULANDI : ${verified}  (%${(100*verified/topics.length).toFixed(0)})`);
  console.log(`  hakeme sorulabilir  : ${grayOnly}  (%${(100*grayOnly/topics.length).toFixed(0)})`);
  console.log(`  ADAYSIZ ÖLÜ         : ${dead}  (%${(100*dead/topics.length).toFixed(0)})`);
  let legacyEligible = 0, legacyPairs = 0, revisedEligible = 0, revisedPairs = 0;
  for (const topic of unverifiableTopics) {
    const before = legacyGrayCandidates(topic, all);
    const after = grayBandCandidates(topic, all);
    if (before.length) legacyEligible++;
    legacyPairs += before.length;
    if (after.length) revisedEligible++;
    revisedPairs += after.length;
  }
  console.log(`  ESKİ → YENİ (0.20): ${legacyEligible}/${legacyPairs} → ${revisedEligible}/${revisedPairs}`);
  const candidateCache = new Map<ResearchCandidate, Array<{
    candidate: ResearchCandidate; combined: number; title: number; titleJaccard: number;
    summary: number; summaryJaccard: number; eventTitle: number; eventTitleJaccard: number;
  }>>();
  for (const topic of unverifiableTopics) {
    const candidates = grayBandCandidates(topic, all, 10_000, 0);
    candidateCache.set(topic, candidates.map((candidate) => {
      const primaryTokens = new Set(storyTokens(topic.title));
      const candidateTokens = new Set(storyTokens(candidate.title));
      const intersection = [...primaryTokens].filter((token) => candidateTokens.has(token)).length;
      const union = new Set([...primaryTokens, ...candidateTokens]).size;
      const primarySummaryTokens = new Set(storyTokens(topic.summary));
      const candidateSummaryTokens = new Set(storyTokens(candidate.summary));
      const summaryIntersection = [...primarySummaryTokens].filter((token) => candidateSummaryTokens.has(token)).length;
      const summaryUnion = new Set([...primarySummaryTokens, ...candidateSummaryTokens]).size;
      const eventProfile = eventTokenSimilarity(topic.title, candidate.title);
      return {
        candidate,
        combined: storySimilarity(`${topic.title} ${topic.summary}`, `${candidate.title} ${candidate.summary}`),
        title: storySimilarity(topic.title, candidate.title),
        titleJaccard: union ? intersection / union : 0,
        summary: storySimilarity(topic.summary, candidate.summary),
        summaryJaccard: summaryUnion ? summaryIntersection / summaryUnion : 0,
        eventTitle: eventProfile.similarity,
        eventTitleJaccard: eventProfile.jaccard,
      };
    }));
  }
  const score = (pair: { combined: number; title: number; titleJaccard: number; summary: number; summaryJaccard: number; eventTitle: number; eventTitleJaccard: number }, mode: "combined" | "max-title-combined" | "distinctive-title" | "strong-title" | "summary-overlap" | "event-title") => {
    if (mode === "summary-overlap") return pair.summaryJaccard >= 0.15 && pair.summary >= 0.25
      ? Math.max(pair.combined, pair.summary) : pair.combined;
    if (mode === "event-title") return pair.eventTitleJaccard >= 0.2 && pair.eventTitle >= 0.4
      ? Math.max(pair.combined, pair.eventTitle) : pair.combined;
    const useTitle = mode === "max-title-combined" || (pair.titleJaccard >= 0.2 && (mode !== "strong-title" || pair.title >= 0.4));
    return useTitle ? Math.max(pair.combined, pair.title) : pair.combined;
  };
  const sweep = (threshold: number, scoreMode: "combined" | "max-title-combined" | "distinctive-title" | "strong-title" | "summary-overlap" | "event-title") => {
    let eligibleTopics = 0;
    let candidateCount = 0;
    for (const topic of unverifiableTopics) {
      const pairs = (candidateCache.get(topic) || [])
        .filter((pair) => score(pair, scoreMode) >= threshold)
        .sort((a, b) => score(b, scoreMode) - score(a, scoreMode))
        .slice(0, 3);
      if (pairs.length) eligibleTopics++;
      candidateCount += pairs.length;
    }
    return { eligibleTopics, candidateCount };
  };
  console.log("\nGri bant eşiği taraması (aynı RSS anlık görüntüsü, en çok 3 aday/konu):");
  for (const threshold of [0.16, 0.18, 0.2, 0.24, 0.26, 0.28, 0.3, 0.32]) {
    const combined = sweep(threshold, "combined");
    const maxTitle = sweep(threshold, "max-title-combined");
    const distinctive = sweep(threshold, "distinctive-title");
    const strong = sweep(threshold, "strong-title");
    const summary = sweep(threshold, "summary-overlap");
    const eventTitle = sweep(threshold, "event-title");
    console.log(`  ${threshold.toFixed(2)} | combined ${combined.eligibleTopics}/${combined.candidateCount} | max(title,combined) ${maxTitle.eligibleTopics}/${maxTitle.candidateCount} | title J≥.20 & score≥.40 ${strong.eligibleTopics}/${strong.candidateCount} | summary gate ${summary.eligibleTopics}/${summary.candidateCount} | Turkish event tokens ${eventTitle.eligibleTopics}/${eventTitle.candidateCount}`);
  }
  console.log("\nTurkish event-token candidates appended after the current ranking (limit 3):");
  let eventAddedPairs = 0, eventAddedTopics = 0;
  for (const topic of unverifiableTopics) {
    const current = [] as NonNullable<ReturnType<typeof candidateCache.get>>;
    const seenCurrent = new Set([publisherKey(topic)]);
    const currentRanked = (candidateCache.get(topic) || [])
      .filter((pair) => score(pair, "strong-title") >= 0.2)
      .sort((a, b) => score(b, "strong-title") - score(a, "strong-title") || b.candidate.sourcePriority - a.candidate.sourcePriority);
    for (const pair of currentRanked) {
      const publisher = publisherKey(pair.candidate);
      if (seenCurrent.has(publisher)) continue;
      seenCurrent.add(publisher);
      current.push(pair);
      if (current.length >= 3) break;
    }
    const seenUrls = new Set(current.map((pair) => pair.candidate.sourceUrl));
    const seenPublishers = new Set([publisherKey(topic), ...current.map((pair) => publisherKey(pair.candidate))]);
    const capacity = Math.max(0, 3 - current.length);
    const added = capacity ? (candidateCache.get(topic) || [])
      .filter((pair) => pair.eventTitleJaccard >= 0.2 && pair.eventTitle >= 0.4)
      .filter((pair) => Math.max(pair.combined, pair.eventTitle) >= 0.2)
      .filter((pair) => !seenUrls.has(pair.candidate.sourceUrl) && !seenPublishers.has(publisherKey(pair.candidate)))
      .sort((a, b) => b.eventTitle - a.eventTitle || b.candidate.sourcePriority - a.candidate.sourcePriority)
      .slice(0, capacity) : [];
    if (current.length === 0 && added.length) eventAddedTopics++;
    for (const pair of added) {
      eventAddedPairs++;
      console.log(`  event title ${(pair.eventTitle * 100).toFixed(0)}% J${(pair.eventTitleJaccard * 100).toFixed(0)}% | ${topic.title.slice(0, 65)} [${host(topic.sourceUrl)}] ⇄ ${pair.candidate.title.slice(0, 65)} [${host(pair.candidate.sourceUrl)}]`);
    }
  }
  console.log(`  additional pairs=${eventAddedPairs}; newly eligible topics=${eventAddedTopics}`);
  for (const topic of unverifiableTopics.filter((item) => /sgk/i.test(item.title))) {
    for (const pair of candidateCache.get(topic) || []) {
      if (/sozcu|cumhuriyet/i.test(host(pair.candidate.sourceUrl))) {
        console.log(`  SGK PAIR ${host(pair.candidate.sourceUrl)} | title ${(pair.title * 100).toFixed(0)}% J${(pair.titleJaccard * 100).toFixed(0)}% | event ${(pair.eventTitle * 100).toFixed(0)}% J${(pair.eventTitleJaccard * 100).toFixed(0)}% | summary ${(pair.summary * 100).toFixed(0)}% J${(pair.summaryJaccard * 100).toFixed(0)}% | combined ${(pair.combined * 100).toFixed(0)}% | ${pair.candidate.title.slice(0, 100)}`);
        console.log(`    PRIMARY SUMMARY: ${topic.summary.slice(0, 400)}`);
        console.log(`    CANDIDATE SUMMARY: ${pair.candidate.summary.slice(0, 400)}`);
        const left = new Set(storyTokens(`${topic.title} ${topic.summary}`));
        const right = new Set(storyTokens(`${pair.candidate.title} ${pair.candidate.summary}`));
        console.log(`    SHARED TOKENS: ${[...left].filter((token) => right.has(token)).join(", ") || "none"}`);
      }
    }
  }
  console.log("  Eşik yükseltmek çağrıları azaltabilir; bu tarama hangi adayın gerçekten aynı olay olduğunu kanıtlamaz.");
  console.log("\nYeni kuralın eski 0.20 kuralına göre eklediği adaylar:");
  let addedPairs = 0;
  let newlyEligibleTopics = 0;
  for (const topic of unverifiableTopics) {
    const existing = new Set(legacyGrayCandidates(topic, all).map((candidate) => candidate.sourceUrl));
    const added = grayBandCandidates(topic, all).filter((candidate) => !existing.has(candidate.sourceUrl));
    if (existing.size === 0 && added.length > 0) {
      newlyEligibleTopics++;
      console.log(`  YENİ KONU: ${topic.title.slice(0, 90)} [${host(topic.sourceUrl)}]`);
    }
    for (const candidate of added) {
      addedPairs++;
      const pair = (candidateCache.get(topic) || []).find((item) => item.candidate === candidate);
      const title = pair?.title || 0;
      const combined = pair?.combined || 0;
      const score = Math.max(title, combined);
      console.log(
        `  ${(score * 100).toFixed(0)}% (title ${(title * 100).toFixed(0)}%, Jaccard ${((pair?.titleJaccard || 0) * 100).toFixed(0)}%, combined ${(combined * 100).toFixed(0)}%) ${topic.title.slice(0, 72)} [${host(topic.sourceUrl)}] ⇄ ${candidate.title.slice(0, 72)} [${host(candidate.sourceUrl)}]`,
      );
    }
  }
  console.log(`  toplam ek aday çifti: ${addedPairs}; ilk kez aday bulan konu: ${newlyEligibleTopics}`);
  console.log("\nAdaysız ölenler ve farklı feed hostlarındaki en yakın başlıklar (filtre dışı, elle inceleme içindir):");
  for (const topic of deadTopics.slice(0, 12)) {
    const topicHost = host(topic.sourceUrl);
    const nearest = all
      .filter((candidate) => {
        if (candidate === topic || !candidate.sourceUrl) return false;
        return host(candidate.sourceUrl) !== topicHost;
      })
      .map((candidate) => ({
        candidate,
        similarity: storySimilarity(`${topic.title} ${topic.summary}`, `${candidate.title} ${candidate.summary}`),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 2);
    console.log(`  × ${topic.title.slice(0, 90)} [${topicHost}]`);
    for (const match of nearest) {
      console.log(`    ${(match.similarity * 100).toFixed(0)}% ${match.candidate.title.slice(0, 88)} [${host(match.candidate.sourceUrl)}]`);
    }
  }
}
main();
