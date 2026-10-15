import { getAllCountries, Country } from "@/api/countries";

let cachedCountries: Country[] = [];
let fetchPromise: Promise<Country[]> | null = null;

export const fetchCountries = async (forceRefresh = false): Promise<Country[]> => {
  if (!forceRefresh && cachedCountries.length > 0) return cachedCountries;
  if (!forceRefresh && fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res: any = await getAllCountries();
      if (res && res.success && Array.isArray(res.data)) {
        cachedCountries = res.data;
      }
    } catch (e) {
      console.warn("Failed to fetch countries from API:", e);
    }
    return cachedCountries;
  })();

  return fetchPromise;
};

// Eagerly trigger fetch in browser environment so countries are ready
if (typeof window !== "undefined") {
  fetchCountries();
}

export const getCountryCode = (country?: string): string => {
  if (!country) return "";
  const trimmed = country.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();

  const lower = trimmed.toLowerCase();

  // Check dynamically fetched countries from Settings > Countries
  const found = cachedCountries.find(
    (c) =>
      (c.iso2 && c.iso2.toLowerCase() === lower) ||
      (c.name && c.name.toLowerCase() === lower) ||
      (c.name_de && c.name_de.toLowerCase() === lower)
  );
  if (found && found.iso2) return found.iso2.toUpperCase();

  return trimmed;
};

export const getCountryName = (country?: string): string => {
  if (!country) return "";
  const trimmed = country.trim();

  const lower = trimmed.toLowerCase();

  // Check dynamically fetched countries from Settings > Countries
  const found = cachedCountries.find(
    (c) =>
      (c.iso2 && c.iso2.toLowerCase() === lower) ||
      (c.name && c.name.toLowerCase() === lower) ||
      (c.name_de && c.name_de.toLowerCase() === lower)
  );
  if (found && found.name) return found.name;

  return trimmed;
};

export const isGermanyCountry = (country?: string): boolean => {
  return getCountryCode(country) === "DE";
};
