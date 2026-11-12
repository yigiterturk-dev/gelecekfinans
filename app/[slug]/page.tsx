import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { absoluteImageUrl, imageObjectLd, publicImageUrl } from "@/lib/image-url";
import { parseProfileSubject, profileAboutLd } from "@/lib/entity-profile";
import { CATS, MedCard } from "@/components/ArticleCard";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import AdSlot from "@/components/AdSlot";
import { readingTime } from "@/lib/reading-time";
import { tamGovde, kilitliGovde } from "@/lib/article-body";
import PremiumBody from "@/components/PremiumBody";

/**
 * 🔑 ISR (2026-09-09). Sayfa ARTIK önbellekleniyor.
 *
 * Öncesinde `force-dynamic` vardı ve yanında yazan `revalidate` hiç
 * çalışmıyordu (force-dynamic onu ezer) — yani "makaleler önbellekleniyor"
 * varsayımı yanlıştı, 53 makalenin HER isteği veritabanına gidiyordu.
 * Sebep premium kapısının `getServerSession` çağrısıydı: çerez okuyan sayfa
 * statik üretilemez.
 *
 * Kapı yeniden kuruldu: sunucu premium makale için HER ZAMAN teaser basar,
 * tam metin `/api/articles/[slug]/body` ucundan (oturum doğrulamalı)
 * çekilir. Bu, eskisinden DAHA güvenli — premium metin artık önbellekte
 * duran HTML'in içinde hiç bulunmuyor.
 *
 * ⚠️ Buraya `cookies()`, `headers()` ya da `getServerSession` EKLEME;
 * eklersen sayfa sessizce dinamiğe döner ve bu kazanç kaybolur.
 * tests/article-isr.test.ts bunu bekçilik ediyor.
 */
export const revalidate = 300;

/**
 * Yayındaki makalelerin adreslerini derleme anında üretir.
 *
 * ⚠️ ÖLÇÜLDÜ: yalnızca `revalidate` yazmak YETMEDİ. `generateStaticParams`
 * olmadan Next hiçbir yolu önceden üretemiyor ve rota derleme çıktısında
 * `ƒ (Dynamic)` kalıyor — yani her istek yine sunucuda render ediliyordu.
 * Build çıktısındaki işaret bu yüzden kabul ölçütü: `●` görmelisin, `ƒ` değil.
 *
 * `dynamicParams` açık: burada listelenmeyen yeni bir makale (bot yayına
 * aldığı anda) yine de çalışır, ilk istekte üretilir ve sonraki ziyaretçiler
 * için önbelleğe alınır. Kapalı olsaydı yeni makaleler 404 verirdi.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const hepsi = await getAllArticles();
  return hepsi.map((a) => ({ slug: a.slug }));
}

const BASE = "https://gelecekfinans.com";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params; const a=await getArticleBySlug(slug); if(!a)return{};
  // OG/Twitter görselleri kendi alan adımızdan verilir (bkz. lib/image-url.ts).
  const img=absoluteImageUrl(a.imageUrl,BASE);
  return{
    title:a.title,description:a.meta,keywords:a.keyword,
    alternates: { canonical: `${BASE}/${slug}` },
    openGraph:{
      title:a.title,description:a.meta,type:"article",publishedTime:a.created_at,
      modifiedTime:a.updatedAt||a.created_at,authors:[`${BASE}/hakkimizda`],section:a.category,
      url:`${BASE}/${slug}`,...(img&&{images:[{url:img,alt:a.title}]})
    },
    twitter:{card:"summary_large_image",title:a.title,description:a.meta,...(img&&{images:[img]})},
  };
}

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const a=await getArticleBySlug(slug); if(!a)notFound();
  const cfg=CATS[a.category]??{l:a.category.toUpperCase(),c:"#555"};
  const img=publicImageUrl(a.imageUrl);
  const publishedDate = new Date(a.created_at);
  const updatedDate = new Date(a.updatedAt || a.created_at);
  const date=publishedDate.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"});
  const visiblyUpdated = updatedDate.getTime() - publishedDate.getTime() > 60_000;
  const url = `${BASE}/${a.slug}`;
  const readTime = readingTime(a.content);

  // Structured data — görsel düğümü mutlak URL ve bilinen boyutlarla üretilir;
  // Google zengin sonuçlar için ImageObject'te width/height bekliyor.
  const imageLd=imageObjectLd(a.imageUrl,BASE,a.title,`${url}#primaryimage`);
  // "X kimdir" künyelerinde sayfanın HAKKINDA olduğu varlık makinece
  // okunabilir olmalı; sitenin tek gerçek sıralaması bu şeritten geliyor.
  const profileSubject = parseProfileSubject(a.title);
  const aboutLd = profileSubject ? profileAboutLd(profileSubject, { url, description: a.meta }) : null;
  const ld={
    "@context":"https://schema.org","@type":"NewsArticle","@id":`${url}#article`,headline:a.title,
    description:a.meta,datePublished:a.created_at,dateModified:a.updatedAt||a.created_at,keywords:a.keyword,
    articleSection:cfg.l,inLanguage:"tr-TR",
    mainEntityOfPage:{"@type":"WebPage","@id":url,...(imageLd&&{primaryImageOfPage:imageLd})},
    author:{"@type":"Organization","@id":`${BASE}/#organization`,name:"GelecekFinans Haber Merkezi",url:`${BASE}/hakkimizda`},
    publisher:{"@type":"NewsMediaOrganization","@id":`${BASE}/#organization`,name:"GelecekFinans",url:BASE,logo:{"@type":"ImageObject",url:`${BASE}/icon.svg`,width:512,height:512}},
    isAccessibleForFree:!a.premium,
    ...(aboutLd&&{about:aboutLd}),
    ...(imageLd&&{image:imageLd}),
    ...(a.premium&&{
      hasPart:{"@type":"WebPageElement",isAccessibleForFree:false,cssSelector:".article-prose"},
    }),
  };

  // Breadcrumb structured data
  const breadcrumbLd = {
    "@context":"https://schema.org","@type":"BreadcrumbList",
    itemListElement:[
      {"@type":"ListItem",position:1,name:"Ana Sayfa",item:BASE},
      {"@type":"ListItem",position:2,name:cfg.l,item:`${BASE}/kategori/${a.category}`},
      {"@type":"ListItem",position:3,name:a.title,item:url},
    ]
  };

  // Related articles (same category, exclude current)
  const allArticles = await getAllArticles();
  const related = allArticles
    .filter(r => r.category === a.category && r.slug !== a.slug)
    .slice(0, 4);

  const tags = a.keyword ? a.keyword.split(/[,;]/).map(k => k.trim()).filter(Boolean) : [];

  // Premium kapısı. ÖNBELLEĞE giren HTML'de premium makale HER ZAMAN kilitli
  // basılır — okurun üye olup olmadığına BAKILMAZ, çünkü bu çıktı CDN'de
  // duruyor ve herkese açık. Üyeye tam metni PremiumBody istemci bileşeni
  // kimlik doğrulamalı uçtan çekip gösteriyor.
  const gated = !!a.premium;
  const bodyHtml = gated
    ? kilitliGovde(a.content)
    : tamGovde(a.content, a.slug, allArticles);

  // AI "Özet & Cebine Etkisi" + SSS — yalnızca alanlar varsa ve içerik
  // kilitli (premium teaser) DEĞİLSE göster (premium içeriği sızdırma).
  const extras = a.aiExtras ?? null;
  const showExtras = !!extras && !gated;
  const faq = showExtras ? extras!.faq ?? [] : [];
  // FAQPage JSON-LD — yalnızca sayfada GÖRÜNEN SSS'lerden üretilir (schema=görünür içerik).
  const faqLd = faq.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  // JSON-LD XSS-güvenliği (Next 16 json-ld rehberi): `<` → < kaçışla.
  const jsonLd = (obj: unknown) => JSON.stringify(obj).replace(/</g, "\\u003c");

  return(
    <div className="article-container">
      <ReadingProgress/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(ld)}}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(breadcrumbLd)}}/>
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(faqLd)}}/>}

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Ana Sayfa</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/kategori/${a.category}`} style={{color:cfg.c}}>{cfg.l}</Link>
        <span className="breadcrumb-sep">/</span>
        <span style={{color:"var(--ink)"}}>{a.title.slice(0, 40)}...</span>
      </nav>

      {/* Category + date */}
      <div className="article-meta-row">
        <span className="tag" style={{background:cfg.c}}>{cfg.l}</span>
        <time className="article-date" dateTime={a.created_at}>Yayınlandı: {date}</time>
        {visiblyUpdated && (
          <time className="article-date" dateTime={a.updatedAt}>
            Güncellendi: {updatedDate.toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}
          </time>
        )}
        <span className="article-date">{readTime}</span>
      </div>

      {/* Title */}
      <h1 className="article-title">{a.title}</h1>

      {/* Lead */}
      <p className="article-lead">{a.meta}</p>

      {/* Share buttons (top) */}
      <ShareButtons url={url} title={a.title} />

      {/* Image */}
      {img&&(
        <figure className="article-figure">
          <div className="article-figure-media">
            <SafeImage src={img} alt={a.title} fill style={{objectFit:"cover"}} sizes="720px" priority />
          </div>
          {/* Görselin yanındaki metin Google Görseller'in en güçlü bağlam
              sinyallerinden biri; alt metnin kopyası değil, kaynak künyesi. */}
          <figcaption className="article-figcaption">{a.title} — GelecekFinans</figcaption>
        </figure>
      )}

      {/* AI Özet & Cebine Etkisi kutusu (alanlar varsa) — metin React children
          olarak basılır, otomatik kaçışlanır (XSS-güvenli). */}
      {showExtras && ((extras!.summary?.length ?? 0) > 0 || !!extras!.impact) && (
        <aside className="ai-brief" aria-label="Haber özeti ve etkisi">
          {(extras!.summary?.length ?? 0) > 0 && (
            <div className="ai-brief-block">
              <span className="ai-brief-label">ÖZET</span>
              <ul className="ai-brief-list">
                {extras!.summary!.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {extras!.impact && (
            <div className="ai-brief-block ai-brief-impact">
              <span className="ai-brief-label">CEBİNE ETKİSİ</span>
              <p>{extras!.impact}</p>
            </div>
          )}
        </aside>
      )}

      {/* Gövde. Premium ise: önbellekte teaser durur, üyeye tam metni
          PremiumBody kimlik doğrulamalı uçtan çekip bunun yerine koyar. */}
      {gated ? (
        <PremiumBody slug={a.slug}>
          <article className="article-prose" dangerouslySetInnerHTML={{__html:bodyHtml}}/>
        </PremiumBody>
      ) : (
        <article className="article-prose" dangerouslySetInnerHTML={{__html:bodyHtml}}/>
      )}

      {/* SSS — sayfada görünür (FAQPage JSON-LD ile birebir aynı içerik) */}
      {faq.length > 0 && (
        <section className="faq-section" aria-label="Sıkça sorulan sorular">
          <h2 className="faq-title">Sıkça Sorulan Sorular</h2>
          <div className="faq-list">
            {faq.map((f, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-q">{f.q}</summary>
                <p className="faq-a">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Premium gate */}
      {gated && (
        <div className="premium-gate">
          <div className="premium-card">
            <span className="premium-pill">PREMIUM İÇERİK</span>
            <h2>Yazının devamını okumak için üye girişi yapın</h2>
            <p>
              Bu analiz GelecekFinans üyelerine özeldir. Ücretsiz hesabınızla
              tüm premium içeriklere erişebilirsiniz.
            </p>
            {/* Yönetim giriş bağlantısı gizli olduğundan public sayfada ifşa edilmez. */}
            <span className="premium-note">Yakında üyelik sistemi aktif olacak.</span>
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="article-tags">
          {tags.map(tag => (
            <span key={tag} className="article-tag">{tag}</span>
          ))}
        </div>
      )}

      {/* Author box */}
      <div className="author-box">
        <div className="author-avatar">GF</div>
        <div>
          <Link href="/yazarlar" className="author-name">GelecekFinans Haber Merkezi</Link>
          <div className="author-role">
            İki bağımsız kaynak ve özgünlük kontrolüyle hazırlanan finans haberleri.{" "}
            <Link href="/yayincilik-ilkeleri">Yayın yöntemimiz</Link>
          </div>
        </div>
      </div>

      {/* In-article ad slot */}
      <AdSlot position="inArticle" />

      {/* Share buttons (bottom) */}
      <div className="article-share-bottom">
        <p className="article-share-label">Paylaş</p>
        <ShareButtons url={url} title={a.title} />
      </div>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="related-section">
          <div className="sec-rule" style={{paddingTop:0}}>
            <span className="sec-rule-label" style={{color:cfg.c}}>İlgili Haberler</span>
            <div className="sec-rule-line"/>
          </div>
          <div className="resp-grid-4" style={{gridTemplateColumns:"repeat(2, 1fr)"}}>
            {related.map(r=><MedCard key={r.filename} article={r}/>)}
          </div>
        </section>
      )}

      <nav className="article-discovery" aria-label="Konuyla ilgili finans sayfaları">
        <strong>Konuyu takip et</strong>
        <div className="market-chips">
          <Link href={`/kategori/${a.category}`} className="market-chip">{cfg.l} haberleri</Link>
          {a.category === "borsa" && <Link href="/faiz" className="market-chip">Faiz oranları</Link>}
          {a.category === "doviz" && <Link href="/doviz" className="market-chip">Canlı döviz kurları</Link>}
          {a.category === "altin" && <Link href="/altin" className="market-chip">Altın fiyatları</Link>}
          {a.category === "kripto" && <Link href="/kripto" className="market-chip">Kripto fiyatları</Link>}
          <Link href="/araclar" className="market-chip">Finans hesaplama araçları</Link>
          <Link href="/arsiv" className="market-chip">Haber arşivi</Link>
        </div>
      </nav>

      <div className="article-back">
        <Link href="/" className="back-link">
          ← Tüm Haberlere Dön
        </Link>
      </div>
    </div>
  );
}
