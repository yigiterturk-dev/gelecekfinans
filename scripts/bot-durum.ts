/** Botun son koşumlarını ve nerede takıldığını tek bakışta gösterir. */
import { prisma } from "../lib/db";

async function main() {
  const runs = await prisma.botRun.findMany({ orderBy: { startedAt: "desc" }, take: 6 });
  console.log("--- son koşumlar ---");
  for (const r of runs) {
    console.log(
      r.startedAt.toISOString(), r.status,
      `bulundu=${r.articlesFound}`, `eklendi=${r.articlesAdded}`,
      `yayın=${r.autoPublished}`, `kuyruk=${r.reviewQueued}`, `engel=${r.blocked}`,
      (r.errors || "").slice(0, 140).replace(/\n/g, " | "),
    );
  }
  const events = await prisma.automationEvent.groupBy({
    by: ["stage"], _count: { _all: true },
    where: { createdAt: { gte: new Date(Date.now() - 36 * 3600 * 1000) } },
  });
  console.log("\n--- son 36 saat aşama dağılımı ---");
  for (const e of events.sort((a, b) => b._count._all - a._count._all)) {
    console.log(e.stage, e._count._all);
  }
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" }, take: 6,
    select: { createdAt: true, status: true, title: true },
  });
  console.log("\n--- son makaleler ---");
  for (const a of articles) console.log(a.createdAt.toISOString(), a.status, a.title.slice(0, 70));
  await prisma.$disconnect();
}

main();
