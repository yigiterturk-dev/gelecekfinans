/**
 * Altın ve döviz sayfalarının varlığa ÖZGÜ içeriği.
 *
 * Neden var: stock-profiles.ts ile aynı gerekçe. 7 Eylül'de ölçüldüğünde
 * `/altin/*` ve `/doviz/*` sayfalarının gövdesi tek cümlelik `desc` alanı
 * dışında birbirinin aynısıydı; GSC bu sayfaların neredeyse tamamını
 * "Discovered - currently not indexed" ya da "URL is unknown to Google"
 * olarak raporluyordu. Her varlığın kendi anlatısı olmadan Google bu
 * sayfaları taramaya almıyor.
 *
 * ⚠️ KURAL (market-faq.ts ile aynı): hiçbir metinde değişken rakam geçmez —
 * fiyat, kur, yüzde, oran. Sabit fiziksel ölçüler (bir onsun gram karşılığı,
 * bir çeyreğin altın içeriği) değişmediği için yazılabilir; piyasada oluşan
 * her değer yasaktır. Yatırım tavsiyesi yoktur.
 */
import type { FaqItem } from "./market-faq";

export interface AssetProfile {
  /** "… Hakkında" bölümünde alt alta basılan paragraflar. */
  paragraphs: string[];
  /** Yalnız bu varlığa özgü sorular; ortak sorulardan ÖNCE gösterilir. */
  faq: FaqItem[];
}

/* -------------------------------------------------------------------------- */
/* ALTIN                                                                       */
/* -------------------------------------------------------------------------- */

export const GOLD_PROFILES: Record<string, AssetProfile> = {
  "gram-altin": {
    paragraphs: [
      "Gram altın, 24 ayar saf altının bir gramını ifade eder ve Türkiye'de altın takibinin başvuru birimidir. Küçük tutarlarla alım yapılabilmesi, bu birimi tasarruf amaçlı altın alışverişinin en yaygın biçimi hâline getirmiştir. Piyasada gram altın hem fiziki olarak külçe ve sertifikalı gram ürünler biçiminde, hem de bankaların altın hesapları üzerinden kaydi olarak işlem görür.",
      "Gram altının Türk Lirası fiyatı iki bileşenden türer: uluslararası piyasada dolar cinsinden işlem gören ons altın fiyatı ve dolar/TL kuru. Bu ikili yapı, altını Türkiye'de takip eden biri için iki ayrı risk anlamına gelir. Ons fiyatı düşse bile kur yeterince yükselirse gram altın TL bazında pahalanabilir; tersi de geçerlidir. Bu nedenle yalnızca ons fiyatına ya da yalnızca kura bakmak eksik bir okuma olur. Fiziki gram altın alırken ödenen tutar hesaplanan ham değerin üzerindedir; aradaki farkı işçilik payı, satıcı marjı ve alış-satış makası oluşturur. Küçük gramajlı ürünlerde işçilik payının oransal ağırlığı daha yüksektir.",
    ],
    faq: [
      {
        q: "Gram altın ile külçe altın arasındaki fark nedir?",
        a: "İkisi de 24 ayar saf altındır; fark ağırlık ve sunum biçimindedir. Gram altın genellikle sertifikalı küçük gramajlı ürünler hâlinde satılır, külçe ise daha büyük ağırlıklarda işlem görür. Büyük gramajlı üründe işçilik payının oransal ağırlığı düştüğü için birim maliyet genellikle daha düşük olur.",
      },
      {
        q: "Bankadaki altın hesabı ile fiziki gram altın aynı şey mi?",
        a: "Hayır. Altın hesabı, altın fiyatına endeksli kaydi bir bakiyedir; elinize fiziki ürün geçmez, buna karşılık saklama sorunu ve işçilik maliyeti de yoktur. Fiziki gram altında ürünü elinizde tutarsınız ancak alırken işçilik ödersiniz ve satarken alış-satış makası nedeniyle bir miktar kayıp oluşur.",
      },
    ],
  },

  "ceyrek-altin": {
    paragraphs: [
      "Çeyrek altın, Türkiye'de en yaygın kullanılan ziynet altını türüdür. Düğün, nişan ve doğum gibi törenlerde hediye edilmesi nedeniyle günlük hayatta gram altından daha çok karşılaşılan bir üründür. Basıldığı kuruma göre Darphane ürünleri ile özel kuyumcu basımları arasında ayrım yapılır; ikisinin saf altın içeriği aynı olsa da alım satımda kabul görme kolaylığı farklılık gösterebilir.",
      "Çeyrek altının fiyatı, içerdiği saf altın miktarının gram altın değeriyle çarpılmasıyla hesaplanır; bu sayfadaki değer de bu yöntemle türetilir. Ancak kuyumcuda ödenen tutar bu ham hesabın üzerindedir. Ziynet altınlarında işçilik payı, basım maliyeti ve satıcı marjı fiyata eklenir. Çeyrek gibi küçük gramajlı ürünlerde işçilik payının toplam bedel içindeki oranı, tam altın ya da külçe gibi büyük ürünlere kıyasla daha yüksektir. Bu nedenle yalnızca altın içeriğine yatırım yapmak isteyen biri için çeyrek, gram altına göre maliyetli bir yol olabilir; buna karşılık bölünebilirliği ve kolay alıcı bulması pratik bir avantaj sağlar. Eski ya da hasarlı çeyrek altınlar satışta hurda fiyatından değerlendirilebilir.",
    ],
    faq: [
      {
        q: "Çeyrek altın kaç gram?",
        a: "Çeyrek altın yaklaşık 1,75 gram saf altın içerir. Ürünün brüt ağırlığı ayarı nedeniyle bundan biraz farklı olabilir; fiyat hesabında esas alınan, içindeki saf altın miktarıdır. Bu sayfadaki değer de saf altın içeriği üzerinden türetilmiştir.",
      },
      {
        q: "Darphane çeyreği ile kuyumcu çeyreği arasında fark var mı?",
        a: "Saf altın içeriği bakımından ikisi de aynı standarda göre basılır. Fark uygulamada ortaya çıkar: Darphane basımı ürünler alım satımda daha kolay kabul görebilir ve bazı satıcılar özel basımlarda daha geniş bir alış-satış makası uygulayabilir.",
      },
    ],
  },

  "cumhuriyet-altini": {
    paragraphs: [
      "Cumhuriyet altını, Darphane tarafından basılan ve üzerinde Cumhuriyet'in kuruluşuna atıf taşıyan ziynet altınıdır. Tam, yarım, çeyrek ve ata gibi farklı boyutlarda basılır; bu sayfadaki değer tam Cumhuriyet altınına aittir. Tam Cumhuriyet altını yaklaşık 7 gram saf altın içerir, yani dört çeyreğe karşılık gelen bir büyüklüktedir. Türkiye'de uzun süredir basılıyor olması ve tanınırlığı nedeniyle alım satımda kolaylıkla alıcı bulan ürünlerdendir.",
      "Fiyat, ürünün içerdiği saf altın miktarının güncel gram altın değeriyle çarpılmasıyla bulunur. Büyük gramajlı bir ürün olduğu için işçilik payının toplam bedel içindeki oranı çeyrek ve yarım altına kıyasla düşüktür; bu, altın içeriği başına maliyeti azaltan bir unsurdur. Buna karşılık bölünebilirliği yoktur: elinizdeki tek bir tam altını kısmen bozdurma imkânı bulunmaz, satmak istediğinizde tamamını satmanız gerekir. Eski tarihli bazı basımlar koleksiyon değeri taşıyabilir ve bu durumda fiyat, içerdiği altının değerinin üzerinde oluşabilir; ancak bu, altın fiyatından bağımsız ayrı bir piyasadır.",
    ],
    faq: [
      {
        q: "Tam Cumhuriyet altını kaç gram?",
        a: "Tam Cumhuriyet altını yaklaşık 7 gram saf altın içerir; bu da dört çeyrek altına karşılık gelir. Bu sayfadaki fiyat, ürünün saf altın içeriğinin güncel gram altın değeriyle çarpılmasıyla hesaplanır.",
      },
      {
        q: "Cumhuriyet altını mı çeyrek altın mı daha avantajlı?",
        a: "Altın içeriği başına maliyet açısından büyük gramajlı ürünler genellikle daha uygundur; tam altında işçilik payının oransal ağırlığı çeyreğe göre düşüktür. Buna karşılık çeyrek altın bölünebilirlik sağlar: küçük tutarlarda alım yapmaya ve gerektiğinde kısmen satmaya imkân verir. Seçim, maliyet ile esneklik arasındaki tercihe bağlıdır.",
      },
    ],
  },

  ons: {
    paragraphs: [
      "Ons altın, uluslararası altın piyasasının standart işlem birimidir. Burada kullanılan ölçü troy onstur ve yaklaşık 31,1 grama karşılık gelir; mutfakta kullanılan onstan farklıdır. Dünya genelinde altın fiyatı dolar cinsinden ons başına kote edilir, dolayısıyla Türkiye'deki gram ve ziynet altın fiyatlarının çıkış noktası da bu değerdir. Londra piyasası fiyat referansının oluştuğu ana merkez olarak kabul edilir; vadeli işlemler tarafında ise ABD borsalarındaki altın kontratları belirleyicidir.",
      "Ons altın fiyatını hareket ettiren başlıklar, TL cinsinden altını etkileyen yerel unsurlardan farklıdır. Amerikan Merkez Bankası'nın faiz politikası bunların başında gelir: faiz yükseldiğinde getiri sağlamayan altını elde tutmanın alternatif maliyeti artar, bu da fiyat üzerinde baskı yaratır. Doların diğer para birimleri karşısındaki gücü ters yönlü bir ilişki taşır; dolar güçlendiğinde ons altın genellikle geriler. Bunların yanında jeopolitik gerilimler, enflasyon beklentileri ve merkez bankalarının rezerv alımları talep tarafını belirler. Bu sayfadaki değer, ons fiyatının güncel dolar/TL kuruyla çarpılmasıyla elde edilen Türk Lirası karşılığıdır.",
    ],
    faq: [
      {
        q: "Bir ons altın kaç gram?",
        a: "Altın piyasasında kullanılan troy ons yaklaşık 31,1 gramdır. Gündelik hayatta kullanılan onstan farklı bir ölçüdür. Gram altın fiyatı, ons fiyatının bu değere bölünmesi ve güncel kurla çarpılmasıyla türetilir.",
      },
      {
        q: "Ons altın fiyatı neye göre değişiyor?",
        a: "Ons altın dolar cinsinden uluslararası piyasada fiyatlanır. Amerikan Merkez Bankası'nın faiz politikası, doların diğer para birimleri karşısındaki gücü, enflasyon beklentileri, jeopolitik gerilimler ve merkez bankalarının rezerv alımları başlıca belirleyicilerdir. Türkiye'deki TL fiyatı ise buna ek olarak dolar/TL kurundan etkilenir.",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* DÖVİZ                                                                       */
/* -------------------------------------------------------------------------- */

export const FX_PROFILES: Record<string, AssetProfile> = {
  "usd-try": {
    paragraphs: [
      "Amerikan Doları, uluslararası ticaretin ve rezerv varlıkların ağırlıklı para birimidir. Dünya genelinde petrol, altın ve pek çok emtia dolar üzerinden fiyatlandığı için doların değeri yalnızca Amerika Birleşik Devletleri'ni değil bütün ülkelerin dış ticaret maliyetlerini etkiler. Türkiye'de dolar/TL kuru, ithalat maliyetlerinden akaryakıt fiyatlarına, altın fiyatından şirketlerin döviz borçlarına kadar geniş bir alanda doğrudan karşılık bulur; bu nedenle en yakından izlenen finansal göstergelerden biridir.",
      "Kurun yönünü belirleyen başlıklar iki tarafta toplanır. Yurt dışında Amerikan Merkez Bankası'nın faiz kararları, ABD enflasyon ve istihdam verileri ile küresel risk iştahı belirleyicidir; faiz artışı doları genel olarak güçlendirir. Yurt içinde ise Merkez Bankası'nın politika faizi, enflasyon seyri, cari işlemler dengesi ve rezerv düzeyi öne çıkar. Bu sayfada gösterilen değer piyasa verisinden derlenen serbest piyasa kurudur; bankaların ve döviz bürolarının uyguladığı alış ile satış kurları bu değerin altında ve üstünde oluşur, aradaki farka makas denir. Merkez Bankası'nın günlük yayımladığı gösterge niteliğindeki kur ise resmî işlemlerde esas alınan ayrı bir değerdir.",
    ],
    faq: [
      {
        q: "Serbest piyasa kuru ile Merkez Bankası kuru arasındaki fark nedir?",
        a: "Serbest piyasa kuru, alıcı ve satıcıların işlemleri sonucu anlık olarak oluşan değerdir; bu sayfada gösterilen de budur. Merkez Bankası ise günlük olarak gösterge niteliğinde bir kur yayımlar ve bu değer resmî işlemlerde, muhasebe kayıtlarında ve bazı sözleşmelerde esas alınır. İki değer birbirine yakın seyreder ancak birebir aynı olmaz.",
      },
      {
        q: "Dolar kuru Türkiye'de neleri doğrudan etkiliyor?",
        a: "İthal ürünlerin maliyetini, akaryakıt fiyatlarını, TL cinsinden altın fiyatını ve döviz borcu olan şirketlerin finansman yükünü doğrudan etkiler. Enerji ve ara malı ithalatı yüksek olduğu için kurdaki hareket üretici maliyetlerine, oradan da tüketici fiyatlarına yansır.",
      },
    ],
  },

  "eur-try": {
    paragraphs: [
      "Euro, Avrupa Birliği'ne üye ülkelerin önemli bir bölümünün ortak para birimidir ve para politikası Avrupa Merkez Bankası tarafından yürütülür. Türkiye açısından euro'nun ayrı bir önemi vardır: Avrupa Birliği ülkeleri Türkiye'nin en büyük ihracat pazarını oluşturur, dolayısıyla ihracatçı şirketlerin gelirlerinin kayda değer bölümü euro cinsindendir. Turizm gelirlerinde ve Avrupa'da yaşayan vatandaşların gönderdiği havalelerde de euro belirgin bir yer tutar.",
      "Euro/TL kuru iki ayrı hareketin bileşimidir. Birincisi euro'nun dolar karşısındaki değeridir; bu oran Avrupa Merkez Bankası ile Amerikan Merkez Bankası'nın faiz politikaları arasındaki farka, Avro Bölgesi'nin büyüme ve enflasyon verilerine göre değişir. İkincisi doların TL karşısındaki seyridir. Bu nedenle euro/TL kuru, dolar/TL sabit kalsa bile euro'nun dolar karşısında güçlenmesiyle yükselebilir. Avrupa'da enerji fiyatları ve sanayi üretimi de euro'nun değeri üzerinde etkilidir. Bu sayfada gösterilen değer serbest piyasa kurudur; banka ve döviz bürolarının alış-satış kurları makas nedeniyle farklılık gösterir.",
    ],
    faq: [
      {
        q: "Euro/TL kuru neden dolar/TL ile birebir aynı yönde hareket etmiyor?",
        a: "Euro/TL, iki ayrı hareketin bileşimidir: euro'nun dolar karşısındaki değeri ve doların TL karşısındaki değeri. Euro dolar karşısında güçlenirse, dolar/TL hiç değişmese bile euro/TL yükselir. Bu yüzden iki kur arasında yakın ama birebir olmayan bir ilişki vardır.",
      },
      {
        q: "Euro kuru Türkiye ekonomisinde neyi etkiliyor?",
        a: "Avrupa Birliği ülkeleri Türkiye'nin en büyük ihracat pazarı olduğu için ihracatçı şirketlerin gelirleri ağırlıklı olarak euro cinsindendir. Turizm gelirleri ve Avrupa'dan gönderilen havaleler de euro ile ilişkilidir. Kurdaki hareket bu kesimlerin TL cinsinden gelirini doğrudan değiştirir.",
      },
    ],
  },

  "gbp-try": {
    paragraphs: [
      "İngiliz Sterlini, Birleşik Krallık'ın para birimidir ve dünyanın en eski kullanımdaki para birimlerinden biri olarak kabul edilir. Para politikası İngiltere Merkez Bankası tarafından yürütülür. Londra, küresel finans merkezlerinin başında geldiği için sterlin, işlem hacmi bakımından uluslararası döviz piyasasının en çok alınıp satılan para birimleri arasında yer alır. Türkiye'de dolar ve euro kadar yaygın kullanılmasa da eğitim, sağlık ve gayrimenkul gibi Birleşik Krallık bağlantılı harcamalarda takip edilir.",
      "Sterlin/TL kuru da euro'da olduğu gibi iki hareketin bileşimidir: sterlinin dolar karşısındaki değeri ve doların TL karşısındaki seyri. Sterlinin değerini belirleyen başlıklar arasında İngiltere Merkez Bankası'nın faiz kararları, Birleşik Krallık'ın enflasyon ve büyüme verileri ile ülkenin dış ticaret dengesi bulunur. Sterlin, ana para birimleri arasında görece oynak kabul edilir; siyasi gelişmelere ve politika belirsizliğine tepkisi belirgin olabilir. Bu sayfada gösterilen değer serbest piyasa kurudur; bankaların ve döviz bürolarının uyguladığı alış-satış kurları makas nedeniyle bu değerden farklılaşır.",
    ],
    faq: [
      {
        q: "Sterlin kuru neden diğer para birimlerinden daha oynak olabiliyor?",
        a: "Sterlin, ana para birimleri arasında politika ve siyaset kaynaklı gelişmelere görece duyarlı kabul edilir. İngiltere Merkez Bankası'nın faiz kararları, enflasyon verileri ve dış ticaret dengesindeki değişimler kurda belirgin hareketler yaratabilir.",
      },
      {
        q: "Türkiye'de sterlin hangi durumlarda takip ediliyor?",
        a: "Birleşik Krallık bağlantılı eğitim, sağlık ve gayrimenkul harcamaları ile bu ülkeyle yapılan dış ticaret işlemlerinde sterlin kuru izlenir. Dolar ve euro kadar yaygın kullanılmasa da bu alanlarda doğrudan maliyet etkisi taşır.",
      },
    ],
  },
};
