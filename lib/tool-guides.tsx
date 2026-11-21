import type { ReactNode } from "react";

/**
 * Araç sayfalarının hesap makinesinin ALTINDAKİ uzun içeriği.
 *
 * Neden: 2026-11-15 indeks taramasında `/araclar/*` sayfalarının 300–330
 * kelime kaldığı ölçüldü. "Kira artışı hesaplama" gibi sorgularda ilk
 * sayfada çıkan sayfaların hiçbiri 300 kelimeyle sıralamıyor; kullanıcı
 * aracı kullanmadan önce yöntemi, yasal sınırı ve örnek hesabı okuyor.
 * Bu bloklar hem o niyeti karşılıyor hem de sayfaya rakip sayfalarla
 * yarışacak metin derinliği veriyor.
 *
 * ⚠️ Rakam UYDURULMAZ: metinlerdeki tüm oranlar "varsayım" olarak
 * işaretlidir, güncel oran için TÜİK/TCMB/BDDK kaynağına yönlendirilir.
 * Güncel veriye bağlı iddialar buraya yazılmaz — her ay yanlışlanır.
 */

type Block =
  | { h: string; p: string[] }
  | { h: string; p?: string[]; ul: string[] }
  | { h: string; p?: string[]; table: { head: string[]; rows: string[][] } };

const GUIDES: Record<string, Block[]> = {
  "kira-artis-hesaplama": [
    {
      h: "Kira artışında yasal sınır nedir?",
      p: [
        "Türk Borçlar Kanunu'nun 344. maddesi, konut ve çatılı işyeri kiralarında yenilenen kira döneminde yapılacak artışın bir önceki kira yılındaki tüketici fiyat endeksi (TÜFE) on iki aylık ortalamalarına göre değişim oranını geçemeyeceğini söyler. Yani ev sahibi bu oranın üstünde zam isteyemez; taraflar anlaşırsa daha düşük bir oran uygulanabilir.",
        "Sınır, sözleşmede yazan zam maddesinden önce gelir. Sözleşmede \"her yıl TÜFE + 10 puan\" gibi bir hüküm varsa o hüküm yalnızca yasal tavanın altında kaldığı sürece geçerlidir. Beş yılını doldurmuş kira ilişkilerinde ise hâkim, kira bedelini emsal ve hakkaniyet ölçütlerine göre yeniden belirleyebilir.",
      ],
    },
    {
      h: "TÜFE on iki aylık ortalama nasıl okunur?",
      p: [
        "TÜİK her ayın başında iki farklı değişim oranı yayımlar: bir önceki aya göre ve bir önceki yılın aynı ayına göre (yıllık) değişim. Kira artışında kullanılan üçüncü seri, \"on iki aylık ortalamalara göre değişim\"dir. Bu oran tek bir ayın fiyat hareketini değil, son on iki ayın ortalamasını yansıttığı için yıllık TÜFE'den farklı çıkar.",
        "Bu yüzden haberlerde açıklanan yıllık enflasyonu hesap makinesine yazmak yanlış sonuç verir. Doğru oranı TÜİK'in aylık TÜFE bültenindeki \"TÜFE değişim oranları\" tablosundan, on iki aylık ortalamalar satırından alın.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Mevcut aylık kira", "20.000 TL"],
          ["Varsayılan artış oranı", "%35"],
          ["Aylık artış tutarı", "7.000 TL"],
          ["Yeni aylık kira", "27.000 TL"],
          ["Yıllık toplam fark", "84.000 TL"],
        ],
      },
      p: [
        "Aynı hesabı oranı değiştirerek aracın üstündeki alandan tekrar edebilirsiniz. Yıllık toplam fark, kiracının on iki ayda cebinden çıkacak ek tutarı gösterir; kira artışının bütçeye etkisini görmek için asıl bakılması gereken satır budur.",
      ],
    },
    {
      h: "Sık yapılan hatalar",
      ul: [
        "Yıllık TÜFE ile on iki aylık ortalama TÜFE'yi karıştırmak: ikisi farklı seridir ve farklı sonuç verir.",
        "Artışı her ay değil, yalnızca yenilenen kira yılında bir kez uygulamak gerekir; aylık kira artışı yasal olarak mümkün değildir.",
        "İşyeri kiralarında da aynı tavan geçerlidir; \"ticari kira\" diye sınırsız zam yapılamaz.",
        "Kiracı yasal sınırın üzerinde artışı kabul etmek zorunda değildir; fazla ödenen tutar için itiraz ve iade talebi gündeme gelebilir.",
      ],
    },
  ],

  "brut-net-maas-hesaplama": [
    {
      h: "Brütten nete maaş nasıl hesaplanır?",
      p: [
        "Bordroda ilk adım sosyal güvenlik kesintileridir: brüt ücretin %14'ü SGK işçi payı, %1'i işsizlik sigortası primi olarak düşülür. Prim, prime esas kazanç tavanına (2026'da asgari ücretin 9 katı, 297.270 TL) kadar olan kısım üzerinden hesaplanır; tavanın üstündeki ücrette prim sabit kalır.",
        "Kalan tutar gelir vergisi matrahıdır. 2026 ücret tarifesinde (Gelir Vergisi Genel Tebliği Seri No 332) yıllık matrahın 190.000 TL'ye kadarı %15, 400.000 TL'ye kadarı %20, 1.500.000 TL'ye kadarı %27, 5.300.000 TL'ye kadarı %35, üstü %40 oranında vergilenir. Damga vergisi brüt ücretin binde 7,59'udur.",
        "Son adım asgari ücret istisnasıdır: asgari ücrete isabet eden gelir vergisi ve damga vergisi her çalışanın vergisinden düşülür. Bu yüzden asgari ücretli hiç vergi ödemez, daha yüksek ücretlilerin vergisi de asgari ücret kadar kısmın vergisi düşülerek hesaplanır.",
      ],
    },
    {
      h: "Kümülatif matrah ve vergi dilimi",
      p: [
        "Gelir vergisi aylık değil, yıl başından itibaren biriken (kümülatif) matraha göre uygulanır. Matrah bir dilim sınırını geçtiği ay, sınırın üstündeki kısım yeni oranla vergilenir. Brüt maaş değişmese de net maaşın yılın ikinci yarısında düşmesinin nedeni budur.",
        "Asgari ücret istisnası da kümülatif hesaplanır, ancak asgari ücretin yıllık matrahı ilk dilimi aşmadığı için istisna tutarı yıl boyunca aynı kalır. Yüksek ücretlerde dilim atlaması istisnayla telafi edilmez.",
      ],
      ul: [
        "Ocak ayında kümülatif matrah sıfırlanır; net maaş yeniden yükselir.",
        "Yıl içinde işyeri değiştirirseniz yeni işveren önceki kümülatif matrahı devralır.",
        "İkramiye ve prim ödemeleri kümülatif matrahı hızlandırarak dilim atlamasını öne çeker.",
      ],
    },
    {
      h: "İşverene maliyet nasıl hesaplanır?",
      p: [
        "İşveren, brüt ücrete ek olarak %21,75 işveren SGK payı (12 malullük-yaşlılık-ölüm, 7,5 genel sağlık, 2,25 kısa vadeli sigorta kolları) ve %2 işsizlik işveren payı öder. Araçtaki maliyet teşviksiz durum içindir; 5 puanlık (imalat) veya 2 puanlık (diğer sektörler) prim teşviki uygulanan işyerlerinde maliyet daha düşüktür.",
      ],
    },
  ],
  "memur-zammi-hesaplama": [
    {
      h: "Memur zammı nasıl hesaplanır?",
      p: [
        "Memur maaşları her yıl ocak ve temmuzda iki kalemle artar: toplu sözleşmede belirlenen dönem zammı ve enflasyon farkı. 8. Dönem Toplu Sözleşme'de (Kamu Görevlileri Hakem Kurulu kararı, Resmî Gazete 27 Ağustos 2025) oranlar 2026 için ilk altı ay %11, ikinci altı ay %7; 2027 için ilk altı ay %5, ikinci altı ay %4 olarak belirlendi.",
        "Enflasyon farkı, önceki altı ayda gerçekleşen TÜFE'nin o dönem verilen toplu sözleşme zammını aşan kısmıdır. Formül: (1 + altı aylık TÜFE) ÷ (1 + önceki dönem zammı) − 1. Ocak 2027 için önceki dönem zammı %7'dir; Temmuz–Aralık 2026 enflasyonu %7'nin üzerinde kalırsa aradaki fark ocakta maaşa eklenir.",
        "Toplam zam iki oranın çarpımıyla bulunur: (1 + dönem zammı) × (1 + enflasyon farkı) − 1. Bu yüzden toplam oran, iki oranın basit toplamından biraz yüksektir.",
      ],
    },
    {
      h: "Memur emeklisi ile SSK/Bağ-Kur emeklisi farkı",
      p: [
        "Memur emeklileri (4/C) memurlarla aynı oranda zam alır: toplu sözleşme zammı ve enflasyon farkı. SSK ve Bağ-Kur emeklilerinin aylıkları ise yalnızca altı aylık TÜFE kadar artırılır. Enflasyon toplu sözleşme oranının altında kalırsa memur emeklisi daha yüksek, üstünde kalırsa iki grup birbirine yakın zam alır.",
        "Ocak zammının dayanağı Temmuz–Aralık TÜFE'sidir ve Aralık verisi TÜİK tarafından ocağın ilk iş günlerinde açıklanır. Araç, bu pencerenin şimdiye kadar açıklanmış aylarını kullanır; kalan aylar için tahmin yapmaz. Kendi beklediğiniz oranı enflasyon alanına yazarak senaryo görebilirsiniz.",
      ],
    },
  ],

  "emekli-zammi-hesaplama": [
    {
      h: "Emekli maaşı zammı nasıl belirlenir?",
      p: [
        "SSK ve Bağ-Kur emeklilerinin aylıkları, ocak ve temmuz dönemlerinde bir önceki altı aylık TÜFE oranında artırılır. Memur emeklilerinde ise toplu sözleşme zammı ile enflasyon farkı birlikte uygulanır; iki grup aynı dönemde farklı oranlar alabilir.",
        "Açıklanan oranın üzerine hükümetin eklediği refah payı gelebilir. Bu nedenle zam oranı, TÜFE'nin açıklanmasından sonra ayrı bir kararla netleşir. Aracın üstündeki oran alanına hangi oranı yazacağınızı bu yüzden güncel açıklamaya göre seçmelisiniz.",
      ],
    },
    {
      h: "Kök aylık ne demek?",
      p: [
        "Zam, bankaya yatan toplam tutar üzerinden değil, ek ödeme ve ek ödemeye bağlı kesintiler çıkarıldıktan sonraki \"kök aylık\" üzerinden hesaplanır. Bu yüzden hesap makinesine banka hesabınıza yatan tutarı yazmak, küçük ama sürekli bir sapmaya yol açar. Kesin tutar için e-Devlet'teki 4A/4B hizmet dökümündeki kök aylık satırına bakın.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Mevcut aylık (varsayım)", "15.000 TL"],
          ["Zam oranı (varsayım)", "%25"],
          ["Aylık zam tutarı", "3.750 TL"],
          ["Yeni aylık", "18.750 TL"],
          ["Yıllık fark", "45.000 TL"],
        ],
      },
    },
    {
      h: "Hesabı etkileyen kalemler",
      ul: [
        "Altı aylık dönem: ocak zammı temmuz-aralık, temmuz zammı ocak-haziran TÜFE'sine bakar.",
        "Ek ödeme: aylığa eklenen ve zamdan farklı kurallarla hesaplanan kalemdir.",
        "Gelir vergisi ve SGK kesintileri: net aylık, brüt aylıktan bu kesintiler çıktıktan sonra oluşur.",
        "Refah payı: her dönem verilmez; verildiğinde oran, açıklanan zam oranının içine eklenir.",
      ],
    },
  ],

  "kredi-faiz-hesaplama": [
    {
      h: "Aylık taksit nasıl hesaplanır?",
      p: [
        "Eşit taksitli (anüite) kredilerde taksit tutarı şu formülle bulunur: Taksit = Anapara × i / (1 − (1 + i)^−n). Burada i aylık faiz oranının ondalık karşılığı, n taksit sayısıdır. Yıllık %36 faiz, aylık %3 demektir; formülde 0,03 kullanılır.",
        "Vade uzadıkça taksit düşer ama toplam faiz yükselir. Aynı kredide 12 ay ile 36 ay arasındaki farkı görmek için vadeyi değiştirip toplam geri ödeme satırına bakın: taksitin düşmesi kredinin ucuzladığı anlamına gelmez.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Kredi tutarı", "100.000 TL"],
          ["Aylık faiz (varsayım)", "%3"],
          ["Vade", "36 ay"],
          ["Aylık taksit", "4.580,38 TL"],
          ["Toplam geri ödeme", "164.893,66 TL"],
          ["Toplam faiz", "64.893,66 TL"],
        ],
      },
    },
    {
      h: "Taksitin içine girmeyen masraflar",
      ul: [
        "KKDF ve BSMV: ihtiyaç kredilerinde faiz üzerinden alınan vergilerdir; taksit hesabına eklenmediği için gerçek maliyet daha yüksek çıkar.",
        "Dosya masrafı ve tahsis ücreti: bankaya göre değişir, kredi kullanımında peşin tahsil edilir.",
        "Sigorta primleri: krediyle bağlantılı hayat ve konut sigortaları ayrı kalemdir.",
        "Erken ödeme: kalan anaparanın ödenmesi hâlinde bazı bankalar erken ödeme tazminatı uygular; sözleşmedeki maddeye bakın.",
      ],
    },
  ],

  "mevduat-faiz-hesaplama": [
    {
      h: "Brüt faiz, net getiri ve stopaj",
      p: [
        "Vadeli mevduatta banka, anapara üzerinden günlük faiz işletir: Brüt faiz = Anapara × Yıllık oran × Gün / 365. Vade sonunda bu tutardan gelir vergisi stopajı kesilir ve hesaba net getiri geçer. Stopaj oranı vade dilimine göre değişir; bu yüzden hesap makinesinde oranı kendiniz girmeniz istenir. Güncel oranlar için Resmî Gazete'de yayımlanan cumhurbaşkanı kararına bakın.",
        "Faiz günlük işletilse de vade bozulduğunda banka genellikle vadesiz faiz uygular. Vadeyi bozmadan çıkmanın yolu, faizi vade sonunda yenilemek ya da kısmi çekim koşullarını önceden sormaktır.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Anapara", "100.000 TL"],
          ["Yıllık faiz (varsayım)", "%45"],
          ["Vade", "32 gün"],
          ["Brüt faiz", "3.945,21 TL"],
          ["Stopaj (varsayım %10)", "394,52 TL"],
          ["Net getiri", "3.550,68 TL"],
        ],
      },
    },
    {
      h: "Reel getiriyi hesaplamak",
      p: [
        "Nominal faiz tek başına bir şey söylemez. Aynı dönemdeki enflasyon oranı faizden yüksekse mevduat alım gücünü koruyamaz. Reel getiri yaklaşık olarak (nominal oran − enflasyon) / (1 + enflasyon) ile bulunur; pratikte faizden enflasyonu çıkarmak fikir verir ama kesin sonuç için bu formülü kullanın. Net getirinizi enflasyon aracına taşıyarak alım gücü karşılığını görebilirsiniz.",
      ],
    },
  ],

  "bilesik-faiz-hesaplama": [
    {
      h: "Bileşik faiz formülü",
      p: [
        "Bileşik faizde her dönemin getirisi anaparaya eklenir ve sonraki dönemde onun da faizi işler. Tek seferlik yatırımda dönem sonu değer A = P × (1 + r)^t formülüyle bulunur; P başlangıç tutarı, r dönemsel oran, t dönem sayısıdır.",
        "Düzenli ek yatırım varsa hesap iki parçaya ayrılır: başlangıç tutarının bileşik büyümesi ve her ayın kendi süresi kadar büyüyen ek yatırımlar. Bu yüzden erken başlamak, sonradan daha büyük tutarlar yatırmaktan daha etkilidir.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Başlangıç tutarı", "100.000 TL"],
          ["Yıllık getiri (varsayım)", "%40"],
          ["Süre", "5 yıl"],
          ["Dönem sonu değer", "537.824 TL"],
          ["Toplam kazanç", "437.824 TL"],
        ],
      },
    },
    {
      h: "72 kuralı ile hızlı tahmin",
      p: [
        "Paranın kaç yılda ikiye katlanacağını hesaplamak için 72'yi yıllık getiri oranına bölmek yeterlidir. %40 getiride bu süre yaklaşık 1,8 yıl; %20 getiride 3,6 yıldır. Kural, bileşik faizin ne kadar agresif çalıştığını göstermek için iyi bir zihinsel çıpadır — kesin sonuç için hesap makinesini kullanın.",
      ],
    },
    {
      h: "Enflasyonu hesaba katmak",
      p: [
        "Bileşik getiri hesaplanırken oran nominaldir. Aynı dönemde enflasyon da bileşik çalıştığı için reel kazanç, nominal kazançtan belirgin şekilde düşük olur. Örneğin yıllık %40 nominal getiri ve %40 enflasyon, satın alma gücü açısından kabaca sıfır reel getiri demektir. Karşılaştırmalı görmek için net getiriyi enflasyon aracına aktarın.",
      ],
    },
  ],

  "hisse-kar-zarar-hesaplama": [
    {
      h: "Net kâr nasıl hesaplanır?",
      p: [
        "Hisse işleminde kâr, alış ve satış fiyatı farkı ile adedin çarpımından işlem maliyetleri çıkarılarak bulunur. BIST'te alım ve satım ayrı ayrı komisyona tabidir; komisyon üzerinden ayrıca %5 oranında BSMV alınır. Bu yüzden hesap makinesinde komisyon oranınızı girmeniz istenir: aynı fiyat farkı, farklı komisyonda farklı net sonuç verir.",
        "Halka açık hisselerde kazanç üzerinden ayrıca stopaj yoktur (temettü geliri hariç). Yine de işlem maliyetleri ve varsa hesap işletim ücreti toplam getiriyi düşürür.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Adet", "1.000"],
          ["Alış fiyatı", "10,00 TL"],
          ["Satış fiyatı", "12,00 TL"],
          ["Komisyon (varsayım %0,2, iki yön + BSMV)", "46,20 TL"],
          ["Net kâr", "1.953,80 TL"],
          ["Getiri", "%9,77"],
        ],
      },
      p: [
        "Brüt kâr 2.000 TL görünse de komisyon ve BSMV sonrası net kâr 1.953,80 TL'ye iner. Düşük fiyatlı ve sık işlem yapılan senaryolarda bu fark, getirinin önemli bir bölümünü siler.",
      ],
    },
    {
      h: "Endeksle kıyaslamak",
      p: [
        "Bir hissenin getirisi tek başına anlamlı değildir; aynı dönemde BIST 100'ün ne yaptığına bakmak gerekir. Hisse %10 yükselirken endeks %20 yükseldiyse, seçim endeksin gerisinde kalmıştır. Portföy kararlarını bu karşılaştırmaya göre vermek, tek işlemin kârına bakmaktan daha sağlıklıdır.",
      ],
    },
  ],

  "temettu-hesaplama": [
    {
      h: "Net temettü ve stopaj",
      p: [
        "Şirketler kâr payını brüt olarak açıklar; yatırımcının hesabına geçen tutar stopaj kesintisi sonrası net temettüdür. Stopaj oranı, gelirin türüne ve yatırımcının vergi durumuna göre değişebilir; kesin oran için güncel mevzuata ve aracı kurumunuzun bildirimine bakın.",
        "Temettü, hisse fiyatından düşer: dağıtım gününde fiyat teorik olarak temettü kadar geriler. Yani \"temettü aldım, kâr ettim\" demek için hem fiyat hareketini hem de bir sonraki dönem beklentisini birlikte okumak gerekir.",
      ],
    },
    {
      h: "Temettü verimi nasıl yorumlanır?",
      p: [
        "Temettü verimi = hisse başına yıllık brüt temettü / hisse fiyatı. Yüksek verim her zaman iyi değildir: fiyatı sert düşmüş bir hissede verim yapay olarak yükselir. Sürdürülebilirlik için şirketin dağıtım oranına (kârının yüzde kaçını dağıttığı) ve nakit akışına bakmak gerekir.",
      ],
    },
    {
      h: "Örnek hesap",
      table: {
        head: ["Kalem", "Değer"],
        rows: [
          ["Hisse adedi", "2.000"],
          ["Hisse başı brüt temettü (varsayım)", "5,00 TL"],
          ["Brüt temettü", "10.000 TL"],
          ["Stopaj (varsayım %10)", "1.000 TL"],
          ["Net temettü", "9.000 TL"],
          ["Hisse fiyatı 100 TL ise verim", "%5,00"],
        ],
      },
    },
    {
      h: "Temettü ile bedelsiz aynı şey değil",
      p: [
        "Bedelsiz sermaye artırımında yatırımcıya nakit ödeme yapılmaz; hisse adedi artar, fiyat bölünür ve toplam değer değişmez. Temettüde ise nakit çıkışı vardır. Bu iki olay vergi tarafında da farklı işler; hesap yaparken hangi olayın gerçekleştiğini doğrulayın.",
      ],
    },
  ],

  "doviz-cevirici": [
    {
      h: "Kur nedir, hangi kur kullanılır?",
      p: [
        "Döviz piyasasında tek bir kur yoktur: bankalar arası piyasada oluşan serbest kur, TCMB'nin günlük olarak açıkladığı gösterge kurlar ve bankaların kendi alış-satış kurları farklıdır. Bu araç, piyasa verisi sağlayıcılarından gelen serbest kuru kullanır ve yaklaşık on dakikada bir güncellenir.",
        "Bankada işlem yaptığınızda gördüğünüz kur, bankanın makası nedeniyle bu kurdan sapar. Makas, aynı gün içinde bile piyasa oynaklığına göre genişleyebilir.",
      ],
    },
    {
      h: "Alış ve satış kuru arasındaki fark",
      p: [
        "Bankanın döviz alış kuru, sizden dövizi alırken ödediği fiyattır ve serbest kurdan düşüktür; satış kuru ise size döviz satarken uyguladığı fiyattır ve serbest kurdan yüksektir. Bu iki fiyat arasındaki fark, işlemin gizli maliyetidir. 1.000 dolar bozdurup aynı gün geri alırsanız, makas kadar zarar edersiniz.",
        "Hesaplarken hangi yönde işlem yaptığınızı netleştirin: elinizdeki TL ile döviz mi alıyorsunuz, yoksa dövizi TL'ye mi çeviriyorsunuz? Banka uygulamasında iki işlem farklı kurdan yapılır.",
      ],
    },
    {
      h: "Efektif ve döviz türleri",
      ul: [
        "Efektif: banknot olarak fiziki döviz. Kurları genellikle daha geniş makaslıdır.",
        "Döviz: hesapta tutulan kaydi döviz. Havale ve EFT işlemlerinde bu kur kullanılır.",
        "Çapraz kurlar: dolar/TL ve euro/dolar üzerinden euro/TL gibi kurlar türetilir; doğrudan kotasyon olmadığı için küçük farklar oluşabilir.",
      ],
    },
  ],

  "altin-hesaplama": [
    {
      h: "Ons altından gram TL fiyatına",
      p: [
        "Uluslararası piyasada altın ons (31,1035 gram) ve dolar cinsinden fiyatlanır. Gram TL fiyatı şu zincirle bulunur: ons fiyatı × dolar/TL ÷ 31,1035. Çıkan değer 24 ayar (has) altın karşılığıdır; 22 ayar üründe 0,916, 14 ayarda 0,585 katsayısı uygulanır.",
        "Kuyumcu vitrinindeki fiyat bu hesabın üzerine işçilik, fire ve kâr marjı eklenerek oluşur. Bu yüzden hesap makinesinin verdiği değer ile dükkânda gördüğünüz fiyat arasında fark olması normaldir; fark, ürünün türüne ve şehre göre değişir.",
      ],
    },
    {
      h: "Standart ürün ağırlıkları",
      table: {
        head: ["Ürün", "Ağırlık", "Ayar"],
        rows: [
          ["Çeyrek altın", "1,75 gram", "22"],
          ["Yarım altın", "3,50 gram", "22"],
          ["Tam (ziynet) altın", "7,00 gram", "22"],
          ["Cumhuriyet (ata) altını", "7,216 gram", "22"],
          ["Gram altın", "1,00 gram", "24 (has)"],
        ],
      },
      p: [
        "Alım-satım yaparken ürünün gramajını ve ayarını bilmek, verilen fiyatın makul olup olmadığını anlamanın tek yoludur. Aynı gramajdaki iki üründen işçiliği yüksek olanın satış fiyatı yüksek, geri alım fiyatı ise daha düşük olur.",
      ],
    },
  ],

  "enflasyon-hesaplama": [
    {
      h: "Alım gücü nasıl hesaplanır?",
      p: [
        "Enflasyon, paranın satın alma gücünü düşürür. Belirli bir tutarın n yıl sonraki alım gücü, tutar / (1 + enflasyon)^n formülüyle bulunur. Örneğin yıllık %50 enflasyonda 100.000 TL, iki yıl sonra yaklaşık 44.444 TL'lik mal ve hizmet alabilir.",
        "Bu hesap, \"param erimesin\" diye yapılan yatırımların gerçekten işe yarayıp yaramadığını görmenin en dürüst yoludur: nominal getiri her zaman pozitif görünür, alım gücü ise çoğu zaman düşer.",
      ],
    },
    {
      h: "Nominal ve reel getiri",
      p: [
        "Nominal getiri, bankanın ya da yatırımın yazılı olarak vaat ettiği orandır. Reel getiri, bu orandan enflasyonun arındırılmasıyla bulunur ve yaklaşık formülü (1 + nominal) / (1 + enflasyon) − 1'dir. Faiz %40, enflasyon %50 ise reel getiri negatiftir: hesabınız büyür, satın alma gücünüz küçülür.",
      ],
    },
    {
      h: "Hangi enflasyon oranı kullanılmalı?",
      ul: [
        "TÜFE: tüketici sepetine dayanır, hanehalkının hissettiği enflasyona en yakın resmî göstergedir.",
        "Yİ-ÜFE: üretici fiyatlarıdır; maliyet baskısını ve gelecek tüketici fiyatlarını önceden gösterir.",
        "Kişisel enflasyon: harcama sepetiniz TÜFE'den farklıysa (kira, eğitim, sağlık ağırlığı) sizin enflasyonunuz TÜFE'den sapar.",
        "Dönem seçimi: tek bir ayın oranı yerine, hesapladığınız süreyle uyumlu kümülatif değişimi kullanın.",
      ],
    },
  ],
};

export function toolGuide(slug: string): ReactNode {
  const blocks = GUIDES[slug];
  if (!blocks) return null;
  return (
    <section className="section">
      <div className="article-prose">
        {blocks.map((b) => (
          <div key={b.h}>
            <h2>{b.h}</h2>
            {"p" in b && b.p?.map((t, i) => <p key={i}>{t}</p>)}
            {"ul" in b && b.ul && (
              <ul>{b.ul.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
            {"table" in b && b.table && (
              <table>
                <thead>
                  <tr>{b.table.head.map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {b.table.rows.map((r) => (
                    <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
