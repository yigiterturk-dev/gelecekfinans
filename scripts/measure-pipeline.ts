/**
 * Salt okunur, sıfır model çağrılı yazı hattı kuru koşusu.
 * Canlı orchestrator'ın aday seçimini taklit eder; makale yazmaz ve DB'ye yazmaz.
 */
import { prisma } from "@/lib/db";
import { matchHookTopic } from "@/lib/bot/hook-topics";
import { getTopics } from "@/lib/bot/topics";
import { MIN_EVIDENCE_MATERIAL_CHARS, evidenceMaterialCharacterCount } from "@/lib/bot/research";

async function main() {
  const started = Date.now();
  // Orchestrator default: count=1, candidate pool=count*24, shortlist=count*8.
  const count = 1;
  const candidates = await getTopics(count * 24);
  // DB URL yoksa RSS kuru koşusu yine çalışır; kalite soğutması ölçülemez.
  const recentQualityEvents = process.env.DATABASE_URL
    ? await prisma.automationEvent.findMany({
        where: {
          stage: "quality",
          level: "warning",
          createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
        select: { metadata: true },
      })
    : [];
  const cooledTitles = new Set(
    recentQualityEvents.flatMap((event) => {
      const metadata = event.metadata as { title?: unknown } | null;
      return typeof metadata?.title === "string"
        ? [metadata.title.trim().toLocaleLowerCase("tr-TR")]
        : [];
    }),
  );
  const notCooled = candidates.filter(
    (topic) => !cooledTitles.has(topic.title.trim().toLocaleLowerCase("tr-TR")),
  );
  const hookFilterEnabled = process.env.NEWS_HOOK_FILTER !== "off";
  const hookEligible = hookFilterEnabled
    ? notCooled.filter((topic) => matchHookTopic(topic.title))
    : notCooled;
  const selected = hookEligible.slice(0, count * 8);

  const tally = { verifiedReady: 0, thinEvidence: 0, grayJudge: 0, dead: 0 };
  for (const topic of selected) {
    const packet = topic.evidencePacket;
    if (!packet) { tally.dead++; continue; }
    const material = evidenceMaterialCharacterCount(packet);
    if (packet.status === "VERIFIED" && packet.independentSourceCount >= 2) {
      if (material >= MIN_EVIDENCE_MATERIAL_CHARS) tally.verifiedReady++;
      else tally.thinEvidence++;
      continue;
    }
    if (topic.corroborationCandidates?.length) tally.grayJudge++;
    else tally.dead++;
  }

  console.log(`${((Date.now() - started) / 1000).toFixed(0)} sn · SIFIR model çağrısı · salt okunur`);
  console.log(`RSS aday havuzu: ${candidates.length} / ${count * 24}`);
  console.log(
    process.env.DATABASE_URL
      ? `Son 6 saat kalite soğutması: ${candidates.length - notCooled.length}`
      : "Son 6 saat kalite soğutması: ölçülemedi (DB URL yok)",
  );
  console.log(`Kanca filtresi (${hookFilterEnabled ? "açık" : "kapalı"}): ${hookEligible.length}`);
  console.log(`Canlı sıraya benzer ilk ${count * 8}: ${selected.length}`);
  console.log(`  ✅ Doğrudan yazara hazır: ${tally.verifiedReady}`);
  console.log(`  ⚠️  Kanıt metni kısa:      ${tally.thinEvidence}`);
  console.log(`  ❓ Hakem adayı var:       ${tally.grayJudge}`);
  console.log(`  ❌ İkinci kaynak yok:     ${tally.dead}`);
  if (selected.length) {
    console.log("\nSeçilen başlıklar ve kanıt durumu:");
    for (const topic of selected) {
      const packet = topic.evidencePacket;
      const material = packet ? evidenceMaterialCharacterCount(packet) : 0;
      console.log(
        `  ${packet?.status ?? "MISSING"} · ${packet?.independentSourceCount ?? 0} kaynak · ${material} kr · hakem adayı ${topic.corroborationCandidates?.length ?? 0} · ${topic.title}`,
      );
    }
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "Kuru koşu başarısız oldu");
  await prisma.$disconnect();
  process.exitCode = 1;
});
