
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

/** Rounds a number safely to 2 decimal places using half-up rounding. */
export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}