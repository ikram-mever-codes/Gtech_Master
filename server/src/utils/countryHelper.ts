import { AppDataSource } from "../config/database";
import { Country } from "../models/country";

let cachedCountries: Country[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function preloadCountries(forceRefresh = false): Promise<Country[]> {
  const now = Date.now();
  if (!forceRefresh && cachedCountries && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedCountries;
  }
  try {
    if (!AppDataSource.isInitialized) {
      return cachedCountries || [];
    }
    const repo = AppDataSource.getRepository(Country);
    cachedCountries = await repo.find({ where: { is_active: true } });
    lastFetchTime = now;
  } catch (err) {
    console.warn("Failed to load countries from DB:", err);
    if (!cachedCountries) cachedCountries = [];
  }
  return cachedCountries;
}

export function invalidateCountryCache(): void {
  cachedCountries = null;
  lastFetchTime = 0;
}

export function findMatchingCountry(
  countryVal?: string | null,
  countryList?: Country[] | null
): Country | null {
  if (!countryVal || typeof countryVal !== "string") return null;
  const trimmed = countryVal.trim();
  if (!trimmed) return null;

  const list = countryList || cachedCountries || [];
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  const byIso = list.find((c) => c.iso2 && c.iso2.toUpperCase() === upper);
  if (byIso) return byIso;

  const byName = list.find(
    (c) =>
      (c.name && c.name.toLowerCase() === lower) ||
      (c.name_de && c.name_de.toLowerCase() === lower)
  );
  if (byName) return byName;

  const byPartial = list.find(
    (c) =>
      (c.name &&
        (lower.includes(c.name.toLowerCase()) ||
          c.name.toLowerCase().includes(lower))) ||
      (c.name_de &&
        (lower.includes(c.name_de.toLowerCase()) ||
          c.name_de.toLowerCase().includes(lower)))
  );
  if (byPartial) return byPartial;

  return null;
}

export function formatCountryName(
  countryVal?: string | null,
  lang: "en" | "de" = "en",
  countryList?: Country[] | null
): string {
  if (!countryVal || typeof countryVal !== "string") return "";
  const trimmed = countryVal.trim();
  if (!trimmed) return "";

  const match = findMatchingCountry(trimmed, countryList);
  if (match) {
    if (lang === "de" && match.name_de) {
      return match.name_de;
    }
    return match.name;
  }

  return trimmed;
}

export function formatCountryCode(
  countryVal?: string | null,
  countryList?: Country[] | null
): string {
  if (!countryVal || typeof countryVal !== "string") return "";
  const trimmed = countryVal.trim();
  if (!trimmed) return "";

  if (trimmed.length === 2) return trimmed.toUpperCase();

  const match = findMatchingCountry(trimmed, countryList);
  if (match && match.iso2) {
    return match.iso2.toUpperCase();
  }

  return trimmed;
}

export function isGermanAddress(
  countryVal?: string | null,
  countryList?: Country[] | null
): boolean {
  if (!countryVal || typeof countryVal !== "string") return true;
  const trimmed = countryVal.trim();
  if (!trimmed) return true;

  const code = formatCountryCode(trimmed, countryList);
  if (code === "DE") return true;

  const lower = trimmed.toLowerCase();
  return (
    lower === "germany" ||
    lower === "deutschland" ||
    lower === "de" ||
    lower.includes("germany") ||
    lower.includes("deutschland")
  );
}
