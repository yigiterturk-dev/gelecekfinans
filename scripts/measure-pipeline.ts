/**
 * Uçtan uca KURU KOŞU: tek bir ücretli model çağrısı yapmadan, bir koşumun
 * yazara kaç konu taşıyabildiğini ölçer. Hakem çağrısı gerektiren gri bant
 * ayrıca sayılır; burada yalnızca HAKEMSİZ geçen yol ölçülür ki sonuç
 * modelden bağımsız ve tekrarlanabilir olsun.
 */
import { getTopics } from "@/lib/bot/topics";
import { MIN_EVIDENCE_MATERIAL_CHARS, evidenceMaterialCharacterCount } from "@/lib/bot/research";

async function main() {
  const started = Date.now();
  const topics = await getTopics(40);
  let verified = 0, thinEvidence = 0, gray = 0, dead = 0;
  const thin: string[] = [];
  const ready: string[] = [];

  for (const topic of topics) {
    const packet = topic.evidencePacket;
    const material = evidenceMaterialCharacterCount(packet);
    if (packet.status === "VERIFIED" && packet.independentSourceCount >= 2) {
      if (material >= MIN_EVIDENCE_MATERIAL_CHARS) { verified++; ready.push(`${material} kr · ${topic.title}`); }
      else { thinEvidence++; thin.push(`${material} kr · ${topic.title}`); }
      continue;
    }
    if (topic.corroborationCandidates?.length) gray++;
    else dead++;
  }

  console.log(`${topics.length} konu, ${((Date.now() - started) / 1000).toFixed(0)} sn, SIFIR model çağrısı\n`);
  console.log(`  ✅ YAZARA HAZIR (hakemsiz)   : ${verified}`);
  console.log(`  ⚠️  kanıt metni yetersiz     : ${thinEvidence}  (eşik ${MIN_EVIDENCE_MATERIAL_CHARS} karakter)`);
  console.log(`  ❓ hakeme sorulacak          : ${gray}`);
  console.log(`  ❌ adaysız ölü               : ${dead}`);
  if (ready.length) {
    console.log("\nYazara hazır ilk 8:");
    for (const row of ready.slice(0, 8)) console.log("  ✓", row.slice(0, 100));
  }
  if (thin.length) {
    console.log("\nKanıtı ince kalanlar:");
    for (const row of thin.slice(0, 8)) console.log("  ×", row.slice(0, 100));
  }
}
main();
