const countryMap: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  de: "DE",
  austria: "AT",
  österreich: "AT",
  oesterreich: "AT",
  at: "AT",
  switzerland: "CH",
  schweiz: "CH",
  ch: "CH",
  france: "FR",
  fr: "FR",
  italy: "IT",
  it: "IT",
  spain: "ES",
  es: "ES",
  netherlands: "NL",
  nederland: "NL",
  nl: "NL",
  belgium: "BE",
  belgique: "BE",
  be: "BE",
  poland: "PL",
  polska: "PL",
  pl: "PL",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
};

export const formatCountryCode = (country?: string | null): string => {
  if (!country) return "";
  const cleaned = country.trim().toLowerCase();

  const code = countryMap[cleaned] || cleaned.toUpperCase().slice(0, 2);

  if (code === "DE") {
    return "";
  }
  return code;
};
