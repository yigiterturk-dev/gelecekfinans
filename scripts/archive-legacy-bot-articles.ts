import "dotenv/config";
import { prisma } from "../lib/db";
import { asJson } from "../lib/prisma-json";

const BATCH_ID = "legacy-gf-2026-08-06-v1";
const CONFIRMATION = "ARCHIVE_LEGACY_GF_2026_08_06";

type StoredMeta = Record<string, unknown> & {
  pipelineVersion?: string;
  verifiedEvidence?: boolean;
  legacyCleanup?: {
    batchId?: string;
    previousStatus?: "DRAFT" | "PUBLISHED" | "REJECTED" | "ARCHIVED";
    previousPublishedAt?: string | null;
    previousPublicationDecision?: "AUTO_PUBLISH" | "REVIEW" | "BLOCK";
    state?: "ARCHIVED" | "RESTORED";
  };
};

function metaOf(value: unknown): StoredMeta {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as StoredMeta
    : {};
}

function words(content: string): number {
  return content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function httpsLinkHosts(content: string): string[] {
  const hosts = new Set<string>();
  for (const match of content.matchAll(/href="(https:\/\/[^\"]+)"/gi)) {
    try {
      const url = new URL(match[1]);
      if (url.protocol === "https:") hosts.add(url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, ""));
    } catch {
      // Invalid links are not evidence of a usable source.
    }
  }
  return [...hosts].slice(0, 12);
}

function reasonsFor(article: {
  content: string;
  imageUrl: string | null;
  automationMeta: unknown;
}): string[] {
  const meta = metaOf(article.automationMeta);
  const reasons: string[] = [];
  if (words(article.content) < 50) reasons.push("EMPTY_SHELL");
  // Pipeline versions evolve independently from the meaning of this flag.
  // A newer verified pipeline (for example v5) is not evidence of a bad
  // article; only a missing/false verification result is.
  if (meta.verifiedEvidence !== true) reasons.push("NO_VERIFIED_EVIDENCE");
  if (/\/ai-|images\.unsplash\.com/.test(article.imageUrl || "")) reasons.push("LEGACY_OR_UNLICENSED_IMAGE");
  return reasons;
}

async function archive(apply: boolean, scope: "all" | "drafts" | "published") {
  const statuses = scope === "drafts" ? ["DRAFT" as const]
    : scope === "published" ? ["PUBLISHED" as const]
    : ["DRAFT" as const, "PUBLISHED" as const];
  const rows = await prisma.article.findMany({
    where: { articleSource: "BOT", status: { in: statuses } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      publicationDecision: true,
      source: true,
      imageUrl: true,
      content: true,
      automationMeta: true,
    },
  });
  const targets = rows.filter((row) => {
    const meta = metaOf(row.automationMeta);
    return meta.legacyCleanup?.batchId !== BATCH_ID && reasonsFor(row).length > 0;
  });

  console.log(JSON.stringify({
    mode: apply ? "APPLY" : "DRY_RUN",
    scope,
    batchId: BATCH_ID,
    targets: targets.length,
    published: targets.filter((row) => row.status === "PUBLISHED").length,
    drafts: targets.filter((row) => row.status === "DRAFT").length,
    articles: targets.map((row) => {
      const meta = metaOf(row.automationMeta);
      return {
        id: row.id,
        slug: row.slug,
        status: row.status,
        title: row.title,
        source: row.source,
        sourceUrl: typeof meta.sourceUrl === "string" ? meta.sourceUrl : null,
        sourceHosts: httpsLinkHosts(row.content),
        hasVisibleSourcesSection: /<h[23][^>]*>\s*Kaynaklar\s*<\/h[23]>/i.test(row.content),
        reasons: reasonsFor(row),
      };
    }),
  }, null, 2));

  if (!apply || !targets.length) return;
  if (process.env.CONFIRM_LEGACY_ARCHIVE !== CONFIRMATION) {
    throw new Error(`Uygulama için CONFIRM_LEGACY_ARCHIVE=${CONFIRMATION} gerekli.`);
  }

  await prisma.$transaction(targets.map((row) => {
    const previous = metaOf(row.automationMeta);
    return prisma.article.update({
      where: { id: row.id },
      data: {
        status: "ARCHIVED",
        publishedAt: null,
        publicationDecision: "BLOCK",
        autoPublished: false,
        automationMeta: asJson({
          ...previous,
          legacyCleanup: {
            batchId: BATCH_ID,
            state: "ARCHIVED",
            archivedAt: new Date().toISOString(),
            previousStatus: row.status,
            previousPublishedAt: row.publishedAt?.toISOString() || null,
            previousPublicationDecision: row.publicationDecision,
            reasons: reasonsFor(row),
          },
        }),
      },
    });
  }));
  console.log(`ARCHIVED ${targets.length} article(s) in batch ${BATCH_ID}`);
}

async function restore() {
  if (process.env.CONFIRM_LEGACY_RESTORE !== BATCH_ID) {
    throw new Error(`Geri alma için CONFIRM_LEGACY_RESTORE=${BATCH_ID} gerekli.`);
  }
  const rows = await prisma.article.findMany({
    where: { articleSource: "BOT", status: "ARCHIVED" },
    select: { id: true, automationMeta: true },
  });
  const targets = rows.filter((row) => metaOf(row.automationMeta).legacyCleanup?.batchId === BATCH_ID);
  await prisma.$transaction(targets.map((row) => {
    const meta = metaOf(row.automationMeta);
    const cleanup = meta.legacyCleanup!;
    return prisma.article.update({
      where: { id: row.id },
      data: {
        status: cleanup.previousStatus || "DRAFT",
        publishedAt: cleanup.previousPublishedAt ? new Date(cleanup.previousPublishedAt) : null,
        publicationDecision: cleanup.previousPublicationDecision || "REVIEW",
        automationMeta: asJson({
          ...meta,
          legacyCleanup: { ...cleanup, state: "RESTORED", restoredAt: new Date().toISOString() },
        }),
      },
    });
  }));
  console.log(`RESTORED ${targets.length} article(s) from batch ${BATCH_ID}`);
}

async function main() {
  const restoreRequested = process.argv.includes("--restore");
  const applyRequested = process.argv.includes("--apply");
  const scope = process.argv.includes("--drafts-only")
    ? "drafts"
    : process.argv.includes("--published-only") ? "published" : "all";
  try {
    if (restoreRequested) await restore();
    else await archive(applyRequested, scope);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
