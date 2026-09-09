/**
 * Premium makale gövdesini YALNIZCA giriş yapmış kullanıcıya verir.
 *
 * Neden var: 2026-09-09'a kadar makale sayfası `getServerSession` çağırdığı
 * için `force-dynamic`ti — 53 makalenin (premium olanı 0) HER isteği
 * veritabanına gidiyordu. Sayfa artık ISR ile önbellekleniyor; premium
 * gövde önbelleklenmiş HTML'e HİÇ girmiyor, buradan çekiliyor.
 *
 * 🔑 Bu düzenleme eskisinden DAHA güvenli: premium metin artık CDN'de duran
 * HTML'in içinde hiç bulunmuyor, yalnızca oturumu doğrulanmış isteğe
 * gönderiliyor.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { tamGovde } from "@/lib/article-body";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const limit = rateLimit(`article:body:${clientIp(req)}`, { limit: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const article = await getArticleBySlug(slug);
  if (!article) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  // Premium olmayan makalenin gövdesi zaten sayfada; bu uç onlar için yok.
  // (Aksi hâlde önbelleklenen sayfanın yanında ikinci, önbelleklenmeyen bir
  // okuma yolu açılır ve her istek boşuna veritabanına gider.)
  if (!article.premium) {
    return NextResponse.json({ error: "Bu makale premium değil." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Üye girişi gerekli." }, { status: 401 });

  const tumMakaleler = await getAllArticles();
  const html = tamGovde(article.content, article.slug, tumMakaleler);

  // Bu yanıt kişiye özel: hiçbir ara katman önbelleğe almamalı.
  return NextResponse.json({ html }, { headers: { "Cache-Control": "private, no-store" } });
}
