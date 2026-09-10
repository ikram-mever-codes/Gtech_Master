
export function sanitizeFilename(input: string): string {
  return String(input || "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss")
    .replace(/[^\w\-\.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}