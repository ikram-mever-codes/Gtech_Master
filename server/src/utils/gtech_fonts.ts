
export interface GtechFonts {
  regular: string;
  medium: string;
  semiBold: string;
  serif: string;
}

export function resolveGtechFonts(): GtechFonts {
  // Use PDFKit built-in fonts (Helvetica) — these are NOT embedded in the PDF
  // output and add 0 bytes. Previously Inter-Regular.ttf (~310KB) was being
  // fully embedded in every generated document, inflating file size 5x.
  return {
    regular: "Helvetica",
    medium: "Helvetica",
    semiBold: "Helvetica-Bold",
    serif: "Times-Roman",
  };
}
