/**
 * Hisse sayfalarının şirkete ÖZGÜ içeriği.
 *
 * Neden var: 7 Eylül'de ölçüldü — `/borsa/thyao`, `/borsa/asels` ve
 * `/borsa/garan` sayfalarındaki 19 cümlenin 14'ü üç sayfada da birebir
 * aynıydı. Özgün olan tek şey `about` alanındaki bir cümleydi. Google bu
 * sayfaları birbirinin kopyası sayıp taramaya hiç almadı: GSC'de 20 hissenin
 * neredeyse tamamı "Discovered - currently not indexed" ya da "URL is unknown
 * to Google" durumundaydı (Last crawled: N/A). Şablonu doldurmak yetmiyor,
 * her sayfanın kendi anlatısı olmak zorunda.
 *
 * ⚠️ KURAL (market-faq.ts ile aynı): hiçbir metinde değişken rakam geçmez —
 * fiyat, piyasa değeri, kâr, ciro, çalışan sayısı, pay oranı, sıralama. Sayfa
 * bayatlar ve yanlış bilgi verir. Yalnızca zamana bağlı olmayan gerçekler
 * yazılır: şirket ne üretir, hangi iş kollarında çalışır, hissenin fiyatını
 * hangi başlıklar hareket ettirir. Yatırım tavsiyesi yoktur.
 */
import type { FaqItem } from "./market-faq";

export interface StockProfile {
  /** "<Şirket> Hakkında" bölümünde alt alta basılan paragraflar. */
  paragraphs: string[];
  /** Yalnız bu hisseye özgü sorular; ortak sorulardan ÖNCE gösterilir. */
  faq: FaqItem[];
}

export const STOCK_PROFILES: Record<string, StockProfile> = {
  "bist-100": {
    paragraphs: [
      "BIST 100, Borsa İstanbul pay piyasasının ana gösterge endeksidir. Endeks, borsada işlem gören şirketler arasından piyasa değeri ve işlem hacmi ölçütlerine göre seçilen 100 hisseden oluşur. Kapsamdaki şirketler dönemsel olarak gözden geçirilir; ölçütleri karşılamayan hisseler endeksten çıkarılır, yerlerine yenileri alınır. Her hissenin endeks üzerindeki etkisi eşit değildir: hesaplamada halka açık kısmın piyasa değeri esas alındığı için büyük şirketlerin hareketi endeksi daha çok etkiler.",
      "Endeks puanı bir fiyat değil, bir sepetin performansını gösteren birimsiz bir ölçüdür; doğrudan satın alınamaz, ancak endeksi izleyen borsa yatırım fonları aracılığıyla yatırıma konu edilebilir. BIST 100'ün yönünü belirleyen başlıklar arasında Merkez Bankası'nın faiz kararları, enflasyon verileri, kur hareketleri ve küresel risk iştahı öne çıkar. Endeks içinde bankacılık ile holding hisselerinin ağırlığı yüksek olduğundan, bu iki gruba ilişkin gelişmeler endeksin geneline diğer sektörlerden daha güçlü yansır. Endeksin nominal olarak yükselmesi ile yatırımcının reel getiri elde etmesi ayrı şeylerdir; enflasyonun yüksek olduğu dönemlerde puandaki artış tek başına alım gücündeki değişimi göstermez.",
    ],
    faq: [
      {
        q: "BIST 100'e hangi hisseler giriyor?",
        a: "Endeks, Borsa İstanbul'da işlem gören şirketler arasından piyasa değeri ve işlem hacmi ölçütlerine göre seçilen 100 hisseden oluşur. Kapsam dönemsel olarak gözden geçirilir; ölçütleri karşılamayan hisseler çıkarılır, yerlerine ölçütleri sağlayan şirketler alınır.",
      },
      {
        q: "Endeksin yükselmesi kazanç anlamına gelir mi?",
        a: "Endeks puanındaki artış, kapsamdaki şirketlerin toplam piyasa değerinin nominal olarak yükseldiğini gösterir. Yatırımcının gerçek kazancı ise enflasyon dikkate alındığında ortaya çıkan reel getiridir. Enflasyonun yüksek seyrettiği dönemlerde endeksteki nominal artış tek başına alım gücündeki değişimi yansıtmaz.",
      },
    ],
  },
  thyao: {
    paragraphs: [
      "Türk Hava Yolları, Türkiye'nin bayrak taşıyıcı havayolu şirketidir. Ana üssü İstanbul Havalimanı'dır ve buradan Avrupa, Asya, Afrika ile Amerika kıtalarına uzanan geniş bir tarifeli uçuş ağı işletir. Şirket yolcu taşımacılığının yanında Turkish Cargo markasıyla hava kargo, teknik bakım ve ikram alanlarında da faaliyet gösterir; AJet markası altında düşük maliyetli uçuş modelini ayrı bir yapıda yürütür. Star Alliance üyesidir, bu da ortak uçuş ve bağlantılı bilet ağını genişletir.",
      "THYAO'nun fiyatını hareket ettiren başlıklar diğer sanayi hisselerinden farklıdır. Gelirin büyük bölümü döviz cinsinden oluştuğu için kur, şirketin lehine çalışabilir; buna karşılık uçak alım borçları ve kiralama yükümlülükleri de dövizlidir. Maliyet tarafında en belirleyici kalem jet yakıtıdır ve petrol fiyatındaki dalgalanma doğrudan kâra yansır. Bunların yanında doluluk oranı, koltuk başına gelir, İstanbul aktarma trafiğinin gücü ve turizm sezonunun seyri şirketin bilançosunu belirleyen temel göstergelerdir. Havacılık talebi ekonomik döngülere ve küresel olaylara duyarlı olduğu için hisse, piyasa geneline göre daha oynak seyredebilir.",
    ],
    faq: [
      {
        q: "THYAO hissesini hangi göstergeler etkiler?",
        a: "Havacılıkta dört başlık öne çıkar: doluluk oranı, koltuk başına elde edilen gelir, jet yakıtı fiyatı ve döviz kuru. Şirketin gelirlerinin önemli kısmı yabancı para cinsinden oluşur, ancak uçak finansmanı ve kiralama yükümlülükleri de dövizlidir; bu yüzden kurun etkisi tek yönlü değildir. Petrol fiyatındaki yükseliş maliyet tarafını doğrudan baskılar.",
      },
      {
        q: "Türk Hava Yolları'nın kargo ve teknik işleri hisseye dahil mi?",
        a: "Evet. Turkish Cargo ile yürütülen hava kargo taşımacılığı, teknik bakım faaliyetleri ve ikram işi şirketin konsolide sonuçlarına dahildir. Bu nedenle THYAO yalnızca yolcu taşımacılığına bağlı bir şirket değildir; kargo hacimleri ve bakım gelirleri de bilançoyu etkiler.",
      },
    ],
  },

  asels: {
    paragraphs: [
      "Aselsan, savunma sanayii elektroniği alanında üretim yapan bir teknoloji şirketidir. Ana ortağı Türk Silahlı Kuvvetlerini Güçlendirme Vakfı'dır. Ürün yelpazesi askeri haberleşme sistemleri, radar ve elektronik harp, elektro-optik sistemler, aviyonik, silah sistemleri ve komuta kontrol yazılımlarını kapsar. Şirket savunma dışında da ürün geliştirir: trafik ve geçiş sistemleri, güvenlik çözümleri ile sağlık teknolojileri sivil iş kollarını oluşturur.",
      "ASELS'in iş modeli proje bazlıdır ve gelirin büyük bölümü kamu kaynaklı savunma siparişlerinden gelir. Bu yüzden yatırımcıların yakından izlediği gösterge, imzalanmış ama henüz teslim edilmemiş işleri gösteren bakiye sipariş tutarıdır; bu tutar genellikle dolar cinsinden açıklanır. Yeni sözleşme duyuruları, savunma bütçesindeki eğilim ve ihracat anlaşmaları hissenin gündemini belirler. Teslimatlar uzun vadeye yayıldığı için gelirin çeyrekler arasında dengesiz dağılması olağandır; tek bir çeyreğin sonucuna bakarak eğilim çıkarmak yanıltıcı olabilir. Ar-Ge yoğun bir şirket olduğundan geliştirme harcamalarının muhasebeleştirilme biçimi de bilanço okumasında dikkat gerektirir.",
    ],
    faq: [
      {
        q: "Aselsan'ın bakiye siparişi neden takip ediliyor?",
        a: "Bakiye sipariş, imzalanmış ancak teslimatı henüz tamamlanmamış işlerin toplam tutarıdır. Proje bazlı çalışan bir şirkette gelecekteki gelirin en somut göstergesi budur; bu nedenle çeyreklik kârdan çok bakiye siparişteki değişim izlenir. Tutar genellikle dolar cinsinden açıklandığı için kur hareketlerinden ayrıştırılarak yorumlanması gerekir.",
      },
      {
        q: "Aselsan yalnızca savunma alanında mı çalışıyor?",
        a: "Hayır. Savunma elektroniği ana iş kolu olmakla birlikte şirketin trafik ve geçiş sistemleri, güvenlik çözümleri ile sağlık teknolojileri alanlarında sivil ürünleri de vardır. Yine de gelirin ağırlığı savunma tarafındadır; bu yüzden savunma bütçesi ve yeni sözleşmeler hisse açısından belirleyici olmayı sürdürür.",
      },
    ],
  },

  garan: {
    paragraphs: [
      "Garanti BBVA, Türkiye'nin büyük özel bankalarından biridir ve çoğunluk hissesi İspanyol bankacılık grubu BBVA'ya aittir. Banka bireysel bankacılık, KOBİ ve kurumsal kredilendirme, ödeme sistemleri ve yatırım bankacılığı alanlarında faaliyet gösterir; leasing, faktoring, portföy yönetimi ve emeklilik alanlarındaki iştirakleriyle birlikte konsolide bir finans grubu olarak çalışır. Dijital bankacılık uygulamaları ve kart iş kolu, gelir yapısının belirgin biçimde öne çıkan parçalarıdır.",
      "GARAN, yabancı yatırımcı ilgisinin yoğun olduğu hisselerdendir ve Borsa İstanbul'un bankacılık endeksi içinde ağırlıklı bir yer tutar. Bir banka hissesinin fiyatını sanayi şirketlerinden farklı başlıklar hareket ettirir: Merkez Bankası'nın politika faizi, kredi ile mevduat faizleri arasındaki fark anlamına gelen net faiz marjı, takipteki kredilerin oranı, karşılık giderleri ve sermaye yeterliliği rasyosu. Faiz indirim döngülerinde mevduat maliyeti kredilerden daha hızlı gerilediği için marj genellikle genişler; sıkılaşma dönemlerinde ise tersi olur. Bankacılık düzenlemelerindeki değişiklikler de sektörün tamamını aynı anda etkileyebilir.",
    ],
    faq: [
      {
        q: "Banka hisselerinde net faiz marjı ne anlama geliyor?",
        a: "Net faiz marjı, bankanın kredilerden elde ettiği faiz geliri ile mevduata ve diğer kaynaklara ödediği faiz gideri arasındaki farkı ölçer. Bankacılıkta kârlılığın ana kaynağı budur. Politika faizindeki değişim mevduat ve kredi faizlerini farklı hızlarda etkilediği için marj, faiz döngüsünün yönüne göre genişler ya da daralır.",
      },
      {
        q: "Garanti BBVA'nın yabancı ortaklığı hisse için ne ifade ediyor?",
        a: "Çoğunluk hissesinin BBVA'da olması, bankanın uluslararası bir grubun raporlama ve sermaye disiplinine tabi olması anlamına gelir. Bu yapı yabancı yatırımcı ilgisini artıran bir unsur olarak görülür; buna karşılık hissenin küresel risk iştahındaki değişimlere duyarlılığını da yükseltir.",
      },
    ],
  },

  akbnk: {
    paragraphs: [
      "Akbank, Sabancı Holding grubunun bankacılık kolu olarak faaliyet gösteren özel bir mevduat bankasıdır. Kuruluşu 1948 yılında Adana'ya dayanır. Banka bireysel bankacılık, ticari ve kurumsal kredilendirme, özel bankacılık ile yatırım bankacılığı alanlarında hizmet verir; portföy yönetimi, leasing ve yatırım menkul değerler iştirakleriyle birlikte konsolide edilir. Dijital kanal yatırımları ve şube dışı işlem hacmi, bankanın uzun süredir öne çıkardığı başlıklardandır.",
      "AKBNK, bankacılık endeksinin ağırlıklı hisselerinden biridir ve sektör geneliyle birlikte hareket etme eğilimi taşır. Hissenin fiyatını belirleyen temel göstergeler net faiz marjı, kredi büyümesi, takipteki kredi oranı ve sermaye yeterliliğidir. Merkez Bankası'nın faiz kararları ile BDDK'nın kredi ve karşılık düzenlemeleri sektörün tamamını aynı anda etkilediği için banka hisseleri çoğu zaman birbirine yakın seyreder. Bunun yanında bankaların menkul kıymet portföylerinde tuttukları enflasyona endeksli tahviller, enflasyonun yüksek seyrettiği dönemlerde faiz gelirlerine belirgin katkı yapabilir.",
    ],
    faq: [
      {
        q: "Akbank hangi gruba bağlı?",
        a: "Akbank, Sabancı Holding grubunun bankacılık kolu olarak faaliyet gösterir. Holding aynı zamanda enerji, çimento, perakende ve sanayi alanlarında da iştiraklere sahiptir; bu nedenle SAHOL hissesinin performansı ile AKBNK arasında dolaylı bir ilişki bulunur.",
      },
      {
        q: "Banka hisseleri neden birlikte hareket ediyor?",
        a: "Bankaların gelirlerini belirleyen başlıkların çoğu sektöre ortaktır: politika faizi, kredi düzenlemeleri, karşılık kuralları ve sermaye yeterliliği gereklilikleri. Bir düzenleme değişikliği ya da faiz kararı bütün bankaları aynı anda etkilediği için hisseler benzer yönde tepki verme eğilimi gösterir.",
      },
    ],
  },

  isctr: {
    paragraphs: [
      "Türkiye İş Bankası, 1924 yılında kurulan ve Cumhuriyet dönemi bankacılığının ilk büyük kurumlarından sayılan bir mevduat bankasıdır. Borsa İstanbul'da işlem gören payı C grubu hissedir; ISCTR kodu bu grubu ifade eder. Banka bireysel ve kurumsal bankacılığın yanında geniş bir iştirak portföyü yönetir. Şişecam, İş GYO, Anadolu Hayat Emeklilik ve İş Yatırım gibi halka açık şirketler bu portföyün içinde yer alır.",
      "ISCTR'yi diğer banka hisselerinden ayıran başlık, bu iştirak yapısıdır. Bankanın değeri yalnızca kredi-mevduat işinden değil, sahip olduğu şirketlerin piyasa değerinden de beslenir; bu yüzden hisse zaman zaman bir holding gibi de değerlendirilir. Bankacılık tarafında ise diğer bankalarla aynı göstergeler geçerlidir: net faiz marjı, takipteki kredi oranı, karşılık giderleri ve sermaye yeterliliği. Merkez Bankası'nın faiz kararları ve bankacılık düzenlemeleri hisseyi sektörle birlikte hareket ettirir. Farklı hisse gruplarının bulunması nedeniyle oy hakkı ve ortaklık yapısı, tek grup hisseye sahip bankalara göre daha karmaşıktır.",
    ],
    faq: [
      {
        q: "İş Bankası'nın C grubu hissesi ne anlama geliyor?",
        a: "İş Bankası'nın sermayesi farklı hisse gruplarına ayrılmıştır. Borsa İstanbul'da işlem gören ve yatırımcıların alıp satabildiği pay C grubudur; ISCTR kodu bu grubu ifade eder. Diğer grupların oy hakkı ve ortaklık yapısı içindeki konumu farklıdır.",
      },
      {
        q: "İştirakleri ISCTR hissesini nasıl etkiliyor?",
        a: "Banka, Şişecam ve Anadolu Hayat Emeklilik gibi halka açık şirketlerde pay sahibidir. Bu şirketlerin piyasa değerindeki değişim bankanın toplam varlık değerine yansır; bu nedenle ISCTR yalnızca bankacılık faaliyetiyle değil, iştirak portföyünün performansıyla da birlikte değerlendirilir.",
      },
    ],
  },

  ykbnk: {
    paragraphs: [
      "Yapı ve Kredi Bankası, 1944 yılında kurulmuş ve Türkiye'de perakende bankacılık odaklı çalışan ilk bankalardan biri olarak anılan bir mevduat bankasıdır. Koç Holding grubunun bankacılık iştirakidir. Banka bireysel bankacılık, kredi kartları, KOBİ ve kurumsal kredilendirme alanlarında faaliyet gösterir; World kart markası uzun yıllardır ödeme sistemleri tarafındaki en tanınan ürünlerinden biridir. Leasing, faktoring, portföy yönetimi ve yatırım iştirakleriyle konsolide edilir.",
      "YKBNK'nin fiyat davranışı bankacılık sektörünün genel dinamiklerini izler. Net faiz marjı, kredi hacmindeki büyüme, takipteki kredilerin oranı ve karşılık giderleri temel göstergelerdir. Kredi kartı iş kolunun ağırlığı nedeniyle bireysel kredi ve kart harcamalarına yönelik düzenlemeler banka için diğer bankalara kıyasla daha doğrudan sonuç doğurabilir. Merkez Bankası'nın faiz patikası ile BDDK düzenlemeleri sektörün tamamını etkilediği için hisse, bankacılık endeksiyle yakın bir seyir izler. Koç Holding'in ortaklık yapısındaki değişiklikler de zaman zaman hissenin gündemine girer.",
    ],
    faq: [
      {
        q: "Yapı Kredi hangi gruba bağlı?",
        a: "Yapı Kredi, Koç Holding grubunun bankacılık iştirakidir. Holding aynı zamanda otomotiv, enerji ve dayanıklı tüketim alanlarında da faaliyet gösterdiği için KCHOL hissesinin değeri içinde bankacılık kolunun payı bulunur.",
      },
      {
        q: "Kredi kartı iş kolu banka hissesi için ne ifade ediyor?",
        a: "Kart iş kolu bankaya faiz gelirinin yanında komisyon geliri de sağlar. Bu nedenle kart harcama hacmi, taksit sınırlamaları ve azami kart faiz oranına ilişkin düzenlemeler, kart tarafı ağırlıklı bankaların gelirlerinde daha belirgin etki yaratır.",
      },
    ],
  },

  kchol: {
    paragraphs: [
      "Koç Holding, Türkiye'nin en büyük sanayi topluluğudur ve borsada bir yatırım holdingi olarak işlem görür. Grup dört ana alanda toplanır: otomotiv tarafında Ford Otosan ve Tofaş, dayanıklı tüketimde Arçelik, enerjide Tüpraş ve Aygaz, finansta ise Yapı Kredi. Bunların yanında turizm, gıda ve bilgi teknolojileri alanlarında da iştirakleri bulunur. Grubun halka açık şirketlerinin çoğu Borsa İstanbul'da ayrı ayrı işlem gördüğü için holdingin performansı bu şirketlerin toplamından türer.",
      "Holding hisselerinde değerleme, tek bir şirketin kârından değil, sahip olunan iştiraklerin toplam değerinden yola çıkılarak yapılır. Bu toplama net aktif değer denir. Holding hisseleri çoğu zaman bu değerin altında fiyatlanır; aradaki farka holding iskontosu adı verilir ve iskontonun daralması ya da genişlemesi hisse için başlı başına bir izleme başlığıdır. KCHOL'ün gündemini iştiraklerin bilançoları, rafineri marjı, otomotiv ihracat hacmi, bankacılık kârlılığı ve grup içi satın alma ya da elden çıkarma kararları belirler. Portföyün genişliği, tek bir sektöre bağlı şirketlere kıyasla dalgalanmayı dengeleyici bir unsur olarak değerlendirilir.",
    ],
    faq: [
      {
        q: "Holding iskontosu nedir?",
        a: "Bir holdingin piyasa değeri ile sahip olduğu iştiraklerin toplam piyasa değeri arasındaki farktır. Holding hisseleri genellikle iştiraklerinin toplamından daha düşük fiyatlanır; bunun gerekçesi olarak yönetim giderleri, halka açık olmayan varlıkların belirsizliği ve iştirak satışında oluşacak vergi yükü gösterilir. İskontonun daralması hisse için olumlu okunur.",
      },
      {
        q: "Koç Holding'in hangi şirketleri ayrıca borsada işlem görüyor?",
        a: "Ford Otosan, Tofaş, Arçelik, Tüpraş, Aygaz ve Yapı Kredi grubun Borsa İstanbul'da ayrı ayrı işlem gören şirketleri arasındadır. Bu şirketlerin hisselerindeki hareket, holdingin net aktif değerine ve dolayısıyla KCHOL fiyatına yansır.",
      },
    ],
  },

  sahol: {
    paragraphs: [
      "Sabancı Holding, farklı sektörlerdeki iştiraklerini tek çatı altında toplayan bir yatırım holdingidir. Portföyün en ağırlıklı parçası bankacılık tarafındaki Akbank'tır. Enerji alanında elektrik dağıtım ve perakende satış işini yürüten Enerjisa, çimentoda Çimsa ve Akçansa, sanayide lastik takviye malzemesi üreten Kordsa ile lastik üreticisi Brisa, perakendede ise Teknosa grubun bilinen şirketleri arasındadır. Holding son yıllarda dijital iş kolları ve yenilenebilir enerji yatırımlarını ayrı bir başlık olarak öne çıkarmaktadır.",
      "SAHOL da diğer holding hisseleri gibi net aktif değer üzerinden değerlendirilir ve iştiraklerinin toplam piyasa değerine göre iskontolu işlem görebilir. Portföyde bankacılığın ağırlığı yüksek olduğu için Akbank'ın kârlılığı ve faiz döngüsü, holdingin sonuçlarında belirleyici bir yer tutar. Enerji tarafında elektrik dağıtım tarifelerine ilişkin düzenlemeler, çimentoda ise iç talep ve inşaat sektörünün seyri izlenen başlıklardır. Grup içi satın alma, birleşme ve pay satışı kararları hissenin gündemini doğrudan etkileyebilir.",
    ],
    faq: [
      {
        q: "Sabancı Holding'in gelirinde hangi sektör ağırlıkta?",
        a: "Portföyün en ağırlıklı parçası bankacılıktır; Akbank holdingin sonuçlarında belirleyici bir yer tutar. Bunun yanında enerji, çimento, sanayi ve perakende iş kolları da katkı sağlar. Bu yapı nedeniyle SAHOL, faiz döngüsüne banka hisseleri kadar olmasa da duyarlıdır.",
      },
      {
        q: "SAHOL ile AKBNK arasında nasıl bir ilişki var?",
        a: "Akbank, Sabancı Holding portföyünün en büyük kalemlerindendir. Akbank hissesindeki değer değişimi holdingin net aktif değerine yansır; bu nedenle iki hisse çoğu zaman aynı yönde hareket eder. Ancak SAHOL'ün diğer iş kolları bu ilişkiyi tam olarak birebir olmaktan çıkarır.",
      },
    ],
  },

  bimas: {
    paragraphs: [
      "BİM, Türkiye'de indirim marketi modelini yaygınlaştıran gıda perakende zinciridir. İş modelinin temeli sınırlı ürün çeşidi ve yüksek devir hızıdır: raflarda görece az sayıda ürün bulundurulur, buna karşılık her üründen yüksek hacimde satış yapılır. Bu yapı tedarikçilerle pazarlık gücünü artırır ve maliyetleri düşük tutar. Kendi markalı ürünlerin satış içindeki payı yüksektir. Şirket Türkiye dışında Fas ve Mısır'da da mağaza işletmektedir.",
      "BIMAS, savunma nitelikli sayılan hisseler arasında değerlendirilir; gıda talebi ekonomik yavaşlama dönemlerinde diğer tüketim kalemlerine göre daha az daralır. Enflasyonun yüksek seyrettiği dönemlerde ciro nominal olarak hızla büyür, ancak burada asıl izlenen gösterge aynı mağaza satışlarındaki reel büyümedir; bu ölçüt yeni açılan mağazaların etkisini ayıklar. Mağaza açılış hızı, sepet büyüklüğü, müşteri trafiği ve brüt kâr marjı diğer temel başlıklardır. Asgari ücret ve kira artışları personel ile işletme giderlerini doğrudan etkilediği için marj üzerinde baskı yaratabilir.",
    ],
    faq: [
      {
        q: "Aynı mağaza satışı neden önemli bir gösterge?",
        a: "Perakendede toplam ciro, yeni mağaza açılışlarıyla da büyür. Aynı mağaza satışı ise en az bir yıldır açık olan mağazaların performansını ölçer ve büyümenin gerçekten talepten mi yoksa yalnızca mağaza sayısından mı geldiğini gösterir. Enflasyonun yüksek olduğu dönemlerde bu ölçütün reel, yani enflasyondan arındırılmış hâline bakılır.",
      },
      {
        q: "BİM yalnızca Türkiye'de mi faaliyet gösteriyor?",
        a: "Hayır. Şirketin Türkiye dışında Fas ve Mısır'da da mağaza operasyonu bulunur. Yurt dışı faaliyetler konsolide sonuçlara dahil edilir; bu ülkelerdeki kur hareketleri ve ekonomik koşullar şirketin bilançosuna yansır.",
      },
    ],
  },

  tuprs: {
    paragraphs: [
      "Tüpraş, Türkiye'nin en büyük petrol rafinericisidir ve Koç Holding grubuna bağlıdır. Şirket İzmit, İzmir, Kırıkkale ve Batman'da rafineri işletir. Ham petrolü işleyerek motorin, benzin, jet yakıtı, LPG ve petrokimya hammaddeleri gibi ürünlere dönüştürür. Ürünlerinin önemli bölümü yurt içi akaryakıt dağıtım ağına verilir, bir kısmı ise ihraç edilir. Şirket son yıllarda yenilenebilir enerji ve sürdürülebilir havacılık yakıtı gibi alanlarda dönüşüm yatırımlarını gündemine almıştır.",
      "Bir rafineri şirketinin kârlılığını belirleyen asıl gösterge ham petrolün fiyatı değil, ham petrol ile üretilen ürünler arasındaki fiyat farkıdır; buna rafineri marjı ya da crack spread denir. Petrol ucuzlarken marj daralabilir, pahalıyken genişleyebilir; bu yüzden petrol fiyatı ile hisse arasında doğrudan bir ilişki kurmak yanıltıcıdır. Stok kârı ve zararı da önemli bir kalemdir: elde tutulan ham petrolün fiyatı işleme süresi içinde değiştiğinde bilançoda değerleme etkisi oluşur. Bunların yanında rafineri kapasite kullanım oranı, planlı bakım duruşları, dolar kuru ve akaryakıt talebindeki mevsimsellik izlenen başlıklardır.",
    ],
    faq: [
      {
        q: "Rafineri marjı nedir?",
        a: "Rafineri marjı, işlenen ham petrolün maliyeti ile ondan üretilen motorin, benzin ve jet yakıtı gibi ürünlerin satış fiyatı arasındaki farktır. Rafineri şirketlerinde kârlılığın asıl kaynağı bu farktır. Bu nedenle petrol fiyatının yönü tek başına yeterli bilgi vermez; ürün fiyatlarının ham petrole göre nasıl hareket ettiği belirleyicidir.",
      },
      {
        q: "Tüpraş'ın kaç rafinerisi var?",
        a: "Şirket İzmit, İzmir, Kırıkkale ve Batman olmak üzere dört rafineri işletir. Bu tesislerden birinde planlı bakım ya da beklenmedik bir duruş yaşanması, o dönemin üretim hacmini ve kapasite kullanım oranını doğrudan etkiler.",
      },
    ],
  },

  eregl: {
    paragraphs: [
      "Ereğli Demir ve Çelik Fabrikaları, Türkiye'nin en büyük yassı çelik üreticisidir ve OYAK grubuna bağlıdır. Şirket Karadeniz Ereğli'deki entegre tesisinin yanında İskenderun'daki İsdemir üzerinden de üretim yapar. Ürün yelpazesi sıcak ve soğuk haddelenmiş sac, galvanizli ürünler ve teneke gibi yassı çelik kalemlerinden oluşur. Bu ürünlerin ana alıcıları otomotiv, beyaz eşya, boru üretimi, inşaat ve genel imalat sanayidir.",
      "EREGL bir emtia şirketidir; bu nedenle hissenin seyri küresel çelik fiyatlarına ve girdi maliyetlerine sıkı biçimde bağlıdır. Ana girdiler demir cevheri ve kömürdür, dolayısıyla bu iki kalemin dünya fiyatı ile çelik ürün fiyatı arasındaki fark kârlılığı belirler. Çin'in çelik üretim ve ihracat politikası, küresel arzın en büyük belirleyicisi olduğu için sektörün tamamını etkiler. Yurt içinde ise otomotiv ve beyaz eşya üretim hacimleri ile inşaat talebi izlenir. Enerji yoğun bir üretim süreci olduğundan doğal gaz ve elektrik fiyatları da maliyet tarafında belirgin bir yer tutar. Şirketin gelirinin önemli kısmı dövizle ilişkili olduğu için kur da sonuçlara yansır.",
    ],
    faq: [
      {
        q: "Erdemir hissesini hangi küresel gelişmeler etkiliyor?",
        a: "Çelik bir emtia olduğu için fiyatlar dünya piyasasında belirlenir. Çin'in üretim ve ihracat politikası küresel arzı en çok etkileyen unsurdur. Bunun yanında demir cevheri ile kömür fiyatları girdi maliyetini, doğal gaz ve elektrik fiyatları ise enerji maliyetini belirler. Bu üç başlık arasındaki denge şirketin marjını oluşturur.",
      },
      {
        q: "Erdemir ile İsdemir arasındaki ilişki nedir?",
        a: "İskenderun'da faaliyet gösteren İsdemir, Erdemir grubunun bir parçasıdır ve sonuçları konsolide edilir. Bu nedenle EREGL hissesi değerlendirilirken yalnızca Karadeniz Ereğli'deki tesis değil, grubun toplam üretim kapasitesi dikkate alınır.",
      },
    ],
  },

  froto: {
    paragraphs: [
      "Ford Otosan, Ford Motor Company ile Koç Holding'in ortaklığıyla kurulan otomotiv üreticisidir. Şirket Kocaeli'deki Gölcük tesisi, Eskişehir ve Yeniköy fabrikalarında üretim yapar; 2022'de Romanya'daki Craiova fabrikasını da bünyesine katmıştır. Üretimin ağırlığı ticari araçlardadır: Transit ailesi şirketin en bilinen ürün grubudur. Ford Otosan aynı zamanda Ford'un Avrupa ticari araç üretiminde önemli bir üs konumundadır ve elektrikli ticari araç üretimine yönelik dönüşüm yatırımları yürütmektedir.",
      "FROTO'nun gelir yapısı ihracat ağırlıklıdır; üretilen araçların büyük bölümü Avrupa pazarına gönderilir. Bu nedenle hissenin seyrinde Avrupa'daki ticari araç talebi, euro kuru ve ihracat hacmi belirleyicidir. Yurt içi satışlar ise kredi koşulları, ÖTV düzenlemeleri ve araç fiyatlarındaki artıştan etkilenir. Maliyet tarafında çelik ve alüminyum gibi hammadde fiyatları, yarı iletken tedariki ve enerji giderleri izlenir. Otomotiv üretimi yüksek sabit maliyetli bir iştir; bu yüzden kapasite kullanım oranındaki değişim kârlılığa orantısız biçimde yansıyabilir. Şirket temettü dağıtımı düzenli olan hisseler arasında anılır.",
    ],
    faq: [
      {
        q: "Ford Otosan'ın ihracatı hisse için neden önemli?",
        a: "Üretilen araçların önemli bölümü Avrupa pazarına gönderilir, dolayısıyla gelirin büyük kısmı döviz cinsindendir. Bu yapı şirketi Avrupa'daki ticari araç talebine ve euro kuruna duyarlı kılar. Avrupa ekonomisindeki yavaşlama sipariş hacmini, kurdaki hareket ise TL cinsinden geliri doğrudan etkiler.",
      },
      {
        q: "Ford Otosan hangi araçları üretiyor?",
        a: "Şirketin üretimi ağırlıklı olarak ticari araçlardan oluşur; Transit ailesi en bilinen ürün grubudur. Kocaeli, Eskişehir ve Yeniköy tesislerinin yanında Romanya'daki Craiova fabrikası da üretim ağının parçasıdır. Elektrikli ticari araç üretimi şirketin dönüşüm gündeminde yer alır.",
      },
    ],
  },

  toaso: {
    paragraphs: [
      "Tofaş, Koç Holding ile Stellantis'in ortaklığıyla faaliyet gösteren otomotiv üreticisidir. Üretim Bursa'daki fabrikada yapılır. Şirket hem binek hem hafif ticari araç üretir; Fiat Egea ailesi yurt içi satışların ve ihracatın önemli bölümünü oluşturur. Tofaş ayrıca ortağı olduğu grubun markalarının Türkiye'deki dağıtım ve satış faaliyetini de yürütür, bu nedenle şirket yalnızca üretici değil aynı zamanda distribütör konumundadır.",
      "Tofaş'ın iş modelinde dikkat çeken unsur, ihracat sözleşmelerinde yer alan al ya da öde yapısıdır: alıcı taraf sözleşmede taahhüt ettiği hacmi almasa bile belirli bir ödeme yükümlülüğü doğar. Bu düzenek talep dalgalandığında şirketin gelirini görece koruyucu bir işlev görür. Hissenin gündemini yurt içi otomotiv pazarının büyüklüğü, kredi koşulları ve ÖTV düzenlemeleri, ihracat tarafında ise Avrupa talebi ve euro kuru belirler. Yeni model geçiş dönemleri üretim hacmini geçici olarak etkileyebilir. Maliyet tarafında hammadde fiyatları, enerji giderleri ve tedarik zincirinin sürekliliği izlenen başlıklardır.",
    ],
    faq: [
      {
        q: "Tofaş'ın al ya da öde sözleşmeleri ne anlama geliyor?",
        a: "İhracat anlaşmalarında alıcı tarafın belirli bir üretim hacmini satın almayı taahhüt ettiği, bu hacmin altında kalması durumunda ise fark için ödeme yaptığı sözleşme yapısıdır. Talebin zayıfladığı dönemlerde şirketin gelirini kısmen koruyan bir düzenek olarak değerlendirilir.",
      },
      {
        q: "Tofaş üretim dışında başka iş yapıyor mu?",
        a: "Evet. Şirket üretimin yanında ortağı olduğu grubun markalarının Türkiye'deki dağıtım ve satış faaliyetini de yürütür. Bu nedenle yurt içi otomotiv pazarındaki daralma ya da genişleme, şirketi yalnızca üretim tarafından değil distribütörlük tarafından da etkiler.",
      },
    ],
  },

  sise: {
    paragraphs: [
      "Şişecam, cam ve kimyasallar alanında üretim yapan, İş Bankası grubuna bağlı bir sanayi şirketidir. Dört ana iş kolunda çalışır: inşaat ve otomotiv sektörüne girdi sağlayan düz cam, bardak ve sofra ürünlerinin üretildiği cam ev eşyası, gıda ve içecek sektörüne şişe ile kavanoz üreten cam ambalaj, bir de soda külü ve krom bileşikleri gibi ürünlerin yer aldığı kimyasallar. Şirketin Türkiye dışında Avrupa, Rusya ve Amerika Birleşik Devletleri dahil birçok ülkede üretim tesisi bulunur.",
      "SISE'nin dört iş kolu farklı sektörlere bağlı olduğu için gelir yapısı görece dağınıktır ve bu, tek sektöre bağlı şirketlere kıyasla dengeleyici bir unsur olarak değerlendirilir. Düz cam tarafında inşaat ve otomotiv talebi, cam ambalajda gıda ve içecek üretimi, kimyasallarda ise soda külünün dünya fiyatı belirleyicidir. Cam üretimi enerji yoğun bir süreçtir; fırınlar sürekli çalıştığı için doğal gaz fiyatı maliyet tarafında en kritik kalemdir. Yurt dışı tesislerin payı yüksek olduğundan kur hareketleri ve faaliyet gösterilen ülkelerdeki ekonomik koşullar da sonuçlara yansır.",
    ],
    faq: [
      {
        q: "Şişecam'ın iş kolları neler?",
        a: "Şirket düz cam, cam ev eşyası, cam ambalaj ve kimyasallar olmak üzere dört ana iş kolunda faaliyet gösterir. Bu kollar sırasıyla inşaat ve otomotiv, perakende tüketim, gıda-içecek ile sanayi sektörlerine bağlıdır; farklı sektörlere yayılmış olması gelir yapısını dengeler.",
      },
      {
        q: "Doğal gaz fiyatı Şişecam'ı neden bu kadar etkiliyor?",
        a: "Cam üretimi yüksek sıcaklıkta ve kesintisiz çalışan fırınlar gerektirir; fırınlar teknik nedenlerle kolayca durdurulup çalıştırılamaz. Bu nedenle enerji, üretim maliyetinin büyük bir kalemidir ve doğal gaz fiyatındaki artış marjı doğrudan baskılar.",
      },
    ],
  },

  pgsus: {
    paragraphs: [
      "Pegasus Hava Yolları, düşük maliyetli havayolu modeliyle çalışan bir yolcu taşımacılığı şirketidir. Ana üssü İstanbul Sabiha Gökçen Havalimanı'dır; buradan yurt içi hatların yanında Avrupa, Orta Doğu ve Orta Asya'ya tarifeli seferler düzenler. Düşük maliyetli modelin gereği olarak tek tip uçak filosu, yüksek günlük uçuş kullanımı ve sadeleştirilmiş hizmet yapısı benimsenmiştir; bilet fiyatı temel hizmeti kapsar, bagaj ve koltuk seçimi gibi kalemler ayrı ücretlendirilir.",
      "PGSUS'un gelir yapısında yan gelirler ayrı bir başlıktır: bagaj ücreti, koltuk seçimi, ikram satışı ve benzeri kalemler toplam gelirin kayda değer bir bölümünü oluşturur ve bilet fiyatına göre daha yüksek marjlı kabul edilir. Hissenin gündemini doluluk oranı, koltuk başına gelir, jet yakıtı fiyatı ve döviz kuru belirler. Turizm sezonunun gücü nedeniyle sonuçlarda belirgin bir mevsimsellik görülür; yaz çeyrekleri kış çeyreklerinden yapısal olarak daha güçlüdür, bu nedenle çeyrekler kendi aralarında değil bir önceki yılın aynı çeyreğiyle karşılaştırılır. Filo genişleme planı ve uçak teslimat takvimi de izlenen başlıklardandır.",
    ],
    faq: [
      {
        q: "Düşük maliyetli havayolu modeli ne demek?",
        a: "Maliyetleri düşük tutmak için tek tip uçak filosu kullanan, uçakları günde daha fazla sefer için değerlendiren ve hizmetleri sadeleştiren modeldir. Bilet fiyatı yalnızca temel taşımayı kapsar; bagaj, koltuk seçimi ve ikram gibi kalemler ayrı ücretlendirilir. Bu ek kalemlere yan gelir denir.",
      },
      {
        q: "Pegasus sonuçlarında mevsimsellik neden bu kadar belirgin?",
        a: "Havacılıkta talep turizm sezonuna bağlı olarak yoğunlaşır; yaz aylarında doluluk ve bilet fiyatları yükselir, kış aylarında geriler. Bu nedenle çeyreklik sonuçlar bir önceki çeyrekle değil, bir önceki yılın aynı çeyreğiyle karşılaştırıldığında anlamlı olur.",
      },
    ],
  },

  tcell: {
    paragraphs: [
      "Turkcell, Türkiye'nin mobil iletişim operatörlerinden biridir ve abone sayısı bakımından sektörün en büyükleri arasındadır. Şirket mobil ses ve veri hizmetlerinin yanında sabit internet, fiber altyapı, dijital servisler, veri merkezi ve bulut hizmetleri alanlarında da faaliyet gösterir. Ana hissedarları arasında Türkiye Varlık Fonu bulunur. Şirket ayrıca dijital ödeme ve finansal teknoloji alanında da iş kollarına sahiptir; abone tabanını bu servislerle ilişkilendirmek uzun süredir izlediği bir stratejidir.",
      "TCELL bir telekom şirketi olarak yüksek sabit yatırım gerektiren bir iş yürütür; şebeke kurulumu ve frekans lisansları büyük sermaye harcaması demektir. Bu nedenle yatırımcılar kârın yanında nakit akışını ve borçluluğu yakından izler. Şirketin gelir kalemleri abone başına ortalama gelir, abone sayısındaki değişim ve veri kullanımındaki artıştan oluşur. Enflasyonun yüksek olduğu dönemlerde tarifelere yapılan fiyat ayarlamalarının maliyet artışını ne ölçüde karşıladığı belirleyici olur. Frekans ihaleleri, yeni nesil şebeke yatırımları ve düzenleyici kurum kararları sektörün tamamını etkileyen başlıklardır. Şirketin döviz cinsinden borcu bulunduğu için kur hareketleri de finansal giderlere yansır.",
    ],
    faq: [
      {
        q: "Telekom hisselerinde abone başına gelir ne anlama geliyor?",
        a: "Abone başına ortalama gelir, şirketin bir aboneden belirli bir dönemde elde ettiği ortalama tutarı gösterir. Abone sayısı büyümesi yavaşladığında büyümenin bu göstergeden gelmesi beklenir; tarife fiyatlarındaki artışın maliyet artışını karşılayıp karşılamadığı buradan izlenir.",
      },
      {
        q: "Turkcell yalnızca mobil operatörlük mü yapıyor?",
        a: "Hayır. Mobil hizmetlerin yanında sabit internet ve fiber altyapı, dijital servisler, veri merkezi ile bulut hizmetleri de şirketin iş kolları arasındadır. Dijital ödeme ve finansal teknoloji alanındaki faaliyetler de gelir yapısının bir parçasıdır.",
      },
    ],
  },

  arclk: {
    paragraphs: [
      "Arçelik, beyaz eşya ve dayanıklı tüketim ürünleri üreten, Koç Holding grubuna bağlı bir sanayi şirketidir. Buzdolabı, çamaşır makinesi, bulaşık makinesi, fırın ve küçük ev aletleri ana ürün gruplarıdır. Şirket Türkiye'de Arçelik ve Beko markalarıyla, uluslararası pazarlarda ise ağırlıklı olarak Beko ve Grundig markalarıyla satış yapar. Türkiye dışında Avrupa, Asya ve Afrika'da üretim tesisleri bulunur; Whirlpool'un Avrupa faaliyetlerinin birleştirilmesiyle Avrupa'daki üretim ve satış ağı genişlemiştir.",
      "ARCLK'in gelirinde yurt dışı satışların payı yüksektir; bu nedenle Avrupa'daki tüketici talebi, euro kuru ve ihracat hacmi hissenin temel izleme başlıklarıdır. Beyaz eşya talebi konut satışları ve hane halkı gelirine bağlı olduğundan ekonomik döngülere duyarlıdır; kredi koşullarının sıkılaştığı dönemlerde satışlar yavaşlar. Maliyet tarafında çelik, plastik ve elektronik bileşen fiyatları ile nakliye giderleri belirleyicidir. Şirketin döviz cinsinden borçluluğu bulunduğu için kur hareketleri hem geliri hem finansman giderlerini etkiler; bu iki yönlü etki nedeniyle kurun hisseye net etkisi doğrudan okunamaz.",
    ],
    faq: [
      {
        q: "Arçelik hangi markalarla satış yapıyor?",
        a: "Türkiye'de Arçelik ve Beko markaları öne çıkar. Uluslararası pazarlarda ağırlıklı olarak Beko ve Grundig markaları kullanılır. Şirketin Türkiye dışında da üretim tesisleri bulunur; Avrupa'daki üretim ve satış ağı Whirlpool'un Avrupa faaliyetlerinin birleştirilmesiyle genişlemiştir.",
      },
      {
        q: "Beyaz eşya talebi neye bağlı?",
        a: "Beyaz eşya alımı büyük ölçüde konut satışlarına, hane halkı gelirine ve tüketici kredisi koşullarına bağlıdır. Faizlerin yükseldiği ve kredinin daraldığı dönemlerde bu tür dayanıklı tüketim harcamaları ertelenme eğilimi gösterir; bu da şirketin satış hacmine yansır.",
      },
    ],
  },

  sasa: {
    paragraphs: [
      "Sasa Polyester, Adana'da faaliyet gösteren ve polyester ürünleri üreten bir kimya sanayi şirketidir. Üretim yelpazesi polyester elyaf, iplik, film ve polimer ürünlerini kapsar. Bu ürünlerin ana alıcıları tekstil, ambalaj ve otomotiv sektörleridir. Şirket son yıllarda üretim zincirinde geriye doğru entegrasyonu hedefleyen büyük ölçekli yatırımlar yürütmüş, polyester üretiminin ana hammaddelerinden olan PTA üretimine yönelik tesis yatırımlarını gündemine almıştır. Şirket Erdemoğlu Holding bünyesinde yer alır.",
      "SASA bir emtia kimyası şirketidir; ürün fiyatları uluslararası piyasada belirlenir ve petrol türevi hammaddelere bağlıdır. Kârlılığı belirleyen asıl unsur ürün fiyatı ile hammadde maliyeti arasındaki farktır. Küresel polyester arzında Asya kaynaklı kapasitenin ağırlığı yüksek olduğu için bu bölgedeki üretim ve fiyat politikaları sektörün tamamını etkiler. Şirketin yürüttüğü yatırım programı yüksek sermaye harcaması gerektirdiğinden borçluluk düzeyi ve finansman giderleri izlenen başlıklar arasındadır; döviz cinsinden borç bulunması kur hareketlerini finansal sonuçlara yansıtır. Yatırımların devreye alınma takvimi hissenin gündemini belirleyen unsurlardandır.",
    ],
    faq: [
      {
        q: "Sasa Polyester ne üretiyor?",
        a: "Şirket polyester elyaf, iplik, film ve polimer ürünleri üretir. Bu ürünler ağırlıklı olarak tekstil, ambalaj ve otomotiv sektörlerinde kullanılır. Polyester üretiminin hammaddeleri petrol türevi olduğu için maliyetler uluslararası enerji ve kimya fiyatlarına bağlıdır.",
      },
      {
        q: "Şirketin yatırım programı hisse açısından neden izleniyor?",
        a: "Büyük ölçekli üretim yatırımları yüksek sermaye harcaması ve borçlanma gerektirir. Bu nedenle borçluluk düzeyi, finansman giderleri ve yatırımların devreye alınma takvimi hissenin değerlendirilmesinde öne çıkan başlıklardır. Döviz cinsinden borç bulunması kur hareketlerini finansal sonuçlara taşır.",
      },
    ],
  },

  ekgyo: {
    paragraphs: [
      "Emlak Konut GYO, konut geliştirme odaklı bir gayrimenkul yatırım ortaklığıdır. Ana ortağı TOKİ'dir. Şirketin iş modelinin merkezinde gelir paylaşımı yöntemi vardır: sahip olduğu arsayı ihaleye çıkarır, projeyi yüklenici firma inşa eder ve satıştan elde edilen gelir önceden belirlenen oranlarda paylaşılır. Bu yapı şirketin inşaat riskini büyük ölçüde yükleniciye devretmesini sağlar. Şirket ayrıca kendi kaynaklarıyla anahtar teslim projeler de geliştirir.",
      "Gayrimenkul yatırım ortaklıkları vergi açısından özel bir statüye tabidir; belirli koşulları sağlamaları hâlinde kurumlar vergisi istisnasından yararlanırlar. EKGYO'nun sonuçlarını belirleyen başlıklar arsa portföyünün büyüklüğü, açılan ihalelerin sayısı ve elde edilen arsa satış karşılığı gelir paylaşımı oranlarıdır. Konut talebi ise doğrudan konut kredisi faizlerine, hane halkı gelirine ve inşaat maliyetlerindeki artışa bağlıdır; faizlerin yükseldiği dönemlerde talep belirgin biçimde yavaşlar. Proje teslim takvimi gelir kaydını belirlediği için çeyreklik sonuçlar dalgalı seyredebilir; bu nedenle tek çeyreğe bakarak eğilim çıkarmak yanıltıcı olur.",
    ],
    faq: [
      {
        q: "Gelir paylaşımı modeli nasıl çalışıyor?",
        a: "Şirket sahip olduğu arsayı ihaleye çıkarır; ihaleyi kazanan yüklenici projeyi kendi kaynaklarıyla inşa eder. Satıştan elde edilen gelir, ihalede belirlenen oranlara göre şirket ile yüklenici arasında paylaşılır. Bu yapı inşaat maliyeti ve tamamlanma riskinin önemli bölümünü yüklenici tarafına aktarır.",
      },
      {
        q: "Gayrimenkul yatırım ortaklığı olmak ne sağlıyor?",
        a: "GYO statüsü, mevzuattaki koşulların yerine getirilmesi hâlinde kurumlar vergisi istisnası sağlar. Buna karşılık portföy yapısı, borçlanma sınırları ve kâr dağıtımı konularında düzenleyici kurallara uyulması gerekir. Bu statü, şirketin vergi sonrası kârlılığını doğrudan etkileyen bir unsurdur.",
      },
    ],
  },
};
