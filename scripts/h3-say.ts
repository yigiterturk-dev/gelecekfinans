import { prisma } from "../lib/db";
async function main() {
  const a = await prisma.article.findFirst({ orderBy: { createdAt: "desc" }, select: { content: true, track: true } });
  console.log("track:", a?.track, "| h2:", (a?.content.match(/<h2/g) || []).length, "| h3:", (a?.content.match(/<h3/g) || []).length);
  await prisma.$disconnect();
}
main();
