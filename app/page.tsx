import SafeImage from "@/components/SafeImage";
import { publicImageUrl } from "@/lib/image-url";
import { getAllArticles } from "@/lib/articles";
import { HeroCard, StripCard, MedCard, RankedCard, CATS, catColor, Ago } from "@/components/ArticleCard";
import Newsletter from "@/components/Newsletter";
import MarketMini from "@/components/MarketMini";
import MoversRail from "@/components/MoversRail";
import AdSlot from "@/components/AdSlot";
import Link from "next/link";
import type { Metadata } from "next";
import { HOME_TITLE } from "@/lib/brand";
export const revalidate = 300;

export const metadata: Metadata = {
  /**
   * MARKA ADI BAŞLIKTA OLMAK ZORUNDA.
   *
   * Buradaki başlık uzun süre "Finans ve Ekonomi Haberleri" idi ve marka hiç
   * geçmiyordu. Sebep belgelenmiş bir Next tuzağı: `title.template`
   * (`app/layout.tsx`'te `%s | GelecekFinans`) YALNIZCA ALT segmentlere
   * uygulanır, aynı segmentteki `page.tsx`'e uygulanmaz. Yani makale ve
   * kategori sayfaları markayı taşırken, markayı en çok taşıması gereken tek
   * sayfa — anasayfa — onu kaybediyordu.
   *
   * Sonuç ölçüldü: Google'da "gelecekfinans" arandığında site hiç çıkmıyordu,
   * GSC'deki 256 sorgunun hiçbiri marka sorgusu değildi ve anasayfa 0 gösterim
   * alıyordu (indeksli olmasına rağmen). `absolute` ile şablondan bağımsız,
   * marka önde bir başlık veriliyor.
   */
  title: { absolute: HOME_TITLE },
  description: "GelecekFinans; borsa, döviz, altın, kripto para ve ekonomi gündemini doğrulanmış kaynaklar, canlı piyasa verileri ve ücretsiz hesaplama araçlarıyla takip etmenizi sağlar.",
  alternates: { canonical: "https://gelecekfinans.com" },
};

export default async function HomePage() {
  const all = await getAllArticles();
  if (!all.length) return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 72 }}>
      <div className="home-split" style={{ display: "grid", gridTemplateColumns: "1fr 320px", alignItems: "start", gap: 28 }}>
        <main style={{ minWidth: 0 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: "var(--accent)" }}>
            EDİTORYAL YENİLEME
          </span>
          <h1 style={{ marginTop: 14, maxWidth: 720, fontFamily: "var(--display)", fontSize: "clamp(32px, 5vw, 58px)", lineHeight: 1.04, letterSpacing: "-.035em", color: "var(--ink)" }}>
            Doğrulanmış haber masamızı yeniden kuruyoruz.
          </h1>
          <p style={{ marginTop: 20, maxWidth: 650, fontSize: 17, lineHeight: 1.7, color: "var(--ink2)" }}>
            Eski otomatik içerikleri kalite incelemesine aldık. Yeni haberler iki bağımsız kaynak,
            iddia doğrulaması ve özgünlük kontrolünden geçtikten sonra burada yer alacak.
          </p>
          <nav aria-label="Finans araçları" className="resp-grid-4" style={{ marginTop: 32 }}>
            {[
              ["Döviz Kurları", "/doviz"],
              ["Altın Fiyatları", "/altin"],
              ["Kripto Piyasası", "/kripto"],
              ["Hesaplama Araçları", "/araclar"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="page-btn" style={{ minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {label}
              </Link>
            ))}
          </nav>
          <section style={{ marginTop: 48 }}>
            <Newsletter />
          </section>
        </main>
        <aside className="home-rail">
          <MarketMini />
        </aside>
      </div>
    </div>
  );

  const hero    = all[0];
  const lead2   = all.slice(1, 3);   // liderin yanındaki ikincil iki haber
  const strip   = all.slice(3, 6);   // lider altı üçlü şerit
  const mostRead = [...all]
    .map(a => ({ a, v: a.views ?? 0 }))
    .sort((x, y) => y.v - x.v)
    .slice(0, 5)
    .map(x => x.a);
  const recent  = all.slice(6, 18);   // şerit (3-6) sonrası kesintisiz — orphan makale kalmaz
  const trending = Array.from(
    new Set(all.flatMap(a => (a.keyword ? a.keyword.split(/[,;]/) : [])).map(k => k.trim()).filter(Boolean))
  ).slice(0, 10);

  return (
    <div className="container page-home" style={{ paddingTop: 28 }}>
      <h1
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {/* Marka adı H1'de de geçmeli: görünür logo "Gelecek Finans" yazıyor,
            şema "GelecekFinans" diyor, alan adı gelecekfinans.com — Google bu
            üçünü kendiliğinden birleştirmiyor. Şema tarafındaki
            `alternateName` ile birlikte üç yazım da aynı varlığa bağlanıyor. */}
        {HOME_TITLE}
      </h1>

      {/* ── HABER LİDER (CNBC/Reuters tarzı): sayfanın üstünü HABER yönetir.
           Üstteki dev "CANLI PİYASA" board'u kaldırıldı (slim top ticker +
           sağ raydaki kompakt MarketMini widget'ı ile mükerrerdi). Piyasa
           verisi artık ikincil; haber lider.

           HABER HİYERARŞİSİ: lider + ikincil + sağ ray ──
           Tüm yerleşim/boşluk INLINE STYLE ile verilir (Tailwind utility üretimi
           bu projede güvenilmez → gap/padding sınıfları render'a yansımıyordu).
           Responsive kırılım .home-split-* sınıfları üzerinden globals.css'te. */}
      <div className="home-split" style={{ display: "grid", gridTemplateColumns: "1fr 320px", alignItems: "start", gap: 28 }}>
        <div style={{ minWidth: 0 }}>
          <HeroCard article={hero}/>
          {lead2.length > 0 && (
            <div
              className="home-lead2"
              style={{
                marginTop: 18,
                display: "grid",
                // Tek kart kaldığında sabit iki sütun ikinci hücreyi boş bırakıyor
                // ve grid'in çizgi rengi zeminini gri bir blok gibi gösteriyordu
                // (canlıda "görsel gitmiş" gibi görünüyordu). Sütun sayısı kart
                // sayısını takip eder.
                gridTemplateColumns: `repeat(${Math.min(lead2.length, 2)}, 1fr)`,
                gap: 1,
                overflow: "hidden",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--border)",
              }}
            >
              {lead2.map(a => (
                <Link
                  key={a.filename}
                  href={`/${a.slug}`}
                  className="home-lead2-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    background: "var(--paper)",
                    padding: "20px 20px 18px",
                    textDecoration: "none",
                  }}
                >
                  {/* Kapak görseli: bu kart daha önce yalnızca metin basıyordu ve
                      hero ile alt şerit arasında görsel olarak kopuk kalıyordu. */}
                  {a.imageUrl && (
                    <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
                      <SafeImage
                        src={publicImageUrl(a.imageUrl)!}
                        alt={a.title}
                        fill
                        sizes="(max-width:768px) 100vw, 50vw"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  )}
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: CATS[a.category] ? catColor(a.category, CATS[a.category].c) : "var(--accent)" }}>
                    {(CATS[a.category]?.l) || a.category.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--display)",
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: 1.38,
                      letterSpacing: "-0.02em",
                      color: "var(--ink)",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {a.title}
                  </span>
                  <span style={{ marginTop: "auto", paddingTop: 4, fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.04em", color: "var(--muted)" }}>
                    {Ago(a.created_at)}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {/* Lider altı üçlü şerit — sol kolonda, haberlerin hemen altında.
              Sol kolonu doldurur, sağ sidebar ile boy dengeler (üstteki boşluk gider). */}
          {strip.length > 0 && (
            <div
              className="home-strip3"
              style={{
                marginTop: 18,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1,
                overflow: "hidden",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--border)",
              }}
            >
              {strip.map(a=><StripCard key={a.filename} article={a}/>)}
            </div>
          )}

          {/* "Son Haberler" — sol kolonun içinde, şeridin altında.
              Sağ sidebar uzun (MarketMini + En Çok Okunan + MoversRail +
              Gündemdekiler + AdSlot) olduğundan sol kolon kısa kalıp altında
              dev boşluk bırakıyordu. Recent'i buraya alıp sol kolonu uzatınca
              iki kolon boy dengeler, boşluk kapanır. Sol kolon dar (~930px)
              olduğu için 2 kolonlu responsive grid (home-recent-grid). */}
          {recent.length > 0 && (
            <section className="section" style={{ marginTop: 32 }}>
              <div className="sec-rule" style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0 20px", marginBottom: 24 }}>
                <span className="sec-rule-label" style={{ color: "var(--ink)" }}>Son Haberler</span>
                <div className="sec-rule-line" />
              </div>
              <div className="home-recent-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "28px 20px" }}>
                {recent.map(a=><MedCard key={a.filename} article={a}/>)}
              </div>
            </section>
          )}
        </div>

        <aside className="home-rail" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Kompakt "Piyasalar" widget'ı — dev board'un yerini alan, açıkça
              ikincil/küçük piyasa görünümü (USD/TRY, EUR/TRY, Gram Altın, BTC, BIST). */}
          <MarketMini />
          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--paper)", boxShadow: "0 1px 2px rgba(15,23,42,.05)", padding: "16px 18px 8px" }}>
            <div style={{ paddingBottom: 12, marginBottom: 4, borderBottom: "1px solid var(--border2)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--accent)" }}>
              En Çok Okunan
            </div>
            {mostRead.map((a,i)=><RankedCard key={a.filename} article={a} index={i} last={i===mostRead.length-1}/>)}
          </div>
          <MoversRail />
          {trending.length > 0 && (
            <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--paper)", boxShadow: "0 1px 2px rgba(15,23,42,.05)", padding: "16px 18px 18px" }}>
              <div style={{ paddingBottom: 12, marginBottom: 14, borderBottom: "1px solid var(--border2)", fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--accent)" }}>
                Gündemdekiler
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {trending.map(t=>(
                  <Link
                    key={t}
                    href={`/arsiv?q=${encodeURIComponent(t)}`}
                    style={{
                      display: "inline-block",
                      borderRadius: 999,
                      border: "1px solid var(--border2)",
                      background: "var(--surface)",
                      padding: "6px 12px",
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      lineHeight: 1.2,
                      color: "var(--ink2)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Reklam kapalıyken hiç yer kaplamaz (AdSlot null döner); açıkken
              .ad-slot-lg min-height ile alanı rezerve eder (CLS-güvenli). */}
          <AdSlot position="sidebar" />
        </aside>
      </div>

      {/* Lider bloğu sonrası tek, etiketli reklam (CLS-güvenli) */}
      <AdSlot position="headerBanner" />

      <section className="section" style={{marginTop:40}}>
        <Newsletter />
      </section>

    </div>
  );
}
