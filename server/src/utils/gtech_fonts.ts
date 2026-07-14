import path from "path";
import fs from "fs";

const mm = (millimeters: number): number => millimeters * 2.8346;

export interface GtechFonts {
  regular: string;
  medium: string;
  semiBold: string;
  serif: string;
}

export function resolveGtechFonts(): GtechFonts {
  const interBase = path.join(
    __dirname,
    "../../node_modules/inter-font/ttf"
  );

  const resolve = (filename: string): string | null => {
    const p = path.join(interBase, filename);
    return fs.existsSync(p) ? p : null;
  };

  const regular =
    resolve("Inter-Regular.ttf") ||
    "Helvetica";

  const medium =
    resolve("Inter-Medium.ttf") ||
    resolve("Inter-Regular.ttf") ||
    "Helvetica";

  const semiBold =
    resolve("Inter-SemiBold.ttf") ||
    resolve("Inter-Bold.ttf") ||
    "Helvetica-Bold";

  const serif = "Times-Roman";

  return { regular, medium, semiBold, serif };
}
