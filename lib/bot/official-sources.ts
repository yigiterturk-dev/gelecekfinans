/**
 * Rehber şeridinin (Şerit B) kanıt kaynakları.
 *
 * Haber şeridi "iki bağımsız gazete" arar; rehber içerikte bu ölçüt anlamsızdır.
 * "Temettü nedir" sorusunun doğru kanıtı ikinci bir gazete değil, kuralı
 * koyan kurumun kendi sayfasıdır. Bu yüzden Şerit B yalnızca resmî ve birincil
 * kaynaklardan beslenir.
 *
 * `match`: kelime bu kalıplardan birini içeriyorsa kaynak aday olur.
 * `weight`: birden fazla kaynak eşleşirse yüksek ağırlıklı önce denenir.
 */
export interface OfficialSource {
  name: string;
  url: string;
  institution: string;
  match: RegExp;
  weight: number;
}

export const OFFICIAL_SOURCES: OfficialSource[] = [
  // TCMB — para politikası, kur, faiz
  {
    name: "TCMB — Para Politikası Kurulu Kararları",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/",
    institution: "Türkiye Cumhuriyet Merkez Bankası",
    match: /faiz|politika faizi|merkez bankas|para politikas|tcmb/i,
    weight: 95,
  },
  {
    name: "TCMB — Döviz Kurları",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Doviz+Kurlari",
    institution: "Türkiye Cumhuriyet Merkez Bankası",
    match: /kur|döviz|dolar|euro|efektif/i,
    weight: 92,
  },
  {
    name: "TCMB — Enflasyon Raporu",
    url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Yayinlar/Raporlar/Enflasyon+Raporu/",
    institution: "Türkiye Cumhuriyet Merkez Bankası",
    match: /enflasyon|fiyat istikrar|reel getiri/i,
    weight: 90,
  },
  // TÜİK — resmî istatistik
  {
    name: "TÜİK — Tüketici Fiyat Endeksi",
    url: "https://data.tuik.gov.tr/Bulten/Index?p=Tuketici-Fiyat-Endeksi",
    institution: "Türkiye İstatistik Kurumu",
    match: /enflasyon|tüfe|tufe|fiyat endeksi|üfe|ufe/i,
    weight: 94,
  },
  {
    name: "TÜİK — Ulusal Hesaplar",
    url: "https://data.tuik.gov.tr/Kategori/GetKategori?p=ulusal-hesaplar-113",
    institution: "Türkiye İstatistik Kurumu",
    match: /büyüme|gsyh|milli gelir|resesyon|cari açık/i,
    weight: 88,
  },
  // Borsa İstanbul / SPK — sermaye piyasası
  {
    name: "Borsa İstanbul — Pay Piyasası",
    url: "https://borsaistanbul.com/tr/sayfa/151/pay-piyasasi",
    institution: "Borsa İstanbul",
    match: /borsa|bist|hisse|pay piyasas|endeks|seans|emir/i,
    weight: 93,
  },
  {
    name: "Borsa İstanbul — VİOP",
    url: "https://borsaistanbul.com/tr/sayfa/171/vadeli-islem-ve-opsiyon-piyasasi",
    institution: "Borsa İstanbul",
    match: /viop|vadeli işlem|opsiyon|türev/i,
    weight: 90,
  },
  {
    name: "SPK — Yatırımcı Bilgilendirme",
    url: "https://www.spk.gov.tr/kurumsal-iletisim/yatirimci-bilgilendirme",
    institution: "Sermaye Piyasası Kurulu",
    match: /aracı kurum|halka arz|yatırım fonu|temettü|portföy|spk|yatırımcı/i,
    weight: 91,
  },
  // GİB — vergi
  {
    name: "GİB — Menkul Sermaye İratları Rehberi",
    url: "https://www.gib.gov.tr/yayinlarimiz/rehberler",
    institution: "Gelir İdaresi Başkanlığı",
    match: /vergi|stopaj|beyanname|gelir vergisi|kazanç/i,
    weight: 96,
  },
  // BDDK / TMSF — bankacılık ürünleri
  {
    name: "BDDK — Bankacılık Düzenlemeleri",
    url: "https://www.bddk.org.tr/Mevzuat",
    institution: "Bankacılık Düzenleme ve Denetleme Kurumu",
    match: /mevduat|banka|kredi|bddk|hesap/i,
    weight: 85,
  },
  {
    name: "Emeklilik Gözetim Merkezi — BES",
    url: "https://www.egm.org.tr/bilgi-merkezi/bes-hakkinda/",
    institution: "Emeklilik Gözetim Merkezi",
    match: /\bbes\b|bireysel emeklilik|emeklilik/i,
    weight: 92,
  },
  // Hazine — borçlanma araçları
  {
    name: "Hazine ve Maliye Bakanlığı — İç Borçlanma",
    url: "https://www.hmb.gov.tr/kamu-finansmani-istatistikleri",
    institution: "Hazine ve Maliye Bakanlığı",
    match: /hazine bonosu|devlet tahvili|eurobond|borçlanma/i,
    weight: 89,
  },
  // Kripto — MASAK/SPK düzenlemesi
  {
    name: "SPK — Kripto Varlık Hizmet Sağlayıcıları",
    url: "https://www.spk.gov.tr/kurumsal-iletisim/duyurular",
    institution: "Sermaye Piyasası Kurulu",
    match: /kripto|bitcoin|blockchain|stablecoin|cüzdan|kripto borsas/i,
    weight: 88,
  },
  {
    name: "Darphane — Külçe Altın ve Ziynet",
    url: "https://www.darphane.gov.tr/",
    institution: "Darphane ve Damga Matbaası",
    match: /altın|gram altın|çeyrek|ons|külçe|ziynet/i,
    weight: 86,
  },
];

/** Kelimeye uyan resmî kaynakları ağırlığa göre sıralı döndürür. */
export function matchOfficialSources(term: string, limit = 4): OfficialSource[] {
  return OFFICIAL_SOURCES.filter((source) => source.match.test(term))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
