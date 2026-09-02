/**
 * İkinci bağımsız kaynak kapısını canlı ölçer.
 *
 * "Konu ikinci bağımsız kaynak bulunamadığı için durduruldu" engelinin
 * sebebi iki farklı şey olabilir: (a) 20 beslemelik havuzda gerçekten olay
 * örtüşmesi yok, (b) örtüşme var ama hakem fazla sıkı. Kayıtlar hakemin
 * gördüğü ÇİFTİ yazmadığı için ikisi ayırt edilemiyordu; bu araç çiftleri
 * gösterir. Varsayılan çalışma model çağırmaz (bedava); `--hakem` verilirse
 * ret gerekçelerini de okumak için doğrulayıcı modeli çağırır.
 */
import { getTopics } from "../lib/bot/topics";

async function main() {
  const askJudge = process.argv.includes("--hakem");
  const topics = await getTopics(40);
  const verified = topics.filter((t) => t.evidencePacket?.status === "VERIFIED");
  const blocked = topics.filter((t) => t.evidencePacket?.status !== "VERIFIED");

  console.log(`konu=${topics.length} hakemsiz-doğrulanan=${verified.length} kapıda-kalan=${blocked.length}`);
  const withCandidates = blocked.filter((t) => (t.corroborationCandidates?.length ?? 0) > 0);
  console.log(`kapıda kalanların ${withCandidates.length}'inde hakeme sorulacak aday VAR, ${blocked.length - withCandidates.length}'inde HİÇ aday yok\n`);

  const judge = askJudge ? (await import("../lib/bot/writer")).judgeSameStory : null;

  for (const topic of withCandidates) {
    console.log(`\n▶ ${topic.title}`);
    console.log(`  [${topic.source}] ${topic.summary.slice(0, 140)}`);
    for (const candidate of topic.corroborationCandidates ?? []) {
      const verdict = judge ? await judge(topic, candidate) : null;
      const mark = verdict === null ? "  ?" : verdict ? "  ✅" : "  ❌";
      console.log(`${mark} [${candidate.source}] ${candidate.title}`);
      console.log(`      ${candidate.summary.slice(0, 140)}`);
    }
  }

  if (!withCandidates.length && blocked.length) {
    console.log("Aday hiç yok: darboğaz hakem değil, besleme havuzundaki olay örtüşmesi.");
  }
}

main().then(() => process.exit(0));
