/**
 * Geriye dönük varlık çıkarımı: zaten yayımlanmış haberlerin kanıt
 * paketlerinden varlıkları toplar.
 *
 * ⚠️ MODEL ÇAĞIRIR — makale başına bir doğrulayıcı çağrısı (gpt-5-mini,
 * minimal reasoning, ~1600 token tavan). Kaç makale işleneceği önce
 * yazdırılır; --uygula verilmeden hiçbir çağrı yapılmaz.
 */
import { prisma } from "../lib/db";
import { extractEntities } from "../lib/bot/writer";
import { recordEntities } from "../lib/bot/entities";

const UYGULA = process.argv.includes("--uygula");
const LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1]) || 25;

interface StoredEvidence { title: string; summary: string; content?: string }

async function main() {
  const makaleler = await prisma.article.findMany({
    where: { articleSource: "BOT" },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: { id: true, title: true, category: true, automationMeta: true, entityMentions: { select: { id: true } } },
  });

  const islenecek = makaleler.filter((m) => {
    if (m.entityMentions.length) return false;
    const meta = m.automationMeta as { evidencePacket?: { evidence?: StoredEvidence[] } } | null;
    return (meta?.evidencePacket?.evidence?.length ?? 0) > 0;
  });

  console.log(`aday makale: ${makaleler.length} | kanıtı olan ve henüz işlenmemiş: ${islenecek.length}`);
  for (const m of islenecek) console.log(`  · ${m.title.slice(0, 70)}`);

  if (!UYGULA) {
    console.log(`\nKuru çalışma. Uygulamak için: npx tsx scripts/varlik-gecmis.ts --uygula`);
    console.log(`Tahmini ${islenecek.length} model çağrısı yapılacak.`);
    return;
  }

  let toplamKayit = 0;
  let toplamRet = 0;
  for (const m of islenecek) {
    const meta = m.automationMeta as { evidencePacket?: { evidence?: StoredEvidence[] } };
    const evidence = meta.evidencePacket?.evidence ?? [];
    const evidenceText = evidence
      .map((item) => [item.title, item.content || item.summary].filter(Boolean).join(". "))
      .join("\n\n");
    const cikan = await extractEntities(m.title, evidence);
    if (!cikan.length) {
      console.log(`  — ${m.title.slice(0, 55)}: varlık çıkmadı`);
      continue;
    }
    const sonuc = await recordEntities(
      m.id, m.category, cikan, evidenceText,
      m.title, evidence.map((item) => item.title),
    );
    toplamKayit += sonuc.recorded;
    toplamRet += sonuc.rejected;
    console.log(`  ✓ ${m.title.slice(0, 55)}: ${sonuc.recorded} kayıt` +
      (sonuc.rejected ? `, ${sonuc.rejected} kanıtsız red (${sonuc.rejectedNames.join(", ")})` : ""));
  }
  console.log(`\ntoplam kayıt: ${toplamKayit} | kanıtsız reddedilen: ${toplamRet}`);
}

main().finally(() => prisma.$disconnect());
