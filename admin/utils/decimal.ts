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

export function formatMatrixPrice(
  price: number | null | undefined,
  decimals = 3,
): string {
  if (price === null || price === undefined) return ".";
  return price.toFixed(decimals);
}

export function formatMax3Decimals(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === "") return "";
  const num = typeof val === "number" ? val : parseFlexibleNumber(val);
  if (num === null || isNaN(num)) return String(val);

  const rounded = Math.round(num * 1000) / 1000;
  const has3rdDecimal = Math.abs(Math.round(rounded * 1000) - Math.round(rounded * 100) * 10) > 0;
  return rounded.toFixed(has3rdDecimal ? 3 : 2);
}

export function formatUnitPriceCurrency(
  amount: number | string | null | undefined,
  currency?: string | null,
  decimals: number = 3,
): string {
  const safeCurrency =
    currency && typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : "EUR";
  const num = typeof amount === "number" ? amount : parseFlexibleNumber(amount) || 0;
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch (e) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  }
}

export function parseAndRoundTo3Decimals(
  value: string | number | null | undefined,
): number | null {
  const parsed = parseFlexibleNumber(value);
  if (parsed === null) return null;
  return Math.round(parsed * 1000) / 1000;
}