import { NextRequest, NextResponse } from "next/server";
import { promoteEntitiesToKeywords } from "@/lib/bot/entities";
import { isGscConfigured, syncSearchPerformance } from "@/lib/gsc";
import {
  attachPerformanceToKeywords,
  getRefreshCandidates,
  mineKeywordOpportunities,
} from "@/lib/seo-feedback";

export const maxDuration = 300;

/**
 * Geri besleme cron'u — model çağırmaz, para harcamaz.
 *
 * Search Console verisini çeker, havuzdaki kelimelerin gerçek sırasını işler,
 * görünen ama havuzda olmayan sorguları yeni kelime olarak ekler ve ilk
 * sayfanın dibinde takılmış sayfaları listeler. Bot'un "ne işe yarıyor"
 * sorusunun cevabı buradan geliyor.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Varlık terfisi GSC'den bağımsız: haber şeridi çalıştığı sürece varlık
  // birikir ve terfi saf DB işidir (model çağırmaz, bedava). Bu yüzden
  // Search Console kimliği olmasa bile çalışmalı — aşağıdaki erken çıkışın
  // ÜSTÜNDE duruyor.
  const entityPromotion = await promoteEntitiesToKeywords();

  if (!isGscConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: "Search Console kimlik bilgileri tanımlı değil",
      entitiesPromoted: entityPromotion.promoted,
    });
  }

  const sync = await syncSearchPerformance(28);
  const performance = await attachPerformanceToKeywords(90);
  const mined = await mineKeywordOpportunities(90, 5);
  const refresh = await getRefreshCandidates(90, 10);

  return NextResponse.json({
    sync,
    entitiesPromoted: entityPromotion.promoted,
    keywordsUpdated: performance.updated,
    keywordsAdded: mined.added,
    minedTerms: mined.picked.map((k) => k.term),
    refreshCandidates: refresh.map((c) => ({
      page: c.page,
      bestPosition: c.bestPosition,
      impressions: c.impressions,
      queries: c.nearMissQueries.map((q) => q.query),
    })),
  });
}
