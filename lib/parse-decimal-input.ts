/** Parse a plain decimal input, accepting either a decimal point or comma. */
export function parseDecimalInput(value: unknown): number {
  if (typeof value !== "string") return NaN;
  const normalized = value.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) return NaN;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}
