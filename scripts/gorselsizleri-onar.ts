// Kapak görseli olmayan makalelerin görselini üretir (yayındakiler önce).
//   npx tsx --env-file=.env --env-file=.env.local scripts/gorselsizleri-onar.ts [limit]
import { prisma } from "../lib/db";
import { ensureArticleImage } from "../lib/bot/ensure-image";

async function main() {
  const limit = parseInt(process.argv[2] || "50");
  const eksik = { OR: [{ imageUrl: null }, { imageUrl: "" }] };
  const articles = await prisma.article.findMany({
    where: eksik,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: limit,
    select: { id: true, title: true, status: true },
  });
  console.log(`[onar] ${articles.length} görselsiz makale`);
  let ok = 0, fail = 0;
  for (const a of articles) {
    const r = await ensureArticleImage(a.id);
    if (r.imageUrl) { ok++; console.log(`  ✓ [${a.status}] ${a.title.slice(0, 60)}`); }
    else { fail++; console.log(`  ✗ [${a.status}] ${a.title.slice(0, 60)}`); }
  }
  console.log(`[onar] bitti: ${ok} üretildi, ${fail} başarısız`);
  await prisma.$disconnect();
}
main();
