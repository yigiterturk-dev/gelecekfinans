import type { EvidencePacket } from "./research";

export interface PlagiarismDocument {
  id: string;
  title: string;
  content: string;
}

export interface PlagiarismMatch {
  type: "SOURCE" | "INTERNAL";
  id: string;
  label: string;
  similarity: number;
  sharedShingles: number;
  longestExactRun: number;
  /**
   * Eşleşen en uzun dizinin kendisi (normalize edilmiş biçimde). Yalnızca uzunluğu
   * bildirmek onarım turunda yetersiz kalıyordu: model hangi cümleyi kopyaladığını
   * bilmeden yeniden yazınca aynı ifadeyi tekrar üretiyor.
   */
  longestExactRunText: string;
}

export interface PlagiarismReport {
  passed: boolean;
  score: number;
  matches: PlagiarismMatch[];
  issues: string[];
  thresholds: {
    shingleSize: number;
    sourceContainment: number;
    internalJaccard: number;
    sourceExactRun: number;
    internalExactRun: number;
  };
}

const SHINGLE_SIZE = 7;
const SOURCE_CONTAINMENT_LIMIT = 0.25;
const INTERNAL_JACCARD_LIMIT = 0.28;
const SOURCE_EXACT_RUN_LIMIT = 14;
const INTERNAL_EXACT_RUN_LIMIT = 18;

function plainText(value: string): string {
  return value
    .replace(/<h2>Kaynaklar<\/h2>[\s\S]*$/iu, " ")
    .replace(/Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir\.?/giu, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:amp|quot|#039|lt|gt);/g, " ");
}

export function plagiarismTokens(value: string): string[] {
  return plainText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 1600);
}

function shingles(tokens: string[], size = SHINGLE_SIZE): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index <= tokens.length - size; index++) {
    result.add(tokens.slice(index, index + size).join(" "));
  }
  return result;
}

function longestCommonRun(left: string[], right: string[]): { length: number; text: string } {
  if (!left.length || !right.length) return { length: 0, text: "" };
  let previous = new Uint16Array(right.length + 1);
  let longest = 0;
  let longestEndInLeft = 0;
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = new Uint16Array(right.length + 1);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      if (left[leftIndex - 1] === right[rightIndex - 1]) {
        current[rightIndex] = previous[rightIndex - 1] + 1;
        if (current[rightIndex] > longest) {
          longest = current[rightIndex];
          longestEndInLeft = leftIndex;
        }
      }
    }
    previous = current;
  }
  return { length: longest, text: left.slice(longestEndInLeft - longest, longestEndInLeft).join(" ") };
}

function compare(candidate: string[], reference: string[], type: PlagiarismMatch["type"]): Omit<PlagiarismMatch, "type" | "id" | "label"> {
  const candidateShingles = shingles(candidate);
  const referenceShingles = shingles(reference);
  const sharedShingles = [...candidateShingles].filter((item) => referenceShingles.has(item)).length;
  const denominator = type === "SOURCE"
    ? Math.max(1, Math.min(candidateShingles.size, referenceShingles.size))
    : Math.max(1, new Set([...candidateShingles, ...referenceShingles]).size);
  const run = longestCommonRun(candidate, reference);
  return {
    similarity: sharedShingles / denominator,
    sharedShingles,
    longestExactRun: run.length,
    longestExactRunText: run.text,
  };
}

export function checkPlagiarism(input: {
  candidate: string;
  evidencePacket: EvidencePacket;
  recentDocuments?: PlagiarismDocument[];
}): PlagiarismReport {
  const candidateTokens = plagiarismTokens(input.candidate);
  const matches: PlagiarismMatch[] = [];

  for (const evidence of input.evidencePacket.evidence) {
    const reference = plagiarismTokens(`${evidence.summary} ${evidence.content || ""}`);
    if (reference.length < SHINGLE_SIZE) continue;
    const comparison = compare(candidateTokens, reference, "SOURCE");
    if (
      (comparison.sharedShingles >= 3 && comparison.similarity >= SOURCE_CONTAINMENT_LIMIT) ||
      comparison.longestExactRun >= SOURCE_EXACT_RUN_LIMIT
    ) {
      matches.push({
        type: "SOURCE",
        id: evidence.id,
        label: evidence.source,
        ...comparison,
      });
    }
  }

  for (const document of input.recentDocuments || []) {
    const reference = plagiarismTokens(document.content);
    if (reference.length < SHINGLE_SIZE) continue;
    const comparison = compare(candidateTokens, reference, "INTERNAL");
    if (
      comparison.similarity >= INTERNAL_JACCARD_LIMIT ||
      comparison.longestExactRun >= INTERNAL_EXACT_RUN_LIMIT
    ) {
      matches.push({ type: "INTERNAL", id: document.id, label: document.title, ...comparison });
    }
  }

  const issues = matches.map((match) =>
    `${match.type === "SOURCE" ? "Kaynak" : "Arşiv"} benzerliği: ${match.label} ` +
    `(%${Math.round(match.similarity * 100)}, ${match.longestExactRun} kelime kesintisiz eşleşme)`,
  );
  const worst = matches.reduce((max, match) => Math.max(max, match.similarity), 0);
  return {
    passed: matches.length === 0,
    score: matches.length ? Math.max(0, Math.round(100 - worst * 100)) : 100,
    matches,
    issues,
    thresholds: {
      shingleSize: SHINGLE_SIZE,
      sourceContainment: SOURCE_CONTAINMENT_LIMIT,
      internalJaccard: INTERNAL_JACCARD_LIMIT,
      sourceExactRun: SOURCE_EXACT_RUN_LIMIT,
      internalExactRun: INTERNAL_EXACT_RUN_LIMIT,
    },
  };
}
