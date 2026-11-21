/**
 * Brüt → net maaş (2026, özel sektör, normal işçi, teşviksiz).
 *
 * Kaynaklar:
 * - Gelir vergisi ücret tarifesi: GVGT Seri No 332, RG 31.12.2025 sayı 33124 (5. Mükerrer):
 *   190.000'e kadar %15; 400.000'e kadar %20; 1.500.000'e kadar %27; 5.300.000'e kadar %35; üstü %40.
 * - Asgari ücret: Asgari Ücret Tespit Komisyonu kararı, RG 26.12.2025: brüt 33.030,00 TL, net 28.075,50 TL.
 * - SGK işçi payı %14, işsizlik işçi payı %1; prime esas kazanç tavanı 297.270 TL (asgari ücretin 9 katı).
 * - Damga vergisi binde 7,59 (DVK 1 sayılı tablo IV-1-b).
 * - Asgari ücret istisnası (GVK 23/18, DVK 9 no'lu tablo): asgari ücrete isabet eden gelir ve
 *   damga vergisi alınmaz; istisna, asgari ücretin o ayki kümülatif vergisi kadardır.
 *
 * 2027 asgari ücreti ve tarifesi açıklanınca YIL_2027 eklenir (tahmin YOK).
 */
export interface MaasYili {
  yil: number;
  dilimler: { ust: number; oran: number }[];
  asgariBrut: number;
  sgkTavan: number;
}

export const YIL_2026: MaasYili = {
  yil: 2026,
  dilimler: [
    { ust: 190_000, oran: 0.15 },
    { ust: 400_000, oran: 0.2 },
    { ust: 1_500_000, oran: 0.27 },
    { ust: 5_300_000, oran: 0.35 },
    { ust: Infinity, oran: 0.4 },
  ],
  asgariBrut: 33_030,
  sgkTavan: 297_270,
};

export const SGK_ISCI = 0.14;
export const ISSIZLIK_ISCI = 0.01;
export const DAMGA = 0.00759;
export const SGK_ISVEREN = 0.2175; // 12 MYÖ + 7,5 GSS + 2,25 KVSK (teşviksiz)
export const ISSIZLIK_ISVEREN = 0.02;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** Kümülatif matrah için toplam gelir vergisi. */
export function kumulatifVergi(matrah: number, y: MaasYili = YIL_2026): number {
  let vergi = 0, alt = 0;
  for (const d of y.dilimler) {
    if (matrah <= alt) break;
    vergi += (Math.min(matrah, d.ust) - alt) * d.oran;
    alt = d.ust;
  }
  return vergi;
}

export interface MaasAy {
  ay: number;
  brut: number;
  sgk: number;
  issizlik: number;
  matrah: number;
  kumulatifMatrah: number;
  vergiOrani: number;
  gelirVergisi: number;
  damga: number;
  net: number;
  isverenMaliyet: number;
}

/** Her ay aynı brütle 12 aylık bordro. */
export function brutNetYil(brut: number, y: MaasYili = YIL_2026): MaasAy[] {
  const asgariMatrah = y.asgariBrut * (1 - SGK_ISCI - ISSIZLIK_ISCI);
  let kum = 0, kumAsgari = 0;
  const aylar: MaasAy[] = [];
  for (let ay = 1; ay <= 12; ay++) {
    const prim = Math.min(brut, y.sgkTavan);
    const sgk = r2(prim * SGK_ISCI);
    const issizlik = r2(prim * ISSIZLIK_ISCI);
    const matrah = brut - sgk - issizlik;
    const vergi = kumulatifVergi(kum + matrah, y) - kumulatifVergi(kum, y);
    const istisna = kumulatifVergi(kumAsgari + asgariMatrah, y) - kumulatifVergi(kumAsgari, y);
    const gelirVergisi = r2(Math.max(0, vergi - istisna));
    const damga = r2(Math.max(0, (brut - y.asgariBrut) * DAMGA));
    kum += matrah;
    kumAsgari += asgariMatrah;
    const oran = y.dilimler.find((d) => kum <= d.ust)?.oran ?? 0.4;
    aylar.push({
      ay, brut, sgk, issizlik, matrah: r2(matrah), kumulatifMatrah: r2(kum), vergiOrani: oran,
      gelirVergisi, damga,
      net: r2(brut - sgk - issizlik - gelirVergisi - damga),
      isverenMaliyet: r2(brut + prim * (SGK_ISVEREN + ISSIZLIK_ISVEREN)),
    });
  }
  return aylar;
}

/** Ocak netini veren brüt (ikili arama, kuruş hassasiyeti). */
export function netBrut(net: number, y: MaasYili = YIL_2026): number {
  let lo = net, hi = net * 3;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (brutNetYil(mid, y)[0].net < net) lo = mid; else hi = mid;
  }
  return r2(hi);
}
