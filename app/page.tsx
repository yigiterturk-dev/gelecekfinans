import SafeImage from "@/components/SafeImage";
import { publicImageUrl } from "@/lib/image-url";
import { getAllArticles } from "@/lib/articles";
import { HeroCard, MedCard, RankedCard, CATS, catColor, Ago } from "@/components/ArticleCard";
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

function SectionHeading({ title, href, link = "Tümünü gör" }: { title: string; href: string; link?: string }) {
  return <div className="edition-section-heading"><h2>{title}</h2><Link href={href}>{link} <span aria-hidden="true">↗</span></Link></div>;
}

export default async function HomePage() {
  const all = await getAllArticles();
  const hero = all[0];
  const secondary = all.slice(1, 4);
  const recent = all.slice(4, 16);
  const mostRead = [...all].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5);
  const trending = Array.from(new Set(all.flatMap(a => a.keyword?.split(/[,;]/) ?? [])
    .map(k => k.trim()).filter(k => k && k.toLowerCase() !== "keyword"))).slice(0, 6);

  return (
    <div className="container page-home edition-home">
      <h1 className="sr-only">{HOME_TITLE}</h1>
      <div className="edition-intro">
        <div><span className="edition-eyebrow">GELECEK FİNANS</span><p>Gündemin içinden. Piyasanın yanından.</p></div>
        <Link href="/rehber">Finansı anlamaya buradan başlayın <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="edition-layout">
        <div className="edition-main">
          {hero ? (
            <>
              <div className="edition-kicker"><span>ÖNE ÇIKAN</span><span>HABER MASASI</span></div>
              <HeroCard article={hero} />
              {secondary.length > 0 && <div className="edition-secondary">
                {secondary.map(a => <Link key={a.filename} href={`/${a.slug}`} className="edition-secondary-card">
                  {a.imageUrl && <div className="edition-secondary-image"><SafeImage src={publicImageUrl(a.imageUrl)!} alt={a.title} fill sizes="(max-width: 640px) 110px, (max-width: 980px) 32vw, 280px" style={{ objectFit: "contain" }} /></div>}
                  <div className="edition-secondary-copy">
                    <span className="edition-category" style={{ color: catColor(a.category, "var(--accent)") }}>{CATS[a.category]?.l ?? a.category}</span>
                    <h2>{a.title}</h2>
                    <time dateTime={a.created_at}>{Ago(a.created_at)}</time>
                  </div>
                </Link>)}
              </div>}
              {recent.length > 0 && <section className="edition-latest">
                <SectionHeading title="Haber akışı" href="/arsiv" link="Haber arşivi" />
                <div className="edition-news-grid">{recent.map(a => <MedCard key={a.filename} article={a} />)}</div>
              </section>}
              <Link href="/arsiv" className="edition-archive">Tüm haberleri keşfedin <span aria-hidden="true">↗</span></Link>
            </>
          ) : <section className="edition-empty">
            <span className="edition-eyebrow">HABER MASASI</span>
            <h2>Ekonomiye daha net bir bakış.</h2>
            <p>Haberlerimiz yayına hazırlanırken piyasa verilerini inceleyebilir, finans rehberlerimizi ve hesaplama araçlarımızı kullanabilirsiniz.</p>
            <Link href="/rehber" className="btn">Finans rehberlerini keşfedin ↗</Link>
          </section>}
        </div>
        <aside className="home-rail edition-rail" aria-label="Piyasalar ve öne çıkanlar">
          <MarketMini />
          <section className="edition-rail-section">
            <h2 className="edition-rail-title">Okurların gündemi</h2>
            {mostRead.map((a, i) => <RankedCard key={a.filename} article={a} index={i} last={i === mostRead.length - 1} />)}
            {!mostRead.length && <p className="edition-rail-note">Yeni haberlerle birlikte en çok okunanlar burada yer alacak.</p>}
          </section>
          <MoversRail />
          <section className="edition-guide">
            <span className="edition-eyebrow">FİNANS REHBERİ</span>
            <h2>Bilgiyle atılan<br />ilk adım.</h2>
            <p>Kavramları tanıyın, piyasaları daha rahat takip edin.</p>
            <Link href="/rehber">Rehberleri inceleyin <span aria-hidden="true">↗</span></Link>
          </section>
          {trending.length > 0 && <section className="edition-topics"><h2 className="edition-rail-title">Gündemdeki konular</h2><div>{trending.map(t => <Link key={t} href={`/arsiv?q=${encodeURIComponent(t)}`}>{t} <span aria-hidden="true">↗</span></Link>)}</div></section>}
          <AdSlot position="sidebar" />
        </aside>
      </div>
      <AdSlot position="headerBanner" />
      <section className="edition-utilities" aria-labelledby="tools-title">
        <div><span className="edition-eyebrow">RAKAMLARI KENDİNİZ HESAPLAYIN</span><h2 id="tools-title">Paranızın hesabı, elinizin altında.</h2><p>Kredi, mevduat, altın ve enflasyon için ücretsiz araçlar.</p></div>
        <Link href="/araclar">Hesaplama araçlarını açın <span aria-hidden="true">↗</span></Link>
      </section>
      <section id="bulten" className="edition-newsletter" aria-label="E-posta bülteni"><Newsletter /></section>
    </div>
  );
}
