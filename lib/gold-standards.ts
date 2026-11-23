/** Darphane ziynet standardından piyasa metal değeri hesaplamasında kullanılan sabitler. */
export const TROY_OUNCE_GRAMS = 31.1035;
export const ZIYNET_GOLD_PURITY = 0.9166;
export const ZIYNET_GOLD_NOMINAL_GRAMS = {
  quarter: 1.754,
  half: 3.508,
  full: 7.016,
} as const;

export function ziynetGoldFineGrams(type: keyof typeof ZIYNET_GOLD_NOMINAL_GRAMS): number {
  return ZIYNET_GOLD_NOMINAL_GRAMS[type] * ZIYNET_GOLD_PURITY;
}
