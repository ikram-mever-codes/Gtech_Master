import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { Rechnung } from "../models/rechnung";
import { Lieferschein } from "../models/lieferscheine";
import { CustomerOrder } from "../models/customer_orders";
import { Customer } from "../models/customers";
import { ContactPerson } from "../models/contact_person";
import { generateGtechDocumentPdf } from "./gtechPdfGenerator";

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

  const rechnungItems = (rechnung.items || []).map((it: any, idx: number) => ({
    position: it.position || idx + 1,
    artNr: it.itemNo || it.material || "—",
    bezeichnung: it.item_name || it.description || "Item",
    remarks: it.remark || it.notes || "-",
    vatRate: it.taxRate ?? rechnung.tax_rate ?? 19,
    quantity: Number(it.quantity || 1),
    unitPrice: Number(it.unit_price_eur || it.price || 0),
    lineTotal: Number(
      it.total_price ||
      it.lineTotal ||
      Number(it.quantity || 1) * Number(it.unit_price_eur || it.price || 0)
    ),
  }));

  const contactPersonName =
    rechnung.ansprechpartner ||
    options?.user?.name ||
    options?.user?.username ||
    customerSnap.contactName ||
    "Joschua Stehle";

  await generateGtechDocumentPdf({
    documentType: "Rechnung",
    documentNumber: rechnung.invoice_number || String(rechnung.id),
    customerSnapshot: customerSnap,
    customerEntity: rechnung.customer,
    deliveryAddress: rechnung.deliveryAddress,
    metadataItems: [
      ["Ansprechpartner", contactPersonName],
      ["Kunde", kundeCombined],
      ["Datum", formatDateStr(rechnung.invoice_date || rechnung.date_created || rechnung.created_at)],
    ],
    lineItems: rechnungItems,
    showPrices: true,
    shippingMethod: rechnung.shipping_method,
    shippingCost: Number(rechnung.shipping_cost || 0),
    discountPercentage: Number(rechnung.discount_percentage || 0),
    discountAmount: Number(rechnung.discount_amount || 0),
    subtotal: Number(rechnung.subtotal || 0),
    taxAmount: Number(rechnung.tax_amount || 0),
    totalAmount: Number(rechnung.total_amount || 0),
    taxRate: Number(rechnung.tax_rate || 19),
    currency: rechnung.currency || "EUR",
    notes: rechnung.notes,
    deliveryTime: rechnung.date_delivery,
    deliveryTerms: rechnung.delivery_terms,
    paymentTerms: rechnung.payment_terms ? `Zahlungsziel: ${rechnung.payment_terms} Tage` : undefined,
    paymentMethod: rechnung.payment_method,
    outputFilePath: rechnungPdfPath,
  });

  const lieferscheinNo = lieferschein?.delivery_note_number || `LS-${rechnung.invoice_number || rechnung.id}`;
  const lieferscheinPdfPath = path.join(lieferscheineDir, `lieferschein_${lieferscheinNo}.pdf`);

  const lieferscheinItems = (rechnung.items || []).map((it: any, idx: number) => ({
    position: it.position || idx + 1,
    artNr: it.itemNo || it.material || "—",
    bezeichnung: it.item_name || it.description || "Item",
    remarks: it.remark || it.notes || "-",
    quantity: Number(it.quantity || 1),
  }));

  await generateGtechDocumentPdf({
    documentType: "Lieferschein",
    documentNumber: lieferscheinNo,
    customerSnapshot: customerSnap,
    customerEntity: rechnung.customer,
    deliveryAddress: rechnung.deliveryAddress,
    metadataItems: [
      ["Ansprechpartner", contactPersonName],
      ["Kunde", kundeCombined],
      ["Datum", formatDateStr(rechnung.invoice_date || rechnung.created_at)],
      ["Lieferdatum", formatDateStr(rechnung.date_delivery || rechnung.delivery_date)],
    ],
    lineItems: lieferscheinItems,
    showPrices: false,
    notes: rechnung.notes,
    deliveryTime: rechnung.date_delivery,
    outputFilePath: lieferscheinPdfPath,
  });

  const rechnungPdfBuffer = fs.readFileSync(rechnungPdfPath);
  const lieferscheinPdfBuffer = fs.readFileSync(lieferscheinPdfPath);

  const rechnungBase64 = rechnungPdfBuffer.toString("base64");
  const lieferscheinBase64 = lieferscheinPdfBuffer.toString("base64");

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

  let bodyText = `${greetingLine}\n\nanbei erhalten Sie die Rechnung (${rechnung.invoice_number || rechnung.id}) und den Lieferschein (${lieferscheinNo}) zu Ihrer Bestellung "${auftragTitle}".\n\n`;

  if (contactPersons.length > 0) {
    bodyText += `Ansprechpartner / Contact Persons:\n`;
    contactPersons.forEach((cp) => {
      bodyText += `- ${cp.name}: ${cp.email}\n`;
    });
    bodyText += `\n`;
  }

  bodyText += `Mit freundlichen Grüßen,\nGTech Industries GmbH`;

  const boundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 11)}@gtech-industries.de>`;

  let emlContent = "";
  emlContent += `X-Unsent: 1\n`;
  emlContent += `Message-ID: ${messageId}\n`;
  emlContent += `Subject: Rechnung & Lieferschein: ${auftragTitle}\n`;
  emlContent += `MIME-Version: 1.0\n`;
  emlContent += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  emlContent += `--${boundary}\n`;
  emlContent += `Content-Type: text/plain; charset="utf-8"\n`;
  emlContent += `Content-Transfer-Encoding: 8bit\n\n`;
  emlContent += `${bodyText}\n\n`;

  const cleanTitle = (auftragTitle || rechnung.title || "")
    .trim()
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const rechnungDocNo = String(rechnung.invoice_number || rechnung.id || "rechnung").trim().replace(/[\s_]+/g, "_");
  const lieferscheinDocNo = String(lieferscheinNo || "lieferschein").trim().replace(/[\s_]+/g, "_");

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

  const safeTitle = (auftragTitle || "Document").replace(/[^a-zA-Z0-9_-]/g, "_");
  const emlFileName = `Rechnung_Lieferschein_${rechnung.invoice_number || rechnung.id}_${safeTitle}.eml`;
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