/**
 * Hit motoru skorları.
 *
 * İki kanal var:
 * - "arama": Search Console'da gösterim alan ama ilk sayfaya giremeyen sorgular.
 *   Burada tek gerçek ölçü, sıra iyileşmesinin tıklamaya çevrilmesi.
 * - "haber": gündem/trend + taze haber yoğunluğu. Discover ve Google News
 *   trafiği sıralamaya değil, tazelik + varlık özgüllüğüne bakıyor.
 *
 * Formüller burada saf tutuluyor; veri toplama scripts/hit-motoru.ts'te.
 */

const CTR_BY_POSITION: Array<[number, number]> = [
  [1, 0.28],
  [2, 0.15],
  [3, 0.11],
  [4, 0.08],
  [5, 0.06],
  [6, 0.045],
  [7, 0.035],
  [8, 0.028],
  [9, 0.024],
  [10, 0.02],
  [15, 0.012],
  [20, 0.008],
  [30, 0.005],
  [40, 0.0025],
];

/** Türkiye organik sonuçları için kaba tıklama oranı eğrisi (konumlar arası doğrusal). */
export function ctrAt(position: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0;
  if (position >= 40) {
    const tail = CTR_BY_POSITION[CTR_BY_POSITION.length - 1][1];
    return Math.max(0.001, tail * (40 / position));
  }
  let prevPos = 1;
  let prevCtr = CTR_BY_POSITION[0][1];
  if (position <= 1) return prevCtr;
  for (const [max, ctr] of CTR_BY_POSITION) {
    if (position <= max) {
      const span = max - prevPos || 1;
      return prevCtr + ((ctr - prevCtr) * (position - prevPos)) / span;
    }
    prevPos = max;
    prevCtr = ctr;
  }
  return prevCtr;
}

/** Sıra iyileşmesinin pencere başına ek tıklaması. Gerileme sayılmaz. */
export function expectedClicks(
  impressions: number,
  currentPosition: number,
  targetPosition: number,
): number {
  const gain = ctrAt(targetPosition) - ctrAt(currentPosition);
  return Math.max(0, impressions * gain);
}

/** Arama kanalı skoru: 0-100, pencere başına beklenen ek tıklama × 10. */
export function searchScore(expected: number): number {
  return Math.min(100, Math.round(expected * 10));
}

export interface NewsSignals {
  /** Google Trends TR listesindeki sıra; listede yoksa null. */
  trendRank: number | null;
  /** Son 24 saatte aynı konuyu işleyen haber sayısı. */
  headlineCount: number;
  /** Haberin yaşı (saat). */
  ageHours: number;
  /** Konu, veritabanındaki doğrulanmış bir varlıkla (şirket/kişi) eşleşiyor mu. */
  entityMatched: boolean;
}

function freshness(ageHours: number): number {
  if (ageHours <= 4) return 1;
  if (ageHours <= 8) return 0.85;
  if (ageHours <= 16) return 0.6;
  if (ageHours <= 24) return 0.35;
  return 0.15;
}

export interface NewsPeaks {
  /** Günün en yüksek haber yoğunluğu; talep buna göre normalize edilir. */
  maxHeadlineCount?: number;
}

/** Haber kanalı skoru: talep + tazelik + kazanılabilirlik + özgüllük. */
export function newsScore(signals: NewsSignals, peaks: NewsPeaks = {}): number {
  const trendDemand =
    signals.trendRank === null ? 0 : Math.max(15, 100 - (signals.trendRank - 1) * 7);
  const maxCount = Math.max(1, peaks.maxHeadlineCount ?? signals.headlineCount);
  const relative = Math.log(1 + signals.headlineCount) / Math.log(1 + maxCount);
  const volumeDemand = Math.min(100, 45 + 55 * relative);
  const demand = Math.max(trendDemand, volumeDemand);
  const winnability = Math.min(
    100,
    60 + (signals.entityMatched ? 25 : 0) + (signals.headlineCount >= 3 ? 10 : 0),
  );
  const specificity = signals.entityMatched ? 100 : 40;

  return Math.round(
    0.45 * demand + 0.3 * freshness(signals.ageHours) * 100 + 0.15 * winnability + 0.1 * specificity,
  );
}

export type Channel = "arama" | "haber";
export type Verdict = "YAZ" | "GİR" | "GÜÇLENDİR" | "KORU" | "GÜNCELLE" | "SIRADA" | "GEÇ";

export function verdict(score: number, channel: Channel, hasPage: boolean): Verdict {
  if (channel === "haber") {
    if (score >= 65) return "GİR";
    return score >= 45 ? "SIRADA" : "GEÇ";
  }
  if (hasPage) return score >= 45 ? "GÜÇLENDİR" : "GEÇ";
  if (score >= 45) return "YAZ";
  return score >= 25 ? "SIRADA" : "GEÇ";
}
