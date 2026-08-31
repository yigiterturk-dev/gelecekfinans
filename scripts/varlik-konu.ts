/**
 * Terfi etmiş varlık kelimelerinin YAZILABİLİRLİK kontrolü.
 *
 * Yazar çağrısı yapmadan, arşivden toplanacak kanıtın gerçekten yetip
 * yetmediğini gösterir. Amaç bir kelimenin canlı koşumda "kanıt yetersiz"
 * diye düşeceğini önceden görmek: o koşum bütçeden bir yazar çağrısı
 * ayırmadan durur ama zamanı yer. Model çağırmaz — bedava.
 */
import { prisma } from "../lib/db";
import { buildEntityTopic, loadEntitySourceByName, MIN_ENTITY_EVIDENCE_CHARS } from "../lib/bot/entity-topic";

async function main() {
  // `npx tsx scripts/varlik-konu.ts "Koç Holding"` — terfi etmemiş bir varlığı
  // da denetler: "bugün terfi etse yazılabilir miydi?" sorusunun bedava cevabı.
  const aranan = process.argv.slice(2).join(" ").trim();
  if (aranan) {
    const source = await loadEntitySourceByName(aranan);
    if (!source) {
      console.log(`"${aranan}" adında varlık kaydı yok.`);
      return;
    }
    const konu = await buildEntityTopic(
      { id: "-", term: source.entity.name, category: "ekonomi", cluster: "-", isHub: false, intent: "INFORMATIONAL", priority: 90, origin: "entity" },
      { source },
    );
    const paket = konu.evidencePacket;
    console.log(`${source.entity.name} (${source.entity.type}) · ${source.articles.length} haberde geçiyor`);
    console.log(`${paket.status === "VERIFIED" ? "✅ yazılabilir" : "⛔ kanıt yetersiz"} · ${paket.evidence.length} kanıt · ${paket.independentSourceCount} yayıncı`);
    for (const sebep of paket.reasons) console.log(`   · ${sebep}`);
    for (const item of paket.evidence) console.log(`   [${item.id}] ${item.source} — ${item.title.slice(0, 70)}`);
    return;
  }

  const kelimeler = await prisma.keyword.findMany({
    where: { origin: "entity" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true, term: true, category: true, cluster: true,
      isHub: true, intent: true, priority: true, origin: true, status: true,
    },
  });

  if (!kelimeler.length) {
    console.log("Terfi etmiş varlık kelimesi yok. Önce: npx tsx scripts/varlik-terfi.ts");
    return;
  }

  console.log(`${kelimeler.length} varlık kelimesi · kanıt eşiği ${MIN_ENTITY_EVIDENCE_CHARS} karakter\n`);
  let hazir = 0;

  for (const kelime of kelimeler) {
    const konu = await buildEntityTopic(kelime);
    const paket = konu.evidencePacket;
    const isaret = paket.status === "VERIFIED" ? "✅" : "⛔";
    if (paket.status === "VERIFIED") hazir++;
    console.log(`${isaret} ${kelime.term}  [${kelime.status}]`);
    console.log(`      kanıt: ${paket.evidence.length} parça · ${paket.independentSourceCount} yayıncı · iç link: ${konu.clusterArticles.length}`);
    for (const sebep of paket.reasons) console.log(`      · ${sebep}`);
  }

  console.log(`\nyazılabilir: ${hazir}/${kelimeler.length}`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
