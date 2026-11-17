/**
 * 8. Dönem Toplu Sözleşme (Kamu Görevlileri Hakem Kurulu, RG 27.08.2025):
 * 2026/1 %11, 2026/2 %7, 2027/1 %5, 2027/2 %4. Kaynak: ÇSGB duyurusu
 * https://csgb.gov.tr/cgm/haberler/27082025/
 *
 * Enflasyon farkı = (1 + 6 aylık TÜFE) / (1 + önceki dönem toplu sözleşme zammı) − 1 (negatifse 0).
 * Toplam memur zammı = (1 + dönem zammı) × (1 + enflasyon farkı) − 1.
 * Memur emeklisi aynı oranı alır. SSK/Bağ-Kur emeklisi = 6 aylık TÜFE.
 */
export const MEMUR_DONEMLER: Record<string, { base: number; prev: number }> = {
  "Temmuz 2026": { base: 7, prev: 11 },
  "Ocak 2027": { base: 5, prev: 7 },
  "Temmuz 2027": { base: 4, prev: 5 },
};

export function memurZam(tufePct: number, base: number, prev: number) {
  const fark = Math.max(0, ((1 + tufePct / 100) / (1 + prev / 100) - 1) * 100);
  const toplam = ((1 + base / 100) * (1 + fark / 100) - 1) * 100;
  return { fark, toplam };
}
