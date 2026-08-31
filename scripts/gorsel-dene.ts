import { getArticleImageResult } from "../lib/bot/images";
async function main() {
  const r = await getArticleImageResult({
    title: "EPDK'dan doğal gaz ve LPG tarifelerinde güncelleme",
    keyword: "EPDK düzenleme", category: "ekonomi", slug: "epdk-test-gorsel",
    recentConcepts: [], maxAttempts: 1, evidenceSourceCount: 2,
  });
  console.log(JSON.stringify({ url: r.url, strategy: r.strategy, brief: r.brief, attempts: r.attempts }, null, 2));
}
main().catch((e) => console.error("HATA:", e));
