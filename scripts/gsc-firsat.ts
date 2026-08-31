import { attachPerformanceToKeywords, mineKeywordOpportunities, getRefreshCandidates } from "../lib/seo-feedback";

async function main() {
  const perf = await attachPerformanceToKeywords(90);
  console.log("havuz performansı işlendi:", JSON.stringify(perf));

  const mined = await mineKeywordOpportunities(90, 10);
  console.log(`\naday: ${mined.candidates} | eklendi: ${mined.added}`);
  for (const k of mined.picked) {
    console.log(`+ ${k.term} (gös ${k.impressions}, sıra ${k.position.toFixed(1)}, küme ${k.cluster})`);
  }

  const refresh = await getRefreshCandidates(90, 10);
  console.log(`\ntazeleme adayı sayfa: ${refresh.length}`);
  for (const r of refresh) {
    console.log(`  en iyi sıra ${r.bestPosition} | gös ${r.impressions} | ${r.page.replace("https://gelecekfinans.com", "")}`);
    for (const q of r.nearMissQueries) console.log(`      · ${q.query} → ${q.position} (gös ${q.impressions})`);
  }
}

main().catch((e) => console.error("HATA:", (e as Error).message));
