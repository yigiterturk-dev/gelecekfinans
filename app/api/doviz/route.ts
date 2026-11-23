import { NextResponse } from "next/server";
import { getAllFx } from "@/lib/market";

/** Canlı döviz kurları (USD/EUR/GBP → TRY). Çevirici ve şerit bileşenleri kullanır. */
export async function GET() {
  try {
    const fx = await getAllFx();
    const hasUsableRate = Object.values(fx).some(
      (rate) => typeof rate?.rate === "number" && Number.isFinite(rate.rate) && rate.rate > 0,
    );
    if (!hasUsableRate) {
      return NextResponse.json(
        { error: "Kur verisi şu anda alınamıyor." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(fx, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json(
      { error: "Kur verisi şu anda alınamıyor." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
