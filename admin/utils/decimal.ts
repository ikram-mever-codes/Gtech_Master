// utils/decimal.ts

/**
 * Accepts "," and "." interchangeably as the decimal separator. If both
 * appear, the last one is the decimal point; if only one appears, it's
 * the decimal point. "." alone is the client's "not calculated" placeholder
 * and returns null, not 0.
 */
export function parseFlexibleNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  let str = value.trim();
  if (str === "" || str === ".") return null;

  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    str =
      lastComma > lastDot
        ? str.replace(/\./g, "").replace(",", ".")
        : str.replace(/,/g, "");
  } else if (lastComma !== -1) {
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export const isPlaceholderInput = (raw: string | null | undefined) =>
  raw === null || raw === undefined || raw.trim() === "" || raw.trim() === ".";

/** "." for null (not calculated), otherwise the formatted number. */
export function formatMatrixPrice(
  price: number | null | undefined,
  decimals = 3,
): string {
  if (price === null || price === undefined) return ".";
  return price.toFixed(decimals);
}
