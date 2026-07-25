-- GelecekFinans autonomous publishing v1
-- Production'da Prisma generate kullanan deploy'dan önce bir kez çalıştırın.
CREATE TYPE "AutonomyRisk" AS ENUM ('GREEN', 'YELLOW', 'RED');
CREATE TYPE "PublicationDecision" AS ENUM ('AUTO_PUBLISH', 'REVIEW', 'BLOCK');

ALTER TABLE "Article"
  ADD COLUMN "riskLevel" "AutonomyRisk" NOT NULL DEFAULT 'YELLOW',
  ADD COLUMN "publicationDecision" "PublicationDecision" NOT NULL DEFAULT 'REVIEW',
  ADD COLUMN "sourceScore" INTEGER,
  ADD COLUMN "imageStrategy" TEXT,
  ADD COLUMN "automationMeta" JSONB,
  ADD COLUMN "autoPublished" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "BotRun"
  ADD COLUMN "autoPublished" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewQueued" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blocked" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "imageFallbacks" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AutomationEvent" (
  "id" TEXT NOT NULL,
  "runId" TEXT,
  "articleId" TEXT,
  "stage" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'info',
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Article_publicationDecision_createdAt_idx"
  ON "Article"("publicationDecision", "createdAt" DESC);
CREATE INDEX "AutomationEvent_runId_createdAt_idx"
  ON "AutomationEvent"("runId", "createdAt");
CREATE INDEX "AutomationEvent_articleId_createdAt_idx"
  ON "AutomationEvent"("articleId", "createdAt");
