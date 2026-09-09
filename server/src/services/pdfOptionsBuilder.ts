import { AppDataSource } from "../config/database";
import { Rechnung } from "../models/rechnung";
import { Lieferschein } from "../models/lieferscheine";
import { CustomerOrder } from "../models/customer_orders";
import { Customer } from "../models/customers";
import { Offer } from "../models/offer";
import { Rechnung_k as RechnungK } from "../models/rechnung_k";
import { PdfDocumentOptions } from "./gtechPdfGenerator";
import { parseFlexibleNumber } from "../utils/decimal";


export interface BuildPdfContextOptions {
  user?: {
    name?: string;
    username?: string;
    email?: string;
  };
  outputFilePath?: string;
}

export async function buildRechnungPdfOptions(
  rechnungInput: Rechnung | number | string,
  ctx?: BuildPdfContextOptions,
): Promise<{
  options: PdfDocumentOptions;
  rechnung: Rechnung;
  auftragNo?: string;
  contactName: string;
  kundeCombined: string;
  resolvedInvoiceDate: string;
}> {
  let rechnung: Rechnung;
  const rechnungRepo = AppDataSource.getRepository(Rechnung);

  if (typeof rechnungInput === "number" || typeof rechnungInput === "string") {
    const found = await rechnungRepo.findOne({
      where: [{ id: String(rechnungInput) }, { invoice_number: String(rechnungInput) }] as any,
      relations: ["customer", "items"],
    });
    if (!found) {
      throw new Error(`Rechnung with ID ${rechnungInput} not found`);
    }
    rechnung = found;
  } else {
    rechnung = rechnungInput;
    if (!rechnung.items || !rechnung.customer) {
      const reloaded = await rechnungRepo.findOne({
        where: { id: String(rechnung.id) } as any,
        relations: ["customer", "items"],
      });
      if (reloaded) rechnung = reloaded;
    }
  }


  // Load Auftrag if linked
  let auftrag: CustomerOrder | null = null;
  if (rechnung.auftrag_id) {
    try {
      auftrag = await AppDataSource.getRepository(CustomerOrder).findOne({
        where: { id: rechnung.auftrag_id },
      });
    } catch (_) { }
  }

  const auftragNo = rechnung.auftrag_no || auftrag?.order_no || undefined;

  // Load Lieferschein if linked
  const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
  let linkedLieferschein = await lieferscheinRepo.findOne({
    where: { rechnung_id: rechnung.id },
  });
  if (!linkedLieferschein && rechnung.auftrag_id) {
    linkedLieferschein = await lieferscheinRepo.findOne({
      where: { auftrag_id: rechnung.auftrag_id },
    });
  }

  const isLieferscheinConfirmed = linkedLieferschein
    ? linkedLieferschein.status === "bestätigt" ||
    linkedLieferschein.status === "geliefert" ||
    linkedLieferschein.status === "delivered" ||
    !!linkedLieferschein.confirmed_at
    : false;

  const customerSnap = rechnung.customerSnapshot || rechnung.customer || {};
  const customerCompName = String(
    customerSnap.company_name ||
    customerSnap.companyName ||
    customerSnap.legalName ||
    "",
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactName =
    rechnung.ansprechpartner ||
    customerSnap.contactName ||
    ctx?.user?.name ||
    ctx?.user?.username ||
    "";

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const resolvedInvoiceDate = formatDateStr(
    rechnung.invoice_date || rechnung.date_created || rechnung.created_at,
  );
  const resolvedDeliveryDate = formatDateStr(
    rechnung.date_delivery || rechnung.delivery_date,
  );

  const defaultTaxRate = Number(rechnung.tax_rate ?? 19);
  const subtotal = Number(rechnung.subtotal || 0);
  const discountAmount = Number(rechnung.discount_amount || 0);
  const shippingCost = Number(rechnung.shipping_cost || 0);

  // Compute tax amount if 0/null on entity
  let taxAmount = Number(rechnung.tax_amount || 0);
  if (taxAmount <= 0 && subtotal > 0 && defaultTaxRate > 0) {
    taxAmount = Math.round((subtotal - discountAmount) * (defaultTaxRate / 100) * 100) / 100;
  }

  // Compute total amount if 0/null on entity
  let totalAmount = Number(rechnung.total_amount || 0);
  if (totalAmount <= 0 && subtotal > 0) {
    totalAmount = Math.round((subtotal - discountAmount + taxAmount + shippingCost) * 100) / 100;
  }

  const items = (rechnung.items || []).map((it: any, idx: number) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unit_price_eur || it.price || 0);
    const lineTot = Number(it.total_price || it.lineTotal || qty * unitPrice);
    const vatRate = it.taxRate ?? defaultTaxRate;

    return {
      position: it.position || idx + 1,
      artNr: it.itemNo || it.material || "—",
      bezeichnung: it.item_name || it.description || "Item",
      remarks: it.remark || it.notes || "-",
      vatRate,
      quantity: qty,
      unitPrice,
      lineTotal: lineTot,
    };
  });

  const paymentTermsRaw = rechnung.payment_terms || auftrag?.payment_terms;
  const paymentTermsFormatted = paymentTermsRaw
    ? (() => {
      const m = String(paymentTermsRaw).match(/(\d+)/);
      return m ? `Zahlungsziel: ${m[1]} Tage` : `Zahlungsziel: ${paymentTermsRaw}`;
    })()
    : undefined;

  const metadataItems: [string, string][] = [
    ["Kontakt", String(contactName || "")],
    ["Kunde", String(kundeCombined || "")],
    ...(auftragNo ? [["Auftrag", String(auftragNo)] as [string, string]] : []),
    ["Datum", String(resolvedInvoiceDate || "")],
  ];

  const options: PdfDocumentOptions = {
    documentType: "Rechnung",
    documentNumber: rechnung.invoice_number || String(rechnung.id),
    documentTitle: rechnung.title || "",
    customerSnapshot: customerSnap,
    customerEntity: rechnung.customer,
    deliveryAddress: rechnung.deliveryAddress,
    metadataItems,
    kontaktName: contactName,
    kontaktEmail: ctx?.user?.email,
    isDelivered: isLieferscheinConfirmed,
    lineItems: items,
    showPrices: true,
    shippingMethod: rechnung.shipping_method,
    shippingCost,
    shippingQuantity: Number(rechnung.shipping_quantity ?? 0),
    shippingTaxRate: defaultTaxRate,
    discountPercentage: Number(rechnung.discount_percentage || 0),
    discountAmount,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate: defaultTaxRate,
    currency: rechnung.currency || "EUR",
    notes: rechnung.notes,
    deliveryTime: resolvedDeliveryDate,
    deliveryDate: resolvedDeliveryDate,
    deliveryTerms: rechnung.delivery_terms || auftrag?.delivery_terms,
    paymentTerms: paymentTermsFormatted,
    paymentMethod: rechnung.payment_method || auftrag?.payment_method,
    invoiceDate: resolvedInvoiceDate,
    taxProfile: rechnung.tax_profile_case || (auftrag as any)?.tax_profile_case,
    outputFilePath: ctx?.outputFilePath || "",

  };

  return {
    options,
    rechnung,
    auftragNo,
    contactName,
    kundeCombined,
    resolvedInvoiceDate,
  };
}

export async function buildLieferscheinPdfOptions(
  rechnungInput: Rechnung | number | string,
  lieferscheinInput?: Lieferschein | null,
  ctx?: BuildPdfContextOptions,
): Promise<{
  options: PdfDocumentOptions;
  lieferscheinNo: string;
}> {
  let rechnung: Rechnung;
  const rechnungRepo = AppDataSource.getRepository(Rechnung);

  if (typeof rechnungInput === "number" || typeof rechnungInput === "string") {
    const found = await rechnungRepo.findOne({
      where: [{ id: String(rechnungInput) }, { invoice_number: String(rechnungInput) }] as any,
      relations: ["customer", "items"],
    });
    if (!found) {
      throw new Error(`Rechnung with ID ${rechnungInput} not found`);
    }
    rechnung = found;
  } else {
    rechnung = rechnungInput;
    if (!rechnung.items || !rechnung.customer) {
      const reloaded = await rechnungRepo.findOne({
        where: { id: String(rechnung.id) } as any,
        relations: ["customer", "items"],
      });
      if (reloaded) rechnung = reloaded;
    }
  }


  let lieferschein = lieferscheinInput;
  if (!lieferschein) {
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    lieferschein = await lieferscheinRepo.findOne({
      where: { rechnung_id: rechnung.id },
    });
    if (!lieferschein && rechnung.auftrag_id) {
      lieferschein = await lieferscheinRepo.findOne({
        where: { auftrag_id: rechnung.auftrag_id },
      });
    }
  }

  let auftrag: CustomerOrder | null = null;
  if (rechnung.auftrag_id) {
    try {
      auftrag = await AppDataSource.getRepository(CustomerOrder).findOne({
        where: { id: rechnung.auftrag_id },
      });
    } catch (_) { }
  }
  const auftragNo = rechnung.auftrag_no || auftrag?.order_no || undefined;

  const customerSnap = rechnung.customerSnapshot || rechnung.customer || {};
  const customerCompName = String(
    customerSnap.company_name ||
    customerSnap.companyName ||
    customerSnap.legalName ||
    "",
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactName =
    rechnung.ansprechpartner ||
    customerSnap.contactName ||
    ctx?.user?.name ||
    ctx?.user?.username ||
    "";

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const resolvedDate = formatDateStr(
    lieferschein?.delivery_date ||
    lieferschein?.date_created ||
    lieferschein?.created_at ||
    rechnung.invoice_date ||
    rechnung.created_at,
  );

  const lieferscheinNo =
    lieferschein?.delivery_note_number ||
    `LS-${rechnung.invoice_number || rechnung.id}`;

  const items = (rechnung.items || []).map((it: any, idx: number) => ({
    position: it.position || idx + 1,
    artNr: it.itemNo || it.material || "—",
    bezeichnung: it.item_name || it.description || "Item",
    remarks: it.remark || it.notes || "-",
    quantity: Number(it.quantity || 1),
  }));

  const metadataItems: [string, string][] = [
    ["Kontakt", String(contactName || "")],
    ["Kunde", String(kundeCombined || "")],
    ...(auftragNo ? [["Auftrag", String(auftragNo)] as [string, string]] : []),
    ["Datum", String(resolvedDate || "")],
  ];

  const options: PdfDocumentOptions = {
    documentType: "Lieferschein",
    documentNumber: lieferscheinNo,
    documentTitle: (lieferschein as any)?.title || rechnung.title || "",
    customerSnapshot: customerSnap,
    customerEntity: rechnung.customer,
    deliveryAddress: rechnung.deliveryAddress,
    metadataItems,
    kontaktName: contactName,
    kontaktEmail: ctx?.user?.email,
    lineItems: items,
    showPrices: false,
    shippingMethod: rechnung.shipping_method,
    notes: lieferschein?.notes || rechnung.notes,
    deliveryTime: resolvedDate,
    deliveryDate: resolvedDate,
    deliveryTerms: rechnung.delivery_terms || auftrag?.delivery_terms,
    outputFilePath: ctx?.outputFilePath || "",
  };

  return {
    options,
    lieferscheinNo,
  };
}

export async function buildAuftragPdfOptions(
  auftragInput: CustomerOrder | number | string,
  ctx?: BuildPdfContextOptions,
): Promise<{
  options: PdfDocumentOptions;
  auftrag: CustomerOrder;
}> {
  let auftrag: CustomerOrder;
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);

  if (typeof auftragInput === "number" || typeof auftragInput === "string") {
    const found = await customerOrderRepo.findOne({
      where: [{ id: Number(auftragInput) || 0 }, { order_no: String(auftragInput) }],
      relations: ["orderItems", "customer", "customer.defaultTaxProfile"],
    });
    if (!found) {
      throw new Error(`Auftrag with ID ${auftragInput} not found`);
    }
    auftrag = found;
  } else {
    auftrag = auftragInput;
    if (!auftrag.orderItems || !auftrag.customer) {
      const reloaded = await customerOrderRepo.findOne({
        where: { id: auftrag.id },
        relations: ["orderItems", "customer", "customer.defaultTaxProfile"],
      });
      if (reloaded) auftrag = reloaded;
    }
  }

  const defaultTaxRate =
    auftrag.tax_rate !== undefined && auftrag.tax_rate !== null
      ? Number(auftrag.tax_rate)
      : auftrag.customer?.defaultTaxProfile?.tax_rate !== undefined &&
        auftrag.customer?.defaultTaxProfile?.tax_rate !== null
        ? Number(auftrag.customer.defaultTaxProfile.tax_rate)
        : 19;

  const customerSnap = auftrag.customerSnapshot || auftrag.customer || {};
  const customerCompName = String(
    customerSnap.companyName ||
    customerSnap.company_name ||
    customerSnap.legalName ||
    customerSnap.displayName ||
    "",
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactName =
    ctx?.user?.name ||
    ctx?.user?.username ||
    customerSnap.contactName ||
    "";

  const rawItems = (auftrag.orderItems || [])
    .slice()
    .sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0));

  const items = rawItems.map((it: any, idx: number) => {
    const qty = it.quantity !== undefined && it.quantity !== null ? Number(it.quantity) : 1;
    const unitPrice = Number(it.price || 0);
    const lineTotal =
      it.lineTotal !== undefined && it.lineTotal !== null
        ? Number(it.lineTotal)
        : qty * unitPrice;
    return {
      position: it.position || idx + 1,
      artNr: it.itemNo || it.material || "—",
      bezeichnung: it.itemName || it.description || "Item",
      remarks: it.notes || it.remark_ex || "-",
      vatRate:
        it.taxRate !== undefined && it.taxRate !== null
          ? Number(it.taxRate)
          : defaultTaxRate,
      quantity: qty,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
    };
  });

  const isDelivered =
    auftrag.auftrag_status === ("delivered" as any) ||
    auftrag.auftrag_status === ("closed" as any) ||
    String(auftrag.status || "").toLowerCase() === "delivered" ||
    String(auftrag.status || "").toLowerCase() === "completed" ||
    String(auftrag.status || "").toLowerCase() === "closed" ||
    !!auftrag.real_delivery_date;

  const effectiveDeliveryDate =
    (isDelivered && auftrag.real_delivery_date) ||
    auftrag.date_delivery ||
    auftrag.delivery_terms;

  const paymentTermsFormatted = auftrag.payment_terms
    ? (() => {
      const m = String(auftrag.payment_terms).match(/(\d+)/);
      return m ? `Zahlungsziel: ${m[1]} Tage` : `Zahlungsziel: ${auftrag.payment_terms}`;
    })()
    : undefined;

  const metadataItems: [string, string][] = [
    ["Kontakt", contactName],
    ["Kunde", kundeCombined],
    ["Datum", auftrag.date_created || auftrag.created_at || ""],
  ];

  const subtotal = Number(auftrag.subtotal || 0);
  const discountAmount = Number(auftrag.discount_amount || 0);
  const shippingCost = Number(auftrag.shipping_cost || 0);

  let taxAmount = Number(auftrag.tax_amount || 0);
  if (taxAmount <= 0 && subtotal > 0 && defaultTaxRate > 0) {
    taxAmount = Math.round((subtotal - discountAmount) * (defaultTaxRate / 100) * 100) / 100;
  }

  let totalAmount = Number(auftrag.total_amount || 0);
  if (totalAmount <= 0 && subtotal > 0) {
    totalAmount = Math.round((subtotal - discountAmount + taxAmount + shippingCost) * 100) / 100;
  }

  const options: PdfDocumentOptions = {
    documentType: "Auftrag" as any,
    documentNumber: auftrag.order_no,
    documentTitle: auftrag.title || "",
    customerSnapshot: customerSnap,
    customerEntity: auftrag.customer,
    deliveryAddress: auftrag.deliveryAddress,
    metadataItems,
    kontaktName: contactName,
    kontaktEmail: ctx?.user?.email,
    isDelivered,
    lineItems: items,
    showPrices: true,
    shippingMethod: auftrag.shipping_text || auftrag.shipping_method,
    shippingCost,
    shippingQuantity: Number(auftrag.shipping_quantity || 1),
    shippingTaxRate: defaultTaxRate,
    discountPercentage: Number(auftrag.discount_percentage || 0),
    discountAmount,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate: defaultTaxRate,
    currency: auftrag.currency || "EUR",
    notes: auftrag.notes,
    deliveryTime: effectiveDeliveryDate,
    deliveryDate: effectiveDeliveryDate,
    deliveryTerms: auftrag.delivery_terms,
    paymentTerms: paymentTermsFormatted,
    paymentMethod: auftrag.payment_method,
    taxProfile:
      (auftrag as any).tax_profile_case ||
      (auftrag.customer as any)?.tax_profile_case ||
      (auftrag.customer as any)?.defaultTaxProfile?.key ||
      customerSnap?.tax_profile_case ||
      customerSnap?.taxProfile,
    kundenreferenz: (auftrag as any).kundenreferenz || undefined,
    outputFilePath: ctx?.outputFilePath || "",
  };

  return { options, auftrag };
}

export async function buildOfferPdfOptions(
  offerInput: Offer | number | string,
  ctx?: BuildPdfContextOptions,
): Promise<{
  options: PdfDocumentOptions;
  offer: Offer;
}> {
  let offer: Offer;
  const offerRepo = AppDataSource.getRepository(Offer);

  if (typeof offerInput === "number" || typeof offerInput === "string") {
    const found = await offerRepo.findOne({
      where: [{ id: String(offerInput) }, { offerNumber: String(offerInput) }] as any,
      relations: ["lineItems"],
    });
    if (!found) {
      throw new Error(`Offer with ID ${offerInput} not found`);
    }
    offer = found;
  } else {
    offer = offerInput;
    if (!offer.lineItems) {
      const reloaded = await offerRepo.findOne({
        where: { id: offer.id },
        relations: ["lineItems"],
      });
      if (reloaded) offer = reloaded;
    }
  }

  const customerSnap = offer.customerSnapshot || {};
  const customerCompName = String(
    (customerSnap as any).companyName ||
    (customerSnap as any).company_name ||
    (customerSnap as any).legalName ||
    (customerSnap as any).displayName ||
    "",
  ).trim();
  const customerNum = String((customerSnap as any).customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactName =
    ctx?.user?.name ||
    ctx?.user?.username ||
    (customerSnap as any).contactName ||
    "";

  const rawItems = (offer.lineItems || [])
    .slice()
    .sort((a: any, b: any) => (Number(a.position) || 0) - (Number(b.position) || 0));

  const items = rawItems.map((it: any, idx: number) => {
    const qty = parseFlexibleNumber(it.baseQuantity) || 1;
    const unitPrice = Number(it.basePrice || 0);
    const lineTotal = Number(it.lineTotal || qty * unitPrice);
    return {
      position: it.position || idx + 1,
      artNr: (it as any).sourceItemId || (it as any).material || "—",
      bezeichnung: it.itemName || (it as any).description || "Item",
      remarks: it.notes || "-",
      vatRate: Number(it.taxRate ?? offer.taxRate ?? 19),
      quantity: qty,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
    };
  });

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const metadataItems: [string, string][] = [
    ["Kontakt", contactName],
    ["Kunde", kundeCombined],
    ["Datum", formatDateStr(offer.createdAt)],
  ];

  const defaultTaxRate = Number(offer.taxRate || 19);
  const subtotal = Number(offer.subtotal || 0);
  const discountAmount = Number(offer.discountAmount || 0);
  const shippingCost = Number(offer.shippingCost || 0);

  let taxAmount = Number(offer.taxAmount || 0);
  if (taxAmount <= 0 && subtotal > 0 && defaultTaxRate > 0) {
    taxAmount = Math.round((subtotal - discountAmount) * (defaultTaxRate / 100) * 100) / 100;
  }

  let totalAmount = Number(offer.totalAmount || 0);
  if (totalAmount <= 0 && subtotal > 0) {
    totalAmount = Math.round((subtotal - discountAmount + taxAmount + shippingCost) * 100) / 100;
  }

  const options: PdfDocumentOptions = {
    documentType: "Angebot" as any,
    documentNumber: offer.offerNumber,
    documentTitle: offer.title || "",
    customerSnapshot: customerSnap,
    deliveryAddress: offer.deliveryAddress,
    metadataItems,
    kontaktName: contactName,
    kontaktEmail: ctx?.user?.email,
    lineItems: items,
    showPrices: true,
    shippingMethod: offer.shippingMethod,
    shippingCost,
    shippingQuantity: Number(offer.shippingQuantity || 1),
    shippingTaxRate: Number(offer.shippingTaxRate ?? offer.taxRate ?? 19),
    discountPercentage: Number(offer.discountPercentage || 0),
    discountAmount,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate: defaultTaxRate,
    currency: offer.currency || "EUR",
    notes: offer.notes,
    deliveryTime: offer.deliveryTime,
    deliveryTerms: offer.deliveryTerms,
    paymentTerms: offer.paymentDueDays
      ? `Zahlungsziel: ${offer.paymentDueDays} Tage`
      : undefined,
    paymentMethod: offer.paymentMethod,
    outputFilePath: ctx?.outputFilePath || "",
  };

  return { options, offer };
}

export async function buildRechnungKPdfOptions(
  rkInput: RechnungK | number | string,
  ctx?: BuildPdfContextOptions,
): Promise<{
  options: PdfDocumentOptions;
  rechnungK: RechnungK;
}> {
  let rechnungK: RechnungK;
  const rechnungKRepo = AppDataSource.getRepository(RechnungK);

  if (typeof rkInput === "number" || typeof rkInput === "string") {
    const found = await rechnungKRepo.findOne({
      where: [{ id: String(rkInput) }, { invoice_number: String(rkInput) }] as any,
      relations: ["items", "customer"],
    });
    if (!found) {
      throw new Error(`Rechnungskorrektur with ID ${rkInput} not found`);
    }
    rechnungK = found;
  } else {
    rechnungK = rkInput;
    if (!rechnungK.items || !rechnungK.customer) {
      const reloaded = await rechnungKRepo.findOne({
        where: { id: rechnungK.id },
        relations: ["items", "customer"],
      });
      if (reloaded) rechnungK = reloaded;
    }
  }

  const defaultTaxRate =
    rechnungK.tax_rate !== undefined && rechnungK.tax_rate !== null
      ? Number(rechnungK.tax_rate)
      : (rechnungK.customer as any)?.defaultTaxProfile?.tax_rate !== undefined &&
        (rechnungK.customer as any)?.defaultTaxProfile?.tax_rate !== null
        ? Number((rechnungK.customer as any).defaultTaxProfile.tax_rate)
        : 19;

  const customerSnap = rechnungK.customerSnapshot || rechnungK.customer || {};
  const customerCompName = String(
    customerSnap.company_name || customerSnap.companyName || customerSnap.legalName || ""
  ).trim();
  const customerNum = String(customerSnap.customerNumber || "").trim();
  let kundeCombined = "—";
  if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
  else if (customerCompName) kundeCombined = customerCompName;
  else if (customerNum) kundeCombined = customerNum;

  const contactName =
    (rechnungK as any).ansprechpartner ||
    ctx?.user?.name ||
    ctx?.user?.username ||
    customerSnap.contactName ||
    "";

  const formatDateStr = (dateVal: any): string => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };

  const resolvedDate = formatDateStr(
    rechnungK.date_created || rechnungK.created_at || rechnungK.invoice_date,
  );

  const items = (rechnungK.items || []).map((it: any, idx: number) => {
    const qty = it.quantity !== undefined && it.quantity !== null ? Number(it.quantity) : 1;
    const unitPrice = Number(it.unit_price_eur || it.price || 0);
    const lineTotal =
      it.total_price !== undefined && it.total_price !== null
        ? Number(it.total_price)
        : it.lineTotal !== undefined && it.lineTotal !== null
          ? Number(it.lineTotal)
          : qty * unitPrice;
    return {
      position: it.position || idx + 1,
      artNr: it.itemNo || it.material || "—",
      bezeichnung: it.item_name || it.description || "Item",
      remarks: it.notes || it.remark_ex || "-",
      vatRate:
        it.taxRate !== undefined && it.taxRate !== null
          ? Number(it.taxRate)
          : defaultTaxRate,
      quantity: qty,
      unitPrice: unitPrice,
      lineTotal: lineTotal,
    };
  });

  const metadataItems: [string, string][] = [
    ["Kontakt", contactName],
    ["Kunde", kundeCombined],
    ["Datum", resolvedDate],
  ];

  const subtotal = Number(rechnungK.subtotal || 0);
  const discountAmount = Number(rechnungK.discount_amount || 0);
  const shippingCost = Number(rechnungK.shipping_cost || 0);

  let taxAmount = Number(rechnungK.tax_amount || 0);
  if (taxAmount <= 0 && subtotal > 0 && defaultTaxRate > 0) {
    taxAmount = Math.round((subtotal - discountAmount) * (defaultTaxRate / 100) * 100) / 100;
  }

  let totalAmount = Number(rechnungK.total_amount || 0);
  if (totalAmount <= 0 && subtotal > 0) {
    totalAmount = Math.round((subtotal - discountAmount + taxAmount + shippingCost) * 100) / 100;
  }

  const paymentTermsFormatted = rechnungK.payment_terms
    ? (() => {
      const m = String(rechnungK.payment_terms).match(/(\d+)/);
      return m ? `Zahlungsziel: ${m[1]} Tage` : `Zahlungsziel: ${rechnungK.payment_terms}`;
    })()
    : undefined;

  const options: PdfDocumentOptions = {
    documentType: "RK" as any,
    documentNumber: rechnungK.invoice_number || String(rechnungK.id),
    documentTitle: rechnungK.title || "",
    customerSnapshot: customerSnap,
    customerEntity: rechnungK.customer,
    deliveryAddress: rechnungK.deliveryAddress,
    metadataItems,
    kontaktName: contactName,
    kontaktEmail: ctx?.user?.email,
    isDelivered: true,
    lineItems: items,
    showPrices: true,
    shippingMethod: rechnungK.shipping_method,
    shippingCost,
    shippingQuantity: Number(rechnungK.shipping_quantity || 1),
    shippingTaxRate: defaultTaxRate,
    discountPercentage: Number(rechnungK.discount_percentage || 0),
    discountAmount,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate: defaultTaxRate,
    currency: rechnungK.currency || "EUR",
    notes: rechnungK.notes,
    deliveryTime: (rechnungK as any).delivery_date || rechnungK.date_delivery,
    deliveryDate: (rechnungK as any).delivery_date || rechnungK.date_delivery,
    deliveryTerms: rechnungK.delivery_terms,
    paymentTerms: paymentTermsFormatted,
    paymentMethod: rechnungK.payment_method,
    outputFilePath: ctx?.outputFilePath || "",
  };

  return { options, rechnungK };
}