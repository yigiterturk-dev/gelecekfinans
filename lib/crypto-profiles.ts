/**
 * Kripto sayfalarının varlığa ÖZGÜ içeriği.
 *
 * Neden var: stock-profiles.ts ve asset-profiles.ts ile aynı gerekçe, ama
 * kripto sayfaları en kötü durumdaydı — hisse ve altında en azından tek
 * cümlelik bir `about`/`desc` alanı vardı, burada o da yoktu: gövde metninde
 * yalnızca varlığın adı ve sembolü değişiyordu. 7 Eylül ölçümünde
 * /kripto/tether ile /kripto/xrp "URL is unknown to Google", /kripto/bnb
 * "Discovered - currently not indexed" durumundaydı.
 *
 * ⚠️ KURAL (market-faq.ts ile aynı): hiçbir metinde değişken rakam geçmez —
 * fiyat, piyasa değeri, işlem hacmi, sıralama, yüzde. Protokol düzeyinde
 * sabitlenmiş ve değişmeyen sayılar (Bitcoin'in üst arz sınırı, blok ödülünün
 * yarılanma dönemi) yazılabilir; piyasada oluşan hiçbir değer yazılamaz.
 * Yatırım tavsiyesi yoktur.
 */
import type { FaqItem } from "./market-faq";

export interface CryptoProfile {
  /** "… Hakkında" bölümünde alt alta basılan paragraflar. */
  paragraphs: string[];
  /** Yalnız bu varlığa özgü sorular; ortak sorulardan ÖNCE gösterilir. */
  faq: FaqItem[];
}

export const CRYPTO_PROFILES: Record<string, CryptoProfile> = {
  bitcoin: {
    paragraphs: [
      "Bitcoin, 2009 yılında çalışmaya başlayan ilk merkeziyetsiz kripto para birimidir. Satoshi Nakamoto takma adıyla yayımlanan teknik bir metne dayanır ve arkasında bir şirket ya da yönetim kurulu yoktur; ağ, dünya genelinde dağıtık düğümler tarafından işletilir. İşlemler blok zinciri adı verilen ortak bir deftere kaydedilir ve iş ispatı yöntemiyle doğrulanır: madenciler işlem gücü harcayarak yeni blok üretir ve karşılığında ödül alır.",
      "Bitcoin'i diğer kripto varlıklardan ayıran temel özellik arz yapısıdır. Üretilebilecek toplam Bitcoin miktarı protokol düzeyinde 21 milyon ile sınırlandırılmıştır ve bu sınır ağın kuralları değiştirilmeden aşılamaz. Blok ödülü yaklaşık dört yılda bir yarıya iner; halving denen bu olay yeni arzın hızını düşürür ve piyasa tarafından yakından izlenir. Fiyatını etkileyen başlıklar arasında küresel risk iştahı, Amerikan Merkez Bankası'nın faiz politikası, kurumsal yatırım araçlarına gelen para akışı ve ülkelerin düzenleme kararları bulunur. Kripto varlıklar yüksek oynaklığa sahiptir; Bitcoin de gün içinde belirgin dalgalanma gösterebilir.",
    ],
    faq: [
      {
        q: "Bitcoin'in arzı neden sınırlı?",
        a: "Protokol, üretilebilecek toplam miktarı 21 milyon ile sınırlar ve bu kural ağın yazılımına gömülüdür. Blok ödülü yaklaşık dört yılda bir yarıya indiği için yeni arz zamanla azalır. Bu yapı, merkez bankalarının ihtiyacına göre basabildiği para birimlerinden temel bir farktır.",
      },
      {
        q: "Halving nedir?",
        a: "Madencilerin yeni blok ürettiğinde aldığı ödülün yaklaşık dört yılda bir yarıya inmesidir. Yeni Bitcoin arzının hızını düşürür. Piyasa tarafından yakından izlenen bir olaydır, ancak fiyat üzerindeki etkisi kesin ve önceden bilinebilir bir şey değildir.",
      },
    ],
  },

  ethereum: {
    paragraphs: [
      "Ethereum, yalnızca değer transferi için değil, programlanabilir uygulamalar çalıştırmak için tasarlanmış bir blok zinciri ağıdır. Ağ üzerinde akıllı sözleşme adı verilen, önceden yazılmış kurallara göre kendiliğinden işleyen kod parçaları çalışır. Merkeziyetsiz finans uygulamaları, NFT'ler ve pek çok token bu altyapı üzerinde kuruludur. ETH, ağın kendi para birimidir ve işlem ücretlerinin ödenmesinde kullanılır; bu ücretlere gas denir.",
      "Ethereum 2022'de gerçekleştirilen ve Merge olarak anılan geçişle iş ispatı yönteminden hisse ispatına taşındı. Bu değişiklikle blokları madenciler değil, ağa ETH kilitleyen doğrulayıcılar üretmeye başladı ve ağın enerji tüketimi büyük ölçüde azaldı. Kilitlenen ETH karşılığında ödül alınması, varlığa getiri üretebilen bir boyut kazandırdı. Fiyatını etkileyen başlıklar arasında ağ üzerindeki uygulama kullanımı, işlem ücretlerinin seviyesi, ölçeklendirme çözümlerinin gelişimi ve genel kripto piyasası eğilimi bulunur. Ağın yükünü hafifleten katman iki çözümleri de ekosistemin izlenen başlıklarındandır.",
    ],
    faq: [
      {
        q: "Ethereum ile Bitcoin arasındaki temel fark nedir?",
        a: "Bitcoin öncelikle değer transferi ve saklama amacıyla tasarlanmıştır. Ethereum ise üzerinde uygulama çalıştırılabilen programlanabilir bir ağdır; akıllı sözleşmeler sayesinde finans uygulamaları, tokenler ve NFT'ler bu altyapıda kurulur. ETH ağın işlem ücretlerini ödemekte kullanılır.",
      },
      {
        q: "Gas ücreti nedir?",
        a: "Ethereum ağında bir işlem yapmak ya da akıllı sözleşme çalıştırmak için ödenen ücrettir. Ağ yoğunlaştığında bu ücretler yükselir. Katman iki adı verilen ölçeklendirme çözümleri, işlemleri ana ağın dışında toplayarak ücretleri düşürmeyi amaçlar.",
      },
    ],
  },

  tether: {
    paragraphs: [
      "Tether (USDT), değeri Amerikan Doları'na sabitlenmiş olacak biçimde tasarlanmış bir stablecoin'dir. Diğer kripto varlıklardan temel farkı budur: amaç fiyatın yükselmesi değil, bir USDT'nin sürekli olarak yaklaşık bir dolara karşılık gelmesidir. Bu sabitleme, varlığı çıkaran şirketin dolaşımdaki her token'a karşılık rezerv tuttuğu iddiasına dayanır; rezervlerin bileşimi ve bağımsız denetimi, stablecoin'ler etrafındaki tartışmaların ana konusudur.",
      "USDT kripto piyasasında ağırlıklı olarak işlem birimi ve geçici park alanı olarak kullanılır. Yatırımcılar pozisyondan çıkarken varlıklarını geleneksel bankacılığa taşımak yerine stablecoin'e çevirebilir; bu, borsalar arası transferi de hızlandırır. Tether birden fazla blok zinciri ağı üzerinde ihraç edilir, dolayısıyla transfer ücreti ve hızı kullanılan ağa göre değişir. Türk Lirası cinsinden bakıldığında USDT'nin fiyatı esas olarak dolar/TL kurunu izler; sabitleme çalıştığı sürece kripto piyasasındaki dalgalanmadan değil kurdan etkilenir. Sabitlemenin geçici olarak bozulduğu durumlar geçmişte yaşanmıştır; bu risk stablecoin'lere özgüdür.",
    ],
    faq: [
      {
        q: "Stablecoin nedir?",
        a: "Değeri belirli bir varlığa, çoğunlukla Amerikan Doları'na sabitlenmiş olacak biçimde tasarlanmış kripto varlıktır. Amaç fiyat artışı değil, istikrarlı bir birim sunmaktır. Kripto piyasasında işlem birimi olarak ve pozisyondan çıkarken geçici park alanı olarak kullanılır.",
      },
      {
        q: "USDT fiyatı TL cinsinden neden değişiyor?",
        a: "USDT'nin değeri dolara sabitlenmiş olduğu için Türk Lirası cinsinden fiyatı esas olarak dolar/TL kurunu izler. Sabitleme çalıştığı sürece kripto piyasasındaki dalgalanmadan çok, kurdaki hareket belirleyici olur.",
      },
    ],
  },

  bnb: {
    paragraphs: [
      "BNB, başlangıçta bir kripto para borsasının kendi token'ı olarak çıkarılan, sonrasında bağımsız bir blok zinciri ağının yerel para birimine dönüşen varlıktır. İlk kullanım amacı borsada işlem ücretlerinde indirim sağlamaktı; zamanla kullanım alanı genişledi. BNB Chain adı verilen ağ, akıllı sözleşme çalıştırabilen ve Ethereum ile uyumlu bir altyapı sunar; bu uyumluluk, Ethereum için yazılmış uygulamaların bu ağa görece kolay taşınmasını sağlar.",
      "BNB'yi diğer kripto varlıklardan ayıran unsurlardan biri arz azaltma mekanizmasıdır: token'ı çıkaran taraf dönemsel olarak dolaşımdaki bir kısım BNB'yi kalıcı olarak yok eder, buna yakma denir. Bu düzenek toplam arzı zamanla azaltmayı amaçlar. Varlığın fiyatı, ilişkili olduğu borsanın işlem hacmi ve kurumsal gelişmeleriyle görece yakından bağlantılıdır; bu, BNB'yi tamamen bağımsız ağlara kıyasla tek bir kuruma daha bağımlı kılan bir özelliktir. Borsaya yönelik düzenleyici kararlar da varlığın gündemini doğrudan etkileyebilir. Ağ üzerindeki uygulama kullanımı ve işlem ücretlerinin düşüklüğü ekosistemin öne çıkardığı başlıklardır.",
    ],
    faq: [
      {
        q: "Token yakma nedir?",
        a: "Dolaşımdaki bir miktar token'ın kimsenin erişemeyeceği bir adrese gönderilerek kalıcı olarak kullanım dışı bırakılmasıdır. Amaç toplam arzı azaltmaktır. BNB'de bu işlem dönemsel olarak yapılır ve arz yapısını etkileyen bir düzenek olarak sunulur.",
      },
      {
        q: "BNB'nin bir borsayla ilişkisi hisse sahipliği gibi mi?",
        a: "Hayır. BNB bir ağın yerel para birimidir ve şirket ortaklığı, temettü hakkı ya da oy hakkı sağlamaz. Bununla birlikte varlığın gündemi ilişkili olduğu borsanın gelişmelerinden ve o borsaya yönelik düzenleyici kararlardan etkilenir.",
      },
    ],
  },

  solana: {
    paragraphs: [
      "Solana, yüksek işlem kapasitesi ve düşük işlem ücretleri hedefiyle tasarlanmış bir blok zinciri ağıdır. Akıllı sözleşme çalıştırabilir ve merkeziyetsiz uygulamalar barındırır. Ağ, hisse ispatı yönteminin yanında tarih ispatı adı verilen ve işlemlerin sıralamasını zaman damgalarıyla düzenleyen bir yaklaşımı birlikte kullanır; bu yapı saniyede işlenebilen işlem sayısını artırmayı amaçlar. SOL ağın yerel para birimidir ve işlem ücretleri ile doğrulayıcılara kilitleme işlemlerinde kullanılır.",
      "Solana ekosisteminde merkeziyetsiz borsalar, NFT projeleri ve ödeme uygulamaları öne çıkar; düşük işlem maliyeti, çok sayıda küçük işlem gerektiren kullanımlar için tercih sebebi olarak sunulur. Ağın geçmişinde kesinti ve durma yaşanan dönemler olmuştur; bu olaylar yüksek performans hedefi ile ağ kararlılığı arasındaki dengenin tartışılmasına yol açmıştır. Fiyatını etkileyen başlıklar arasında ağ üzerindeki uygulama ve kullanıcı sayısı, ekosisteme gelen geliştirici ilgisi, ağ kesintileri ve genel kripto piyasası eğilimi bulunur.",
    ],
    faq: [
      {
        q: "Solana neden hızlı olduğunu iddia ediyor?",
        a: "Ağ, hisse ispatının yanında tarih ispatı adı verilen bir yöntemi kullanır; bu yaklaşım işlemlerin sıralamasını zaman damgalarıyla düzenleyerek doğrulama sürecini hızlandırmayı amaçlar. Hedef, saniyede işlenen işlem sayısını artırmak ve işlem ücretlerini düşük tutmaktır.",
      },
      {
        q: "Ağ kesintileri Solana için neden konuşuluyor?",
        a: "Ağın geçmişinde işlemlerin durduğu kesinti dönemleri yaşanmıştır. Bu olaylar, yüksek işlem kapasitesi hedefi ile ağın kesintisiz çalışması arasındaki dengenin sorgulanmasına yol açmıştır ve ekosistem için izlenen bir başlık olmayı sürdürür.",
      },
    ],
  },

  xrp: {
    paragraphs: [
      "XRP, sınır ötesi ödemelerin hızlandırılması ve maliyetinin düşürülmesi hedefiyle geliştirilen XRP Ledger ağının yerel varlığıdır. Ağ, Bitcoin ve benzeri zincirlerdeki madencilik yöntemini kullanmaz; işlemler, doğrulayıcıların üzerinde uzlaştığı bir mutabakat düzeneğiyle onaylanır. Bu yapı sayesinde işlemler kısa sürede ve düşük ücretle sonuçlanır. Tasarımın öncelikli kullanım senaryosu, bankalar ve ödeme kuruluşları arasında para transferinde köprü varlık işlevi görmektir.",
      "XRP'yi diğer büyük kripto varlıklardan ayıran en önemli başlık hukuki geçmişidir. Amerika Birleşik Devletleri'nde varlığın menkul kıymet sayılıp sayılmayacağı uzun süren bir yargı sürecine konu olmuştur; bu süreçteki gelişmeler varlığın fiyatı ve borsalarda işlem görebilirliği üzerinde belirleyici etki yaratmıştır. Bu nedenle XRP, kripto piyasasının genel eğiliminden bağımsız hareket edebilen, düzenleyici haberlere görece duyarlı bir varlık olarak değerlendirilir. Ödeme altyapısında kurumsal kullanım anlaşmaları da izlenen başlıklar arasındadır.",
    ],
    faq: [
      {
        q: "XRP madencilikle mi üretiliyor?",
        a: "Hayır. XRP Ledger, Bitcoin'deki gibi iş ispatı ve madencilik kullanmaz. İşlemler doğrulayıcıların uzlaşmasıyla onaylanır. Bu yapı işlemlerin kısa sürede ve düşük ücretle sonuçlanmasını sağlar; buna karşılık ağın merkeziyetsizlik düzeyi tartışma konusu olmuştur.",
      },
      {
        q: "XRP'nin hukuki süreci neden önemli?",
        a: "Amerika Birleşik Devletleri'nde varlığın menkul kıymet sayılıp sayılmayacağı uzun süren bir yargı sürecine konu olmuştur. Bu süreçteki kararlar hem fiyat hem de varlığın borsalarda işlem görebilirliği üzerinde doğrudan etki yaratmıştır; bu nedenle XRP düzenleyici haberlere görece duyarlıdır.",
      },
    ],
  },

  cardano: {
    paragraphs: [
      "Cardano, akademik araştırma ve hakem denetiminden geçmiş çalışmalara dayanan bir geliştirme yaklaşımıyla öne çıkan blok zinciri ağıdır. Ouroboros adı verilen hisse ispatı mutabakat yöntemini kullanır. Projenin ayırt edici yanı geliştirme sürecinin biçimidir: yeni özellikler önce akademik olarak yayımlanır, ardından resmî doğrulama yöntemleriyle sınanır ve sonra ağa alınır. Bu yaklaşım geliştirme hızını yavaşlatır, buna karşılık hata riskini azaltmayı hedefler. ADA ağın yerel para birimidir.",
      "Cardano'nun yol haritası isimlendirilmiş aşamalara bölünmüştür; akıllı sözleşme desteği ve ölçeklendirme çözümleri bu aşamaların içinde devreye alınmıştır. Ağ üzerinde kilitleme yapan kullanıcılar doğrulama sürecine katılarak ödül alabilir. Projenin gündemini belirleyen başlıklar arasında yol haritasındaki aşamaların hayata geçirilme takvimi, ağ üzerindeki uygulama sayısı ve geliştirici ilgisi bulunur. Kripto piyasasının genel eğilimi de fiyat üzerinde etkilidir. Yavaş ve kademeli geliştirme yaklaşımı, projenin hem en çok eleştirilen hem de savunucuları tarafından en çok öne çıkarılan yönüdür.",
    ],
    faq: [
      {
        q: "Cardano'nun geliştirme yaklaşımı neden farklı sayılıyor?",
        a: "Yeni özellikler önce akademik olarak yayımlanır, hakem denetiminden geçirilir ve resmî doğrulama yöntemleriyle sınandıktan sonra ağa alınır. Bu süreç geliştirmeyi yavaşlatır; amaç, ağa alınan değişikliklerdeki hata riskini azaltmaktır.",
      },
      {
        q: "ADA kilitlemek ne anlama geliyor?",
        a: "Hisse ispatı kullanan ağlarda kullanıcılar varlıklarını ağın doğrulama sürecine tahsis ederek ödül alabilir. Cardano'da bu işlem havuzlar aracılığıyla yapılır. Ödül miktarı ağın kurallarına ve katılım düzeyine göre değişir; garanti edilmiş bir getiri değildir.",
      },
    ],
  },

  dogecoin: {
    paragraphs: [
      "Dogecoin, 2013 yılında dönemin kripto para hevesine mizahi bir gönderme olarak ortaya çıkan ve adını internette popüler olan bir köpek görselinden alan kripto varlıktır. Teknik olarak Litecoin'in koduna dayanır ve iş ispatı yöntemiyle çalışır. Şaka amacıyla başlamış olmasına rağmen zamanla kalıcı bir kullanıcı topluluğu edinmiş, bahşiş verme ve küçük tutarlı transferler gibi kullanımlarda yaygınlaşmıştır.",
      "Dogecoin'i Bitcoin'den ayıran önemli bir fark arz yapısıdır: üst sınırı yoktur, her yıl sabit miktarda yeni Dogecoin üretilmeye devam eder. Bu, arzın zamanla azaldığı Bitcoin modelinin tersidir. Varlığın fiyat hareketleri geleneksel değerleme ölçütlerinden çok topluluk ilgisine, sosyal medya gündemine ve tanınmış kişilerin açıklamalarına duyarlıdır; bu nedenle keskin ve kısa süreli hareketler görülebilir. Bu yapı Dogecoin'i meme coin olarak anılan varlık grubunun en bilinen örneği hâline getirmiştir. Kripto varlıklar genel olarak yüksek oynaklığa sahiptir; bu grup için oynaklık daha da belirgindir.",
    ],
    faq: [
      {
        q: "Dogecoin'in arz sınırı var mı?",
        a: "Hayır. Bitcoin'den farklı olarak Dogecoin'in üst arz sınırı bulunmaz; her yıl sabit miktarda yeni Dogecoin üretilmeye devam eder. Bu, arzın zamanla azaldığı modelin tersi bir yapıdır ve iki varlık arasındaki temel farklardandır.",
      },
      {
        q: "Meme coin ne demek?",
        a: "Fiyat hareketi teknik özelliklerinden çok topluluk ilgisine, sosyal medya gündemine ve tanınmış kişilerin açıklamalarına bağlı olan kripto varlıklar için kullanılan tanımdır. Bu gruptaki varlıklarda kısa süreli ve keskin hareketler görülmesi olağandır; oynaklık genel kripto piyasasının da üzerindedir.",
      },
    ],
  },
};
