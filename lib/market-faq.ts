/**
 * Canlı veri sayfalarının soru-cevap içeriği.
 *
 * Neden ayrı dosya: metin sayfa bileşenlerinin içine gömülseydi her varlık
 * için kopyalanır, biri güncellenip diğeri unutulurdu. Burada tek yerde
 * duruyor ve her sayfa kendi varlığına ait olanı çağırıyor.
 *
 * ⚠️ KURAL: hiçbir cevapta değişken rakam geçmez (fiyat, kur, yüzde, oran).
 * Sebep iki tane: (1) sayfa bayatlar ve yanlış bilgi verir, (2) botun kalite
 * kapısı "kaynaklarda bulunmayan rakam" diye zaten reddediyor — aynı disiplin
 * elle yazılan metin için de geçerli olmalı.
 */

export interface FaqItem {
  q: string;
  a: string;
}

/* -------------------------------------------------------------------------- */
/* ALTIN                                                                       */
/* -------------------------------------------------------------------------- */

const ALTIN_ORTAK: FaqItem[] = [
  {
    q: "Altın fiyatları neye göre belirleniyor?",
    a: "Türkiye'deki altın fiyatının iki bileşeni vardır: uluslararası piyasada dolar cinsinden işlem gören ons altın fiyatı ve dolar/TL kuru. Ons fiyatı sabit kalsa bile kur yükselirse TL cinsinden altın pahalanır; tersi durumda ucuzlar. Bu yüzden altın takibi yapan biri yalnız ons fiyatına değil, kura da bakmak zorundadır.",
  },
  {
    q: "Kapalıçarşı fiyatı ile buradaki fiyat neden farklı?",
    a: "Bu sayfadaki değerler ons altın ve güncel kur üzerinden türetilen ham hesap değerleridir. Kuyumcu ve bankaların satış fiyatına işçilik payı, kâr marjı ve alış-satış makası eklenir. Fiziki altın alırken ödenen tutar bu nedenle hesaplanan değerin üzerinde, satarken elde edilen tutar altında olur.",
  },
  {
    q: "Altın fiyatı ne sıklıkla güncelleniyor?",
    a: "Sayfadaki veri yaklaşık on dakikada bir tazelenir. Uluslararası altın piyasası hafta içi neredeyse kesintisiz işlediği için gün içinde birden çok kez değişim görebilirsiniz; hafta sonu piyasa kapalı olduğundan son kapanış değeri gösterilir.",
  },
];

const ALTIN_OZEL: Record<string, FaqItem[]> = {
  "gram-altin": [
    {
      q: "Gram altın fiyatı nasıl hesaplanıyor?",
      a: "Bir ons altın 31,1035 grama denk gelir. Ons altının dolar fiyatı bu sayıya bölünüp güncel dolar/TL kuruyla çarpıldığında bir gram altının TL karşılığı çıkar. Sayfada gösterilen değer bu hesabın sonucudur ve 24 ayar saf altını temsil eder.",
    },
    {
      q: "22 ayar bilezik neden gram altından ucuz?",
      a: "Bilezikte kullanılan 22 ayar altın binde 916 saflıktadır, yani her gramın yaklaşık yüzde 92'si altındır. Kalan kısım dayanıklılık için eklenen alaşımdır. Bu nedenle bilezik gramının hurda değeri saf gram altının altında kalır; satın alırken ayrıca işçilik ödenir, satarken bu işçilik geri alınamaz.",
    },
  ],
  "ceyrek-altin": [
    {
      q: "Çeyrek altın kaç gram?",
      a: "Yeni tarihli çeyrek altın 1,75 gram ağırlığında ve 22 ayar saflıktadır; içindeki saf altın miktarı yaklaşık 1,60 gramdır. Eski tarihli çeyrekler biraz daha ağır olabildiği için aynı gün bile iki çeyrek arasında fiyat farkı görülebilir.",
    },
    {
      q: "Çeyrek altın mı gram altın mı avantajlı?",
      a: "Çeyrek altında darphane işçiliği fiyata yansır, bu yüzden gram başına maliyeti gram altından yüksektir. Buna karşılık çeyrek hediye ve bozdurma kolaylığı sağlar. Yalnızca değer saklamak amacıyla alım yapılıyorsa gram altın işçilik farkı nedeniyle genelde daha verimlidir.",
    },
  ],
  "cumhuriyet-altini": [
    {
      q: "Cumhuriyet altını kaç gram?",
      a: "Tam Cumhuriyet altını 7,216 gram ağırlığında ve 22 ayardır; içerdiği saf altın miktarı yaklaşık 6,6 gramdır. Ata lira olarak da bilinir ve fiyatı içindeki altın miktarının yanı sıra darphane işçiliğini de içerir.",
    },
    {
      q: "Ziynet altın ile Cumhuriyet altını aynı şey mi?",
      a: "İkisi de 22 ayardır ancak Cumhuriyet altını Darphane tarafından basılan standart bir sikkedir, ziynet altın ise kuyumcuların ürettiği takı amaçlı basımları kapsar. Standart basım olduğu için Cumhuriyet altınının alım satımı genelde daha kolaydır.",
    },
  ],
  ons: [
    {
      q: "Ons altın nedir?",
      a: "Ons, değerli metal piyasasının uluslararası ağırlık birimidir ve bir troy ons 31,1035 grama karşılık gelir. Dünya genelinde altın fiyatı dolar cinsinden ons üzerinden kote edilir; Türkiye'deki gram, çeyrek ve Cumhuriyet altını fiyatları bu değerden türetilir.",
    },
    {
      q: "Ons altın fiyatını ne etkiler?",
      a: "Başlıca etkenler ABD Merkez Bankası'nın faiz politikası, dolar endeksinin seyri, tahvil getirileri, jeopolitik riskler ve merkez bankalarının altın alımlarıdır. Faizler yükseldiğinde getiri sağlamayan altın görece cazibesini kaybeder; belirsizlik arttığında ise güvenli liman talebiyle değer kazanma eğilimi gösterir.",
    },
  ],
};

export function goldFaq(slug: string): FaqItem[] {
  return [...(ALTIN_OZEL[slug] ?? []), ...ALTIN_ORTAK];
}

export const GOLD_HUB_FAQ: FaqItem[] = [
  ...ALTIN_ORTAK,
  {
    q: "Hangi altın türü hangi amaca uygun?",
    a: "Gram altın işçilik payı en düşük seçenek olduğu için değer saklama amacına; çeyrek ve yarım altın bozdurma ve hediye kolaylığı nedeniyle küçük tutarlara; Cumhuriyet altını ise standart basım olması sebebiyle daha büyük tutarların saklanmasına uygun kabul edilir.",
  },
];

/* -------------------------------------------------------------------------- */
/* DÖVİZ                                                                       */
/* -------------------------------------------------------------------------- */

const DOVIZ_ORTAK: FaqItem[] = [
  {
    q: "Bankadaki kur ile buradaki kur neden aynı değil?",
    a: "Bu sayfadaki değer piyasadaki referans kurudur. Bankalar ve döviz büfeleri bu kurun üzerine kendi alış-satış makasını ekler: size satarken referansın üzerinde, sizden alırken altında fiyat verirler. Aradaki fark kurumun kâr payıdır ve tutara göre değişebilir.",
  },
  {
    q: "TCMB kuru ile serbest piyasa kuru arasındaki fark nedir?",
    a: "Merkez Bankası her iş günü gösterge niteliğinde bir kur yayımlar; bu kur resmî işlemlerde, muhasebe kayıtlarında ve sözleşmelerde referans alınır. Serbest piyasa kuru ise gün boyunca arz ve talebe göre değişir. İkisi birbirine yakın seyreder ancak gün içi hareketlerde ayrışabilir.",
  },
  {
    q: "Kur verisi ne sıklıkla güncelleniyor?",
    a: "Sayfadaki kurlar yaklaşık on dakikada bir tazelenir. Döviz piyasası hafta içi gün boyu işlediğinden gün içinde birden çok değişim görülebilir; hafta sonu ve resmî tatillerde son işlem değeri gösterilir.",
  },
];

const DOVIZ_OZEL: Record<string, FaqItem[]> = {
  "usd-try": [
    {
      q: "Dolar kurunu ne belirliyor?",
      a: "Dolar/TL kuru, döviz arz ve talebinin yanı sıra Merkez Bankası'nın faiz kararlarına, enflasyon beklentilerine, cari işlemler dengesine ve küresel risk iştahına göre şekillenir. ABD tarafında açıklanan faiz ve istihdam verileri de doların dünya genelindeki değerini etkilediği için kura yansır.",
    },
    {
      q: "1 dolar kaç TL sorusunun cevabı gün içinde neden değişiyor?",
      a: "Döviz kuru sabit değil, sürekli işlem gören bir fiyattır. Piyasa saatleri içinde her alım satım emri fiyatı bir miktar oynatır; veri açıklamaları ve merkez bankası duyuruları gibi anlarda hareket belirginleşir. Bu sayfada gösterilen değer son güncelleme anındaki referans kurudur.",
    },
  ],
  "eur-try": [
    {
      q: "Euro kuru dolardan bağımsız mı hareket eder?",
      a: "Tamamen bağımsız değildir. Euro/TL kuru büyük ölçüde euro/dolar paritesi ile dolar/TL kurunun bileşimidir. Parite yükselirken dolar/TL sabit kalsa bile euro TL karşısında değer kazanır; bu nedenle euro takibi yapanların pariteyi de izlemesi gerekir.",
    },
    {
      q: "Euro kurunu hangi gelişmeler etkiler?",
      a: "Avrupa Merkez Bankası'nın faiz kararları, Euro Bölgesi enflasyon ve büyüme verileri euronun küresel değerini belirler. Türkiye tarafında ise Merkez Bankası politikası ve enflasyon beklentileri TL kanadını etkiler; kur bu iki tarafın bileşkesidir.",
    },
  ],
  "gbp-try": [
    {
      q: "Sterlin kuru neden diğer kurlardan daha oynak görünür?",
      a: "Sterlin, işlem hacmi dolar ve euroya göre daha sınırlı olan bir para birimidir ve İngiltere Merkez Bankası kararlarına, enflasyon verilerine ve siyasi gelişmelere hızlı tepki verir. Bu iki etken bir araya geldiğinde sterlin/TL kurunda daha belirgin gün içi hareketler görülebilir.",
    },
  ],
};

export function fxFaq(pair: string): FaqItem[] {
  return [...(DOVIZ_OZEL[pair] ?? []), ...DOVIZ_ORTAK];
}

export const FX_HUB_FAQ: FaqItem[] = DOVIZ_ORTAK;

/* -------------------------------------------------------------------------- */
/* KRİPTO                                                                      */
/* -------------------------------------------------------------------------- */

export function cryptoFaq(label: string, symbol: string): FaqItem[] {
  return [
    {
      q: `${label} fiyatı TL olarak nasıl hesaplanıyor?`,
      a: `Kripto paralar dünya genelinde ağırlıklı olarak dolar ve stabilcoin paritelerinde işlem görür. Sayfadaki ${symbol}/TL değeri, borsalardaki güncel ${symbol} fiyatının Türk Lirası karşılığıdır ve yaklaşık beş dakikada bir tazelenir. Farklı kripto borsalarında likidite farkı nedeniyle küçük fiyat ayrışmaları görülebilir.`,
    },
    {
      q: `${label} piyasası hafta sonu da açık mı?`,
      a: "Kripto piyasaları borsa ve döviz piyasalarının aksine haftanın yedi günü, günün yirmi dört saati işler. Bu nedenle hafta sonu da fiyat değişimi olur ve pazartesi açılışı diye bir kavram yoktur.",
    },
    {
      q: "24 saatlik değişim oranı neyi gösterir?",
      a: "Son yirmi dört saatteki fiyat değişimini yüzde olarak ifade eder; takvim gününü değil, o ana göre geriye doğru yirmi dört saatlik pencereyi baz alır. Kripto varlıklar yüksek oynaklığa sahiptir, bu oran gün içinde belirgin şekilde değişebilir.",
    },
  ];
}

export const CRYPTO_HUB_FAQ: FaqItem[] = [
  {
    q: "Piyasa değeri sıralaması neye göre yapılıyor?",
    a: "Piyasa değeri, dolaşımdaki toplam arz ile güncel fiyatın çarpımıdır. Fiyatı yüksek bir kripto paranın piyasa değeri, arzı sınırlıysa daha düşük fiyatlı bir varlığın altında kalabilir; bu nedenle sıralamada tek başına fiyata bakmak yanıltıcıdır.",
  },
  {
    q: "Kripto fiyatları neden borsadan borsaya farklı?",
    a: "Her borsanın kendi emir defteri vardır ve fiyat o defterdeki arz talep dengesiyle oluşur. Likiditesi düşük borsalarda fiyat, büyük borsalardan bir miktar ayrışabilir. Sayfadaki değerler geniş kapsamlı bir piyasa ortalamasını yansıtır.",
  },
  {
    q: "Stabilcoin nedir, neden fiyatı sabit görünür?",
    a: "Stabilcoinler değeri dolar gibi bir varlığa sabitlenmiş kripto paralardır. Bu nedenle dolar cinsinden fiyatları neredeyse değişmez; TL karşılıkları ise dolar/TL kuruna bağlı olarak hareket eder.",
  },
];

/* -------------------------------------------------------------------------- */
/* BORSA                                                                       */
/* -------------------------------------------------------------------------- */

export function bistFaq(name: string, ticker: string, isIndex: boolean): FaqItem[] {
  if (isIndex) {
    return [
      {
        q: "BIST 100 endeksi neyi ölçer?",
        a: "BIST 100, Borsa İstanbul'da işlem gören şirketler arasından piyasa değeri ve işlem hacmi ölçütlerine göre seçilen 100 hissenin ağırlıklı performansını gösterir. Endeksin yükselmesi kapsamdaki şirketlerin toplam piyasa değerinin arttığı anlamına gelir; her hissenin endekse etkisi büyüklüğüyle orantılıdır.",
        },
      {
        q: "Borsa İstanbul kaçta açılıp kaçta kapanıyor?",
        a: "Pay piyasasında işlemler hafta içi sabah açılış seansıyla başlar, gün boyu sürekli işlem şeklinde devam eder ve akşamüstü kapanış seansıyla sona erer. Hafta sonu ve resmî tatillerde piyasa kapalıdır; bu sayfada seans dışında son kapanış değeri gösterilir.",
      },
      {
        q: "Endeks puanı ile hisse fiyatı arasındaki fark nedir?",
        a: "Hisse fiyatı tek bir şirketin payının Türk Lirası cinsinden değeridir. Endeks ise bir sepetin performansını gösteren birimsiz bir puandır; doğrudan satın alınamaz, ancak endeksi izleyen fonlar aracılığıyla yatırıma konu edilebilir.",
      },
    ];
  }
  return [
    {
      q: `${ticker} hissesi hangi borsada işlem görüyor?`,
      a: `${name}, Borsa İstanbul pay piyasasında ${ticker} koduyla işlem görür. Fiyat, seans süresince alıcı ve satıcı emirlerinin eşleşmesiyle oluşur; seans kapandıktan sonra ekranda son kapanış fiyatı kalır.`,
    },
    {
      q: `${ticker} fiyatı seans dışında neden değişmiyor?`,
      a: "Pay piyasası yalnızca seans saatlerinde işlem görür. Seans kapandıktan sonra emirler eşleşmediği için fiyat sabit kalır; gece gelen haberler ertesi günkü açılışta fiyata yansır. Bu nedenle kapanış ile açılış arasında sıçrama görülebilir.",
    },
    {
      q: "Günlük değişim oranı neye göre hesaplanıyor?",
      a: "Güncel fiyatın bir önceki seansın kapanış fiyatına göre farkını yüzde olarak gösterir. Temettü ödemesi ya da sermaye artırımı gibi işlemlerin gerçekleştiği günlerde fiyatta düzeltme yapıldığı için oran, o gün oluşan gerçek getiriyi birebir yansıtmayabilir.",
    },
  ];
}

export const BIST_HUB_FAQ: FaqItem[] = [
  {
    q: "BIST 100 endeksi şu an kaç puan?",
    a: "Sayfanın üst kısmındaki kartta endeksin son değeri ve önceki kapanışa göre değişimi yer alır; veri seans süresince yaklaşık beş dakikada bir tazelenir. Seans dışındaysa son kapanış değeri gösterilir.",
  },
  {
    q: "Hisse fiyatları buradan takip edilirken nelere dikkat edilmeli?",
    a: "Ekrandaki fiyat son işlem fiyatıdır; gerçek alım satımda alış ve satış kotasyonları arasında fark bulunur. Ayrıca düşük işlem hacimli hisselerde tek bir emir fiyatı belirgin şekilde oynatabilir, bu nedenle hacim de fiyat kadar önemlidir.",
  },
  {
    q: "Borsa verisi hafta sonu neden güncellenmiyor?",
    a: "Borsa İstanbul hafta içi seans saatlerinde işlem görür; hafta sonu ve resmî tatillerde piyasa kapalıdır. Bu dönemlerde tabloda cuma kapanış değerleri kalır ve değişim oranı sabitlenir.",
  },
];

/* -------------------------------------------------------------------------- */
/* ARAÇLAR                                                                     */
/* -------------------------------------------------------------------------- */

const ARAC_FAQ: Record<string, FaqItem[]> = {
  "kredi-faiz-hesaplama": [
    {
      q: "Kredi taksiti nasıl hesaplanır?",
      a: "Taksit tutarı anapara, aylık faiz oranı ve vade sayısı kullanılarak eşit taksitli (anüite) yöntemle bulunur. Her taksitin bir kısmı faize, kalanı anaparaya gider; ilk taksitlerde faiz payı yüksektir, vade ilerledikçe anapara payı artar. Bu nedenle krediyi erken kapatmak toplam faiz yükünü azaltır.",
    },
    {
      q: "Bankanın söylediği taksit neden hesaplamadan farklı çıkıyor?",
      a: "Bankalar taksit tutarına kredi tahsis ücreti, sigorta ve vergi kalemlerini ekleyebilir. Ayrıca tüketici kredilerinde faiz üzerinden alınan BSMV ve KKDF gibi yükümlülükler maliyeti artırır. Bu araç saf faiz hesabını gösterir; sözleşmedeki toplam geri ödeme tutarını mutlaka kontrol edin.",
    },
    {
      q: "Yıllık faiz oranı ile aylık faiz oranı arasındaki fark nedir?",
      a: "Türkiye'de kredi faizleri genellikle aylık oran olarak ilan edilir. Aylık oranı on iki ile çarpmak yıllık basit faizi verir ancak bileşik etkiyi göstermez; gerçek yıllık maliyet, faizin faizi de hesaba katıldığı için bu çarpımın üzerinde çıkar.",
    },
  ],
  "mevduat-faiz-hesaplama": [
    {
      q: "Mevduat faizi nasıl hesaplanır?",
      a: "Anapara, yıllık faiz oranı ve vade gün sayısı kullanılarak brüt getiri bulunur; hesaplamada yıl 365 gün kabul edilir. Bulunan brüt tutardan stopaj düşüldükten sonra kalan kısım net getiridir.",
    },
    {
      q: "Stopaj ne kadar kesiliyor?",
      a: "Mevduat faiz gelirinden gelir vergisi stopajı kesilir ve oran vade süresine göre değişir; kısa vadelerde daha yüksek, uzun vadelerde daha düşük uygulanır. Oranlar Cumhurbaşkanı kararıyla dönem dönem güncellendiği için hesaplama öncesinde bankanızdan güncel oranı teyit etmek gerekir.",
    },
    {
      q: "Vade dolmadan parayı çekersem ne olur?",
      a: "Vadeli hesaptan vade bitmeden yapılan çekimde kural olarak faiz işlemez; hesap vadesiz hesap gibi değerlendirilir ve birikmiş faiz hakkı kaybedilir. Bazı bankalar kısmi çekim imkânı sunar ancak bu durumda da faiz kaybı söz konusu olabilir.",
    },
  ],
  "enflasyon-hesaplama": [
    {
      q: "Enflasyon hesaplaması neyi gösterir?",
      a: "Belirli bir tutarın satın alma gücünün zaman içinde nasıl değiştiğini gösterir. Geçmişteki bir tutarın bugünkü karşılığı, aradaki dönemde biriken fiyat artışıyla büyütülerek bulunur; sonuç o paranın bugün aynı sepeti alabilmesi için ne kadar olması gerektiğini ifade eder.",
    },
    {
      q: "TÜFE ile ÜFE arasındaki fark nedir?",
      a: "TÜFE, hanehalkının satın aldığı mal ve hizmetlerin fiyat değişimini ölçer ve günlük hayattaki pahalılığı yansıtır. ÜFE ise üreticilerin yurt içi satış fiyatlarındaki değişimi izler; maliyet tarafındaki baskıyı gösterdiği için tüketici fiyatlarına gecikmeli olarak yansıyabilir.",
    },
    {
      q: "Resmî enflasyon verisi nereden açıklanıyor?",
      a: "Türkiye İstatistik Kurumu her ayın başında bir önceki aya ait TÜFE ve ÜFE verilerini yayımlar. Aylık, yıllık ve on iki aylık ortalama değişim oranları aynı bültende yer alır; hesaplamalarda hangi oranın kullanıldığına dikkat edilmelidir.",
    },
  ],
  "doviz-cevirici": [
    {
      q: "Çevirici hangi kuru kullanıyor?",
      a: "Hesaplama, sayfada gösterilen güncel piyasa referans kuruyla yapılır. Bankalar ve döviz büfeleri kendi alış satış makasını uyguladığı için gişede karşılaşacağınız tutar bu sonuçtan bir miktar farklı olur.",
    },
    {
      q: "Kur çevirimi neden anlık değişiyor?",
      a: "Döviz kurları piyasa saatleri içinde sürekli işlem görür ve arz talep dengesine göre değişir. Sayfadaki veri düzenli aralıklarla tazelendiği için farklı zamanlarda yapılan aynı çevirim farklı sonuç verebilir.",
    },
  ],
  "altin-hesaplama": [
    {
      q: "Altın hesaplaması hangi saflığı esas alıyor?",
      a: "Gram hesabı 24 ayar saf altını esas alır. Çeyrek, yarım ve tam altın gibi ziynet ürünleri 22 ayar olduğu için içerdikleri saf altın miktarı üzerinden değerlenir; bu nedenle gram karşılıkları nominal ağırlıklarından düşüktür.",
    },
    {
      q: "Hesaplanan tutarla kuyumcunun verdiği fiyat neden farklı?",
      a: "Kuyumcu fiyatına işçilik ve kâr marjı eklenir, ayrıca alış ile satış arasında makas bulunur. Bu araç ons altın ve güncel kur üzerinden ham değeri hesaplar; fiziki alım satımda ödenen veya alınan tutar bu değerin üstünde ya da altında olur.",
    },
  ],
};

export function toolFaq(slug: string): FaqItem[] {
  return ARAC_FAQ[slug] ?? [];
}
