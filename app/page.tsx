import SafeImage from "@/components/SafeImage";
import Image from "next/image";
import { articleCoverAlt, articleCoverFallbackUrl, articleCoverUrl, isIllustrativeCover } from "@/lib/article-cover";
import { getAllArticles, getGuides } from "@/lib/articles";
import { HeroCard, MedCard, RankedCard, CATS, catColor, Ago } from "@/components/ArticleCard";
import Newsletter from "@/components/Newsletter";
import { mailEnabled } from "@/lib/mail";
import MarketMini from "@/components/MarketMini";
import MoversRail from "@/components/MoversRail";
import AdSlot from "@/components/AdSlot";
import ToolsRail from "@/components/ToolsRail";
import Link from "next/link";
import type { Metadata } from "next";
import { HOME_TITLE } from "@/lib/brand";
import type { ArticleListItem } from "@/lib/types";
export const revalidate = 300;

// Local visual preview only. Production keeps the fail-closed database behavior.
function localPreviewArticle(title: string, category: string, slug: string, day: number, meta = "Finans gündeminden öne çıkan gelişmeler ve temel bilgiler."): ArticleListItem {
  return {
    title, meta, keyword: title, category, image_path: null, source: "",
    created_at: `2026-11-${String(day).padStart(2, "0")}T09:00:00.000Z`,
    slug, filename: `local-preview-${slug}`, imageUrl: null, views: 0, premium: false,
  };
}

const LOCAL_PREVIEW_ARTICLES: ArticleListItem[] = [
  localPreviewArticle("Tüketici güven endeksi kasımda yükseldi", "ekonomi", "tuketici-guven-endeksi-kasimda-yukseldi", 23, "TÜİK verilerine göre tüketici güven endeksi kasımda aylık bazda yüzde 2,4 artarak 86,8 oldu."),
  localPreviewArticle("Altın Alım Satım Makası Nedir? Tanımı, Hesaplaması ve Dikkat Edilecekler", "altin", "altin-alim-satim-makasi-nedir", 22),
  localPreviewArticle("Fed Tutanaklarında Faiz Artırımı Sinyali: Aralıkta 50 Baz Puan Olasılığı", "ekonomi", "fed-tutanaklarinda-faiz-artirimi-sinyali", 21),
  localPreviewArticle("Merkez Bankası rezervleri 159 milyar dolar oldu", "ekonomi", "merkez-bankasi-rezervleri-159-milyar-dolar-oldu", 20),
  localPreviewArticle("Blockchain Nasıl Çalışır? Merkeziyetsiz Teknolojinin Temelleri", "kripto", "blockchain-nasil-calisir-merkeziyetsiz-teknolojinin-temelleri", 19),
  localPreviewArticle("Fransız Bankası Societe Generale'den Türkiye Ekonomisine Bakış", "ekonomi", "societe-generale-turkiye-ekonomisi", 18),
  localPreviewArticle("Hindistan Dizel ve Havacılık Yakıtı İhracat Vergilerini Artırdı", "ekonomi", "hindistan-yakit-ihracat-vergilerini-artirdi", 17),
  localPreviewArticle("Gümrük Denetimleriyle Vergi Kaybının Önlenmesi", "ekonomi", "gumruk-denetimleri-vergi-kaybi", 16),
  localPreviewArticle("Elektrifikasyon Türkiye İçin Yeni Bir Ekonomik Büyüme Modeli", "ekonomi", "elektrifikasyon-turkiye-ekonomik-buyume-modeli", 15),
  localPreviewArticle("Resesyon Nedir? Ekonomide Resesyon Ne Demek, Olursa Ne Olur", "ekonomi", "resesyon-nedir", 14),
  localPreviewArticle("Altın Ons Fiyatı Ekim 2025 Sonrası En Düşük Seviyelerde", "altin", "altin-ons-fiyati-en-dusuk-seviyelerde", 13),
  localPreviewArticle("VİOP Nedir? Vadeli İşlem ve Opsiyon Piyasası, Teminat ve VİOP Hesabı", "borsa", "viop-nedir-turkiye-vadeli-islem-ve-opsiyon-piyasasi-rehberi", 12),
  localPreviewArticle("Çin Ekonomisinde Ekim Ayı Verileri: Tüketim ve Konut Piyasasında Daralma", "ekonomi", "cin-ekonomisi-ekim-verileri", 11),
  localPreviewArticle("Cari Açık Nedir? Ekonomik Etkileri ve Hesaplama Yöntemleri", "ekonomi", "cari-acik-nedir", 10),
  localPreviewArticle("TCMB'nin 2027 Enflasyon Tahmini ve Varsayımları", "ekonomi", "tcmb-2027-enflasyon-tahmini", 9),
  localPreviewArticle("Gram Altın Hesaplama: 22 Ayar, Çeyrek ve Ons Formülleri", "altin", "gram-altin-hesaplama", 8),
];

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
  let all: ArticleListItem[];
  let guides: ArticleListItem[];
  let localPreview = false;
  try {
    [all, guides] = await Promise.all([getAllArticles(), getGuides(6)]);
  } catch (error) {
    if (process.env.NODE_ENV !== "development") throw error;
    console.warn("[homepage] Veritabanı bağlı değil; yerel tasarım önizlemesi gösteriliyor.");
    all = LOCAL_PREVIEW_ARTICLES;
    guides = [];
    localPreview = true;
  }
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
      {localPreview && <p className="edition-preview-note">Yerel tasarım önizlemesi · Haber veritabanı bağlı değil, kartlar örnek içerik gösteriyor.</p>}
      <div className="edition-layout">
        <div className="edition-main">
          {hero ? (
            <>
              <div className="edition-kicker"><span>ÖNE ÇIKAN</span><span>HABER MASASI</span></div>
              <HeroCard article={hero} />
              {secondary.length > 0 && <div className="edition-secondary">
                {secondary.map(a => {
                  const img = articleCoverUrl(a);
                  return <Link key={a.filename} href={`/${a.slug}`} className="edition-secondary-card">
                    {img && <div className="edition-secondary-image"><SafeImage src={img} fallbackSrc={articleCoverFallbackUrl(a)} alt={articleCoverAlt(a)} fill sizes="(max-width: 640px) 110px, (max-width: 980px) 32vw, 280px" style={{ objectFit: "cover" }} />{isIllustrativeCover(a) && <span className="illustrative-badge">Temsili görsel</span>}</div>}
                    <div className="edition-secondary-copy">
                      <span className="edition-category" style={{ color: catColor(a.category, "var(--accent)") }}>{CATS[a.category]?.l ?? a.category}</span>
                      <h2>{a.title}</h2>
                      <time dateTime={a.created_at}>{Ago(a.created_at)}</time>
                    </div>
                  </Link>;
                })}
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
            <div className="edition-guide-visual" aria-hidden="true">
              <Image
                src="/visuals/financial-literacy-editorial.webp"
                alt=""
                width={960}
                height={543}
                sizes="(max-width: 980px) 90vw, 340px"
                quality={80}
              />
            </div>
            <span className="edition-eyebrow">FİNANS REHBERİ</span>
            <h2>Bilgiyle atılan<br />ilk adım.</h2>
            <p>Kavramları tanıyın, piyasaları daha rahat takip edin.</p>
            <Link href="/rehber">Rehberleri inceleyin <span aria-hidden="true">↗</span></Link>
          </section>
          {trending.length > 0 && <section className="edition-topics"><h2 className="edition-rail-title">Gündemdeki konular</h2><div>{trending.map(t => <Link key={t} href={`/arsiv?q=${encodeURIComponent(t)}`}>{t} <span aria-hidden="true">↗</span></Link>)}</div></section>}
          <AdSlot position="sidebar" />
        </aside>
      </div>
      {guides.length > 0 && (
        <section className="edition-latest">
          <SectionHeading title="Finans rehberleri" href="/rehber" link="Tüm rehberler" />
          <div className="market-chips">
            {guides.map((g) => (
              <Link key={g.slug} href={`/${g.slug}`} className="market-chip">{g.title}</Link>
            ))}
          </div>
        </section>
      )}
      <AdSlot position="headerBanner" />
      <section className="edition-utilities" aria-labelledby="tools-title">
        <div><span className="edition-eyebrow">RAKAMLARI KENDİNİZ HESAPLAYIN</span><h2 id="tools-title">Paranızın hesabı, elinizin altında.</h2><p>Kredi, mevduat, altın ve enflasyon için ücretsiz araçlar.</p></div>
        <Link href="/araclar">Hesaplama araçlarını açın <span aria-hidden="true">↗</span></Link>
      </section>
      <ToolsRail title="Hesaplama Araçları" />

      <section id="bulten" className="edition-newsletter" aria-label="E-posta bülteni"><Newsletter enabled={mailEnabled()} /></section>
    </div>
  );
}
