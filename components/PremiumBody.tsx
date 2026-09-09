"use client";

/**
 * Premium makalenin tam gövdesini, üyeyse, istemci tarafında yükler.
 *
 * Neden böyle: sayfa artık ISR ile önbellekleniyor. Önbelleğe giren HTML
 * herkese açıktır, bu yüzden premium metin oraya HİÇ konmuyor — sunucu
 * teaser basıyor, bu bileşen kimlik doğrulamalı uçtan tam metni çekip
 * teaser'ın yerine koyuyor.
 *
 * 🔑 Eskisinden daha güvenli: premium metin CDN'de duran HTML'de artık
 * hiç bulunmuyor.
 *
 * ⚠️ Bu bileşen bir GÜVENLİK sınırı DEĞİL, yalnızca bir görüntüleme yolu.
 * Asıl kapı sunucudaki uçta (`/api/articles/[slug]/body`, oturum kontrolü).
 * Buradaki durum sadece ne gösterileceğini seçer.
 */
import { useEffect, useState } from "react";

type Durum = "bekliyor" | "yuklendi" | "yetkisiz" | "hata";

export default function PremiumBody({
  slug,
  children,
}: {
  slug: string;
  /** Sunucudan gelen teaser + kapı; tam metin gelene kadar bu görünür. */
  children: React.ReactNode;
}) {
  const [durum, setDurum] = useState<Durum>("bekliyor");
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch(`/api/articles/${encodeURIComponent(slug)}/body`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (iptal) return;
        if (r.status === 401) {
          setDurum("yetkisiz"); // Üye değil: teaser + kapı görünmeye devam eder.
          return;
        }
        if (!r.ok) {
          setDurum("hata");
          return;
        }
        const d = (await r.json()) as { html?: string };
        if (iptal) return;
        if (typeof d.html !== "string") {
          setDurum("hata");
          return;
        }
        setHtml(d.html);
        setDurum("yuklendi");
      } catch {
        if (!iptal) setDurum("hata");
      }
    })();
    return () => {
      iptal = true;
    };
  }, [slug]);

  // Yüklendiyse tam metin; her durumda (bekliyor/yetkisiz/hata) teaser kalır.
  // Hata hâlinde okuru boş ekranla bırakmamak için teaser'a düşmek kasıtlı.
  if (durum === "yuklendi" && html !== null) {
    // Gövde sunucuda sanitizeArticleHtml'den geçti (bkz. lib/article-body.ts).
    return <article className="article-prose" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <>{children}</>;
}
