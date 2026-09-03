import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import * as pdfLib from "pdf-lib";
import {
  registerGtechFonts,
  fontRegular,
  fontMedium,
  fontSemiBold,
} from "./gtechDocumentTemplate";
import { resolveGtechFonts } from "../utils/gtech_fonts";
import { getActiveTemplateFilePath } from "../controllers/system_parameter_controller";

const SVGtoPDF = require("svg-to-pdfkit");

let cachedCustomerSvg: string | null = null;
let cachedTemplatePath: string | null = null;

async function drawCustomerSvgBackground(doc: InstanceType<typeof PDFDocument>): Promise<void> {
  try {
    const activePath = await getActiveTemplateFilePath("customer_doc_template");
    const isSvg = activePath && activePath.toLowerCase().endsWith(".svg");
    if (!isSvg || !fs.existsSync(activePath)) return;

    if (!cachedCustomerSvg || cachedTemplatePath !== activePath) {
      let rawSvg = fs.readFileSync(activePath, "utf8");
      rawSvg = rawSvg
        .replace(/<path[^>]*id="path25"[^>]*\/>/gi, "")
        .replace(/x_Document_Title/gi, "")
        .replace(/Document_Title/gi, "");
      cachedCustomerSvg = rawSvg;
      cachedTemplatePath = activePath;
    }

    if (cachedCustomerSvg) {
      SVGtoPDF(doc, cachedCustomerSvg, 0, 0, {
        width: 595.28,
        height: 841.89,
        preserveAspectRatio: "none",
      });
    }
  } catch (err) {
    console.error("Error drawing SVG background:", err);
  }
}

async function mergePdfTemplate(contentPdfPath: string): Promise<void> {
  try {
    const activePath = await getActiveTemplateFilePath("customer_doc_template");
    const isPdf = activePath && activePath.toLowerCase().endsWith(".pdf");
    if (!isPdf || !fs.existsSync(activePath) || !fs.existsSync(contentPdfPath))
      return;

    const templateBytes = fs.readFileSync(activePath);
    const contentBytes = fs.readFileSync(contentPdfPath);

    const templatePdf = await pdfLib.PDFDocument.load(templateBytes);
    const contentPdf = await pdfLib.PDFDocument.load(contentBytes);

    const mergedPdf = await pdfLib.PDFDocument.create();
    const templatePageCount = templatePdf.getPageCount();
    const contentPageCount = contentPdf.getPageCount();

    for (let i = 0; i < contentPageCount; i++) {
      const templatePageIdx = Math.min(i, templatePageCount - 1);

      const [embeddedTemplate] = await mergedPdf.embedPdf(templateBytes, [
        templatePageIdx,
      ]);
      const [embeddedContent] = await mergedPdf.embedPdf(contentBytes, [i]);

      const contentPage = contentPdf.getPage(i);
      const { width, height } = contentPage.getSize();

      const newPage = mergedPdf.addPage([width, height]);

      newPage.drawPage(embeddedTemplate, {
        x: 0,
        y: 0,
        width,
        height,
      });

      newPage.drawPage(embeddedContent, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(contentPdfPath, mergedBytes);
  } catch (err) {
    console.error("Error in mergePdfTemplate:", err);
  }
}

function cleanPdfText(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/[^\x20-\x7E\xA0-\xFF\u20AC]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(dateVal: any): string {
  if (!dateVal) return "—";
  if (typeof dateVal === "string") {
    const parts = dateVal.trim().split(".");
    if (parts.length === 3 && parts[2].length === 4) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${day}.${month}.${year}`;
    }
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatGermanNum(val: number | string | undefined | null, decimals = 2): string {
  const num = Number(val) || 0;
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatGermanPrice(val: number | string | undefined | null): string {
  const num = Number(val) || 0;
  const rounded3 = Math.round(num * 1000) / 1000;
  const rounded2 = Math.round(num * 100) / 100;
  const has3rdDec = Math.abs(rounded3 - rounded2) > 0.0001;
  const decimals = has3rdDec ? 3 : 2;
  return num.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCountry(code?: string | null): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  if (upper === "DE" || upper === "GERMANY" || upper === "DEUTSCHLAND")
    return "Deutschland";
  if (upper === "AT" || upper === "AUSTRIA" || upper === "ÖSTERREICH")
    return "Österreich";
  if (upper === "CH" || upper === "SWITZERLAND" || upper === "SCHWEIZ")
    return "Schweiz";
  if (upper === "CN" || upper === "CHINA") return "China";
  if (upper === "HK" || upper === "HONG KONG") return "Hong Kong";
  if (upper === "US" || upper === "USA" || upper === "UNITED STATES")
    return "USA";
  return code;
}

export interface PdfLineItem {
  position: number;
  artNr?: string;
  bezeichnung: string;
  remarks?: string;
  vatRate?: number;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  isFreizeile?: boolean;
}

export interface PdfDocumentOptions {
  documentType:
  | "Angebot"
  | "Auftragsbestätigung"
  | "Auftrag"
  | "Rechnung"
  | "Rechnungskorrektur"
  | "RK"
  | "Lieferschein"
  | string;
  documentNumber: string;
  documentTitle?: string;
  kontaktName?: string;
  kontaktEmail?: string;
  customerSnapshot: any;
  customerEntity?: any;
  deliveryAddress?: any;
  metadataItems: [string, string][];
  lineItems: PdfLineItem[];
  showPrices?: boolean;
  shippingMethod?: string;
  shippingCost?: number;
  shippingQuantity?: number;
  shippingTaxRate?: number;
  discountPercentage?: number;
  discountAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRate?: number;
  currency?: string;
  notes?: string;
  deliveryTime?: string | Date;
  deliveryDate?: string | Date;
  isDelivered?: boolean;
  deliveryTerms?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  outputFilePath: string;
  vatBreakdown?: Array<{ rate: number; amount: number }>;
  trackingNumbers?: string | string[];
  taxProfile?: string;
  payments?: Array<{ amount: number; receivedDate?: string | Date; paymentMethod?: string }>;
  rks?: Array<{ amount: number; createdDate?: string | Date; rkNumber?: string }>;
  outstandingAmount?: number;
  invoiceDate?: string | Date;
  kundenreferenz?: string;
}

export async function generateGtechDocumentPdf(
  opts: PdfDocumentOptions,
): Promise<string> {
  const gtechFonts = resolveGtechFonts();
  const showPrices = opts.showPrices !== false;

  const doc = new PDFDocument({
    margin: 0,
    size: "A4",
    bufferPages: true,
  });

  const MM = (v: number) => v * 2.8346;
  const LEFT_X = MM(18);
  const TABLE_END_X = MM(192);
  const CONTENT_WIDTH = MM(174);

  const dirPath = path.dirname(opts.outputFilePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const writeStream = fs.createWriteStream(opts.outputFilePath);
  doc.pipe(writeStream);

  const pdfWritePromise = new Promise<void>((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  registerGtechFonts(doc, gtechFonts);
  const R = fontRegular(gtechFonts);
  const M = fontMedium(gtechFonts);
  const SB = fontSemiBold(gtechFonts);

  await drawCustomerSvgBackground(doc);

  let customer: any = {};
  if (opts.customerSnapshot) {
    try {
      customer =
        typeof opts.customerSnapshot === "string"
          ? JSON.parse(opts.customerSnapshot)
          : opts.customerSnapshot;
    } catch {
      customer = opts.customerSnapshot || {};
    }
  }

  let addrY = MM(53);
  doc.fillColor("#3F4446");

  const legalName = (
    customer.legalName ||
    customer.legal_name ||
    customer.legalCompany ||
    opts.customerEntity?.legalName ||
    ""
  ).trim();
  const companyName = (
    customer.companyName ||
    customer.company_name ||
    opts.customerEntity?.companyName ||
    ""
  ).trim();
  const primaryName = legalName || companyName;
  const mainCityStr = (customer.city || opts.customerEntity?.city || "").trim();
  const mainPostalStr = (
    customer.postalCode ||
    opts.customerEntity?.postalCode ||
    ""
  ).trim();
  const mainStreetStr = (
    customer.street ||
    customer.address ||
    opts.customerEntity?.addressLine1 ||
    ""
  ).trim();
  const mainAddInfo = (
    customer.addressAdditionalLine ||
    customer.addressLine2 ||
    opts.customerEntity?.addressLine2 ||
    ""
  ).trim();

  const formatAddressBlockLines = (
    cName: string,
    addLine: string,
    street: string,
    pCode: string,
    city: string,
    countryVal: any,
  ): string[] => {
    const rawC =
      typeof countryVal === "string"
        ? countryVal.trim()
        : (countryVal?.code || countryVal?.name || "").trim();
    const dispC = formatCountry(rawC);
    const isGer =
      !rawC ||
      ["DE", "GERMANY", "DEUTSCHLAND", "DE - GERMANY"].some((s) =>
        rawC.toUpperCase().includes(s),
      );

    let cleanStreet = (street || "").trim();
    const pStr = (pCode || "").trim();
    const cStr = (city || "").trim();

    if (pStr && cStr && cleanStreet.includes(pStr) && cleanStreet.includes(cStr)) {
      cleanStreet = cleanStreet
        .replace(new RegExp(`,?\\s*${pStr}\\s+${cStr}`, "gi"), "")
        .replace(/,?\s*(Germany|Deutschland|DE)\s*/gi, "")
        .trim()
        .replace(/,\s*$/, "");
    }

    let cityLineVal = `${pStr} ${cStr}`.trim();
    if (!isGer && rawC) {
      const cCode =
        rawC.length <= 3
          ? rawC.toUpperCase()
          : dispC.substring(0, 2).toUpperCase();
      cityLineVal = `${cCode} - ${pStr} ${cStr}`.trim();
    }

    const lines: string[] = [];
    if (cName && cName.trim()) lines.push(cName.trim());

    if (
      addLine &&
      addLine.trim() &&
      addLine.trim() !== "Additional Info" &&
      addLine.trim() !== cName.trim()
    ) {
      lines.push(addLine.trim());
    }

    if (cleanStreet) lines.push(cleanStreet);
    if (cityLineVal) lines.push(cityLineVal);

    return lines;
  };

  const mainAddrLines = formatAddressBlockLines(
    primaryName,
    mainAddInfo,
    mainStreetStr,
    mainPostalStr,
    mainCityStr,
    customer.country,
  );

  const ADDR_X = MM(24.0);
  mainAddrLines.forEach((lineText, idx) => {
    if (idx === 0) {
      doc
        .font(M)
        .fontSize(9.5)
        .text(lineText, ADDR_X, addrY, { width: MM(80) });
      addrY += doc.heightOfString(lineText, { width: MM(80) }) + 3;
      doc.font(R).fontSize(9);
    } else {
      doc.text(lineText, ADDR_X, addrY, { width: MM(80) });
      addrY += doc.heightOfString(lineText, { width: MM(80) }) + 2;
    }
  });

  const customerVatId =
    customer.vatId || customer.vatTaxId || customer.taxNumber || "";
  const rawCMain = (customer.country || "").trim();
  const isGermanyMain =
    !rawCMain ||
    ["DE", "GERMANY", "DEUTSCHLAND"].includes(rawCMain.toUpperCase());

  if (customerVatId && !isGermanyMain) {
    doc.text(`VAT ID: ${customerVatId}`, ADDR_X, addrY, { width: MM(80) });
    addrY += doc.heightOfString(`VAT ID: ${customerVatId}`, { width: MM(80) }) + 2;
  }

  let shipLinesToRender: string[] = [];
  let shipCoreKey = "";
  let isExplicitlySame = false;

  const offerDelivery = opts.deliveryAddress;
  if (offerDelivery) {
    if (typeof offerDelivery === "string") {
      const trimmed = offerDelivery.trim().toLowerCase();
      if (
        !trimmed ||
        trimmed === "same" ||
        trimmed.includes("same as") ||
        trimmed.includes("same delivery") ||
        trimmed.includes("billing") ||
        trimmed.includes("rechnungsadresse") ||
        trimmed.includes("hauptadresse") ||
        trimmed.includes("customer address")
      ) {
        isExplicitlySame = true;
      } else {
        shipLinesToRender = [primaryName, offerDelivery.trim()].filter(Boolean);
        shipCoreKey = offerDelivery.trim().toLowerCase().replace(/[^a-z0-9]/gi, "");
      }
    } else if (typeof offerDelivery === "object") {
      if (
        offerDelivery.sameAsBilling ||
        offerDelivery.isSameAsBilling ||
        offerDelivery.useBilling
      ) {
        isExplicitlySame = true;
      } else {
        const sStreet = (offerDelivery.street || offerDelivery.addressLine1 || "").trim();
        const sPostal = (offerDelivery.postal_code || offerDelivery.postalCode || "").trim();
        const sCity = (offerDelivery.city || "").trim();
        const sCountry = offerDelivery.country || customer.country || "";

        if (sStreet || sCity || sPostal) {
          shipCoreKey = `${sStreet}${sPostal}${sCity}${typeof sCountry === "string" ? sCountry : (sCountry as any)?.code || ""}`
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, "");

          const sAddLine =
            offerDelivery.additionalInfo ||
            offerDelivery.addressAdditionalLine ||
            offerDelivery.addressLine2 ||
            "";
          const sContact =
            offerDelivery.contactName || offerDelivery.name || primaryName;
          shipLinesToRender = formatAddressBlockLines(
            sContact,
            sAddLine,
            sStreet,
            sPostal,
            sCity,
            sCountry,
          );
        }
      }
    }
  }

  const mainCoreKey = `${mainStreetStr}${mainPostalStr}${mainCityStr}${(customer.country || "").trim()}`
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, "");

  const hasRealDifferentAddress =
    !isExplicitlySame &&
    shipLinesToRender.length > 0 &&
    shipCoreKey.length > 5 &&
    mainCoreKey.length > 5 &&
    shipCoreKey !== mainCoreKey;

  if (hasRealDifferentAddress) {
    const shipTextToRender = shipLinesToRender.join("\n").trim();
    addrY += 6;
    doc
      .font(SB)
      .fontSize(8.5)
      .fillColor("#2D3748")
      .text("Lieferadresse:", ADDR_X, addrY, { width: MM(80) });
    addrY += 11;
    doc.font(R).fontSize(8.5).fillColor("#3F4446");
    doc.text(shipTextToRender, ADDR_X, addrY, { width: MM(80) });
    addrY += doc.heightOfString(shipTextToRender, { width: MM(80) }) + 3;
  }

  const isOfferDoc = opts.documentType === "Angebot";
  const valueAlign: "left" | "right" = isOfferDoc ? "left" : "right";

  const bannerW = MM(60);
  const bannerX = TABLE_END_X - bannerW;
  const bannerY = MM(48);
  const bannerH = 16;

  doc.rect(bannerX, bannerY - 4, bannerW, bannerH).fill("#ECEAE6");
  const bannerTextY = bannerY - 1;
  const BANNER_LEFT_PAD = 2;

  let displayDocType = opts.documentType;
  if (displayDocType === "Auftragsbestätigung") displayDocType = "Auftrag" as any;
  if (displayDocType === "RK") displayDocType = "Rechnungskorrektur" as any;

  doc
    .font(SB)
    .fontSize(10)
    .fillColor("#1A202C")
    .text(displayDocType, bannerX + BANNER_LEFT_PAD, bannerTextY, {
      lineBreak: false,
    });

  if (opts.documentNumber) {
    doc
      .font(SB)
      .fontSize(10)
      .fillColor("#1A202C")
      .text(opts.documentNumber, bannerX + BANNER_LEFT_PAD, bannerTextY, {
        align: "right",
        width: bannerW - BANNER_LEFT_PAD * 2 - 2,
        lineBreak: false,
      });
  }

  const titleBoxX = bannerX + BANNER_LEFT_PAD;
  let infoY = bannerY + bannerH + 1.5;
  const LABEL_W = MM(16);
  const VALUE_X = titleBoxX + LABEL_W;
  const VALUE_W = bannerW - BANNER_LEFT_PAD * 2 - LABEL_W;

  doc.fontSize(8.5).fillColor("#3F4446");
  opts.metadataItems.forEach(([label, value]) => {
    if (!label && !value) return;
    let lblStr = String(label || "");
    const isKontakt = lblStr === "Ansprechpartner" || lblStr === "Kontakt";

    if (isKontakt) {
      lblStr = "Kontakt";
      const rawVal = String(value || "").trim();

      let contactEmail = opts.kontaktEmail || "";
      let contactName = opts.kontaktName || "";

      if (!contactEmail && rawVal.includes("@")) {
        contactEmail = rawVal;
      }
      if (!contactName && rawVal && !rawVal.includes("@")) {
        contactName = rawVal;
      }
      if (!contactName && contactEmail) {
        const parts = contactEmail.split("@")[0].split(".");
        contactName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
      }
      if (!contactEmail && contactName) {
        const emailSlug = contactName.toLowerCase().replace(/\s+/g, ".");
        contactEmail = `${emailSlug}@gtech.de`;
      }

      let docType = opts.documentType || "Rechnung";
      if (docType === "Auftragsbestätigung") docType = "Auftrag";
      if (docType === "RK") docType = "Rechnungskorrektur";

      const docNum = opts.documentNumber || "";
      const docTitle = (opts.documentTitle || opts.notes || "").trim();
      const titlePart = docTitle ? ` – ${docTitle}` : "";

      const subject = `Rückfrage ${docType} ${docNum}${titlePart}`;
      const body = `Hallo guten Tag ${contactName},\n\nich habe eine Rückfrage zur ${docType} ${docNum}${titlePart}:\n\n`;

      const mailtoUrl = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const valDisplay = `${contactEmail} \u2197`;

      const hLbl = doc.font(R).fontSize(8.5).heightOfString(lblStr, { width: LABEL_W });
      const hVal = doc.font(M).fontSize(8.5).heightOfString(valDisplay, { width: VALUE_W });
      const rowH = Math.max(11, hLbl, hVal);

      doc.font(R).fontSize(8.5).fillColor("#3F4446").text(lblStr, titleBoxX, infoY, { width: LABEL_W, lineBreak: true });
      doc.font(M).fontSize(8.5).fillColor("#1A202C").text(valDisplay, VALUE_X, infoY, {
        width: VALUE_W,
        align: valueAlign,
        lineBreak: false,
        link: mailtoUrl,
        underline: true,
      });
      infoY += rowH + 2;
      return;
    }

    const valStr =
      lblStr === "Datum" || lblStr === "Lieferdatum" || lblStr === "Date"
        ? formatDate(value)
        : String(value || "");
    const hLbl = doc.font(R).fontSize(8.5).heightOfString(lblStr, { width: LABEL_W });
    const hVal = doc.font(M).fontSize(8.5).heightOfString(valStr, { width: VALUE_W });
    const rowH = Math.max(11, hLbl, hVal);

    doc.font(R).fontSize(8.5).fillColor("#3F4446").text(lblStr, titleBoxX, infoY, { width: LABEL_W, lineBreak: true });
    doc.font(M).fontSize(8.5).fillColor("#1A202C").text(valStr, VALUE_X, infoY, {
      width: VALUE_W,
      align: valueAlign,
      lineBreak: false,
    });
    infoY += rowH + 2;
  });

  const kundenreferenzText = (opts.kundenreferenz || "").trim();
  let yPos = Math.max(addrY + 25, infoY + 25);

  if (kundenreferenzText) {
    doc
      .font(SB)
      .fontSize(10)
      .fillColor("#1A202C")
      .text(kundenreferenzText, LEFT_X, yPos, { lineBreak: false });
    yPos += 18;
  }

  const tableY = yPos;

  const columns = showPrices
    ? [
      { header: "Pos", width: 22, align: "left" },
      { header: "Art.-Nr.", width: 65, align: "left" },
      { header: "Bezeichnung", width: 185, align: "left" },
      { header: "MwSt.", width: 34, align: "center" },
      { header: "Menge", width: 36, align: "right" },
      { header: "Netto-Preis €", width: 73, align: "right" },
      { header: "Netto gesamt €", width: 78, align: "right" },
    ]
    : [
      { header: "Pos", width: 25, align: "left" },
      { header: "Art.-Nr.", width: 85, align: "left" },
      { header: "Bezeichnung", width: 300, align: "left" },
      { header: "Menge", width: 83, align: "right" },
    ];

  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const headerHeight = 24;

  doc.rect(LEFT_X, tableY, tableWidth, headerHeight).fill("#ECEAE6");
  doc.font(SB).fontSize(8.5).fillColor("#1A202C");

  let currentX = LEFT_X;
  columns.forEach((col) => {
    const headerYOffset = col.header.includes("\n") ? 3 : 7;
    doc.text(col.header, currentX + 1, tableY + headerYOffset, {
      width: col.width - 2,
      align: col.align as any,
      lineBreak: false,
    });
    currentX += col.width;
  });

  doc
    .moveTo(LEFT_X, tableY + headerHeight)
    .lineTo(LEFT_X + tableWidth, tableY + headerHeight)
    .lineWidth(0.8)
    .strokeColor("#A0AEC0")
    .stroke();

  let currentY = tableY + headerHeight;

  if (opts.lineItems && opts.lineItems.length > 0) {
    const sortedLineItems = opts.lineItems
      .slice()
      .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    for (let rowIndex = 0; rowIndex < sortedLineItems.length; rowIndex++) {
      const item = sortedLineItems[rowIndex];
      const isFreizeile = item.isFreizeile || (!item.artNr && item.bezeichnung);
      const itemNameStr = cleanPdfText(item.bezeichnung) || (isFreizeile ? "Freizeile" : "Item");
      const artNrStr = cleanPdfText(item.artNr) || "—";
      const rawRemarks = cleanPdfText(item.remarks);
      const hasRemark = !!(rawRemarks && rawRemarks !== "-");

      const bezWidth = columns[2].width - 4;
      const remarkWidth = columns[2].width + (columns[3] ? columns[3].width : 0) - 4;
      const halfRowGap = 3;

      doc.font(R).fontSize(8.5);
      const nameHeight = doc.heightOfString(itemNameStr, { width: bezWidth, lineGap: 2 });
      const remarkHeight = hasRemark
        ? doc.heightOfString(rawRemarks, { width: remarkWidth, lineGap: 2 }) + halfRowGap
        : 0;
      const computedRowHeight = Math.max(22, nameHeight + (hasRemark ? (halfRowGap + remarkHeight) : 0) + 8);

      if (currentY + computedRowHeight > MM(270)) {
        doc
          .moveTo(LEFT_X, currentY)
          .lineTo(LEFT_X + tableWidth, currentY)
          .lineWidth(0.6)
          .strokeColor("#CBD5E0")
          .stroke();

        doc.addPage();
        await drawCustomerSvgBackground(doc);
        doc.rect(0, 0, 595.28, MM(24)).fill("#FFFFFF");

        const newTableY = MM(25);
        doc.rect(LEFT_X, newTableY, tableWidth, headerHeight).fill("#ECEAE6");
        doc.font(SB).fontSize(8.5).fillColor("#1A202C");
        let tempX = LEFT_X;
        columns.forEach((col) => {
          const headerYOffset = col.header.includes("\n") ? 3 : 7;
          doc.text(col.header, tempX + 1, newTableY + headerYOffset, {
            width: col.width - 2,
            align: col.align as any,
            lineBreak: col.header.includes("\n") ? true : false,
          });
          tempX += col.width;
        });
        doc
          .moveTo(LEFT_X, newTableY + headerHeight)
          .lineTo(LEFT_X + tableWidth, newTableY + headerHeight)
          .lineWidth(0.8)
          .strokeColor("#A0AEC0")
          .stroke();

        doc.font(R).fontSize(8.5).fillColor("#3F4446");
        currentY = newTableY + headerHeight;
      }

      if (rowIndex % 2 === 1) {
        doc.rect(LEFT_X, currentY, tableWidth, computedRowHeight).fill("#F8FAFC");
      } else {
        doc.rect(LEFT_X, currentY, tableWidth, computedRowHeight).fill("#FFFFFF");
      }

      const rowData = showPrices
        ? [
          (rowIndex + 1).toString(),
          artNrStr,
          itemNameStr,
          `${formatGermanNum(item.vatRate ?? opts.taxRate ?? 0, 2)}%`,
          String(item.quantity ?? 1),
          formatGermanPrice(item.unitPrice),
          formatGermanNum(item.lineTotal ?? (item.quantity * (item.unitPrice || 0)), 2),
        ]
        : [
          (rowIndex + 1).toString(),
          artNrStr,
          itemNameStr,
          String(item.quantity ?? 1),
        ];

      currentX = LEFT_X;
      rowData.forEach((data, colIndex) => {
        doc.font(R).fontSize(8.5).fillColor("#2D3748");
        const col = columns[colIndex];

        if (colIndex === 2) {
          doc.text(data, currentX + 2, currentY + 5, {
            width: bezWidth,
            align: "left",
            lineBreak: true,
            lineGap: 2,
          });

          if (hasRemark) {
            doc.font(R).fontSize(8).fillColor("#4A5568");
            doc.text(rawRemarks, currentX + 2, currentY + 5 + nameHeight + halfRowGap, {
              width: remarkWidth,
              align: "left",
              lineBreak: true,
              lineGap: 2,
            });
          }
        } else {
          doc.text(data, currentX + 2, currentY + 5, {
            width: col.width - 4,
            align: col.align as any,
            lineBreak: true,
            lineGap: 2,
          });
        }
        currentX += col.width;
      });

      if (rowIndex < opts.lineItems.length - 1) {
        doc
          .moveTo(LEFT_X, currentY + computedRowHeight)
          .lineTo(LEFT_X + tableWidth, currentY + computedRowHeight)
          .lineWidth(0.5)
          .strokeColor("#E2E8F0")
          .stroke();
      }

      currentY += computedRowHeight;
    }
  }

  const shippingMethod = (opts.shippingMethod || "").trim();
  const shippingCostNum = Number(opts.shippingCost || 0);
  const shippingQtyNum = Number(opts.shippingQuantity || 1);
  const shippingLineTotal = shippingCostNum * shippingQtyNum;
  const shippingTaxRateForRow =
    opts.shippingTaxRate !== undefined && opts.shippingTaxRate !== null
      ? Number(opts.shippingTaxRate)
      : opts.taxRate !== undefined && opts.taxRate !== null
        ? Number(opts.taxRate)
        : 0;

  if (shippingMethod) {
    const totalItemCount = opts.lineItems ? opts.lineItems.length : 0;
    const shipRowNum = totalItemCount + 1;
    const shipRowBg = totalItemCount % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

    const shipTextHeight = doc.font(R).fontSize(8.5).heightOfString(shippingMethod, { width: columns[2].width - 4 });
    const shipRowH = Math.max(22, shipTextHeight + 10);

    if (currentY + shipRowH > MM(270)) {
      doc.addPage();
      await drawCustomerSvgBackground(doc);
      doc.rect(0, 0, 595.28, MM(24)).fill("#FFFFFF");
      currentY = MM(25);
    }

    doc.rect(LEFT_X, currentY, tableWidth, shipRowH).fill(shipRowBg);

    if (showPrices) {
      const shipRowData = [
        String(shipRowNum),
        "—",
        shippingMethod,
        `${formatGermanNum(shippingTaxRateForRow, 2)}%`,
        String(shippingQtyNum),
        formatGermanPrice(shippingCostNum),
        formatGermanNum(shippingLineTotal, 2),
      ];
      let shipX = LEFT_X;
      shipRowData.forEach((data, colIndex) => {
        doc.font(R).fontSize(8.5).fillColor("#2D3748");
        const col = columns[colIndex];
        doc.text(data, shipX + 2, currentY + 5, {
          width: col.width - 4,
          align: col.align as any,
          lineBreak: colIndex === 2,
        });
        shipX += col.width;
      });
    } else {
      doc.font(R).fontSize(8.5).fillColor("#2D3748");
      doc.text(String(shipRowNum), LEFT_X + 2, currentY + 6, {
        width: columns[0].width - 4,
        lineBreak: false,
      });
      const bezX = LEFT_X + columns[0].width + columns[1].width;
      doc.text(shippingMethod, bezX + 2, currentY + 6, {
        width: columns[2].width - 4,
        lineBreak: false,
      });
    }

    currentY += shipRowH;
  }

  doc
    .moveTo(LEFT_X, currentY)
    .lineTo(LEFT_X + tableWidth, currentY)
    .lineWidth(0.6)
    .strokeColor("#CBD5E0")
    .stroke();

  yPos = currentY + 12;

  if (showPrices) {
    if (yPos + 80 > MM(272)) {
      doc.addPage();
      await drawCustomerSvgBackground(doc);
      doc.rect(0, 0, 595.28, MM(24)).fill("#FFFFFF");
      yPos = MM(25);
    }

    const TOTALS_RIGHT_PAD = 6;
    const TOTALS_VAL_W = MM(42);
    const TOTALS_VAL_X = TABLE_END_X - TOTALS_VAL_W;
    const TOTALS_LABEL_W = MM(55);
    const TOTALS_LABEL_X = TOTALS_VAL_X - TOTALS_LABEL_W;
    const rawCurrency = opts.currency || "EUR";
    const currency = (rawCurrency.toUpperCase() === "EUR" || rawCurrency === "€") ? "€" : rawCurrency;

    const shippingTotalNet = Number(opts.shippingCost || 0) * (Number(opts.shippingQuantity) || 1);
    const effectiveSubtotal = Number(opts.subtotal || 0) + shippingTotalNet;

    doc.font(R).fontSize(9).fillColor("#3F4446");
    doc.text("Zwischensumme Netto", TOTALS_LABEL_X, yPos);
    doc.text(
      `${formatGermanNum(effectiveSubtotal, 2)} ${currency}`,
      TOTALS_VAL_X - TOTALS_RIGHT_PAD,
      yPos,
      { align: "right", width: TOTALS_VAL_W },
    );

    if (Number(opts.discountAmount || 0) > 0) {
      yPos += 16;
      doc
        .font(R)
        .text(`Rabatt (${opts.discountPercentage || 0}%)`, TOTALS_LABEL_X, yPos);
      doc.font(R).text(
        `-${formatGermanNum(opts.discountAmount, 2)} ${currency}`,
        TOTALS_VAL_X - TOTALS_RIGHT_PAD,
        yPos,
        { align: "right", width: TOTALS_VAL_W },
      );
    }

    let vatEntries: Array<{ rate: number; amount: number }> = [];

    if (opts.vatBreakdown && opts.vatBreakdown.length > 0) {
      vatEntries = opts.vatBreakdown;
    } else {
      const rateOrder: number[] = [];
      const vatMap = new Map<number, number>();
      (opts.lineItems || []).forEach((it) => {
        const rate =
          it.vatRate !== undefined && it.vatRate !== null
            ? Number(it.vatRate)
            : opts.taxRate !== undefined && opts.taxRate !== null
              ? Number(opts.taxRate)
              : 0;
        if (!vatMap.has(rate)) {
          rateOrder.push(rate);
        }
        const lineNet =
          it.lineTotal !== undefined && it.lineTotal !== null
            ? Number(it.lineTotal)
            : (Number(it.quantity ?? 1) * Number(it.unitPrice || 0));
        const vatAmt = lineNet * (rate / 100);
        vatMap.set(rate, (vatMap.get(rate) || 0) + vatAmt);
      });

      if (shippingTotalNet > 0) {
        const shipRate = opts.shippingTaxRate !== undefined && opts.shippingTaxRate !== null ? Number(opts.shippingTaxRate) : opts.taxRate !== undefined && opts.taxRate !== null ? Number(opts.taxRate) : 0;
        if (!vatMap.has(shipRate)) {
          rateOrder.push(shipRate);
        }
        const shipVat = shippingTotalNet * (shipRate / 100);
        vatMap.set(shipRate, (vatMap.get(shipRate) || 0) + shipVat);
      }

      if (vatMap.size > 0) {
        vatEntries = rateOrder.map((rate) => ({
          rate,
          amount: vatMap.get(rate) || 0,
        }));
      }
    }

    const positiveVatEntries = vatEntries.filter(
      (e) => Number(e.amount.toFixed(2)) > 0,
    );
    const entriesToDisplay =
      positiveVatEntries.length > 0
        ? positiveVatEntries
        : vatEntries.length > 0
          ? vatEntries
          : [{ rate: Number(opts.taxRate || 0), amount: 0 }];

    let calcVatTotal = 0;
    for (const entry of entriesToDisplay) {
      calcVatTotal += entry.amount;
      yPos += 16;
      doc
        .font(R)
        .text(
          `MwSt. ${formatGermanNum(entry.rate, 2)}%`,
          TOTALS_LABEL_X,
          yPos,
        );
      doc.font(R).text(
        `${formatGermanNum(entry.amount, 2)} ${currency}`,
        TOTALS_VAL_X - TOTALS_RIGHT_PAD,
        yPos,
        { align: "right", width: TOTALS_VAL_W },
      );
    }

    const finalBrutto = (effectiveSubtotal - Number(opts.discountAmount || 0)) + calcVatTotal;

    yPos += 22;
    const bruttoBoxX = TOTALS_LABEL_X - 6;
    const bruttoBoxW = TABLE_END_X - bruttoBoxX;
    doc.rect(bruttoBoxX, yPos - 4, bruttoBoxW, 20).fill("#ECEAE6");

    doc.font(SB).fontSize(10).fillColor("#1A202C");
    doc.text("Gesamtpreis Brutto", TOTALS_LABEL_X, yPos);
    doc.text(
      `${formatGermanNum(finalBrutto, 2)} ${currency}`,
      TOTALS_VAL_X - TOTALS_RIGHT_PAD,
      yPos,
      { align: "right", width: TOTALS_VAL_W },
    );

    yPos += 22;

    let totalPaidInPdf = 0;
    let totalRkInPdf = 0;

    if (opts.payments && opts.payments.length > 0) {
      doc.font(R).fontSize(8.5).fillColor("#3F4446");
      opts.payments.forEach((p) => {
        const pAmt = Number(p.amount || 0);
        totalPaidInPdf += pAmt;
        const pMethod = p.paymentMethod || "Überweisung";
        const pDate = formatDate(p.receivedDate);
        const pText = `Zahlung (${pMethod}) vom ${pDate}`;

        doc.text(pText, TOTALS_LABEL_X - 60, yPos, { width: TOTALS_LABEL_W + 60 });
        doc.text(
          `${formatGermanNum(pAmt, 2)} ${currency}`,
          TOTALS_VAL_X - TOTALS_RIGHT_PAD,
          yPos,
          { align: "right", width: TOTALS_VAL_W },
        );
        yPos += 14;
      });
    }

    if (opts.rks && opts.rks.length > 0) {
      doc.font(R).fontSize(8.5).fillColor("#3F4446");
      opts.rks.forEach((rk) => {
        const rkAmt = Number(rk.amount || 0);
        totalRkInPdf += rkAmt;
        const rkDate = formatDate(rk.createdDate);
        const rkText = `Rechnungskorrektur vom ${rkDate}`;

        doc.text(rkText, TOTALS_LABEL_X - 60, yPos, { width: TOTALS_LABEL_W + 60 });
        doc.text(
          `-${formatGermanNum(rkAmt, 2)} ${currency}`,
          TOTALS_VAL_X - TOTALS_RIGHT_PAD,
          yPos,
          { align: "right", width: TOTALS_VAL_W },
        );
        yPos += 14;
      });
    }

    const calcOutstanding = opts.outstandingAmount !== undefined
      ? opts.outstandingAmount
      : Math.max(0, finalBrutto - totalPaidInPdf - totalRkInPdf);

    if ((opts.payments && opts.payments.length > 0) || (opts.rks && opts.rks.length > 0) || opts.outstandingAmount !== undefined) {
      yPos += 8;
      const offenerBoxX = TOTALS_LABEL_X - 6;
      const offenerBoxW = TABLE_END_X - offenerBoxX;
      doc.rect(offenerBoxX, yPos - 4, offenerBoxW, 20).fill("#ECEAE6");

      doc.font(SB).fontSize(10).fillColor("#1A202C");
      doc.text("offener Betrag", TOTALS_LABEL_X, yPos);
      doc.text(
        `${formatGermanNum(calcOutstanding, 2)} ${currency}`,
        TOTALS_VAL_X - TOTALS_RIGHT_PAD,
        yPos,
        { align: "right", width: TOTALS_VAL_W },
      );
      yPos += 20;
    }

    const rawTaxProfileKey = String(
      opts.taxProfile ||
      opts.customerSnapshot?.taxProfile ||
      opts.customerSnapshot?.tax_profile ||
      opts.customerSnapshot?.tax_profile_case ||
      opts.customerSnapshot?.taxProfileKey ||
      opts.customerEntity?.defaultTaxProfile?.key ||
      opts.customerEntity?.defaultTaxProfile?.name ||
      opts.customerEntity?.taxProfile?.key ||
      opts.customerEntity?.tax_profile ||
      "",
    ).trim();

    const rawCountry = String(
      opts.customerSnapshot?.country ||
      opts.customerEntity?.country ||
      "",
    ).trim().toUpperCase();

    let isEuIgl = /EU_IGL|EU-IGL|IGL/i.test(rawTaxProfileKey);
    let isThirdCountry = /third_country|thirdcountry|drittland|3rd_country/i.test(rawTaxProfileKey);

    const isGermany = !rawCountry || ["DE", "GERMANY", "DEUTSCHLAND", "DEU"].includes(rawCountry);
    const euCountries = ["AT", "ÖSTERREICH", "AUSTRIA", "BE", "BELGIUM", "BG", "CY", "CZ", "DK", "EE", "FI", "FR", "FRANCE", "GR", "GREECE", "HR", "HU", "IE", "IRELAND", "IT", "ITALY", "LT", "LU", "LV", "MT", "NL", "NETHERLANDS", "PL", "POLAND", "PT", "RO", "SE", "SWEDEN", "SI", "SK"];

    if (!isEuIgl && !isThirdCountry && !isGermany && calcVatTotal === 0) {
      if (euCountries.includes(rawCountry)) {
        isEuIgl = true;
      } else {
        isThirdCountry = true;
      }
    }

    if (isEuIgl || isThirdCountry) {
      const line1 = isEuIgl
        ? "Steuerfreie innergemeinschaftliche Lieferung gemäß"
        : "Steuerfreie Ausfuhrlieferung gemäß";
      const line2 = isEuIgl
        ? "§ 4 Nr. 1 Buchst. b i. V. m. § 6a UStG."
        : "§ 4 Nr. 1 Buchst. a i. V. m. § 6 UStG.";

      doc
        .font(R)
        .fontSize(9)
        .fillColor("#1A202C")
        .text(line1, bruttoBoxX, yPos, {
          align: "right",
          width: bruttoBoxW,
        })
        .text(line2, bruttoBoxX, yPos + 11, {
          align: "right",
          width: bruttoBoxW,
        });

      yPos += 26;
    } else {
      yPos += 8;
    }
  }

  let notesHeight = 15;
  if (opts.paymentMethod || opts.paymentTerms) notesHeight += 15;
  if (opts.deliveryTime) notesHeight += 15;
  if (opts.deliveryTerms) notesHeight += 15;
  if (opts.notes) {
    const rawNotes = String(opts.notes).trim();
    if (rawNotes) {
      doc.font(SB).fontSize(8.5);
      const labelWidth = doc.widthOfString("Hinweise: ");
      doc.font(R).fontSize(8.5);
      notesHeight +=
        doc.heightOfString(rawNotes, {
          width: CONTENT_WIDTH - labelWidth,
          lineGap: 2,
        }) + 10;
    }
  }

  if (yPos + notesHeight > MM(272)) {
    doc.addPage();
    await drawCustomerSvgBackground(doc);
    doc.rect(0, 0, 595.28, MM(24)).fill("#FFFFFF");
    yPos = MM(25);
  }

  doc.font(R).fontSize(9).fillColor("#3F4446");

  let rawPayMethod = (opts.paymentMethod || "").trim();
  let rawPayTerms = (opts.paymentTerms || "").trim();
  if (rawPayTerms.toLowerCase().startsWith("zahlungsziel:")) {
    rawPayTerms = rawPayTerms.replace(/^zahlungsziel:\s*/i, "").trim();
  }

  let combinedPaymentStr = rawPayMethod;
  if (rawPayTerms) {
    let termsSuffix = rawPayTerms;
    if (/^\d+$/.test(termsSuffix)) {
      termsSuffix = `${termsSuffix} Tage`;
    }
    if (combinedPaymentStr) {
      if (!combinedPaymentStr.toLowerCase().includes(termsSuffix.toLowerCase())) {
        combinedPaymentStr = `${combinedPaymentStr}, ${termsSuffix}`;
      }
    } else {
      combinedPaymentStr = termsSuffix;
    }
  }

  if (combinedPaymentStr) {
    doc.text(`Zahlungsart: ${combinedPaymentStr}`, LEFT_X, yPos);
    yPos += 14;
  }

  const isRechnungDoc =
    opts.documentType === "Rechnung" ||
    opts.documentType === "Rechnungskorrektur" ||
    opts.documentType === "RK";
  if (isRechnungDoc) {
    const dayMatch = rawPayTerms.match(/(\d+)/);
    if (dayMatch) {
      const dueDays = parseInt(dayMatch[1], 10);
      const baseDateRaw = opts.invoiceDate || opts.deliveryDate || opts.deliveryTime;
      if (baseDateRaw) {
        let baseDate: Date;
        const rawStr = String(baseDateRaw).trim();
        const germanMatch = rawStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (germanMatch) {
          baseDate = new Date(
            parseInt(germanMatch[3], 10),
            parseInt(germanMatch[2], 10) - 1,
            parseInt(germanMatch[1], 10),
          );
        } else {
          baseDate = new Date(rawStr);
        }
        if (!isNaN(baseDate.getTime())) {
          const dueDate = new Date(baseDate);
          dueDate.setDate(dueDate.getDate() + dueDays);
          doc.text(`Fällig am: ${formatDate(dueDate)}`, LEFT_X, yPos);
          yPos += 14;
        }
      }
    }
  }
  const deliveryInput = opts.deliveryTime || opts.deliveryDate;
  if (deliveryInput) {
    const rawDelivery = String(deliveryInput).trim();
    if (rawDelivery) {
      const isIso = /^\d{4}-\d{2}-\d{2}/.test(rawDelivery);
      const isGermanDate = /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(rawDelivery);
      const parsed = new Date(rawDelivery);
      const isValidDate =
        (isIso || isGermanDate || !isNaN(parsed.getTime())) &&
        /\d{4}/.test(rawDelivery);

      const hasLieferdatumInMetadata = (opts.metadataItems || []).some(([k]) =>
        k.toLowerCase().includes("lieferdatum")
      );

      if (!hasLieferdatumInMetadata || !isValidDate) {
        if (isValidDate) {
          const docType = String(opts.documentType || "");
          const isOffer = docType === "Angebot";
          const isDelivered = opts.isDelivered === true;
          const isAuftrag =
            docType === "Auftrag" || docType === "Auftragsbestätigung";

          const label =
            isOffer || (isAuftrag && !isDelivered)
              ? "Lieferdatum: voraussichtlich"
              : "Lieferdatum:";
          doc.text(`${label} ${formatDate(rawDelivery)}`, LEFT_X, yPos);
        } else {
          doc.text(`Lieferzeit: ${rawDelivery}`, LEFT_X, yPos);
        }
        yPos += 14;
      }
    }
  }
  if (opts.deliveryTerms) {
    doc.text(`Lieferbedingungen: ${opts.deliveryTerms}`, LEFT_X, yPos);
    yPos += 14;
  }
  if (opts.shippingMethod && opts.documentType === "Lieferschein") {
    doc.text(`Versandart: ${opts.shippingMethod}`, LEFT_X, yPos);
    yPos += 14;
  }
  if (opts.trackingNumbers && opts.documentType === "Lieferschein") {
    const trackings = Array.isArray(opts.trackingNumbers)
      ? opts.trackingNumbers
      : [opts.trackingNumbers];
    const validTrackings = trackings.filter(Boolean);
    if (validTrackings.length > 0) {
      doc.text("Tracking(s):", LEFT_X, yPos, { lineBreak: false });
      const labelW = doc.widthOfString("Tracking(s): ");
      validTrackings.forEach((trk, idx) => {
        const curY = yPos + idx * 14;
        doc.text(trk, LEFT_X + labelW, curY);
      });
      yPos += 14 * validTrackings.length;
    }
  }
  if (opts.notes) {
    const rawNotes = String(opts.notes).trim();
    if (rawNotes) {
      yPos += 4;
      doc.font(SB).fontSize(8.5);
      const labelWidth = doc.widthOfString("Hinweise: ");

      doc.font(R).fontSize(8.5);
      const noteTextHeight = doc.heightOfString(rawNotes, {
        width: CONTENT_WIDTH - labelWidth,
        lineGap: 2,
      });

      if (yPos + noteTextHeight + 10 > MM(272)) {
        doc.addPage();
        await drawCustomerSvgBackground(doc);
        doc.rect(0, 0, 595.28, MM(24)).fill("#FFFFFF");
        yPos = MM(25);
      }

      doc
        .font(SB)
        .fontSize(8.5)
        .fillColor("#1A202C")
        .text("Hinweise: ", LEFT_X, yPos, {
          lineBreak: false,
        });

      doc
        .font(R)
        .fontSize(8.5)
        .fillColor("#2D3748")
        .text(rawNotes, LEFT_X + labelWidth, yPos, {
          width: CONTENT_WIDTH - labelWidth,
          lineGap: 2,
        });

      yPos += noteTextHeight + 8;
    }
  }

  const pageRange = doc.bufferedPageRange();
  for (let i = pageRange.start; i < pageRange.start + pageRange.count; i++) {
    doc.switchToPage(i);
    doc.font(R).fontSize(7.5).fillColor("#3F4446");
    doc.text(
      `${i + 1}/${pageRange.count}`,
      LEFT_X,
      MM(282),
      {
        width: CONTENT_WIDTH,
        align: "right",
      }
    );
  }

  doc.end();

  await pdfWritePromise;
  await mergePdfTemplate(opts.outputFilePath);

  return opts.outputFilePath;
}
