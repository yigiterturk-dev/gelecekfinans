/**
 * Canlı veri sayfalarının soru-cevap içeriği.
 *
 * Neden ayrı dosya: metin sayfa bileşenlerinin içine gömülseydi her varlık
 * için kopyalanır, biri güncellenip diğeri unutulurdu. Burada tek yerde
 * duruyor ve her sayfa kendi varlığına ait olanı çağırıyor.
 *
 * ⚠️ Canlı ve sürekli değişen rakamları (fiyat, kur, oran) FAQ cevaplarına
 * koymayın. İstisna: belirli bir yıla sabitlenmiş hesaplama aracının FAQ'sı,
 * o yılı açıkça yazar ve birincil kaynağa bağlarsa yılın oran/tavanını verebilir.
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
      a: "Darphane standardındaki Cumhuriyet ziynet çeyreği 1,754 gram nominal ağırlıktadır ve 916,6 milyem (22 ayar) saflıktadır. Bu sayfadaki spot metal karşılığı, bu standarda göre hesaplanır; sikke primi ve alış-satış makası içermez.",
    },
    {
      q: "Çeyrek altın mı gram altın mı avantajlı?",
      a: "Çeyrek altında darphane işçiliği fiyata yansır, bu yüzden gram başına maliyeti gram altından yüksektir. Buna karşılık çeyrek hediye ve bozdurma kolaylığı sağlar. Yalnızca değer saklamak amacıyla alım yapılıyorsa gram altın işçilik farkı nedeniyle genelde daha verimlidir.",
    },
  ],
  "cumhuriyet-altini": [
    {
      q: "Cumhuriyet altını kaç gram?",
      a: "Cumhuriyet ziynet birliği (tam ziynet altını) Darphane standardında 7,016 gram nominal ağırlıkta ve 916,6 milyem (22 ayar) saflıktadır. Sikke türündeki birlik Cumhuriyet altını ise 7,216 gramdır; iki türü karıştırmamak gerekir. Bu sayfadaki hesap ziynet standardının spot metal karşılığıdır.",
    },
    {
      q: "Ziynet altın ile Cumhuriyet altını aynı şey mi?",
      a: "Her ikisi de Darphane'nin ürettiği 22 ayar Cumhuriyet altını grubundadır. Ziynet ve sikke türlerinin ağırlık ve çap standartları ayrıdır; alım satımda ürünün türünü ve ağırlığını kontrol edin.",
    },
  ],
  "yarim-altin": [
    {
      q: "Yarım altın kaç gram?",
      a: "Darphane yarım ziynet altını 3,508 gram nominal ağırlıkta ve 916,6 milyem (22 ayar) saflıktadır. Yarım sikke altın ise 3,608 gramdır; bu sayfadaki spot metal karşılığı ziynet standardına göredir.",
    },
    {
      q: "Yarım ziynet ve yarım sikke altın arasındaki fark nedir?",
      a: "İkisi farklı ağırlık standardına sahip Cumhuriyet altınlarıdır. Ziynet yarımlık 3,508 gram, sikke yarımlık 3,608 gramdır. Ürünün grubunu kontrol ederek fiyat karşılaştırması yapın.",
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
    q: "TCMB kuru ile referans kur arasındaki fark nedir?",
    a: "TCMB her iş günü resmî işlemler için gösterge niteliğinde döviz ve efektif alış-satış kurları yayımlar. Bu sayfadaki günlük referans kur ise uluslararası kaynaklardan derlenen orta piyasa değeridir; bankaların anlık alış-satış fiyatı değildir.",
  },
  {
    q: "Referans kur verisi ne zaman güncelleniyor?",
    a: "Sayfadaki değerler günlük referans kurlarıdır; veri sağlayıcı kaynaklarına göre günde bir veya birkaç kez güncellenir. Her kurun yanında referans tarihi gösterilir. Bu değerler gerçek zamanlı işlem fiyatı değildir.",
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
    {
      q: "Dolar alış ve satış kuru ne anlama gelir?",
      a: "Alış kuru, bankanın veya döviz büfesinin sizden dolar alırken uyguladığı fiyattır; satış kuru ise size dolar satarken uyguladığı fiyattır. Satış kuru her zaman alış kurundan yüksektir, aradaki farka makas denir. Bu sayfada günlük referans kur ile TCMB döviz ve efektif alış-satış kurları karşılaştırmalı olarak gösterilir.",
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
  "kira-artis-hesaplama": [
    {
      q: "Kira artış oranı nasıl belirlenir?",
      a: "Yenilenen kira dönemlerinde kira artışı, Türk Borçlar Kanunu m. 344 uyarınca bir önceki kira yılındaki TÜFE 12 aylık ortalama değişim oranını aşamaz. Taraflar bundan daha düşük bir artışta anlaşabilir.",
    },
    {
      q: "TÜFE 12 aylık ortalama oranını nereden bulurum?",
      a: "TÜİK her ay tüketici fiyat endeksi verisini açıklar; 12 aylık ortalama değişim oranı bu duyurularda yer alır. Hesaplayıcıya kira yenileme ayına ait güncel oranı girin.",
    },
    {
      q: "Bu hesaplama hukuki görüş yerine geçer mi?",
      a: "Hayır. Araç yalnızca girdiğiniz oranla aritmetik hesap yapar. Uyuşmazlık durumunda sözleşmenizi ve güncel mevzuatı bir avukata danışarak değerlendirin.",
    },
  ],
  "brut-net-maas-hesaplama": [
    {
      q: "2026 asgari ücret net ne kadar?",
      a: "2026 brüt asgari ücret 33.030,00 TL, net asgari ücret 28.075,50 TL'dir (Asgari Ücret Tespit Komisyonu kararı, Resmî Gazete 26.12.2025). Aradaki fark %14 SGK ve %1 işsizlik primidir; asgari ücretten gelir ve damga vergisi alınmaz.",
    },
    {
      q: "Brüt maaştan hangi kesintiler yapılır?",
      a: "Brütten %14 SGK işçi payı ve %1 işsizlik sigortası primi düşülür, kalan tutar gelir vergisi matrahıdır. Matraha vergi dilimine göre %15-%40 gelir vergisi, brüte binde 7,59 damga vergisi uygulanır; asgari ücrete isabet eden kısım her iki vergiden istisnadır.",
    },
    {
      q: "Net maaş neden yıl içinde düşüyor?",
      a: "Gelir vergisi yıllık kümülatif matraha göre hesaplanır. Matrah 2026'da 190.000 TL'yi aşınca oran %15'ten %20'ye, 400.000 TL'yi aşınca %27'ye çıkar; brüt aynı kalsa da sonraki aylarda net azalır. Ocakta kümülatif matrah sıfırlanır.",
    },
    {
      q: "2027 asgari ücret ne kadar olacak?",
      a: "2027 asgari ücreti henüz açıklanmadı; Asgari Ücret Tespit Komisyonu kararı genellikle aralık ayında Resmî Gazete'de yayımlanır. Karar açıklanınca araç yeni tutar ve 2027 vergi dilimleriyle güncellenir.",
    },
  ],
  "memur-zammi-hesaplama": [
    {
      q: "Ocak 2027 memur zammı ne kadar olacak?",
      a: "Toplu sözleşme zammı %5'tir; buna Temmuz–Aralık 2026 enflasyonunun %7'yi aşan kısmı kadar enflasyon farkı eklenir. Kesin oran, TÜİK'in Aralık 2026 enflasyonunu açıklamasıyla (Ocak 2027'nin ilk iş günleri) netleşir.",
    },
    {
      q: "Enflasyon farkı nasıl hesaplanır?",
      a: "(1 + altı aylık TÜFE) ÷ (1 + önceki dönem toplu sözleşme zammı) − 1. Enflasyon önceki dönem zammının altında kalırsa fark sıfırdır; maaş geri düşmez.",
    },
    {
      q: "Memur emeklisi de aynı zammı alır mı?",
      a: "Evet. 4/C memur emeklileri, memurlarla aynı toplu sözleşme zammı ve enflasyon farkını alır. SSK ve Bağ-Kur emeklileri ise altı aylık TÜFE oranında zam alır.",
    },
  ],
  "emekli-zammi-hesaplama": [
    {
      q: "Emekli zammı nasıl hesaplanır?",
      a: "Yeni aylık, mevcut aylığın zam oranı kadar artırılmasıyla bulunur. Zam oranı açıklanmadan önce tahmini bir oranla senaryo görebilirsiniz.",
    },
    {
      q: "Kesin zam oranını nereden öğrenirim?",
      a: "Enflasyon farkına göre belirlenen oran, TÜİK verisinin açıklanmasının ardından resmî duyurularla kamuoyuna bildirilir. Kesin tutar için SGK ve ilgili kurumların duyurularına bakın.",
    },
    {
      q: "Sonuç net ele geçen tutar mıdır?",
      a: "Araç yalnızca aylığın zam sonrası brüt tutarını gösterir; kesintiler ve olası vergi etkisi hesaba katılmaz.",
    },
  ],
  "temettu-hesaplama": [
    {
      q: "Net temettü nasıl hesaplanır?",
      a: "Brüt temettü, hisse adedi ile hisse başına brüt temettünün çarpımıdır. Net tutar, bu brüt tutardan stopaj düşülerek bulunur.",
    },
    {
      q: "Temettü verimi nedir?",
      a: "Hisse başına brüt temettünün hisse fiyatına oranıdır. Hissenin fiyatı değiştikçe verim de değişir; geçmiş temettü gelecekte tekrarlanacak anlamına gelmez.",
    },
    {
      q: "Stopaj oranı ve vergi durumum için neye bakmalıyım?",
      a: "Araçtaki %15 varsayılan, GVK 94 kapsamındaki genel kâr payı tevkifat oranıdır (9286 sayılı Cumhurbaşkanı Kararı, 22 Aralık 2024). Alıcının mükellefiyetine ve kurumun türüne göre oran veya beyan durumu farklı olabilir; GİB'in güncel kesinti oranlarını ve kendi vergi durumunuzu kontrol edin.",
    },
  ],
  "bes-devlet-katkisi-hesaplama": [
    {
      q: "2026 BES devlet katkısı oranı ve üst sınırı nedir?",
      a: "EGM’nin 2026 bilgisine göre uygun kişisel katkı paylarında oran %20, yıllık katkı payı üst sınırı 396.360 TL ve buna karşılık gelen azami devlet katkısı 79.272 TL’dir. Takip eden yılların tutarları değişebilir.",
    },
    {
      q: "İşverenin ödediği BES katkısı devlet katkısı kazandırır mı?",
      a: "Hayır. EGM açıklamasına göre işveren tarafından ödenen katkı payları devlet katkısı hesabında dikkate alınmaz. Araç yalnızca kişinin kendi ödediği uygun katkı payını kullanır.",
    },
    {
      q: "2026 BES devlet katkısı limiti her sözleşme için ayrı mı?",
      a: "Hayır. EGM yıllık sınırı katılımcı başına tanımlar; gönüllü BES sözleşmelerine katılımcı adına yapılan uygun ödemeleri topluca hesaba katın. İşveren katkıları ve başka hesaptan aktarılan birikimler uygun ödeme sayılmaz.",
    },
    {
      q: "Çocuğumun BES katkılarını kendi devlet katkısı limitime eklemeli miyim?",
      a: "Hayır. Limit katılımcı bazındadır; çocuğunuzun sözleşmesi onun kendi limiti içinde değerlendirilir. EGM’ye göre çocuk adına yapılan katkılar da devlet katkısından yararlanabilir, ancak her katılımcının sözleşmeleri ayrı hesaplanır.",
    },
    {
      q: "BES katkı payını katılımcı yerine başka biri öderse devlet katkısı alınır mı?",
      a: "EGM’ye göre katılımcı adına başka biri ödeme yapabilir; ancak katkıyı ödeyen ile katılımcı arasında iş ilişkisi bulunmamalıdır. Yıllık limit katılımcı bazında uygulanır.",
    },
    {
      q: "Önceki yıldan devreden BES katkı payım nasıl hesaplanır?",
      a: "Yıllık uygun katkı payı sınırını aşan tutar sonraki takvim yıllarına devreder ve ilgili yılın ilk günü şirket hesabına geçmiş ödeme gibi değerlendirilir. Varsa devreden tutarı, o yılki katkılarınızdan ayrı hesaplayıp araca ekleyin.",
    },
    {
      q: "OKS katkı paylarımı BES hesaplamasına eklemeli miyim?",
      a: "Hayır. EGM, gönüllü BES ve Otomatik Katılım Sistemi (OKS) için yıllık devlet katkısı üst limitlerini ayrı tanımlar. Bu araç yalnızca gönüllü BES katkı paylarını hesaplar; OKS ödemelerinizi ayrı değerlendirin.",
    },
    {
      q: "BES devlet katkısı hesabıma ne zaman geçer?",
      a: "EGM’ye göre katkı payı emeklilik şirketi hesabına nakden ulaştıktan sonraki ay devlet katkısı BES hesabınıza yatırılır. Gerçekleşen tutarı emeklilik şirketinizin hesabından veya EGM BES Mobil/e-Devlet hizmetinden kontrol edin.",
    },
    {
      q: "BES devlet katkısının tamamı ne zaman alınabilir?",
      a: "Normal ayrılmada en az üç, altı ve on yıl sistemde kalma için sırasıyla %15, %35 ve %60 hak ediş uygulanır; üç yıldan önce hak ediş oluşmaz. Emeklilik hakkıyla ayrılma, vefat veya maluliyette %100 hak ediş olabilir. Gerçek süre ve tutarı emeklilik şirketiniz ile EGM’den doğrulayın.",
    },
  ],
  "oks-devlet-katkisi-hesaplama": [
    {
      q: "2026 OKS devlet katkısı oranı ve yıllık tavanı nedir?",
      a: "EGM’ye göre 2026’da uygun OKS katkı paylarına %20 oran uygulanır. Kişi başına yıllık katkı payı tavanı 396.360 TL, buna karşılık gelen azami katkı 79.272 TL’dir. OKS ve gönüllü BES için limitler ayrıdır.",
    },
    {
      q: "OKS’de 500 TL ilave devlet katkısını kim alır?",
      a: "İki aylık başlangıç dönemi sonunda sistemde kalan ve bu tutarı daha önce almamış katılımcıya 2026 itibarıyla tek seferlik 500 TL ilave devlet katkısı taahhüt edilir. Tüm OKS sertifikalarını sonlandırıp çıkan kişi yeniden katıldığında bu katkıdan yararlanamaz. Yalnızca cayma hakkını kullanıp daha önce başlangıç katkısı hesaplanmamış olanlar için yeniden katılım istisnası vardır. Tutar yıllık katkı limitine dahil değildir. Uygunluğu emeklilik şirketinizden doğrulayın.",
    },
    {
      q: "OKS devlet katkısı hemen hesabıma yatırılır mı?",
      a: "Hayır. EGM, OKS devlet katkısını hak ediş koşullarına bağlı taahhüt olarak çalışan hesabında gösterir. Sistemde kalış süresi ve ayrılma nedeni, alınabilecek tutarı belirler.",
    },
  ],
  "bilesik-faiz-hesaplama": [
    {
      q: "Bileşik faiz nedir?",
      a: "Bileşik faiz, kazanılan faizin anaparaya eklenip sonraki dönemlerde bu birikmiş tutar üzerinden de faiz işletilmesidir. Süre uzadıkça getiri doğrusal değil üstel büyür; bu yüzden uzun vadede basit faize göre belirgin fark yaratır.",
    },
    {
      q: "Bileşik faiz nasıl hesaplanır?",
      a: "Her dönem sonunda bakiye (1 + dönemlik faiz oranı) ile çarpılır; aylık ek yatırım varsa her ay bakiyeye eklenir. Bu araç yıllık oranı 12'ye bölerek aylık bileşikleme yapar ve aylık ek yatırımı her ayın sonunda ekler.",
    },
    {
      q: "Sonuçlar garanti mi?",
      a: "Hayır. Sonuç, girdiğiniz sabit getiri varsayımına dayanır. Gerçek getiriler dönemden döneme değişir; vergi, komisyon ve enflasyon hesaba katılmaz.",
    },
  ],
  "hisse-kar-zarar-hesaplama": [
    {
      q: "Hisse kâr zarar nasıl hesaplanır?",
      a: "Net sonuç, satıştan elde edilen tutardan alış maliyetinin çıkarılmasıyla bulunur. Komisyon hem alışta hem satışta işlem tutarı üzerinden kesildiği için maliyete ve satış gelirine yansıtılır.",
    },
    {
      q: "Komisyon oranını nereden öğrenirim?",
      a: "Komisyon oranı aracı kurumdan kuruma ve işlem hacmine göre değişir; genellikle binde olarak ifade edilir. Güncel oranı aracı kurumunuzun tarifesinden veya müşteri temsilcinizden öğrenebilirsiniz.",
    },
    {
      q: "Hesapta vergi ve diğer masraflar var mı?",
      a: "Araç, girdiğiniz oranla komisyon üzerinden BSMV'yi hesaplayıp net kâr/zarara dahil eder. Varsayılan BSMV oranı %5'tir; aracı kurumunuzun tarifesine göre güncelleyin. Saklama ve diğer hesap ücretleri dahil değildir.",
    },
  ],
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
      a: "GİB'in 2026 Geçici 67 rehberine göre 9 Temmuz 2025'ten itibaren açılan veya yenilenen TL vadeli hesaplarda genel oran 6 aya kadar %17,5, 1 yıla kadar %15 ve 1 yıldan uzun vadede %10'dur. Eski açılış/yenileme tarihleri, para birimi ve özel hesap türleri farklı oranlara tabi olabilir. Araç 32 günlük örnek vade için %17,5 ile başlar; kendi hesabınızın oranını bankanızdan ve GİB rehberinden doğrulayın.",
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

/* -------------------------------------------------------------------------- */
/* FAİZ                                                                        */
/* -------------------------------------------------------------------------- */

export const FAIZ_FAQ: FaqItem[] = [
  {
    q: "Politika faizi nedir, neden önemlidir?",
    a: "Politika faizi, Merkez Bankası'nın bankalara bir hafta vadeli repo işlemleriyle fon sağladığı orandır. Ekonomideki tüm faizlerin çıpasıdır: kredi, mevduat ve tahvil faizleri bu oranın etrafında şekillenir. Yükselmesi kredinin pahalanması ve talebin soğuması, düşmesi ise tersi anlamına gelir.",
  },
  {
    q: "Faiz kararları ne zaman açıklanıyor?",
    a: "Para Politikası Kurulu yılda sekiz kez toplanır ve toplantı takvimi yıl başında ilan edilir. Karar, toplantı günü öğleden sonra Merkez Bankası'nın internet sitesinde duyurulur; kararla birlikte yayımlanan metin gerekçeyi ve sonraki adıma dair sinyali içerir.",
  },
  {
    q: "Faiz koridoru ne demek?",
    a: "Gecelik borç verme faizi üst bandı, gecelik borçlanma faizi alt bandı oluşturur; politika faizi bu iki oranın arasında yer alır. Koridor, bankalar arası piyasada gecelik faizin hangi aralıkta oluşacağını belirler.",
  },
  {
    q: "Mevduat faizi politika faiziyle aynı mı?",
    a: "Hayır. Politika faizi bankaların Merkez Bankası'ndan fonlanma maliyetidir; mevduat faizi ise bankaların mudiye ödediği orandır ve bankadan bankaya, vadeye ve tutara göre değişir. Politika faizi yön verir ama birebir belirlemez.",
  },
];

/**
 * "1 euro ne kadar / dolar bugün kaç TL" sorguları için güncel kur sorusu: cevap,
 * sayfanın zaten çektiği kurdan üretilir (uydurma rakam yok). Kur yoksa soru
 * hiç basılmaz. FAQPage JSON-LD görünür SSS'den üretildiği için ikisi aynıdır.
 */
export function fxLiveFaq(
  pair: string,
  label: string,
  base: string,
  fx: { rate: number; changePct: number | null; updatedAt: string | null } | null,
  tcmbBanknoteSelling: number | null,
  fmt: { tl: (n: number, d?: number) => string; when: (iso: string | null) => string },
): FaqItem | null {
  if (!fx || !Number.isFinite(fx.rate)) return null;
  const ad = pair === "eur-try" ? "euro (avro)" : label.toLocaleLowerCase("tr-TR");
  const zaman = fmt.when(fx.updatedAt);
  const degisim =
    fx.changePct == null
      ? ""
      : ` Önceki kapanışa göre değişim %${Math.abs(fx.changePct).toFixed(2).replace(".", ",")} ${fx.changePct >= 0 ? "yükseliş" : "düşüş"}.`;
  const tcmb = tcmbBanknoteSelling
    ? ` Merkez Bankası'nın bugünkü efektif satış kuru ₺${fmt.tl(tcmbBanknoteSelling, 4)}.`
    : "";
  return {
    q: `Bugün 1 ${ad} ne kadar, kaç TL?`,
    a: `${zaman ? `${zaman} referans tarihi itibarıyla` : "Son referans verisine göre"} 1 ${base} = ₺${fmt.tl(fx.rate, 4)} (günlük referans kuru).${degisim}${tcmb} Banka ve döviz bürolarında bu kurun üzerine alış-satış makası eklendiği için gişede göreceğiniz fiyat farklı olabilir.`,
  };
}
