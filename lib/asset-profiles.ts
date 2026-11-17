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

  "chf-try": {
    paragraphs: [
      "İsviçre Frangı, İsviçre ve Lihtenştayn'ın para birimidir; para politikasını İsviçre Ulusal Bankası yürütür. Frank, uzun süredir küresel piyasalarda \"güvenli liman\" para birimi olarak anılır: siyasi istikrar, düşük enflasyon geçmişi, güçlü cari fazla ve köklü bankacılık sistemi, belirsizlik dönemlerinde yatırımcıların frangı talep etmesine yol açar. Bu nedenle küresel risk iştahı azaldığında frank, pek çok para birimi karşısında değer kazanma eğilimi gösterir.",
      "Türkiye'de frank, özellikle geçmiş yıllarda frank cinsinden kullanılan konut ve taşıt kredileri, İsviçre'de yaşayan vatandaşların gönderdiği havaleler ve İsviçre ile yapılan ticaret nedeniyle takip edilir. Frank/TL kuru, frangın dolar karşısındaki değeri ile dolar/TL kurunun bileşiminden oluşur; İsviçre Ulusal Bankası'nın faiz kararları ve zaman zaman frangın aşırı değerlenmesini önlemek için yaptığı döviz müdahaleleri kuru etkileyen başlıca etkenlerdir.",
    ],
    faq: [
      { q: "İsviçre frangına neden güvenli liman deniyor?", a: "İsviçre'nin siyasi istikrarı, tarihsel olarak düşük enflasyonu, güçlü dış ticaret fazlası ve sağlam bankacılık sistemi nedeniyle piyasalarda belirsizlik arttığında yatırımcılar frangı tercih eder. Bu talep, kriz dönemlerinde frangın değer kazanmasına yol açar." },
      { q: "Frank kuru Türkiye'de kimleri ilgilendirir?", a: "İsviçre ile ticaret yapan şirketleri, İsviçre'de yaşayan ve Türkiye'ye para gönderen vatandaşları, geçmişte frank cinsinden kredi kullananları ve İsviçre'de eğitim veya sağlık harcaması yapanları doğrudan ilgilendirir." },
    ],
  },

  "sar-try": {
    paragraphs: [
      "Suudi Arabistan Riyali, Suudi Arabistan'ın resmî para birimidir ve uzun yıllardır sabit bir oranla Amerikan Dolarına bağlıdır. Bu sabit kur rejimi, Suudi Merkez Bankası'nın (SAMA) güçlü döviz rezervleriyle korunur. Sonuç olarak riyalin TL karşısındaki değeri neredeyse tamamen dolar/TL kurunu izler; riyal/TL'deki günlük hareket, dolar/TL'deki hareketle aynı yönde ve oranda gerçekleşir.",
      "Türkiye'de riyal kurunun en çok takip edildiği dönemler hac ve umre sezonlarıdır: Suudi Arabistan'daki konaklama, ulaşım ve alışveriş harcamaları riyal üzerinden yapılır. Bunun yanında Körfez bölgesinde çalışan vatandaşların gelirleri ve Suudi Arabistan ile yapılan müteahhitlik ve ihracat işleri de riyal kurunu gündeme getirir. Döviz bürolarında riyal alış-satış makası, dolar ve euroya göre genellikle daha geniştir.",
    ],
    faq: [
      { q: "Riyal kuru neden dolarla aynı hareket ediyor?", a: "Suudi Arabistan riyali sabit bir oranla dolara bağlıdır. Bu yüzden riyalin TL karşısındaki değişimi, dolar/TL kurundaki değişimle neredeyse aynıdır; riyal kurunu tahmin etmek için dolar kurunu izlemek yeterlidir." },
      { q: "Umre ve hac için riyal mi dolar mı almak daha uygun?", a: "Riyal dolara sabitlendiği için kur riski açısından ikisi arasında belirgin fark yoktur. Asıl fark alış-satış makasındadır: Türkiye'de dolar makası genellikle daha dardır, riyal makası ise büroya göre değişir. Harcama yapılacak yerde döviz bozdurma koşulları da karar için önemlidir." },
    ],
  },

  "aed-try": {
    paragraphs: [
      "Birleşik Arap Emirlikleri Dirhemi, BAE'nin para birimidir ve riyal gibi sabit bir oranla Amerikan Dolarına bağlıdır. BAE Merkez Bankası bu bağı yüksek döviz rezervleriyle korur. Bu nedenle dirhem/TL kuru pratikte dolar/TL kurunun bir yansımasıdır: dolar TL karşısında değer kazandığında dirhem de aynı oranda değer kazanır.",
      "Dubai ve Abu Dabi'nin ticaret, turizm ve gayrimenkul merkezi olması dirhemi Türkiye'de giderek daha sık takip edilen bir para birimi hâline getirdi. Dubai'de gayrimenkul alımı, şirket kuruluşu, turistik seyahatler ve Körfez'e yapılan ihracat ödemeleri dirhem üzerinden hesaplanır. BAE ile Türkiye arasında yerel para birimleriyle ticaret ve swap anlaşmaları da dirhemin önemini artırmıştır.",
    ],
    faq: [
      { q: "Dirhem kuru dolardan bağımsız hareket eder mi?", a: "Hayır. BAE dirhemi sabit bir oranla dolara bağlı olduğu için dirhem/TL kuru dolar/TL ile aynı yönde ve aynı oranda hareket eder. Kurdaki değişimin kaynağı neredeyse tamamen TL'nin dolar karşısındaki seyridir." },
      { q: "Dubai'de harcama yaparken nelere dikkat edilmeli?", a: "Kartla yapılan harcamalarda bankanın uyguladığı döviz çevrim kuru ve ek komisyonlar, nakit dirhem bozdurmaya göre farklı sonuç verebilir. Seyahat öncesi bankanızın yurt dışı işlem ücretini ve uyguladığı kuru kontrol etmek, toplam maliyeti netleştirir." },
    ],
  },

  "rub-try": {
    paragraphs: [
      "Rus Rublesi, Rusya Federasyonu'nun para birimidir; para politikasını Rusya Merkez Bankası yürütür. Rublenin değeri büyük ölçüde enerji fiyatlarına bağlıdır: Rusya'nın ihracat gelirlerinin önemli bölümü petrol ve doğalgazdan geldiği için emtia fiyatlarındaki yükseliş rubleyi destekler, düşüş ise baskı altına alır. Uluslararası yaptırımlar ve sermaye kontrolleri de son yıllarda rublenin seyrini belirleyen başlıca etkenler arasındadır.",
      "Türkiye açısından ruble; turizm, enerji ithalatı, inşaat ve tarım ürünleri ticareti nedeniyle önem taşır. Rusya, Türkiye'ye en çok turist gönderen ülkeler arasında yer aldığından rublenin değeri sezon gelirlerini doğrudan etkiler. Yaptırımlar nedeniyle uluslararası ödeme kanallarının sınırlanması, iki ülke arasındaki ticarette ruble ve TL ile ödeme yapılmasının önünü açmıştır.",
    ],
    faq: [
      { q: "Ruble kurunu en çok ne etkiler?", a: "Petrol ve doğalgaz fiyatları, Rusya Merkez Bankası'nın faiz kararları, uluslararası yaptırımlar ve sermaye kontrolleri rublenin değerini belirleyen başlıca etkenlerdir. Enerji fiyatları yükseldiğinde Rusya'nın döviz geliri artar ve ruble genellikle güçlenir." },
      { q: "Ruble kuru Türkiye'de neden takip ediliyor?", a: "Rusya, Türkiye'nin en büyük turist kaynaklarından ve enerji tedarikçilerinden biridir. Turizm gelirleri, Rusya'ya yapılan ihracat ve iki ülke arasındaki inşaat projeleri rublenin değerinden doğrudan etkilenir." },
    ],
  },

  "azn-try": {
    paragraphs: [
      "Azerbaycan Manatı, Azerbaycan'ın resmî para birimidir ve Azerbaycan Merkez Bankası tarafından yönetilir. Manat, uzun süredir dolar karşısında sabit tutulan, yönetilen bir kur rejimi altında işlem görür. Bu nedenle manat/TL kuru büyük ölçüde dolar/TL kurunu izler; kurdaki günlük hareketin kaynağı çoğunlukla TL'nin dolar karşısındaki seyridir.",
      "Azerbaycan ekonomisi ağırlıklı olarak petrol ve doğalgaz ihracatına dayanır; enerji fiyatlarındaki sert düşüşler geçmişte manatın devalüe edilmesine yol açmıştır. Türkiye ile Azerbaycan arasındaki yakın ekonomik ilişkiler — enerji boru hatları, müteahhitlik projeleri, ticaret ve iki ülke arasındaki yoğun öğrenci ve turist trafiği — manat kurunu Türkiye'de düzenli olarak takip edilen kurlardan biri yapar.",
    ],
    faq: [
      { q: "Manat kuru neden dolara yakın seyrediyor?", a: "Azerbaycan Merkez Bankası manatı dolar karşısında sabit tutan yönetilen bir kur politikası uygular. Bu yüzden manat/TL kurundaki değişim, dolar/TL kurundaki değişimle büyük ölçüde örtüşür." },
      { q: "Manatın değerini ne tehdit eder?", a: "Azerbaycan'ın döviz gelirlerinin büyük kısmı petrol ve doğalgazdan geldiği için enerji fiyatlarındaki uzun süreli düşüşler rezervleri azaltır ve sabit kurun korunmasını zorlaştırır. Geçmişte bu nedenle manatın değeri düşürülmüştür." },
    ],
  },

  "jpy-try": {
    paragraphs: [
      "Japon Yeni, Japonya'nın para birimidir ve dolar ile euronun ardından dünyada en çok işlem gören para birimleri arasında yer alır. Para politikasını Japonya Merkez Bankası yürütür. Japonya uzun yıllar boyunca sıfıra yakın, hatta negatif faiz uyguladığı için yen, düşük faizle borçlanıp yüksek faizli varlıklara yatırım yapılan \"carry trade\" işlemlerinin temel finansman para birimi olmuştur.",
      "Yen, frank gibi belirsizlik dönemlerinde talep gören bir güvenli liman olarak da bilinir: küresel piyasalarda risk iştahı azaldığında carry trade pozisyonları kapanır ve yen hızla değer kazanabilir. Yen tek birim olarak küçük bir değer taşıdığı için kur genellikle \"100 yen kaç TL\" biçiminde de ifade edilir. Türkiye'de yen; Japon otomotiv ve makine ithalatı, Japon finans kuruluşlarıyla yapılan kredi anlaşmaları ve turizm nedeniyle takip edilir.",
    ],
    faq: [
      { q: "Yen neden genellikle 100 birim üzerinden gösterilir?", a: "Tek bir yenin değeri küçük olduğu için karşılaştırmayı kolaylaştırmak amacıyla kur sıklıkla 100 yen üzerinden ifade edilir. Bu sayfadaki değer 1 yenin TL karşılığıdır; 100 yen için değeri yüzle çarpmanız yeterlidir." },
      { q: "Japonya'nın faiz politikası yeni nasıl etkiler?", a: "Japonya Merkez Bankası'nın uzun süre uyguladığı çok düşük faiz yeni zayıflatmış ve onu carry trade işlemlerinde finansman para birimi yapmıştır. Faiz artırımı sinyalleri ya da küresel risk iştahındaki düşüş, bu pozisyonların kapanmasına ve yenin hızla değer kazanmasına yol açabilir." },
    ],
  },

  "cny-try": {
    paragraphs: [
      "Çin Yuanı (renminbi), Çin Halk Cumhuriyeti'nin para birimidir ve Çin Halk Bankası tarafından yönetilir. Yuan serbest dalgalı değildir: merkez bankası her işlem günü bir orta kur belirler ve yuanın gün içinde bu kurun etrafında belirli bir bant içinde hareket etmesine izin verir. Çin'in ihracat odaklı ekonomisi ve sermaye kontrolleri, yuanın değerini belirleyen başlıca unsurlardır.",
      "Çin, Türkiye'nin en büyük ithalat kaynaklarından biridir; elektronik, makine, tekstil hammaddesi ve tüketim ürünlerinin önemli bölümü Çin'den gelir. Bu nedenle yuan kuru ithalatçılar ve e-ticaret satıcıları için doğrudan maliyet kalemidir. Türkiye ile Çin arasındaki swap anlaşması ve yuanın IMF'nin rezerv para sepetine dahil edilmesi, yuanın uluslararası ticaretteki kullanımını artırmıştır.",
    ],
    faq: [
      { q: "Yuan kuru serbestçe mi belirleniyor?", a: "Tam olarak değil. Çin Halk Bankası her gün bir referans orta kur açıklar ve yuanın bu kurun etrafında sınırlı bir bantta işlem görmesine izin verir. Bu yönetilen rejim, yuanın büyük para birimlerine göre daha kontrollü hareket etmesini sağlar." },
      { q: "Yuan kuru Türkiye'de kimleri etkiler?", a: "Çin'den mal ithal eden şirketleri, Çin kaynaklı ürün satan e-ticaret işletmelerini ve Çin ile ihracat bağlantısı olan üreticileri doğrudan etkiler. Yuan değer kazandığında Çin'den ithal edilen ürünlerin TL maliyeti artar." },
    ],
  },

  "cad-try": {
    paragraphs: [
      "Kanada Doları, Kanada'nın para birimidir ve para politikasını Kanada Merkez Bankası yürütür. Kanada dünyanın önde gelen petrol, maden ve tarım ürünü ihracatçıları arasında yer aldığı için Kanada Doları bir \"emtia para birimi\" olarak kabul edilir: özellikle petrol fiyatlarının yükseldiği dönemlerde değer kazanma eğilimi gösterir. Kanada ekonomisinin ABD ile yakın ticari bağları da Kanada Dolarını Amerikan Dolarındaki gelişmelere duyarlı kılar.",
      "Türkiye'de Kanada Doları kuru başta eğitim, göç ve iş başvuruları nedeniyle takip edilir: Kanada'da okul ücretleri, yaşam masrafları ve vize başvurularında gösterilmesi gereken mali yeterlilik Kanada Doları cinsindendir. Kanada Doları/TL kuru, Kanada Dolarının ABD Doları karşısındaki değeri ile dolar/TL kurunun bileşiminden oluşur.",
    ],
    faq: [
      { q: "Kanada Doları neden petrol fiyatlarıyla birlikte hareket eder?", a: "Kanada'nın ihracat gelirlerinin önemli bölümü petrol ve diğer emtialardan gelir. Petrol fiyatları yükseldiğinde ülkeye giren döviz artar ve Kanada Doları genellikle güçlenir; fiyatlar düştüğünde ise tersi yaşanır." },
      { q: "Kanada'da eğitim veya göç planlayanlar kuru neden izlemeli?", a: "Okul ücretleri, konaklama ve vize başvurusunda istenen mali yeterlilik Kanada Doları cinsinden belirlenir. Kurdaki değişim, aynı planın TL cinsinden maliyetini doğrudan değiştirir; ödemeleri parçalara bölmek kur riskini dağıtmanın bir yoludur." },
    ],
  },
};
