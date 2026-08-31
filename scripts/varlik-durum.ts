/**
 * Varlık havuzunun durumu: ne kaydedilmiş, ne terfi etmiş, sırada ne var.
 * Model çağırmaz — bedava.
 */
import { prisma } from "../lib/db";
import { ENTITY_PROMOTION_THRESHOLD } from "../lib/bot/entities";

async function main() {
  const [toplam, gozlem, terfi] = await Promise.all([
    prisma.entity.count(),
    prisma.entity.count({ where: { status: "OBSERVED" } }),
    prisma.entity.count({ where: { status: "PROMOTED" } }),
  ]);
  console.log(`varlık: ${toplam} | gözlemde: ${gozlem} | terfi etmiş: ${terfi} | eşik: ${ENTITY_PROMOTION_THRESHOLD} makale`);

  const liste = await prisma.entity.findMany({
    orderBy: [{ mentions: "desc" }, { createdAt: "desc" }],
    take: 30,
    include: { articles: { select: { article: { select: { title: true, slug: true } } } } },
  });

  console.log("\n--- varlıklar ---");
  for (const e of liste) {
    const hazir = e.status === "OBSERVED" && e.mentions >= ENTITY_PROMOTION_THRESHOLD ? " ⬆ TERFİYE HAZIR" : "";
    console.log(`${e.mentions}x ${e.type.padEnd(11)} ${e.name}${hazir}`);
    if (e.role) console.log(`      rol: ${e.role}`);
    for (const m of e.articles.slice(0, 3)) console.log(`      · ${m.article.title.slice(0, 70)}`);
  }

  const kelimeler = await prisma.keyword.findMany({
    where: { origin: "entity" },
    orderBy: { priority: "desc" },
    select: { term: true, status: true, priority: true, notes: true },
  });
  console.log(`\n--- varlıktan gelen kelimeler (${kelimeler.length}) ---`);
  for (const k of kelimeler) console.log(`[${k.status}] ${k.term}  · ${k.notes || ""}`);
}

main().finally(() => prisma.$disconnect());
