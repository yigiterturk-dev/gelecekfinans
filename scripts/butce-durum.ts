import { prisma } from "../lib/db";
import { resolveArticleAIBudgetConfig, startOfIstanbulDay } from "../lib/bot/ai-budget";

async function main() {
  const used = await prisma.automationEvent.count({
    where: { stage: "writer_call_reserved", createdAt: { gte: startOfIstanbulDay() } },
  });
  console.log("bugün kullanılan yazar çağrısı:", used);
  console.log("bütçe:", JSON.stringify(resolveArticleAIBudgetConfig()));
  await prisma.$disconnect();
}
main();
