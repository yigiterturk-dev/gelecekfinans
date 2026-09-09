/**
 * Kategori sayfalarının kategoriye ÖZGÜ içeriği.
 *
 * Neden var: 9 Eylül GSC ölçümünde `/kategori/doviz` "Discovered - currently
 * not indexed" çıktı. Canlı sayfa ölçüldü: **178 kelime** — başlık, haber
 * sayısı ve kart ızgarası dışında tek cümle özgün metin yok. Beş kategori
 * sayfası da aynı bileşenden üretildiği için birbirinin kopyası; Google
 * bunları taramaya değer görmüyor.
 *
 * Aynı çözüm hisse/varlık/kripto sayfalarında işe yaradı (thyao 424 -> 658
 * kelime, sayfaya özgü cümle 5 -> 20). Burada da her kategoriye kendi
 * anlatısı ve kendi soruları veriliyor.
 *
 * ⚠️ KURAL (stock-profiles.ts ve market-faq.ts ile aynı): hiçbir metinde
 * değişken rakam geçmez — fiyat, oran, yüzde, tarih. Sayfa bayatlamasın ve
 * kalite kapısının "somut rakam" kuralıyla çelişmesin diye. Yalnızca zamana
 * bağlı olmayan gerçekler yazılır. Yatırım tavsiyesi yoktur.
 */
import type { FaqItem } from "./market-faq";

export interface CategoryProfile {
  /** Haber ızgarasının ALTINDA basılan paragraflar. */
  paragraphs: string[];
  /** Yalnız bu kategoriye özgü sorular. */
  faq: FaqItem[];
}

export const CATEGORY_PROFILES: Record<string, CategoryProfile> = {
  doviz: {
    paragraphs: [
      "Döviz kuru, bir para biriminin başka bir para birimi cinsinden değeridir. Türkiye'de serbest kur rejimi uygulanır; kurun düzeyini alıcı ve satıcılar piyasada belirler, Merkez Bankası'nın ilan ettiği gösterge niteliğindeki kurlar bu işlemlerden türetilir. Bankaların müşterilerine uyguladığı alış ve satış kurları arasındaki fark makas olarak adlandırılır ve kurumdan kuruma değişir; efektif kur nakit işlemler, döviz kuru ise hesaptan hesaba transferler için geçerlidir.",
      "Kur hareketlerinin arkasındaki başlıklar büyük ölçüde aynıdır: Merkez Bankası'nın faiz kararları ve rezerv gelişmeleri, enflasyon ile cari denge verileri, yurt dışı yerleşiklerin portföy hareketleri ve küresel tarafta ABD Merkez Bankası'nın para politikası. Bu kategoride dolar, euro ve sterlin başta olmak üzere kur haberlerini, arkasındaki veriyi ve kararları takip ediyoruz. Kurun bir gün içindeki hareketi ile eğilimi ayrı şeylerdir; günlük dalgalanma çoğu zaman kalıcı bir yön değişimi anlamına gelmez.",
    ],
    faq: [
      {
        q: "Serbest kur rejiminde kuru kim belirliyor?",
        a: "Kurun düzeyi piyasada, alıcı ve satıcıların işlemleriyle oluşur. Merkez Bankası kuru bir seviyeye sabitlemez; ilan ettiği gösterge kurlar piyasada gerçekleşen işlemlerden türetilir. Para politikası kararları kuru dolaylı olarak, faiz ve likidite kanalıyla etkiler.",
      },
      {
        q: "Döviz kuru ile efektif kur arasındaki fark ne?",
        a: "Efektif kur nakit döviz alım satımında, döviz kuru ise hesaptan hesaba yapılan transferlerde geçerlidir. Nakdin taşınması, saklanması ve sayımı maliyet yarattığı için efektif kurlar genellikle biraz daha dezavantajlıdır.",
      },
      {
        q: "Alış ve satış kuru neden farklı?",
        a: "Aradaki farka makas denir ve bankanın ya da döviz bürosunun işlem maliyeti ile kâr marjını içerir. Makas kurumdan kuruma, işlem tutarına ve piyasadaki dalgalanmaya göre değişir; oynaklığın arttığı dönemlerde açılır.",
      },
    ],
  },

  altin: {
    paragraphs: [
      "Altın fiyatları iki katmanlı oluşur. Uluslararası piyasada ons altın ABD doları cinsinden fiyatlanır; Türkiye'de gram altının TL karşılığı ise bu ons fiyatının dolar kuruyla birleşmesinden çıkar. Bu yüzden gram altındaki bir hareketin kaynağını anlamak için iki bileşene ayrı bakmak gerekir: ons tarafı mı değişti, kur tarafı mı? İkisi ters yönde hareket ettiğinde gram altın yerinde sayabilir, aynı yöne gittiğinde hareket büyür.",
      "Ons altının yönünü belirleyen başlıklar arasında reel faizler, ABD Merkez Bankası'nın para politikası, doların diğer para birimleri karşısındaki seyri, merkez bankalarının rezerv alımları ve jeopolitik risk öne çıkar. Yurt içinde ise ziynet ürünlerinde işçilik ve satıcı marjı fiyata eklenir; bu nedenle çeyrek ve cumhuriyet altınının alım satım farkı külçeye göre daha geniştir. Bu kategoride hem ons tarafındaki gelişmeleri hem de yurt içi altın piyasasını takip ediyoruz.",
    ],
    faq: [
      {
        q: "Gram altın fiyatı nasıl oluşuyor?",
        a: "Uluslararası piyasada dolar cinsinden belirlenen ons altın fiyatı, dolar/TL kuru ve ons ile gram arasındaki ağırlık dönüşümü birleştirilerek hesaplanır. Yani gram altındaki değişim hem ons fiyatını hem de kuru içinde taşır.",
      },
      {
        q: "Ons düşerken gram altın neden yükselebiliyor?",
        a: "Gram altın iki bileşenden oluştuğu için biri diğerini bastırabilir. Ons altın dolar bazında gerilese bile dolar/TL kuru aynı dönemde daha güçlü yükselirse gram altının TL karşılığı artabilir. Tersi de mümkündür.",
      },
      {
        q: "Çeyrek altın ile gram altın arasındaki fiyat farkı neden?",
        a: "Ziynet ürünlerinde saf altın değerinin üzerine işçilik payı ve satıcı marjı eklenir. Bu ek maliyet ürünün ağırlığına göre orantılı değildir; küçük gramajlı ürünlerde payı daha yüksektir ve alış ile satış arasındaki farkı genişletir.",
      },
    ],
  },

  borsa: {
    paragraphs: [
      "Borsa İstanbul pay piyasasında şirketlerin hisseleri alınıp satılır. Piyasanın genel yönü endekslerle izlenir: BIST 100 ana gösterge endekstir, BIST 30 ise en likit şirketleri kapsar ve vadeli işlemlere dayanak oluşturur. Endeks hesabında halka açık kısmın piyasa değeri esas alındığı için büyük şirketlerin hareketi endeksi daha çok etkiler; bankacılık ve holding hisselerinin ağırlığı yüksek olduğundan bu iki gruba ilişkin haberler endeksin geneline daha güçlü yansır.",
      "Hisse fiyatlarını hareket ettiren başlıklar iki katmandadır. Şirkete özgü tarafta bilanço dönemleri, yatırım ve kapasite kararları, sözleşme duyuruları, temettü ve sermaye artırımı kararları yer alır. Makro tarafta ise faiz kararları, enflasyon verileri, kur seyri ve küresel risk iştahı belirleyicidir. Bu kategoride şirket haberlerini, endeks hareketlerini ve arkasındaki kararları takip ediyoruz. Endeksin nominal yükselişi ile yatırımcının reel getirisi ayrı şeylerdir; enflasyonun yüksek olduğu dönemlerde puandaki artış tek başına alım gücündeki değişimi göstermez.",
    ],
    faq: [
      {
        q: "BIST 100 ile BIST 30 arasındaki fark ne?",
        a: "BIST 100 pay piyasasının ana gösterge endeksidir ve daha geniş bir şirket kümesini kapsar. BIST 30 ise en likit şirketlerden oluşan dar kapsamlı endekstir ve vadeli işlem sözleşmelerine dayanak oluşturur. İkisinin bileşimi farklı olduğu için günlük hareketleri de birbirinden ayrışabilir.",
      },
      {
        q: "Endeks puanı ne anlama geliyor?",
        a: "Endeks puanı bir fiyat değil, kapsamdaki hisselerden oluşan bir sepetin performansını gösteren birimsiz bir ölçüdür. Doğrudan satın alınamaz; endeksi izleyen borsa yatırım fonları aracılığıyla yatırıma konu edilebilir.",
      },
      {
        q: "Şirket haberleri hisseyi nasıl etkiliyor?",
        a: "Piyasa fiyatı beklentileri yansıtır. Bu nedenle açıklanan bir bilanço ya da duyuru, kendi başına iyi veya kötü olmasından çok beklentiden ne kadar saptığıyla fiyatı hareket ettirir. Beklenen bir gelişme açıklandığında fiyatta belirgin bir tepki oluşmayabilir.",
      },
    ],
  },

  kripto: {
    paragraphs: [
      "Kripto varlıklar merkezi olmayan ağlar üzerinde tutulan ve devredilen dijital varlıklardır. Bitcoin toplam arzı protokolde sınırlandırılmış ilk örnektir; Ethereum ise akıllı sözleşme çalıştırabilen bir platform olarak konumlanır ve üzerinde çalışan uygulamaların işlem ücretleri bu ağın kendi birimiyle ödenir. Stabil coinler ise ayrı bir kategoridir: bir para birimine sabitlenmeyi hedeflerler ve fiyat hareketinden çok transfer ile borsa içi bakiye aracı olarak kullanılırlar.",
      "Kripto piyasası hafta sonu dahil kesintisiz işlem görür ve geleneksel piyasalara göre daha oynaktır. Fiyatları etkileyen başlıklar arasında küresel likidite koşulları ve merkez bankası politikaları, düzenleme haberleri, ağ üzerindeki teknik güncellemeler ve borsa kaynaklı gelişmeler yer alır. Türkiye'de kripto varlık hizmet sağlayıcıları için yasal çerçeve oluşturulmuş ve faaliyetleri Sermaye Piyasası Kurulu'nun düzenleme alanına alınmıştır. Bu kategoride hem piyasa hareketlerini hem de düzenleme tarafındaki gelişmeleri takip ediyoruz.",
    ],
    faq: [
      {
        q: "Kripto piyasası neden hafta sonu da işlem görüyor?",
        a: "İşlemler merkezi bir takas kurumunun çalışma saatlerine değil, kesintisiz çalışan ağlara ve bu ağlara bağlı platformlara dayanır. Bu nedenle piyasa kapanış saati olmadan işler; hafta sonu işlem hacmi düştüğü için fiyat hareketleri daha sert olabilir.",
      },
      {
        q: "Stabil coin ile diğer kripto varlıklar arasındaki fark ne?",
        a: "Stabil coinler bir para birimine sabitlenmeyi hedefler ve değerlerini bu sabitlemeyi destekleyen rezerv ya da mekanizmalardan alır. Bitcoin gibi varlıklarda böyle bir sabitleme yoktur; fiyat tamamen arz ve talebe göre oluşur.",
      },
      {
        q: "Türkiye'de kripto varlık işlemleri düzenlemeye tabi mi?",
        a: "Kripto varlık hizmet sağlayıcıları için yasal bir çerçeve oluşturulmuş ve bu kuruluşların faaliyetleri Sermaye Piyasası Kurulu'nun düzenleme ve denetim alanına alınmıştır. Düzenlemeye tabi olmak yatırımın değer kaybetmeyeceği anlamına gelmez.",
      },
    ],
  },

  ekonomi: {
    paragraphs: [
      "Ekonomi haberleri, piyasa fiyatlarının arkasındaki veri ve kararları kapsar. Takvimin sabit başlıkları vardır: Türkiye İstatistik Kurumu enflasyon, işsizlik, sanayi üretimi ve dış ticaret verilerini dönemsel olarak yayımlar; Merkez Bankası para politikası kurulu kararlarını ve enflasyon raporunu açıklar; Hazine ve Maliye Bakanlığı bütçe gerçekleşmeleri ile borçlanma programını duyurur. Bu açıklamaların çoğu önceden ilan edilmiş bir takvime bağlıdır.",
      "Verilerin piyasa üzerindeki etkisi mutlak düzeylerinden çok beklentiden sapmalarıyla ortaya çıkar. Beklenenin üzerinde gelen bir enflasyon verisi faiz beklentisini, faiz beklentisi kuru ve tahvil getirilerini, bunlar da hisse fiyatlarını etkiler. Bu kategoride enflasyon, faiz, büyüme, istihdam ve bütçe başlıklarındaki gelişmeleri, hangi kurumun ne açıkladığını ve neyi değiştirdiğini takip ediyoruz.",
    ],
    faq: [
      {
        q: "Enflasyon verisi ne zaman ve kim tarafından açıklanıyor?",
        a: "Tüketici ve üretici fiyat endeksleri Türkiye İstatistik Kurumu tarafından, önceden ilan edilen veri takvimine göre aylık dönemler halinde yayımlanır. Merkez Bankası ise enflasyonun seyrine ilişkin değerlendirme ve tahminlerini enflasyon raporuyla paylaşır.",
      },
      {
        q: "Politika faizi ile piyasa faizleri arasındaki fark ne?",
        a: "Politika faizi Merkez Bankası'nın belirlediği referans orandır. Mevduat, kredi ve tahvil faizleri ise bu referansın yanında vade, risk ve beklentilere göre piyasada oluşur. Bu nedenle politika faizindeki bir değişiklik piyasa faizlerine birebir ve anında yansımaz.",
      },
      {
        q: "Veri beklentiyi karşılamayınca piyasa neden sert tepki veriyor?",
        a: "Fiyatlar açıklama öncesinde beklentiyi zaten içerir. Gelen veri beklentiden saptığında piyasanın fiyatladığı senaryo değişir ve bu düzeltme fiyata hızlı yansır. Beklentiyle uyumlu gelen bir veride belirgin bir hareket görülmeyebilir.",
      },
    ],
  },
};

export function getCategoryProfile(cat: string): CategoryProfile | null {
  return CATEGORY_PROFILES[cat] ?? null;
}
