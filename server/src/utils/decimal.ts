// src/utils/decimal.ts

/**
 * Accepts "," and "." interchangeably as the decimal separator.
 * Rule: if both appear, the LAST one is the decimal point and the other
 * is treated as a thousands separator and stripped. If only one appears,
 * it is always the decimal point (never assumed to be a thousands
 * separator, since prices/quantities here don't need grouping on input).
 * "." alone (the client's placeholder for "not calculated") returns null.
 */
export function parseFlexibleNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  let str = String(value).trim();
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

/** Same as parseFlexibleNumber but falls back to 0 instead of null. */
export function parseFlexibleNumberOrZero(value: unknown): number {
  return parseFlexibleNumber(value) ?? 0;
}
