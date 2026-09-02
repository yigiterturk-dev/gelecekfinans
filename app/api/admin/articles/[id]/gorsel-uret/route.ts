import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureArticleImage } from "@/lib/bot/ensure-image";

// Görsel üretimi (grafik çizimi + blob yüklemesi) saniyeler sürebiliyor.
export const maxDuration = 300;

/**
 * Panelde makalenin yanındaki "Görsel Üret" butonu.
 *
 * Botun taslağa düşürdüğü makalelerin kapağı olmuyordu; Yiğit ya elle görsel
 * yüklüyor ya da image-repair cron'unun sırasını bekliyordu. Bu uç nokta
 * bot ile aynı görsel hattını (grafik / lisanslı medya / markalı şablon)
 * tek tıkla çalıştırır.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sonuc = await ensureArticleImage(id);
  if (!sonuc.imageUrl) {
    return NextResponse.json({ error: "Görsel üretilemedi" }, { status: 502 });
  }
  return NextResponse.json(sonuc);
}
