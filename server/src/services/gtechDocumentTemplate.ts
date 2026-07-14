/**
 * GTech Document Brand Layer Service
 *
 * Draws the static brand elements on every PDF page:
 *   - GTech Logo (top right)
 *   - Slogan (top left, Source Serif 4 / serif fallback)
 *   - Green header line
 *   - Sender line (small, below header line)
 *   - Footer separator line
 *   - Footer text (3 columns: legal/bank | court/tax | contact)
 *   - Folding marks (left edge at 105mm and 210mm)
 *   - Hole mark (left edge at 148.5mm)
 *
 * All coordinates follow the GTech Customer Document Template Specification.
 * 1mm = 2.8346pt (PDF points)
 */

import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import { GtechFonts } from "../utils/gtech_fonts";

// mm → PDF points
const mm = (v: number) => v * 2.8346;

// GTech brand colours
const COLOR_GREEN = "#2F6B46";
const COLOR_TEXT = "#3F4446";
const COLOR_MARK = "#5E6568";

// GTech company footer information (static)
const FOOTER = {
  left: [
    "GTech Industries GmbH",
    "IBAN DE16 4404 0037 0210 9288 00",
    "BIC COBADEFFXXX",
    "Commerzbank Dortmund",
  ],
  center: [
    "Amtsgericht Dortmund HRB 38470",
    "Geschäftsführer Joschua Grenzheuser",
    "Ust.-ID DE291514916",
    "Steuer-Nr: 316/5733/1295",
  ],
  right: [
    "+49 231 5869 7565",
    "info@gtech.de",
    "www.gtech.de",
  ],
};

/**
 * Register GTech fonts in a PDFDocument.
 * Must be called before any text is drawn.
 */
export function registerGtechFonts(
  doc: InstanceType<typeof PDFDocument>,
  fonts: GtechFonts
): void {
  if (fonts.regular !== "Helvetica") {
    try { doc.registerFont("Inter-Regular", fonts.regular); } catch (_) { }
  }
  if (fonts.medium !== "Helvetica" && fonts.medium !== fonts.regular) {
    try { doc.registerFont("Inter-Medium", fonts.medium); } catch (_) { }
  }
  if (fonts.semiBold !== "Helvetica-Bold" && fonts.semiBold !== fonts.regular) {
    try { doc.registerFont("Inter-SemiBold", fonts.semiBold); } catch (_) { }
  }
}

/**
 * Resolve registered font name with Helvetica fallback
 */
export function fontRegular(fonts: GtechFonts): string {
  return fonts.regular !== "Helvetica" ? "Inter-Regular" : "Helvetica";
}
export function fontMedium(fonts: GtechFonts): string {
  return fonts.medium !== "Helvetica" ? "Inter-Medium" : "Helvetica";
}
export function fontSemiBold(fonts: GtechFonts): string {
  return fonts.semiBold !== "Helvetica-Bold" ? "Inter-SemiBold" : "Helvetica-Bold";
}

/**
 * Draw the complete static GTech brand layer on the current page.
 * Call this at the start of each new page before drawing dynamic content.
 */
export function drawGtechBrandLayer(
  doc: InstanceType<typeof PDFDocument>,
  fonts: GtechFonts
): void {
  const reg = fontRegular(fonts);

  // ── Logo (top right) ─────────────────────────────────────────
  // Spec: x=150mm, y=10mm, w=40mm → x=425pt, y=28pt, w=113pt
  const logoPath = path.join(__dirname, "../../assets/logo.png");
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, mm(150), mm(10), { width: mm(40) });
    } catch (_) { }
  }

  // ── Slogan (top left) ─────────────────────────────────────────
  // Spec: x=18mm, y=16mm, Source Serif 4 Medium 10pt #3F4446
  doc
    .font(fonts.serif)
    .fontSize(10)
    .fillColor(COLOR_TEXT)
    .text(
      "Gemeinsam. Lieferfähigkeit stärken. Zukunft gestalten.",
      mm(18),
      mm(16),
      { width: mm(110), lineBreak: false }
    );

  // ── Green header line ─────────────────────────────────────────
  // Spec: x=18mm, y=32mm, w=174mm, 0.75pt, #2F6B46
  doc
    .moveTo(mm(18), mm(32))
    .lineTo(mm(18) + mm(174), mm(32))
    .lineWidth(0.75)
    .strokeColor(COLOR_GREEN)
    .stroke();

  // ── Sender line (small text below header line) ────────────────
  // Spec: x=25mm, y=45mm, Inter Regular 7pt #3F4446
  doc
    .font(reg)
    .fontSize(7)
    .fillColor(COLOR_TEXT)
    .text(
      "GTech Industries GmbH · Antonio-Segni-Str. 4 · 44263 Dortmund",
      mm(25),
      mm(45),
      { width: mm(90), lineBreak: false }
    );

  // ── Folding marks & hole mark (left edge) ─────────────────────
  // Spec: 5mm lines, 0.4pt stroke, #5E6568
  const markStyle = { strokeColor: COLOR_MARK, lineWidth: 0.4 };

  // Folding mark 1 at 105mm
  doc
    .moveTo(0, mm(105))
    .lineTo(mm(5), mm(105))
    .lineWidth(markStyle.lineWidth)
    .strokeColor(markStyle.strokeColor)
    .stroke();

  // Hole mark at 148.5mm
  doc
    .moveTo(0, mm(148.5))
    .lineTo(mm(5), mm(148.5))
    .lineWidth(markStyle.lineWidth)
    .strokeColor(markStyle.strokeColor)
    .stroke();

  // Folding mark 2 at 210mm
  doc
    .moveTo(0, mm(210))
    .lineTo(mm(5), mm(210))
    .lineWidth(markStyle.lineWidth)
    .strokeColor(markStyle.strokeColor)
    .stroke();
  doc
    .moveTo(mm(18), mm(265))
    .lineTo(mm(18) + mm(174), mm(265))
    .lineWidth(0.75)
    .strokeColor(COLOR_TEXT)
    .stroke();
  doc.fontSize(7.2).font(reg).fillColor(COLOR_TEXT);

  const footerY = mm(268);
  const lineH = 9.5;
  FOOTER.left.forEach((line, i) => {
    if (i === 0) doc.font(fontSemiBold(fonts));
    else doc.font(reg);
    doc.text(line, mm(18), footerY + i * lineH, {
      width: mm(55),
      lineBreak: false,
    });
  });
  doc.font(reg);
  FOOTER.center.forEach((line, i) => {
    doc.text(line, mm(78), footerY + i * lineH, {
      width: mm(60),
      lineBreak: false,
    });
  });
  FOOTER.right.forEach((line, i) => {
    doc.text(line, mm(150), footerY + i * lineH, {
      width: mm(42),
      lineBreak: false,
    });
  });
}