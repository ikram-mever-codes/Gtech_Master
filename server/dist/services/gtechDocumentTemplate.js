"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGtechFonts = registerGtechFonts;
exports.fontRegular = fontRegular;
exports.fontMedium = fontMedium;
exports.fontSemiBold = fontSemiBold;
exports.drawGtechBrandLayer = drawGtechBrandLayer;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mm = (v) => v * 2.8346;
const COLOR_GREEN = "#2F6B46";
const COLOR_TEXT = "#3F4446";
const COLOR_MARK = "#5E6568";
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
function registerGtechFonts(doc, fonts) {
    if (fonts.regular !== "Helvetica") {
        try {
            doc.registerFont("Inter-Regular", fonts.regular);
        }
        catch (_) { }
    }
    if (fonts.medium !== "Helvetica" && fonts.medium !== fonts.regular) {
        try {
            doc.registerFont("Inter-Medium", fonts.medium);
        }
        catch (_) { }
    }
    if (fonts.semiBold !== "Helvetica-Bold" && fonts.semiBold !== fonts.regular) {
        try {
            doc.registerFont("Inter-SemiBold", fonts.semiBold);
        }
        catch (_) { }
    }
}
function fontRegular(fonts) {
    return fonts.regular !== "Helvetica" ? "Inter-Regular" : "Helvetica";
}
function fontMedium(fonts) {
    return fonts.medium !== "Helvetica" ? "Inter-Medium" : "Helvetica";
}
function fontSemiBold(fonts) {
    return fonts.semiBold !== "Helvetica-Bold" ? "Inter-SemiBold" : "Helvetica-Bold";
}
function drawGtechBrandLayer(doc, fonts) {
    const reg = fontRegular(fonts);
    const logoPath = path_1.default.join(__dirname, "../../assets/logo.png");
    if (fs_1.default.existsSync(logoPath)) {
        try {
            doc.image(logoPath, mm(150), mm(10), { width: mm(40) });
        }
        catch (_) { }
    }
    doc
        .font(fonts.serif)
        .fontSize(10)
        .fillColor(COLOR_TEXT)
        .text("Gemeinsam. Lieferfähigkeit stärken. Zukunft gestalten.", mm(18), mm(16), { width: mm(110), lineBreak: false });
    doc
        .moveTo(mm(18), mm(32))
        .lineTo(mm(18) + mm(174), mm(32))
        .lineWidth(0.75)
        .strokeColor(COLOR_GREEN)
        .stroke();
    doc
        .font(reg)
        .fontSize(7)
        .fillColor(COLOR_TEXT)
        .text("GTech Industries GmbH · Antonio-Segni-Str. 4 · 44263 Dortmund", mm(25), mm(45), { width: mm(90), lineBreak: false });
    const markStyle = { strokeColor: COLOR_MARK, lineWidth: 0.4 };
    doc
        .moveTo(0, mm(105))
        .lineTo(mm(5), mm(105))
        .lineWidth(markStyle.lineWidth)
        .strokeColor(markStyle.strokeColor)
        .stroke();
    doc
        .moveTo(0, mm(148.5))
        .lineTo(mm(5), mm(148.5))
        .lineWidth(markStyle.lineWidth)
        .strokeColor(markStyle.strokeColor)
        .stroke();
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
        if (i === 0)
            doc.font(fontSemiBold(fonts));
        else
            doc.font(reg);
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
