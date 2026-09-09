import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { Rechnung } from "../models/rechnung";
import { Rechnung_k as RechnungK } from "../models/rechnung_k";
import { Lieferschein } from "../models/lieferscheine";
import { CustomerOrder } from "../models/customer_orders";
import { Offer } from "../models/offer";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { generateGtechDocumentPdf } from "./gtechPdfGenerator";
import { parseFlexibleNumber } from "../utils/decimal";
import {
  buildRechnungPdfOptions,
  buildLieferscheinPdfOptions,
  buildAuftragPdfOptions,
  buildOfferPdfOptions,
  buildRechnungKPdfOptions,
} from "./pdfOptionsBuilder";

interface ContactInfo {
  name: string;
  email: string;
}

export async function generateRechnungLieferscheinEml(
  rechnungId: number | string,
  options?: {
    user?: {
      name?: string;
      username?: string;
      email?: string;
    };
  },
): Promise<{
  emlFilePath: string;
  filename: string;
  rechnungNo: string;
  lieferscheinNo: string;
  contactPersons: ContactInfo[];
}> {
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const rechnung = await rechnungRepo.findOne({
    where: [{ id: String(rechnungId) }, { invoice_number: String(rechnungId) }] as any,
    relations: ["items", "customer"],
  });

  if (!rechnung) {
    throw new Error(`Rechnung with ID ${rechnungId} not found`);
  }

  const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
  let lieferschein: Lieferschein | null = null;
  try {
    lieferschein = await lieferscheinRepo.findOne({
      where: { rechnung_id: rechnung.id } as any,
    });
    if (!lieferschein && rechnung.auftrag_id) {
      lieferschein = await lieferscheinRepo.findOne({
        where: { auftrag_id: rechnung.auftrag_id } as any,
      });
    }
  } catch (err) {
    console.warn("Could not load Lieferschein for EML:", err);
  }

  let auftragTitle = rechnung.title || rechnung.notes || rechnung.auftrag_no || `Rechnung ${rechnung.invoice_number || rechnung.id}`;
  let customerId: any = undefined;

  if (rechnung.auftrag_id) {
    try {
      const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
      const auftrag = await customerOrderRepo.findOne({
        where: { id: rechnung.auftrag_id } as any,
      });
      if (auftrag) {
        if (auftrag.title) auftragTitle = auftrag.title;
        if (auftrag.customer_id) customerId = auftrag.customer_id;
      }
    } catch (err) {
      console.warn("Could not load Auftrag for EML:", err);
    }
  }

  if (!customerId && rechnung.customer?.original_customer_id) {
    customerId = rechnung.customer.original_customer_id;
  }
  const contactPersons: ContactInfo[] = [];
  if (customerId) {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId } as any,
        relations: ["starBusinessDetails"],
      });

      if (customer?.starBusinessDetails?.id) {
        const contactPersonRepo = AppDataSource.getRepository(ContactPerson);
        const contacts = await contactPersonRepo.find({
          where: { starBusinessDetailsId: customer.starBusinessDetails.id } as any,
        });

        contacts.forEach((c) => {
          const fullName = [c.name, c.familyName].filter(Boolean).join(" ");
          if (c.email) {
            contactPersons.push({
              name: fullName || "Contact Person",
              email: c.email.trim(),
            });
          }
        });
      }

      if (contactPersons.length === 0 && customer?.email) {
        contactPersons.push({
          name: customer.companyName || customer.legalName || "Customer",
          email: customer.email.trim(),
        });
      }
    } catch (custErr) {
      console.warn("Could not load Customer ContactPersons for EML:", custErr);
    }
  }

  if (contactPersons.length === 0 && rechnung.customer?.email) {
    contactPersons.push({
      name: rechnung.customer.company_name || "Customer",
      email: rechnung.customer.email.trim(),
    });
  }

  if (contactPersons.length === 0) {
    throw new Error("No contact person email address set — EML file cannot be generated.");
  }

  const uploadsDir = path.join(__dirname, "../../uploads/eml");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const rechnungenDir = path.join(__dirname, "../../uploads/rechnungen");
  if (!fs.existsSync(rechnungenDir)) {
    fs.mkdirSync(rechnungenDir, { recursive: true });
  }

  const lieferscheineDir = path.join(__dirname, "../../uploads/lieferscheine");
  if (!fs.existsSync(lieferscheineDir)) {
    fs.mkdirSync(lieferscheineDir, { recursive: true });
  }

  const customerSnap = rechnung.customerSnapshot || rechnung.customer || {};
  const customerCompName = String(
    customerSnap.company_name || customerSnap.companyName || customerSnap.legalName || ""
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const rechnungPdfPath = path.join(
    rechnungenDir,
    `rechnung_${rechnung.invoice_number || rechnung.id}.pdf`
  );

  const { options: rechnungPdfOpts } = await buildRechnungPdfOptions(rechnung, {
    user: options?.user,
    outputFilePath: rechnungPdfPath,
  });

  await generateGtechDocumentPdf(rechnungPdfOpts);

  const { options: lieferscheinPdfOpts, lieferscheinNo } = await buildLieferscheinPdfOptions(
    rechnung,
    lieferschein,
    {
      user: options?.user,
      outputFilePath: undefined,
    }
  );

  const lieferscheinPdfPath = path.join(lieferscheineDir, `lieferschein_${lieferscheinNo}.pdf`);
  lieferscheinPdfOpts.outputFilePath = lieferscheinPdfPath;
  await generateGtechDocumentPdf(lieferscheinPdfOpts);

  const rechnungPdfBuffer = fs.readFileSync(rechnungPdfPath);
  const lieferscheinPdfBuffer = fs.readFileSync(lieferscheinPdfPath);

  const rechnungBase64 = rechnungPdfBuffer.toString("base64");
  const lieferscheinBase64 = lieferscheinPdfBuffer.toString("base64");

  const primaryEmail = contactPersons[0]?.email || rechnung.customer?.email || "";

  let contactGreetingName = "";
  if (
    contactPersons.length > 0 &&
    contactPersons[0].name &&
    contactPersons[0].name !== "Customer" &&
    contactPersons[0].name !== "Contact Person"
  ) {
    contactGreetingName = contactPersons[0].name;
  } else if (customerSnap.contactName) {
    contactGreetingName = customerSnap.contactName;
  }

  const greetingLine = contactGreetingName
    ? `Hallo guten Tag ${contactGreetingName},`
    : `Hallo guten Tag,`;

  const rawTitle =
    auftragTitle ||
    (rechnung as any).title ||
    (rechnung as any).items?.[0]?.item_name ||
    "";
  const cleanTitle = String(rawTitle || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const rechnungDocNo = String(rechnung.invoice_number || rechnung.id || "rechnung").trim().replace(/[\s_]+/g, "_");
  const lieferscheinDocNo = String(lieferscheinNo || "lieferschein").trim().replace(/[\s_]+/g, "_");

  const subjectTitle = cleanTitle ? cleanTitle.replace(/_/g, " ") : "";
  const emlSubject = subjectTitle
    ? `Rechnung Lieferschein ${rechnungDocNo} GTech ${subjectTitle}`
    : `Rechnung Lieferschein ${rechnungDocNo} GTech`;

  let bodyHtml = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: sans-serif; font-size: 14px; color: #111827;">\n`;
  if (primaryEmail) {
    bodyHtml += `<p style="margin: 0 0 12px 0;">${primaryEmail}</p>\n`;
  }
  bodyHtml += `<p style="margin: 0 0 12px 0;">${greetingLine}</p>\n`;
  bodyHtml += `<p style="margin: 0 0 12px 0;">anbei erhalten Sie die Rechnung (${rechnung.invoice_number || rechnung.id}) und den Lieferschein (${lieferscheinNo}) zu Ihrer Bestellung "${auftragTitle}".</p>\n`;
  bodyHtml += `</body>\n</html>`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: ${emlSubject}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/html; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyHtml}\n\n`;

  const rechnungFileName = cleanTitle
    ? `Rechnung_${rechnungDocNo}_GTech_${cleanTitle}.pdf`
    : `Rechnung_${rechnungDocNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${rechnungFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${rechnungFileName}"\n\n`;
  emlContent += `${rechnungBase64.match(/.{1,76}/g)?.join("\n") || rechnungBase64}\n\n`;

  const lieferscheinFileName = cleanTitle
    ? `Lieferschein_${lieferscheinDocNo}_GTech_${cleanTitle}.pdf`
    : `Lieferschein_${lieferscheinDocNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${lieferscheinFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${lieferscheinFileName}"\n\n`;
  emlContent += `${lieferscheinBase64.match(/.{1,76}/g)?.join("\n") || lieferscheinBase64}\n\n`;

  emlContent += `--${boundary}--\n`;

  const emlFileName = cleanTitle
    ? `Rechnung_Lieferschein_${rechnungDocNo}_GTech_${cleanTitle}.eml`
    : `Rechnung_Lieferschein_${rechnungDocNo}_GTech.eml`;
  const emlFilePath = path.join(uploadsDir, emlFileName);

  fs.writeFileSync(emlFilePath, emlContent, "utf-8");

  return {
    emlFilePath,
    filename: emlFileName,
    rechnungNo: rechnung.invoice_number || String(rechnung.id),
    lieferscheinNo,
    contactPersons,
  };
}

export async function generateRechnungOnlyEml(
  rechnungId: number | string,
  options?: {
    user?: {
      name?: string;
      username?: string;
      email?: string;
    };
  },
): Promise<{
  emlFilePath: string;
  filename: string;
  rechnungNo: string;
  contactPersons: ContactInfo[];
}> {
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const rechnung = await rechnungRepo.findOne({
    where: [{ id: String(rechnungId) }, { invoice_number: String(rechnungId) }] as any,
    relations: ["items", "customer"],
  });

  if (!rechnung) {
    throw new Error(`Rechnung with ID ${rechnungId} not found`);
  }

  let auftragTitle = rechnung.title || rechnung.notes || rechnung.auftrag_no || `Rechnung ${rechnung.invoice_number || rechnung.id}`;
  let customerId: any = undefined;

  if (rechnung.auftrag_id) {
    try {
      const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
      const auftrag = await customerOrderRepo.findOne({
        where: { id: rechnung.auftrag_id } as any,
      });
      if (auftrag) {
        if (auftrag.title) auftragTitle = auftrag.title;
        if (auftrag.customer_id) customerId = auftrag.customer_id;
      }
    } catch (err) {
      console.warn("Could not load Auftrag for Rechnung-only EML:", err);
    }
  }

  if (!customerId && rechnung.customer?.original_customer_id) {
    customerId = rechnung.customer.original_customer_id;
  }

  const contactPersons: ContactInfo[] = [];
  if (customerId) {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId } as any,
        relations: ["starBusinessDetails"],
      });

      if (customer?.starBusinessDetails?.id) {
        const contactPersonRepo = AppDataSource.getRepository(ContactPerson);
        const contacts = await contactPersonRepo.find({
          where: { starBusinessDetailsId: customer.starBusinessDetails.id } as any,
        });
        contacts.forEach((c) => {
          const fullName = [c.name, c.familyName].filter(Boolean).join(" ");
          if (c.email) {
            contactPersons.push({
              name: fullName || "Contact Person",
              email: c.email.trim(),
            });
          }
        });
      }

      if (contactPersons.length === 0 && customer?.email) {
        contactPersons.push({
          name: customer.companyName || customer.legalName || "Customer",
          email: customer.email.trim(),
        });
      }
    } catch (custErr) {
      console.warn("Could not load Customer ContactPersons for Rechnung-only EML:", custErr);
    }
  }

  if (contactPersons.length === 0 && rechnung.customer?.email) {
    contactPersons.push({
      name: rechnung.customer.company_name || "Customer",
      email: rechnung.customer.email.trim(),
    });
  }

  if (contactPersons.length === 0) {
    throw new Error("No contact person email address set — EML file cannot be generated.");
  }

  const uploadsDir = path.join(__dirname, "../../uploads/eml");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const rechnungenDir = path.join(__dirname, "../../uploads/rechnungen");
  if (!fs.existsSync(rechnungenDir)) fs.mkdirSync(rechnungenDir, { recursive: true });

  const customerSnap = rechnung.customerSnapshot || rechnung.customer || {};
  const customerCompName = String(
    customerSnap.company_name || customerSnap.companyName || customerSnap.legalName || ""
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const rechnungPdfPath = path.join(
    rechnungenDir,
    `rechnung_${rechnung.invoice_number || rechnung.id}.pdf`
  );

  const { options: rechnungPdfOpts } = await buildRechnungPdfOptions(rechnung, {
    user: options?.user,
    outputFilePath: rechnungPdfPath,
  });

  await generateGtechDocumentPdf(rechnungPdfOpts);

  const rechnungPdfBuffer = fs.readFileSync(rechnungPdfPath);
  const rechnungBase64 = rechnungPdfBuffer.toString("base64");
  const primaryEmail = contactPersons[0]?.email || rechnung.customer?.email || "";

  let contactGreetingName = "";
  if (
    contactPersons.length > 0 &&
    contactPersons[0].name &&
    contactPersons[0].name !== "Customer" &&
    contactPersons[0].name !== "Contact Person"
  ) {
    contactGreetingName = contactPersons[0].name;
  } else if (customerSnap.contactName) {
    contactGreetingName = customerSnap.contactName;
  }

  const greetingLine = contactGreetingName
    ? `Hallo guten Tag ${contactGreetingName},`
    : `Hallo guten Tag,`;

  const rawTitle = auftragTitle || (rechnung as any).title || "";
  const cleanTitle = String(rawTitle || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const rechnungDocNo = String(rechnung.invoice_number || rechnung.id || "rechnung").trim().replace(/[\s_]+/g, "_");

  const subjectTitle = cleanTitle ? cleanTitle.replace(/_/g, " ") : "";
  const emlSubject = subjectTitle
    ? `Rechnung ${rechnungDocNo} GTech ${subjectTitle}`
    : `Rechnung ${rechnungDocNo} GTech`;

  let bodyHtml = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: sans-serif; font-size: 14px; color: #111827;">\n`;
  if (primaryEmail) {
    bodyHtml += `<p style="margin: 0 0 12px 0;">${primaryEmail}</p>\n`;
  }
  bodyHtml += `<p style="margin: 0 0 12px 0;">${greetingLine}</p>\n`;
  bodyHtml += `<p style="margin: 0 0 12px 0;">anbei erhalten Sie die Rechnung (${rechnung.invoice_number || rechnung.id}) zu Ihrer Bestellung "${auftragTitle}".</p>\n`;
  bodyHtml += `</body>\n</html>`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: ${emlSubject}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/html; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyHtml}\n\n`;

  const rechnungFileName = cleanTitle
    ? `Rechnung_${rechnungDocNo}_GTech_${cleanTitle}.pdf`
    : `Rechnung_${rechnungDocNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${rechnungFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${rechnungFileName}"\n\n`;
  emlContent += `${rechnungBase64.match(/.{1,76}/g)?.join("\n") || rechnungBase64}\n\n`;

  emlContent += `--${boundary}--\n`;

  const emlFileName = cleanTitle
    ? `Rechnung_${rechnungDocNo}_GTech_${cleanTitle}.eml`
    : `Rechnung_${rechnungDocNo}_GTech.eml`;
  const emlFilePath = path.join(uploadsDir, emlFileName);

  fs.writeFileSync(emlFilePath, emlContent, "utf-8");

  return {
    emlFilePath,
    filename: emlFileName,
    rechnungNo: rechnung.invoice_number || String(rechnung.id),
    contactPersons,
  };
}

export async function generateAuftragEml(
  auftragId: number | string,
  options?: {
    user?: {
      name?: string;
      username?: string;
      email?: string;
    };
  },
): Promise<{
  emlFilePath: string;
  filename: string;
  orderNo: string;
  contactPersons: ContactInfo[];
}> {
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
  const auftrag = await customerOrderRepo.findOne({
    where: [{ id: Number(auftragId) || 0 }, { order_no: String(auftragId) }],
    relations: [
      "orderItems",
      "customer",
      "customer.defaultTaxProfile",
      "customer.starBusinessDetails",
    ],
  });

  if (!auftrag) {
    throw new Error(`Auftrag with ID ${auftragId} not found`);
  }

  const auftragTitle = auftrag.title || auftrag.notes || `Auftrag ${auftrag.order_no || auftrag.id}`;
  const customerId = auftrag.customer_id || auftrag.customer?.id;

  const contactPersons: ContactInfo[] = [];
  if (customerId) {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId } as any,
        relations: ["starBusinessDetails"],
      });

      if (customer?.starBusinessDetails?.id) {
        const contactPersonRepo = AppDataSource.getRepository(ContactPerson);
        const contacts = await contactPersonRepo.find({
          where: { starBusinessDetailsId: customer.starBusinessDetails.id } as any,
        });

        contacts.forEach((c) => {
          const fullName = [c.name, c.familyName].filter(Boolean).join(" ");
          if (c.email) {
            contactPersons.push({
              name: fullName || "Contact Person",
              email: c.email.trim(),
            });
          }
        });
      }

      if (contactPersons.length === 0 && customer?.email) {
        contactPersons.push({
          name: customer.companyName || customer.legalName || "Customer",
          email: customer.email.trim(),
        });
      }
    } catch (custErr) {
      console.warn("Could not load Customer ContactPersons for Auftrag EML:", custErr);
    }
  }

  if (contactPersons.length === 0 && auftrag.customerSnapshot?.email) {
    contactPersons.push({
      name:
        auftrag.customerSnapshot?.contactName ||
        auftrag.customerSnapshot?.displayName ||
        auftrag.customerSnapshot?.companyName ||
        "Customer",
      email: String(auftrag.customerSnapshot.email).trim(),
    });
  }

  if (contactPersons.length === 0) {
    throw new Error("No contact person email address set — EML file cannot be generated.");
  }

  const uploadsDir = path.join(__dirname, "../../uploads/eml");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const auftraegeDir = path.join(__dirname, "../../uploads/customer_orders");
  if (!fs.existsSync(auftraegeDir)) {
    fs.mkdirSync(auftraegeDir, { recursive: true });
  }

  const customerSnap = auftrag.customerSnapshot || auftrag.customer || {};
  const customerCompName = String(
    customerSnap.companyName ||
    customerSnap.company_name ||
    customerSnap.legalName ||
    customerSnap.displayName ||
    ""
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const defaultTaxRate =
    auftrag.tax_rate !== undefined && auftrag.tax_rate !== null
      ? Number(auftrag.tax_rate)
      : auftrag.customer?.defaultTaxProfile?.tax_rate !== undefined &&
        auftrag.customer?.defaultTaxProfile?.tax_rate !== null
        ? Number(auftrag.customer.defaultTaxProfile.tax_rate)
        : 19;

  const contactPersonName =
    options?.user?.name ||
    options?.user?.username ||
    customerSnap.contactName ||
    "";

  const auftragPdfPath = path.join(
    auftraegeDir,
    `auftrag_${auftrag.order_no || auftrag.id}.pdf`
  );

  const { options: auftragPdfOpts } = await buildAuftragPdfOptions(auftrag, {
    user: options?.user,
    outputFilePath: auftragPdfPath,
  });

  await generateGtechDocumentPdf(auftragPdfOpts);

  const auftragPdfBuffer = fs.readFileSync(auftragPdfPath);
  const auftragBase64 = auftragPdfBuffer.toString("base64");
  const primaryEmail = contactPersons[0]?.email || customerSnap.email || "";

  let contactGreetingName = "";
  if (
    contactPersons.length > 0 &&
    contactPersons[0].name &&
    contactPersons[0].name !== "Customer" &&
    contactPersons[0].name !== "Contact Person"
  ) {
    contactGreetingName = contactPersons[0].name;
  } else if (customerSnap.contactName) {
    contactGreetingName = customerSnap.contactName;
  }

  const greetingLine = contactGreetingName
    ? `Hallo guten Tag ${contactGreetingName},`
    : `Hallo guten Tag,`;

  const rawTitle =
    auftragTitle ||
    (auftrag as any)?.title ||
    (auftrag as any)?.order_items?.[0]?.item_name ||
    (auftrag as any)?.items?.[0]?.item_name ||
    "";
  const cleanTitle = String(rawTitle || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const docNo = String(auftrag.order_no || auftrag.id || "order").trim().replace(/[\s_]+/g, "_");

  const subjectTitle = cleanTitle ? cleanTitle.replace(/_/g, " ") : "";
  const emlSubject = subjectTitle
    ? `Auftrag ${docNo} GTech ${subjectTitle}`
    : `Auftrag ${docNo} GTech`;

  let bodyHtml = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: sans-serif; font-size: 14px; color: #111827;">\n`;
  if (primaryEmail) {
    bodyHtml += `<p style="margin: 0 0 12px 0;">${primaryEmail}</p>\n`;
  }
  bodyHtml += `<p style="margin: 0 0 12px 0;">${greetingLine}</p>\n`;
  bodyHtml += `<p style="margin: 0 0 12px 0;">anbei erhalten Sie die Auftragsbestätigung (${docNo}) zu Ihrer Bestellung "${auftragTitle}".</p>\n`;
  bodyHtml += `</body>\n</html>`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: ${emlSubject}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/html; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyHtml}\n\n`;

  const auftragFileName = cleanTitle
    ? `Auftrag_${docNo}_GTech_${cleanTitle}.pdf`
    : `Auftrag_${docNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${auftragFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${auftragFileName}"\n\n`;
  emlContent += `${auftragBase64.match(/.{1,76}/g)?.join("\n") || auftragBase64}\n\n`;

  emlContent += `--${boundary}--\n`;

  const emlFileName = cleanTitle
    ? `Auftrag_${docNo}_GTech_${cleanTitle}.eml`
    : `Auftrag_${docNo}_GTech.eml`;
  const emlFilePath = path.join(uploadsDir, emlFileName);

  fs.writeFileSync(emlFilePath, emlContent, "utf-8");
  return {
    emlFilePath,
    filename: emlFileName,
    orderNo: auftrag.order_no || String(auftrag.id),
    contactPersons,
  };
}

export async function generateOfferEml(
  offerId: string | number,
  options?: {
    user?: {
      name?: string;
      username?: string;
      email?: string;
    };
  },
): Promise<{
  emlFilePath: string;
  filename: string;
  offerNumber: string;
  contactPersons: ContactInfo[];
}> {
  const offerRepo = AppDataSource.getRepository(Offer);
  const offer = await offerRepo.findOne({
    where: [{ id: String(offerId) }, { offerNumber: String(offerId) }] as any,
    relations: ["lineItems"],
  });

  if (!offer) {
    throw new Error(`Offer with ID ${offerId} not found`);
  }

  const offerTitle = offer.title || `Angebot ${offer.offerNumber}`;
  const customerId = offer.customerId;

  const contactPersons: ContactInfo[] = [];
  if (customerId) {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId } as any,
        relations: ["starBusinessDetails"],
      });

      if (customer?.starBusinessDetails?.id) {
        const contactPersonRepo = AppDataSource.getRepository(ContactPerson);
        const contacts = await contactPersonRepo.find({
          where: { starBusinessDetailsId: customer.starBusinessDetails.id } as any,
        });

        contacts.forEach((c) => {
          const fullName = [c.name, c.familyName].filter(Boolean).join(" ");
          if (c.email) {
            contactPersons.push({
              name: fullName || "Contact Person",
              email: c.email.trim(),
            });
          }
        });
      }

      if (contactPersons.length === 0 && customer?.email) {
        contactPersons.push({
          name: customer.companyName || customer.legalName || "Customer",
          email: customer.email.trim(),
        });
      }
    } catch (custErr) {
      console.warn("Could not load Customer ContactPersons for Offer EML:", custErr);
    }
  }

  if (contactPersons.length === 0 && offer.customerSnapshot?.email) {
    contactPersons.push({
      name:
        (offer.customerSnapshot as any)?.contactName ||
        (offer.customerSnapshot as any)?.displayName ||
        (offer.customerSnapshot as any)?.companyName ||
        "Customer",
      email: String((offer.customerSnapshot as any).email).trim(),
    });
  }

  if (contactPersons.length === 0) {
    throw new Error("No contact person email address set — EML file cannot be generated.");
  }

  const uploadsDir = path.join(__dirname, "../../uploads/eml");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const offersDir = path.join(__dirname, "../../uploads/offers");
  if (!fs.existsSync(offersDir)) fs.mkdirSync(offersDir, { recursive: true });

  const customerSnap = offer.customerSnapshot || {};
  const customerCompName = String(
    (customerSnap as any).companyName ||
    (customerSnap as any).company_name ||
    (customerSnap as any).legalName ||
    (customerSnap as any).displayName ||
    ""
  ).trim();
  const customerNum = String((customerSnap as any).customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactPersonName =
    options?.user?.name ||
    options?.user?.username ||
    (customerSnap as any).contactName ||
    "";

  const offerPdfPath = path.join(
    offersDir,
    `angebot_${offer.offerNumber || offer.id}.pdf`
  );

  const { options: offerPdfOpts } = await buildOfferPdfOptions(offer, {
    user: options?.user,
    outputFilePath: offerPdfPath,
  });

  await generateGtechDocumentPdf(offerPdfOpts);

  const offerPdfBuffer = fs.readFileSync(offerPdfPath);
  const offerBase64 = offerPdfBuffer.toString("base64");

  const primaryEmail = contactPersons[0]?.email || (customerSnap as any).email || "";

  let contactGreetingName = "";
  if (
    contactPersons.length > 0 &&
    contactPersons[0].name &&
    contactPersons[0].name !== "Customer" &&
    contactPersons[0].name !== "Contact Person"
  ) {
    contactGreetingName = contactPersons[0].name;
  } else if ((customerSnap as any).contactName) {
    contactGreetingName = (customerSnap as any).contactName;
  }

  const greetingLine = contactGreetingName
    ? `Hallo guten Tag ${contactGreetingName},`
    : `Hallo guten Tag,`;

  const rawTitle = offerTitle || "";
  const cleanTitle = String(rawTitle || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const docNo = String(offer.offerNumber || offer.id || "angebot").trim().replace(/[\s_]+/g, "_");

  const subjectTitle = cleanTitle ? cleanTitle.replace(/_/g, " ") : "";
  const emlSubject = subjectTitle
    ? `Angebot ${docNo} GTech ${subjectTitle}`
    : `Angebot ${docNo} GTech`;

  let bodyHtml = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: sans-serif; font-size: 14px; color: #111827;">\n`;
  if (primaryEmail) {
    bodyHtml += `<p style="margin: 0 0 12px 0;">${primaryEmail}</p>\n`;
  }
  bodyHtml += `<p style="margin: 0 0 12px 0;">${greetingLine}</p>\n`;
  bodyHtml += `<p style="margin: 0 0 12px 0;">anbei erhalten Sie das Angebot (${docNo}) zu Ihrer Anfrage "${offerTitle}".</p>\n`;
  bodyHtml += `</body>\n</html>`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: ${emlSubject}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/html; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyHtml}\n\n`;

  const offerFileName = cleanTitle
    ? `Angebot_${docNo}_GTech_${cleanTitle}.pdf`
    : `Angebot_${docNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${offerFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${offerFileName}"\n\n`;
  emlContent += `${offerBase64.match(/.{1,76}/g)?.join("\n") || offerBase64}\n\n`;

  emlContent += `--${boundary}--\n`;

  const emlFileName = cleanTitle
    ? `Angebot_${docNo}_GTech_${cleanTitle}.eml`
    : `Angebot_${docNo}_GTech.eml`;
  const emlFilePath = path.join(uploadsDir, emlFileName);

  fs.writeFileSync(emlFilePath, emlContent, "utf-8");
  return {
    emlFilePath,
    filename: emlFileName,
    offerNumber: offer.offerNumber || String(offer.id),
    contactPersons,
  };
}

export async function generateRechnungKEml(
  rechnungKId: number | string,
  options?: {
    user?: {
      name?: string;
      username?: string;
      email?: string;
    };
  },
): Promise<{
  emlFilePath: string;
  filename: string;
  rkNo: string;
  contactPersons: ContactInfo[];
}> {
  const rechnungKRepo = AppDataSource.getRepository(RechnungK);
  const rechnungK = await rechnungKRepo.findOne({
    where: [{ id: String(rechnungKId) }, { invoice_number: String(rechnungKId) }] as any,
    relations: ["items", "customer"],
  });

  if (!rechnungK) {
    throw new Error(`Rechnungskorrektur with ID ${rechnungKId} not found`);
  }

  const rkTitle = rechnungK.title || rechnungK.notes || rechnungK.auftrag_no || `Rechnungskorrektur ${rechnungK.invoice_number || rechnungK.id}`;
  let customerId: any = (rechnungK as any).customer_id || rechnungK.customer?.id;

  if (!customerId && rechnungK.customer?.original_customer_id) {
    customerId = rechnungK.customer.original_customer_id;
  }

  const contactPersons: ContactInfo[] = [];
  if (customerId) {
    try {
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId } as any,
        relations: ["starBusinessDetails"],
      });

      if (customer?.starBusinessDetails?.id) {
        const contactPersonRepo = AppDataSource.getRepository(ContactPerson);
        const contacts = await contactPersonRepo.find({
          where: { starBusinessDetailsId: customer.starBusinessDetails.id } as any,
        });

        contacts.forEach((c) => {
          const fullName = [c.name, c.familyName].filter(Boolean).join(" ");
          if (c.email) {
            contactPersons.push({
              name: fullName || "Contact Person",
              email: c.email.trim(),
            });
          }
        });
      }

      if (contactPersons.length === 0 && customer?.email) {
        contactPersons.push({
          name: customer.companyName || customer.legalName || "Customer",
          email: customer.email.trim(),
        });
      }
    } catch (custErr) {
      console.warn("Could not load Customer ContactPersons for RK EML:", custErr);
    }
  }

  if (contactPersons.length === 0 && rechnungK.customer?.email) {
    contactPersons.push({
      name: rechnungK.customer.company_name || "Customer",
      email: rechnungK.customer.email.trim(),
    });
  }

  if (contactPersons.length === 0) {
    throw new Error("No contact person email address set — EML file cannot be generated.");
  }

  const uploadsDir = path.join(__dirname, "../../uploads/eml");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const rkDir = path.join(__dirname, "../../uploads/rechnungen_k");
  if (!fs.existsSync(rkDir)) fs.mkdirSync(rkDir, { recursive: true });

  const customerSnap = rechnungK.customerSnapshot || rechnungK.customer || {};
  const customerCompName = String(
    customerSnap.company_name || customerSnap.companyName || customerSnap.legalName || ""
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const defaultTaxRate =
    rechnungK.tax_rate !== undefined && rechnungK.tax_rate !== null
      ? Number(rechnungK.tax_rate)
      : (rechnungK.customer as any)?.defaultTaxProfile?.tax_rate !== undefined &&
        (rechnungK.customer as any)?.defaultTaxProfile?.tax_rate !== null
        ? Number((rechnungK.customer as any).defaultTaxProfile.tax_rate)
        : 19;

  const contactPersonName =
    (rechnungK as any).ansprechpartner ||
    options?.user?.name ||
    options?.user?.username ||
    customerSnap.contactName ||
    "";

  const rkPdfPath = path.join(
    rkDir,
    `rechnung_k_${rechnungK.invoice_number || rechnungK.id}.pdf`
  );

  const { options: rkPdfOpts } = await buildRechnungKPdfOptions(rechnungK, {
    user: options?.user,
    outputFilePath: rkPdfPath,
  });

  await generateGtechDocumentPdf(rkPdfOpts);
  const rkPdfBuffer = fs.readFileSync(rkPdfPath);
  const rkBase64 = rkPdfBuffer.toString("base64");

  const primaryEmail = contactPersons[0]?.email || rechnungK.customer?.email || "";

  let contactGreetingName = "";
  if (
    contactPersons.length > 0 &&
    contactPersons[0].name &&
    contactPersons[0].name !== "Customer" &&
    contactPersons[0].name !== "Contact Person"
  ) {
    contactGreetingName = contactPersons[0].name;
  } else if (customerSnap.contactName) {
    contactGreetingName = customerSnap.contactName;
  }

  const greetingLine = contactGreetingName
    ? `Hallo guten Tag ${contactGreetingName},`
    : `Hallo guten Tag,`;

  const rawTitle = rkTitle || "";
  const cleanTitle = String(rawTitle || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const docNo = String(rechnungK.invoice_number || rechnungK.id || "rechnungskorrektur").trim().replace(/[\s_]+/g, "_");

  const subjectTitle = cleanTitle ? cleanTitle.replace(/_/g, " ") : "";
  const emlSubject = subjectTitle
    ? `Rechnungskorrektur ${docNo} GTech ${subjectTitle}`
    : `Rechnungskorrektur ${docNo} GTech`;

  let bodyHtml = `<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body style="font-family: sans-serif; font-size: 14px; color: #111827;">\n`;
  if (primaryEmail) {
    bodyHtml += `<p style="margin: 0 0 12px 0;">${primaryEmail}</p>\n`;
  }
  bodyHtml += `<p style="margin: 0 0 12px 0;">${greetingLine}</p>\n`;
  bodyHtml += `<p style="margin: 0 0 12px 0;">anbei erhalten Sie die Rechnungskorrektur (${docNo}) zu Ihrer Bestellung "${rkTitle}".</p>\n`;
  bodyHtml += `</body>\n</html>`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: ${emlSubject}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/html; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyHtml}\n\n`;

  const rkFileName = cleanTitle
    ? `Rechnungskorrektur_${docNo}_GTech_${cleanTitle}.pdf`
    : `Rechnungskorrektur_${docNo}_GTech.pdf`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: application/pdf; name="${rkFileName}"\n`;
  emlContent += `Content-Transfer-Encoding: base64\n`;
  emlContent += `Content-Disposition: attachment; filename="${rkFileName}"\n\n`;
  emlContent += `${rkBase64.match(/.{1,76}/g)?.join("\n") || rkBase64}\n\n`;

  emlContent += `--${boundary}--\n`;

  const emlFileName = cleanTitle
    ? `Rechnungskorrektur_${docNo}_GTech_${cleanTitle}.eml`
    : `Rechnungskorrektur_${docNo}_GTech.eml`;
  const emlFilePath = path.join(uploadsDir, emlFileName);

  fs.writeFileSync(emlFilePath, emlContent, "utf-8");
  return {
    emlFilePath,
    filename: emlFileName,
    rkNo: rechnungK.invoice_number || String(rechnungK.id),
    contactPersons,
  };
}
