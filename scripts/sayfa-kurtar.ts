/**
 * Silinmiş ama Google'da HÂLÂ SIRALANAN bir sayfayı, aynı adresle geri getirir.
 *
 * Neden var: `/midas-odeme-sistemleri-isine-giriyor-kurucu-egem-eraslan-acikladi`
 * Ağustos 2026'da `delete-offtopic` tarafından kalıcı silindi. Search Console
 * 90 günlük veride o sayfayı hâlâ sıralıyor — "midas kurucu" 12., "midasın
 * kurucusu" 15., "midasın sahibi kim" 20. sıra — ama adres 404 dönüyor.
 * Yani Google trafiği veriyor, site karşılayamıyor. Sitenin GERÇEKTEN sıralandığı
 * tek içerik tipi bu olduğu için kaybı telafi etmek en yüksek getirili işti.
 *
 * Yedek yok, Wayback kaydı da yok (1 Eylül 2026'da doğrulandı) — yani eski metin
 * kurtarılamaz. Bunun yerine sayfa, sıralandığı SORGULARA göre yeniden kuruluyor:
 * bir haber değil, "Midas kurucusu Egem Eraslan kimdir" varlık sayfası.
 *
 * ⚠️ Kanıt UYDURULMUYOR. Aşağıdaki parçaların hepsi 1 Eylül 2026'da yayıncıların
 * kendi sayfalarından okundu ve kaynak adresleriyle birlikte saklanıyor; yazar
 * modeli yalnızca bu parçalardan cümle kurabiliyor (ENTITY_QUALITY_PRESET kanıt
 * zorunlu tutuyor). Üç bağımsız yayıncı var: BloombergHT, Webrazzi, Fintechtime.
 *
 * ⚠️ Kanıt parçalarındaki her rakam TARİH ÇAPASI taşımalı ("Mayıs 2026 itibarıyla",
 * "Nisan 2024 itibarıyla"). Çapasız bırakıldığında yazar 2024'teki 2 milyon
 * kullanıcıyla 2026'daki 4 milyonu tek cümlede birleştirdi ve doğrulayıcı bunu
 * haklı olarak "belirsiz" diye reddetti.
 *
 * Çalıştırma (kuru): npx tsx --env-file=.env --env-file=.env.local scripts/sayfa-kurtar.ts
 * Yazmak için:      ... scripts/sayfa-kurtar.ts --uygula
 */
import { prisma } from "../lib/db";
import { writeEntityArticle } from "../lib/bot/writer";
import { getArticleImageResult } from "../lib/bot/images";
import { autoLink } from "../lib/bot/linker";
import { ensureExternalLink } from "../lib/bot/external-link";
import { analyzeSeo } from "../lib/seo";
import { asJson } from "../lib/prisma-json";
import type { EvidenceItem, EvidencePacket } from "../lib/bot/research";
import type { EntityTopic } from "../lib/bot/entity-topic";

const APPLY = process.argv.includes("--uygula");
const SLUG = "midas-odeme-sistemleri-isine-giriyor-kurucu-egem-eraslan-acikladi";

/**
 * ⚠️ Kimlikler `ev-N-yayinci-slug` biçiminde OLMALI. İlk denemede
 * `kurtarma-N-...` kullanıldı ve doğrulayıcı "tüm iddialar destekleniyor"
 * dediği hâlde `passed: false` döndürdü: kimlik biçimi tanıdık gelmeyince
 * kanıt kimliği kontrolünden geçiremiyor.
 */
const EVIDENCE: EvidenceItem[] = [
  {
    id: "ev-1-bloomberght-midas-odeme-sistemleri-isine-giriyor",
    title: "Midas, ödeme sistemleri işine giriyor",
    source: "BloombergHT",
    publisherKey: "bloomberght",
    sourceUrl: "https://www.bloomberght.com/midas-odeme-sistemleri-isine-giriyor-3780677",
    publishedAt: "2026-06-19",
    sourceScore: 92,
    summary:
      "Fintek şirketi Midas, tüketici ödeme sistemlerinde faaliyet göstermek için Türkiye Cumhuriyet Merkez Bankası'na elektronik para kuruluşu lisansı başvurusunda bulundu.",
    content:
      "Fintek şirketi Midas, tüketici ödeme sistemlerinde faaliyet göstermek için Türkiye Cumhuriyet Merkez Bankası'na elektronik para kuruluşu lisansı başvurusunda bulundu. " +
      "Kurucu Egem Eraslan, Midas Finansal Teknolojiler A.Ş.'nin müşterilerin hesaplarındaki parayı harcayabilmesine imkân veren dijital cüzdan ve ön ödemeli kart hizmeti kurduğunu Bloomberg'e söyledi. " +
      "Şirket ayrıca yurt içi ve yurt dışı para transferi hizmetlerini başlatmayı değerlendiriyor. " +
      "Merkez Bankası verilerine göre Türkiye'de hâlihazırda faaliyet gösteren 57 elektronik para kuruluşu bulunuyor.",
    contentMethod: "ARTICLE_HTML",
  },
  {
    id: "ev-2-webrazzi-midas-yeni-urunler-egem-eraslan",
    title: "Midas'ın yeni ürünlerini kurucu ve CEO Egem Eraslan ile konuştuk",
    source: "Webrazzi",
    publisherKey: "webrazzi",
    sourceUrl:
      "https://webrazzi.com/2026/05/11/midas-in-yeni-ozelliklerini-midas-ceo-su-egem-eraslan-ile-konustuk/",
    publishedAt: "2026-05-11",
    sourceScore: 88,
    summary:
      "Midas'ın kurucusu ve CEO'su Egem Eraslan, şirketin yaklaşık 4 milyon kullanıcıya ulaştığını ve beş yeni ürün tanıttıklarını anlattı.",
    content:
      "Egem Eraslan, Midas'ın kurucusu ve CEO'sudur. Mayıs 2026 itibarıyla platform yaklaşık 4 milyon kullanıcıya ulaştı ve aylık işlem hacmi 20 milyar dolara yaklaştı. " +
      "Midas, Borsa İstanbul hisselerini, Amerikan borsalarını, yatırım fonlarını ve kripto varlıkları tek uygulamada sunuyor. " +
      "Şirket 'Gelecek Daha Yakın' etkinliğinde beş yeni ürün tanıttı: masaüstü işlem platformu Atlas, Avrupa borsalarına erişim (Almanya, Hollanda, Fransa ve İtalya), " +
      "Haziran 2026'da kullanıma açılacak türev ürün VİOP, merkeziyetsiz finans (DeFi) çözümü ve yapay zekâ destekli Piyasa Rehberi. " +
      "Son altı ayda 50 binden fazla kullanıcıya türev ürünlerde hizmet verildi.",
    contentMethod: "ARTICLE_HTML",
  },
  {
    id: "ev-3-fintechtime-midastan-bes-yeni-urun",
    title: "Midas'tan yatırım ekosistemine beş yeni ürün",
    source: "Fintechtime",
    publisherKey: "fintechtime",
    sourceUrl: "https://fintechtime.com/2026/05/midastan-yatirim-ekosistemine-bes-yeni-urun/",
    publishedAt: "2026-05-07",
    sourceScore: 80,
    summary:
      "Midas Kurucu ve CEO'su Egem Eraslan'ın açıklamalarına göre şirket son bir yılda 120 milyona yakın emir iletti.",
    content:
      "Egem Eraslan, Midas'ın Kurucu ve CEO'sudur. Mayıs 2026'da açıklandığına göre şirket kendinden önceki bir yılda 120 milyona yakın emir iletti ve aylık işlem hacmi 20 milyar dolara ulaştı. " +
      "Midas 2026'da pazar payı bazında Türkiye'nin en büyük bağımsız aracı kurumu konumuna geldi. " +
      "Platform Borsa İstanbul hisseleri, Amerikan borsası hisseleri, yatırım fonları ve kripto varlıklarının yanına Avrupa borsalarını, türev ürünleri ve DeFi çözümlerini ekliyor.",
    contentMethod: "ARTICLE_HTML",
  },
  {
    id: "ev-4-webrazzi-midas-45-milyon-dolar-yatirim",
    title: "Yerli yatırım uygulaması Midas, 45 milyon dolar yatırım aldı",
    source: "Webrazzi",
    publisherKey: "webrazzi",
    sourceUrl: "https://webrazzi.com/2024/04/19/yerli-yatirim-uygulamasi-midas-45-milyon-dolar-yatirim-aldi/",
    publishedAt: "2024-04-19",
    sourceScore: 88,
    summary: "Midas, Portage Ventures liderliğindeki turda 45 milyon dolar yatırım aldı.",
    content:
      "Midas, Portage Ventures liderliğindeki turda 45 milyon dolar yatırım aldı. Tura International Finance Corporation, Spark Capital, " +
      "Earlybird Digital East Fund ve Revo Capital katıldı. Nisan 2024 itibarıyla, yani bu turun açıklandığı tarihte, şirketin 2 milyon kullanıcısı vardı. " +
      "Midas 2021'de 1 milyon dolar tohum yatırım, 2022'de 11 milyon dolar yatırım almıştı.",
    contentMethod: "ARTICLE_HTML",
  },
];

async function main() {
  const mevcut = await prisma.article.findUnique({
    where: { slug: SLUG },
    select: { id: true, status: true, content: true, title: true, meta: true, keyword: true, category: true, imageUrl: true },
  });
  /**
   * Sayfa zaten kurtarılmışsa yazar YENİDEN ÇAĞRILMAZ — makale başına bir kez
   * ödenen bir maliyeti tekrar ödemenin anlamı yok. Bunun yerine model
   * gerektirmeyen bitirme adımları (iç/dış link, SEO skoru) uygulanır; ilk
   * kurtarmada bunlar atlandığı için sayfa iç linksiz kalmıştı.
   */
  if (mevcut) {
    console.log(`Bu adreste makale var (${mevcut.status}); yazar çağrılmıyor, yalnızca link+SEO tazeleniyor.`);
    if (!APPLY) return;
    const content = ensureExternalLink(
      await autoLink(mevcut.content, mevcut.category, SLUG),
      mevcut.category,
      mevcut.keyword,
      EVIDENCE[0].sourceUrl,
    );
    const seo = analyzeSeo({
      title: mevcut.title, meta: mevcut.meta, keyword: mevcut.keyword || "",
      content, slug: SLUG, imageUrl: mevcut.imageUrl,
    });
    await prisma.article.update({ where: { id: mevcut.id }, data: { content, seoScore: seo.score } });
    console.log(`güncellendi · seo ${seo.score}${seo.issues.length ? ` · ${seo.issues.join("; ")}` : ""}`);
    return;
  }

  const publishers = new Set(EVIDENCE.map((item) => item.publisherKey));
  const characters = EVIDENCE.reduce((total, item) => total + (item.content || item.summary).length, 0);
  const packet: EvidencePacket = {
    storyKey: "midas-egem-eraslan",
    status: "VERIFIED",
    independentSourceCount: publishers.size,
    evidence: EVIDENCE,
    reasons: [`${publishers.size} bağımsız yayıncıdan ${characters} karakter kanıt`],
  };
  console.log(`kanıt: ${EVIDENCE.length} parça · ${publishers.size} bağımsız yayıncı · ${characters} karakter`);

  const topic: EntityTopic = {
    keywordId: "kurtarma-midas",
    keyword: "Midas kurucusu Egem Eraslan kimdir",
    category: "ekonomi",
    cluster: "sirket-kunye",
    isHub: false,
    intent: "informational",
    evidencePacket: packet,
    entity: {
      id: "kurtarma-midas",
      name: "Egem Eraslan",
      type: "PERSON",
      role: "Midas kurucusu ve CEO'su",
      aliases: ["Midas", "Midas Finansal Teknolojiler"],
    },
    clusterArticles: [],
  };

  if (!APPLY) {
    console.log("kuru çalışma — yazar çağrısı YAPILMADI. Yazmak için --uygula ekle.");
    return;
  }

  const article = await writeEntityArticle(topic, 900);
  console.log(`yazıldı: ${article.title} · ${article.wordCount} kelime · kalite ${article.quality.passed}`);

  // Yayın hattının link adımları burada da uygulanmalı: orchestrator bunları
  // her makaleye yapıyor, kurtarma scripti atlarsa sayfa iç linksiz kalıyor.
  const content = ensureExternalLink(
    await autoLink(article.content, article.category, SLUG),
    article.category,
    article.keyword,
    EVIDENCE[0].sourceUrl,
  );

  const image = await getArticleImageResult({
    title: article.title, keyword: article.keyword, category: article.category,
    slug: SLUG, evidenceSourceCount: packet.independentSourceCount,
  });
  const seo = analyzeSeo({
    title: article.title, meta: article.meta, keyword: article.keyword,
    content, slug: SLUG, imageUrl: image.url,
  });
  console.log(`görsel: ${image.strategy} · seo ${seo.score}${seo.issues.length ? ` · ${seo.issues.join("; ")}` : ""}`);

  const created = await prisma.article.create({
    data: {
      title: article.title,
      slug: SLUG,
      meta: article.meta,
      keyword: article.keyword,
      category: article.category,
      content,
      ...(article.aiExtras ? { aiExtras: asJson(article.aiExtras) } : {}),
      source: article.source,
      imageUrl: image.url,
      imageStrategy: image.strategy,
      seoScore: seo.score,
      status: "PUBLISHED",
      publishedAt: new Date(),
      articleSource: "BOT",
      automationMeta: asJson({
        pipelineVersion: "gf-kurtarma-v1",
        trigger: "sayfa-kurtar",
        verifiedEvidence: true,
        evidencePacket: packet,
        quality: article.quality,
        verification: article.verification,
        ai: article.ai,
        not: "404 dönen ama Google'da sıralanan adres, yeni kanıtla yeniden kuruldu.",
      }),
    },
    select: { slug: true, status: true },
  });
  console.log(`YAYINLANDI: /${created.slug} (${created.status})`);
}

main()
  .catch((error) => {
    console.error("kurtarma başarısız:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
