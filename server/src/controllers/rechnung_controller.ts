import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Rechnung, StockWhere } from "../models/rechnung";
import { RechnungCustomer } from "../models/rechnung_customer";
import { RechnungItem } from "../models/rechnung_items";
import { AuftragStatus, CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Customer } from "../models/customers";
import path from "path";
import fs from "fs";
import { generateGtechDocumentPdf } from "../services/gtechPdfGenerator";
import { generateRechnungLieferscheinEml } from "../services/emlGenerator";
import { CCIInvoice } from "../models/cci_invoice";
import { CCICustomer } from "../models/cci_customer";
import { CCIItem } from "../models/cci_items";
import { NumberSequenceService } from "../services/number_sequence_service";
import { createLieferscheinFromRechnung } from "./lieferschein_controller";
import { Lieferschein } from "../models/lieferscheine";
import { In } from "typeorm/find-options/operator/In";
import { Rechnung_k } from "../models/rechnung_k";

/** Fetches documents linked to a Rechnung: the originating Auftrag
 * (CustomerOrder, via auftrag_id) and every correction invoice
 * (Rechnung_k) created against it (via original_rechnung_id). Full
 * records, not just ids. */
async function getLinkedDocumentsForRechnung(rechnung: Rechnung) {
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);

  const [auftrag, rechnungenK] = await Promise.all([
    rechnung.auftrag_id
      ? customerOrderRepo.findOne({
        where: { id: rechnung.auftrag_id },
        select: ["id", "order_no", "created_at"],
      })
      : Promise.resolve(null),
    rechnungKRepo.find({
      where: { original_rechnung_id: rechnung.id },
      select: ["id", "invoice_number", "created_at", "original_rechnung_id"],
      order: { created_at: "DESC" },
    }),
  ]);

  return {
    auftrag: auftrag ? [auftrag] : [],
    rechnungenK,
  };
}

/** Same as above, batched for many Rechnungen at once. Returns a Map keyed
 * by rechnung id. */
async function getLinkedDocumentsForRechnungen(rechnungen: Rechnung[]) {
  const empty = () => ({ auftrag: [] as any[], rechnungenK: [] as any[] });
  const result = new Map<string, ReturnType<typeof empty>>();
  rechnungen.forEach((r) => result.set(r.id, empty()));

  if (rechnungen.length === 0) return result;

  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);

  const auftragIds = Array.from(
    new Set(
      rechnungen
        .map((r) => r.auftrag_id)
        .filter((v): v is number => typeof v === "number"),
    ),
  );
  const rechnungIds = rechnungen.map((r) => r.id);

  const [auftraege, rechnungenK] = await Promise.all([
    auftragIds.length
      ? customerOrderRepo.find({
        where: { id: In(auftragIds) },
        select: ["id", "order_no", "created_at"],
      })
      : Promise.resolve([]),
    rechnungKRepo.find({
      where: { original_rechnung_id: In(rechnungIds) },
      select: ["id", "invoice_number", "created_at", "original_rechnung_id"],
      order: { created_at: "DESC" },
    }),
  ]);

  const auftragById = new Map(auftraege.map((a: any) => [a.id, a]));

  for (const r of rechnungen) {
    if (!r.auftrag_id) continue;
    const bucket = result.get(r.id);
    const auftrag = auftragById.get(r.auftrag_id);
    if (bucket && auftrag) bucket.auftrag.push(auftrag);
  }

  for (const rk of rechnungenK) {
    const bucket = result.get(rk.original_rechnung_id as any);
    if (bucket) bucket.rechnungenK.push(rk);
  }

  return result;
}

export const createRechnungFromAuftrag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { auftragId } = req.params;
    const { selectedItems, notes, deliveryDate, warehouse } = req.body;

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 line item must be selected to generate a Rechnung",
      });
      return;
    }

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const auftrag = await customerOrderRepo.findOne({
      where: { id: Number(auftragId) },
      relations: ["orderItems", "customer"],
    });

    if (!auftrag) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");

    let invoiceNo = "";
    try {
      invoiceNo = await NumberSequenceService.getNextNumber("invoice");
    } catch (err) {
      console.warn("Could not generate sequence number for invoice:", err);
      invoiceNo = `R${yy}${mm}-${Date.now().toString().slice(-4)}`;
    }

    let deliveryNoteNo = "";
    try {
      deliveryNoteNo =
        await NumberSequenceService.getNextNumber("delivery_note");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for delivery note:",
        err,
      );
      deliveryNoteNo = `LS${yy}${mm}-${Date.now().toString().slice(-4)}`;
    }

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const custRepo = AppDataSource.getRepository(Customer);
    let originalCust: Customer | null = null;
    if (auftrag.customer_id) {
      originalCust = await custRepo.findOne({
        where: { id: auftrag.customer_id },
        relations: ["businessDetails"],
      });
    }

    const rechnungCustomerRepo = AppDataSource.getRepository(RechnungCustomer);
    const rechnungCustomer = rechnungCustomerRepo.create({
      original_customer_id: auftrag.customer_id || undefined,
      company_name:
        auftrag.customerSnapshot?.legalName ||
        originalCust?.legalName ||
        originalCust?.legalName ||
        "Customer",
      email:
        auftrag.customerSnapshot?.email || originalCust?.email || undefined,
      tax_number:
        auftrag.customerSnapshot?.vatId ||
        originalCust?.vatTaxId ||
        originalCust?.taxNumber ||
        undefined,
      bill_to_address:
        auftrag.customerSnapshot?.address ||
        originalCust?.businessDetails?.address ||
        undefined,
      ship_to_address:
        auftrag.customerSnapshot?.street ||
        originalCust?.businessDetails?.address ||
        undefined,
      city:
        auftrag.customerSnapshot?.city ||
        originalCust?.businessDetails?.city ||
        undefined,
      country:
        auftrag.customerSnapshot?.country || originalCust?.country || undefined,
      phone:
        auftrag.customerSnapshot?.contactPhoneNumber ||
        originalCust?.contactPhoneNumber ||
        undefined,
    });
    const savedCustomerSnapshot =
      await rechnungCustomerRepo.save(rechnungCustomer);

    let subtotal = 0;
    const itemsToCreate: Partial<RechnungItem>[] = [];
    const customerOrderItemRepo =
      AppDataSource.getRepository(CustomerOrderItem);

    for (const selItem of selectedItems) {
      const sourceLine = (auftrag.orderItems || []).find(
        (li) =>
          String(li.id) ===
          String(selItem.sourceLineItemId || selItem.lineItemId),
      );

      const qty =
        Number(selItem.qty || selItem.quantity || sourceLine?.quantity) || 1;
      const price = Number(selItem.price || sourceLine?.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      const itemName = selItem.itemName || sourceLine?.itemName || "Item";

      const itemData: Partial<RechnungItem> = {
        item_name: itemName,
        itemNo:
          selItem.itemNo ||
          sourceLine?.itemNo ||
          sourceLine?.material ||
          undefined,
        material: sourceLine?.material || undefined,
        photo: sourceLine?.photo || undefined,
        specification: sourceLine?.specification || undefined,
        description: sourceLine?.description || undefined,
        weight: sourceLine?.weight || undefined,
        extraWeight: sourceLine?.extraWeight || undefined,
        taxRate: sourceLine?.taxRate || undefined,
        highlightColor: sourceLine?.highlightColor || undefined,
        sourceLineItemId: sourceLine?.id || undefined,
        sourceItemId: sourceLine?.sourceItemId || undefined,
        notes: sourceLine?.notes || undefined,
        remark_order_item: selItem.remark_order_item || undefined,
        quantity: qty,
        price: price,
        unit_price_eur: price,
        total_price: lineTotal,
        order_no: auftrag.order_no,
        remark: selItem.notes || sourceLine?.description || undefined,
        position: (itemsToCreate.length || 0) + 1,
        max_qty: qty,
        transferPrice: price,
        purchasePrice: price,
        purchaseCurrency: auftrag.currency || "EUR",
        lineTotal: lineTotal,
      };

      itemsToCreate.push(itemData);

      if (sourceLine) {
        const currentQty = Number(sourceLine.quantity) || 0;
        const newRemainingQty = Math.max(0, currentQty - qty);
        sourceLine.quantity = newRemainingQty;
        sourceLine.lineTotal = newRemainingQty * Number(sourceLine.price || 0);
        await customerOrderItemRepo.save(sourceLine);
      }
    }

    const totalRemainingQty = (auftrag.orderItems || []).reduce(
      (sum, li) => sum + Number(li.quantity || 0),
      0,
    );

    // Advance both the legacy `status` field and the delivery-lifecycle
    // `auftrag_status` field together. `auftrag_status` is what drives the
    // Auftrag-tab sort order and row background highlighting, so it must
    // stay in sync with every Rechnung generated off this Auftrag.
    // A manually CLOSED Auftrag is never reopened by a later Rechnung —
    // closing is a deliberate, final action ("we're done even though
    // qty open > 0"), so `status` still tracks fulfillment but
    // `auftrag_status` is left as CLOSED.
    if (auftrag.auftrag_status !== AuftragStatus.CLOSED) {
      if (totalRemainingQty <= 0) {
        auftrag.status = "Completed";
        auftrag.auftrag_status = AuftragStatus.DELIVERED;
      } else {
        auftrag.status = "In Progress";
        auftrag.auftrag_status = AuftragStatus.PARTIALLY_DELIVERED;
      }
    } else if (totalRemainingQty <= 0) {
      auftrag.status = "Completed";
    } else {
      auftrag.status = "In Progress";
    }
    await customerOrderRepo.save(auftrag);

    const taxRate = Number(auftrag.tax_rate ?? 19);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const discountPercentage = Number(auftrag.discount_percentage ?? 0);
    const discountAmount = Number(auftrag.discount_amount ?? 0);
    const shippingCost = Number(auftrag.shipping_cost ?? 0);
    const shippingQuantity = Number(auftrag.shipping_quantity ?? 1);

    // ============================================
    // CREATE RECHNUNG
    // ============================================
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = rechnungRepo.create({
      invoice_number: invoiceNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      invoice_date: now,
      delivery_date: deliveryDate ? new Date(deliveryDate) : undefined,
      warehouse: warehouse || "CN",
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: auftrag.currency || "EUR",
      notes: notes || auftrag.notes || "",
      status: "open",
      customer: savedCustomerSnapshot,
      rechnung_customer_id: savedCustomerSnapshot.id,
      date_created: dateCreatedStr,
      date_emailed: auftrag.date_emailed || undefined,
      date_delivery: auftrag.date_delivery || undefined,
      stock_where: auftrag.stock_where || StockWhere.EU,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      shipping_cost: shippingCost,
      shipping_quantity: shippingQuantity,
      payment_terms: auftrag.payment_terms || undefined,
      delivery_terms: auftrag.delivery_terms || undefined,
      terms_conditions: auftrag.terms_conditions || undefined,
      internal_notes: auftrag.internal_notes || undefined,
      highlight_color: auftrag.highlight_color || undefined,
      customerSnapshot: auftrag.customerSnapshot || undefined,
      deliveryAddress: auftrag.deliveryAddress || undefined,
      payment_method: auftrag.payment_method || undefined,
      shipping_method: auftrag.shipping_method || undefined,
    });

    const savedRechnung: Rechnung = await rechnungRepo.save(rechnung);

    // ============================================
    // SAVE RECHNUNG ITEMS
    // ============================================
    const rechnungItemRepo = AppDataSource.getRepository(RechnungItem);
    const itemEntities = itemsToCreate.map((item) =>
      rechnungItemRepo.create({
        ...item,
        rechnungId: savedRechnung.id,
      }),
    );
    await rechnungItemRepo.save(itemEntities);

    // Get full Rechnung with relations
    const fullRechnung = await rechnungRepo.findOne({
      where: { id: savedRechnung.id },
      relations: ["items", "customer"],
    });

    // ============================================
    // CREATE LIEFERSCHEIN FROM THE SAME AUFTRAG DATA
    // ============================================
    if (fullRechnung) {
      try {
        await createLieferscheinFromRechnung(fullRechnung, deliveryNoteNo);
      } catch (err) {
        console.warn("Could not create Lieferschein:", err);
        // Don't fail the Rechnung creation if Lieferschein creation fails
      }
    }

    // ============================================
    // CREATE CCI INVOICE (Mirror to CCI tables)
    // ============================================
    try {
      const cciCustRepo = AppDataSource.getRepository(CCICustomer);
      const cciCust = cciCustRepo.create({
        original_customer_id: auftrag.customer_id
          ? String(auftrag.customer_id)
          : undefined,
        company_name: savedCustomerSnapshot.company_name,
        email: savedCustomerSnapshot.email,
        tax_number: savedCustomerSnapshot.tax_number,
        bill_to_address: savedCustomerSnapshot.bill_to_address,
        ship_to_address: savedCustomerSnapshot.ship_to_address,
        city: savedCustomerSnapshot.city,
        country: savedCustomerSnapshot.country,
        phone: savedCustomerSnapshot.phone,
      });
      const savedCciCust = await cciCustRepo.save(cciCust);

      const cciInvRepo: any = AppDataSource.getRepository(CCIInvoice);
      const cciInv = cciInvRepo.create({
        invoice_number: invoiceNo,
        order_number: auftrag.order_no,
        cargo_no: deliveryNoteNo || auftrag.order_no,
        invoice_date: now,
        delivery_date: deliveryDate ? new Date(deliveryDate) : now,
        due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        net_total: subtotal,
        tax_amount: taxAmount,
        gross_total: totalAmount,
        freight_cost: shippingCost,
        description: notes || auftrag.notes || "",
        status: "open",
        customer: savedCciCust,
        cci_customer_id: savedCciCust.id,
        discount_percentage: discountPercentage,
        discount_amount: discountAmount,
        payment_terms: auftrag.payment_terms || undefined,
        shipping_method: auftrag.shipping_method || undefined,
      });
      const savedCciInv = await cciInvRepo.save(cciInv);

      const cciItemRepo: any = AppDataSource.getRepository(CCIItem);
      const cciItems = itemsToCreate.map((it) =>
        cciItemRepo.create({
          cci_invoice_id: savedCciInv.id,
          item_name: it.item_name || "Item",
          item_no_de: it.itemNo || undefined,
          quantity: it.quantity || 1,
          unit_price: it.unit_price_eur || 0,
          total_price: it.total_price || 0,
          order_no: auftrag.order_no,
          remark: it.remark || it.notes,
          itemNo: it.itemNo,
          material: it.material,
          specification: it.specification,
          description: it.description,
          weight: it.weight,
          extraWeight: it.extraWeight,
          taxRate: it.taxRate,
          sourceItemId: it.sourceItemId,
          notes: it.notes,
        }),
      );
      await cciItemRepo.save(cciItems);
    } catch (cciErr) {
      console.warn("Could not mirror to CCI tables:", cciErr);
    }

    res.status(201).json({
      success: true,
      message: `Rechnung ${invoiceNo} created successfully`,
      data: fullRechnung,
    });
  } catch (error) {
    console.error("Error creating Rechnung:", error);
    next(error);
  }
};
export const getAllRechnungen = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const filter = (req.query.filter as string) || "";

    const qb = rechnungRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.items", "items")
      .leftJoinAndSelect("r.customer", "c")
      .orderBy("r.created_at", "DESC");

    if (filter === "missing_gelangenheitsbestaetigung") {
      qb.andWhere(
        "(r.tax_profile_case IN ('EU_IGL', 'third_country') OR (c.country IS NOT NULL AND c.country != '' AND c.country NOT IN ('DE', 'Deutschland', 'DEU')))",
      ).andWhere(
        "(r.gelangenheitsbestaetigung_doc IS NULL OR r.gelangenheitsbestaetigung_doc = '' OR r.gelangenheitsbestaetigung_doc = 'null')",
      );
    }

    const rechnungen = await qb.getMany();

    const linkedDocumentsByRechnungId =
      await getLinkedDocumentsForRechnungen(rechnungen);

    const rechnungenWithLinkedDocuments = rechnungen.map((r: any) => ({
      ...r,
      linkedDocuments: linkedDocumentsByRechnungId.get(r.id) || {
        auftrag: [],
        rechnungenK: [],
      },
    }));

    res.json({
      success: true,
      data: rechnungenWithLinkedDocuments,
    });
  } catch (error) {
    next(error);
  }
};

export const getLieferscheine = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferscheine = await lieferscheinRepo.find({
      order: { created_at: "DESC" },
      relations: ["rechnung", "rechnung.items", "rechnung.customer"],
    });

    // Transform to frontend-friendly format
    const formattedLieferscheine = lieferscheine.map((ls) => {
      const rechnung = ls.rechnung;
      const customer = rechnung?.customer;
      const items = rechnung?.items || [];

      return {
        id: ls.id,
        deliveryNoteNo: ls.delivery_note_number,
        invoiceNumber: ls.invoice_number,
        orderNumber: ls.auftrag_no || ls.order_number,
        date: ls.delivery_date,
        status: ls.status,
        customerName: customer?.company_name || "—",
        city: customer?.city || "",
        country: customer?.country || "",
        itemCount: items.length,
        items: items.map((item) => ({
          id: item.id,
          itemName: item.item_name || "—",
          itemNo: item.itemNo || "—",
          quantity: item.quantity,
          remark: item.remark || item.notes,
          weight: item.weight,
          photo: item.photo,
        })),
        highlightColor: ls.highlight_color,
        createdAt: ls.created_at,
        rechnungId: rechnung?.id,
      };
    });

    res.json({
      success: true,
      data: formattedLieferscheine,
    });
  } catch (error) {
    console.error("Error fetching Lieferscheine:", error);
    next(error);
  }
};

export const getRechnungById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({
      where: { id },
      relations: ["items", "customer"],
    });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    const linkedDocuments = await getLinkedDocumentsForRechnung(rechnung);

    res.json({
      success: true,
      data: { ...rechnung, linkedDocuments },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRechnung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({ where: { id } });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    await rechnungRepo.remove(rechnung);
    res.json({
      success: true,
      message: "Rechnung deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const THREE_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 3;

const isWithinEditableWindow = (dateVal: any): boolean => {
  if (!dateVal) return true;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return true;
  return Date.now() - d.getTime() <= THREE_MONTHS_MS;
};

export const updateRechnung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      customerSnapshot,
      deliveryAddress,
      gelangenheitsbestaetigung_doc,
      tax_profile_case,
      notes,
      internal_notes,
      highlight_color,
    } = req.body;

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({
      where: { id },
      relations: ["items", "customer"],
    });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    if (gelangenheitsbestaetigung_doc !== undefined)
      rechnung.gelangenheitsbestaetigung_doc = gelangenheitsbestaetigung_doc;
    if (tax_profile_case !== undefined)
      rechnung.tax_profile_case = tax_profile_case;
    if (notes !== undefined) rechnung.notes = notes;
    if (internal_notes !== undefined) rechnung.internal_notes = internal_notes;
    if (highlight_color !== undefined)
      rechnung.highlight_color = highlight_color;

    const addressPatch: Record<string, any> = {};
    if (customerSnapshot !== undefined) {
      rechnung.customerSnapshot = { ...customerSnapshot };
      addressPatch.customerSnapshot = rechnung.customerSnapshot;
    }
    if (deliveryAddress !== undefined) {
      rechnung.deliveryAddress = { ...deliveryAddress };
      addressPatch.deliveryAddress = rechnung.deliveryAddress;
    }

    await rechnungRepo.save(rechnung);

    if (Object.keys(addressPatch).length > 0) {
      await rechnungRepo
        .createQueryBuilder()
        .update(Rechnung)
        .set(addressPatch)
        .where("id = :id", { id })
        .execute();
    }

    const fullRechnung = await rechnungRepo.findOne({
      where: { id: rechnung.id },
      relations: ["items", "customer"],
    });

    res.json({
      success: true,
      message: "Rechnung updated successfully",
      data: fullRechnung || rechnung,
    });
  } catch (error) {
    console.error("[updateRechnung] error:", error);
    next(error);
  }
};

export const uploadGelangenheitsbestaetigung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({ where: { id } });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    const docPath = `/uploads/${file.filename}`;
    rechnung.gelangenheitsbestaetigung_doc = docPath;
    await rechnungRepo.save(rechnung);

    res.json({
      success: true,
      message: "Gelangenheitsbestätigung uploaded successfully",
      data: {
        gelangenheitsbestaetigung_doc: docPath,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGelangenheitsbestaetigung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({ where: { id } });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    rechnung.gelangenheitsbestaetigung_doc = null as any;
    await rechnungRepo.save(rechnung);

    res.json({
      success: true,
      message: "Gelangenheitsbestätigung removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const downloadRechnungPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({
      where: [{ id: String(id) }, { invoice_number: String(id) }],
      relations: ["items", "customer"],
    });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    const defaultTaxRate =
      rechnung.tax_profile_case === "EU_IGL" ||
      rechnung.tax_profile_case === "third_country"
        ? 0
        : rechnung.tax_rate !== undefined && rechnung.tax_rate !== null
          ? Number(rechnung.tax_rate)
          : 19;

    const customerSnap = rechnung.customerSnapshot || rechnung.customer || {};
    const contactName =
      (req as any).user?.name || (req as any).user?.username || "Admin";
    const customerCompName = (
      customerSnap.company_name ||
      customerSnap.companyName ||
      customerSnap.legalName ||
      ""
    ).trim();
    const customerNum = (customerSnap.customerNumber || "").trim();
    let kundeCombined = "—";
    if (customerCompName && customerNum)
      kundeCombined = `${customerCompName} · ${customerNum}`;
    else if (customerCompName) kundeCombined = customerCompName;
    else if (customerNum) kundeCombined = customerNum;

    const uploadsDir = path.join(__dirname, "../../uploads/rechnungen");
    const filePath = path.join(
      uploadsDir,
      `rechnung_${rechnung.invoice_number || rechnung.id}.pdf`,
    );

    const items = (rechnung.items || []).map((it: any, idx: number) => ({
      position: it.position || idx + 1,
      artNr: it.itemNo || it.material || "—",
      bezeichnung: it.item_name || it.description || "Item",
      remarks: it.remark || it.notes || "-",
      vatRate:
        it.taxRate !== undefined && it.taxRate !== null
          ? Number(it.taxRate)
          : defaultTaxRate,
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unit_price_eur || it.price || 0),
      lineTotal: Number(
        it.total_price ||
        it.lineTotal ||
        Number(it.quantity || 1) * Number(it.unit_price_eur || it.price || 0),
      ),
    }));

    await generateGtechDocumentPdf({
      documentType: "Rechnung",
      documentNumber: rechnung.invoice_number,
      customerSnapshot: customerSnap,
      customerEntity: rechnung.customer,
      deliveryAddress: rechnung.deliveryAddress,
      metadataItems: [
        ["Ansprechpartner", contactName],
        ["Kunde", kundeCombined],
        [
          "Datum",
          rechnung.date_created || rechnung.created_at || rechnung.invoice_date,
        ],
      ],
      lineItems: items,
      showPrices: true,
      shippingMethod: rechnung.shipping_method,
      shippingCost: Number(rechnung.shipping_cost || 0),
      shippingQuantity: Number(rechnung.shipping_quantity || 1),
      shippingTaxRate: defaultTaxRate,
      discountPercentage: Number(rechnung.discount_percentage || 0),
      discountAmount: Number(rechnung.discount_amount || 0),
      subtotal: Number(rechnung.subtotal || 0),
      taxAmount: Number(rechnung.tax_amount || 0),
      totalAmount: Number(rechnung.total_amount || 0),
      taxRate: defaultTaxRate,
      currency: rechnung.currency || "EUR",
      notes: rechnung.notes,
      deliveryTime: rechnung.date_delivery,
      deliveryTerms: rechnung.delivery_terms,
      paymentTerms: rechnung.payment_terms
        ? `Zahlungsziel: ${rechnung.payment_terms} Tage`
        : undefined,
      paymentMethod: rechnung.payment_method,
      outputFilePath: filePath,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rechnung_${rechnung.invoice_number}.pdf`,
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

export const downloadRechnungEml = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    console.log("Generating EML for rechnung ID:", id);
    const emlData = await generateRechnungLieferscheinEml(id);

    res.setHeader("Content-Type", "message/rfc822");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${emlData.filename}"`,
    );
    fs.createReadStream(emlData.emlFilePath).pipe(res);
  } catch (err) {
    console.error("Error in downloadRechnungEml:", err);
    next(err);
  }
};
