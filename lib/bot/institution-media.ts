import type { LicensedMediaAsset } from "./media-types";

/**
 * Soyut ekonomi yazıları (faiz kararı, Fed, ECB, meclis/torba yasa) için
 * Wikimedia Commons'tan ELLE seçilmiş kurum fotoğrafları.
 *
 * NEDEN: Pixabay/Pexels "central bank" sorgusuna alakasız foto döndürüyor;
 * bu konular markalı karta düşüyordu. Commons'ta kurumun kendi binası var,
 * anahtar/üyelik gerekmez. Liste sabit: her dosyanın lisansı ve yazarı
 * 2026-11-17'de Commons API'den (extmetadata) okunup gözle kontrol edildi.
 * PD/CC0 dosyalarda atıf şart değil; CC BY / BY-SA dosyalarda atıf lisans
 * şartı — görselin altındaki kaynak satırı (imageCredit) bunu karşılıyor.
 *
 * Sıra önemli: "ABD Merkez Bankası" de "merkez bankası" içerdiği için
 * Fed ve ECB, TCMB'den önce denenir.
 */

interface CommonsFile {
  file: string;
  url: string;
  author: string;
  license: string;
  width: number;
  height: number;
  caption: string;
}

const PD = "Kamu malı";

export const INSTITUTIONS: Array<{ id: string; pattern: RegExp; files: CommonsFile[] }> = [
  {
    id: "fed",
    pattern: /\bfed\b|fed'|federal reserve|abd merkez bankası|powell|\bfomc\b/i,
    files: [
      { file: "Eccles_Building_(26088200676).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/8/89/Eccles_Building_%2826088200676%29.jpg", author: "Federal Reserve", license: PD, width: 3000, height: 2041, caption: "Fed genel merkezi, Eccles Binası (Washington)" },
      { file: "Ec_05_(26114196145)_(cropped).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Ec_05_%2826114196145%29_%28cropped%29.jpg", author: "Federal Reserve", license: PD, width: 2400, height: 1800, caption: "Fed, Eccles Binası cephesi" },
      { file: "Ec_35_(25841504020).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/0/04/Ec_35_%2825841504020%29.jpg", author: "Federal Reserve", license: PD, width: 3000, height: 2013, caption: "Fed yönetim kurulu toplantı salonu" },
      { file: "Federal_Open_Market_Committee_(FOMC)_in_Washington_DC_April_26-27,_2016.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/0/09/Federal_Open_Market_Committee_%28FOMC%29_in_Washington_DC_April_26-27%2C_2016.jpg", author: "Federal Reserve", license: PD, width: 3000, height: 2000, caption: "Fed Açık Piyasa Komitesi (FOMC) toplantısı" },
      { file: "Eccles_Building_2013.JPG", url: "https://upload.wikimedia.org/wikipedia/commons/7/74/Eccles_Building_2013.JPG", author: "Farragutful", license: "CC BY-SA 3.0", width: 4608, height: 3456, caption: "Fed, Eccles Binası (Washington)" },
    ],
  },
  {
    id: "ecb",
    pattern: /\becb\b|avrupa merkez bankası|\bamb\b|lagarde|euro bölgesi faiz/i,
    files: [
      { file: "Frankfurt_am_Main,_Seat_of_the_European_Central_Bank_(Skytower_(ECB)).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Frankfurt_am_Main%2C_Seat_of_the_European_Central_Bank_%28Skytower_%28ECB%29%29.jpg", author: "Dr. Thomas Liptak", license: "CC BY-SA 4.0", width: 6000, height: 4000, caption: "Avrupa Merkez Bankası genel merkezi (Frankfurt)" },
      { file: "Frankfurt_-_New_headquarters_for_the_European_Central_Bank_(ECB)_(16334894341).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Frankfurt_-_New_headquarters_for_the_European_Central_Bank_%28ECB%29_%2816334894341%29.jpg", author: "Fred Romero", license: "CC BY 2.0", width: 4000, height: 3000, caption: "Avrupa Merkez Bankası binası (Frankfurt)" },
      { file: "FFM_EZB_2019_(3).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/FFM_EZB_2019_%283%29.jpg", author: "Warburg1866", license: "CC BY-SA 4.0", width: 2560, height: 1920, caption: "Avrupa Merkez Bankası kulesi (Frankfurt)" },
    ],
  },
  {
    id: "tcmb",
    pattern: /\btcmb\b|merkez bankası|politika faizi|faiz kararı|faiz indirimi|faiz artırımı|\bppk\b|para politikası/i,
    files: [
      { file: "TC_Merkez_Bankası_arka_cephe.JPG", url: "https://upload.wikimedia.org/wikipedia/commons/f/f5/TC_Merkez_Bankas%C4%B1_arka_cephe.JPG", author: "Vikiçizer", license: "CC BY-SA 3.0", width: 3264, height: 2448, caption: "TCMB genel merkez binası (Ankara)" },
      { file: "Tcmb.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Tcmb.jpg", author: "Flosarca", license: "CC BY-SA 4.0", width: 3000, height: 3000, caption: "TCMB kulesi, İstanbul Finans Merkezi" },
      { file: "Türkiye_Cumhuriyet_Merkez_Bankası_Denizli_Şubesi_03.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/9/93/T%C3%BCrkiye_Cumhuriyet_Merkez_Bankas%C4%B1_Denizli_%C5%9Eubesi_03.jpg", author: "Biologg", license: "CC BY-SA 4.0", width: 5184, height: 3456, caption: "Türkiye Cumhuriyet Merkez Bankası şube binası" },
    ],
  },
  {
    id: "tbmm",
    pattern: /\btbmm\b|meclis|kanun teklifi|yasa teklifi|torba yasa|kanun tasarısı/i,
    files: [
      { file: "TBMM,_August_2022.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/2/2d/TBMM%2C_August_2022.jpg", author: "Yıldız Yazıcıoğlu (VOA)", license: PD, width: 4032, height: 3024, caption: "TBMM Genel Kurul salonu" },
      { file: "TBMM_28._dönem_yemin_töreni.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/a/a2/TBMM_28._d%C3%B6nem_yemin_t%C3%B6reni.jpg", author: "Yıldız Yazıcıoğlu (VOA)", license: PD, width: 1920, height: 1440, caption: "TBMM Genel Kurulu" },
      { file: "TBMM_meclis_binası_1.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/3/3d/TBMM_meclis_binas%C4%B1_1.jpg", author: "Modern primat", license: "CC BY-SA 4.0", width: 4000, height: 3000, caption: "TBMM binası (Ankara)" },
      { file: "TBMM_meclis_binası_3.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/e/e9/TBMM_meclis_binas%C4%B1_3.jpg", author: "Modern primat", license: "CC BY-SA 4.0", width: 4000, height: 3000, caption: "TBMM binası (Ankara)" },
    ],
  },
  {
    id: "borsa-istanbul",
    pattern: /borsa ?istanbul|\bbist\b|\bspk\b|sermaye piyasası|halka arz|finans merkezi/i,
    files: [
      { file: "Istanbul-stock.jpg", url: "https://upload.wikimedia.org/wikipedia/commons/7/78/Istanbul-stock.jpg", author: "Thomas Steiner", license: "CC BY-SA 2.5", width: 3456, height: 2304, caption: "Borsa İstanbul binası (İstinye)" },
      { file: "IFM_Görsel_(cropped).jpg", url: "https://upload.wikimedia.org/wikipedia/commons/c/c0/IFM_G%C3%B6rsel_%28cropped%29.jpg", author: "Acode37", license: "CC0", width: 4437, height: 2943, caption: "İstanbul Finans Merkezi (Ataşehir)" },
    ],
  },
];

export function matchInstitution(text: string) {
  const hay = text.toLocaleLowerCase("tr-TR");
  return INSTITUTIONS.find((inst) => inst.pattern.test(hay)) || null;
}

function toAsset(instId: string, f: CommonsFile, thumb: (url: string) => string): LicensedMediaAsset {
  return {
    provider: "commons",
    assetId: `${instId}:${f.file}`,
    licenseId: f.license.toLocaleLowerCase("en-US").replace(/\s+/g, "-"),
    licenseName: f.license,
    downloadUrl: thumb(f.url),
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${encodeURI(f.file)}`,
    // Lisans adı burada YOK: sayfa (coerceImageCredit) licenseName'i zaten ekliyor.
    attribution: `Fotoğraf: ${f.author} / Wikimedia Commons`,
    caption: f.caption,
    width: f.width,
    height: f.height,
  };
}

/**
 * Konuya uyan kurumun, son 60 günde kullanılmamış ilk fotoğrafını döndürür.
 * Başlangıç noktası başlığa göre deterministik; havuz tükenirse null (kart).
 */
export function pickInstitutionPhoto(
  text: string,
  used: Record<string, number> | undefined,
  seed: number,
  thumb: (url: string) => string,
): LicensedMediaAsset | null {
  const inst = matchInstitution(text);
  if (!inst) return null;
  const n = inst.files.length;
  for (let i = 0; i < n; i++) {
    const f = inst.files[(seed + i) % n];
    const asset = toAsset(inst.id, f, thumb);
    if (!used?.[`${asset.provider}:${asset.assetId}`]) return asset;
  }
  return null;
}
