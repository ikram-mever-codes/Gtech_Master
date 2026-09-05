import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Rechnung, StockWhere } from "../models/rechnung";
import { RechnungItem } from "../models/rechnung_items";
import { Rechnung_k } from "../models/rechnung_k";
import { RechnungKItem } from "../models/rechnung_k_items";
import { NumberSequenceService } from "../services/number_sequence_service";
import { numericTransformer } from "../utils/numeric-transformer";
import path from "path";
import fs from "fs";
import { generateGtechDocumentPdf } from "../services/gtechPdfGenerator";
import { generateRechnungKEml } from "../services/emlGenerator";
import { In } from "typeorm";
import { CustomerOrder } from "../models/customer_orders";
import { TaxProfile } from "../models/tax_profile";

/** Fetches documents linked to a correction invoice (Rechnung_k): the
 * original Rechnung it was created from, and the originating Auftrag
 * (CustomerOrder). Full records, not just ids. */

async function resolveFrozenTaxProfile(taxRate: number): Promise<any> {
  const taxProfileRepo = AppDataSource.getRepository(TaxProfile);
  const profiles = await taxProfileRepo.find({ where: { is_active: true } });
  const match = profiles.find((tp) => Number(tp.tax_rate) === Number(taxRate));
  return match
    ? {
        id: match.id,
        name: match.name,
        taxCase: match.tax_case || undefined,
        taxRate: Number(match.tax_rate),
        taxCode: match.tax_code || undefined,
      }
    : {
        id: null,
        name: "Frozen",
        taxCase: undefined,
        taxRate: Number(taxRate) || 19,
        taxCode: undefined,
      };
}

async function getLinkedDocumentsForRechnungK(rechnungK: Rechnung_k) {
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);

  const [originalRechnung, auftrag] = await Promise.all([
    rechnungK.original_rechnung_id
      ? rechnungRepo.findOne({
          where: { id: rechnungK.original_rechnung_id },
          select: ["id", "invoice_number", "title", "created_at"],
        })
      : Promise.resolve(null),
    rechnungK.auftrag_id
      ? customerOrderRepo.findOne({
          where: { id: rechnungK.auftrag_id },
          select: ["id", "order_no", "title", "created_at"],
        })
      : Promise.resolve(null),
  ]);

  return {
    rechnung: originalRechnung ? [originalRechnung] : [],
    auftrag: auftrag ? [auftrag] : [],
  };
}

/** Same as above, batched for many Rechnung_k at once. Returns a Map keyed
 * by rechnungK id. */
async function getLinkedDocumentsForRechnungenK(rechnungenK: Rechnung_k[]) {
  const empty = () => ({ rechnung: [] as any[], auftrag: [] as any[] });
  const result = new Map<string, ReturnType<typeof empty>>();
  rechnungenK.forEach((rk) => result.set(rk.id, empty()));

  if (rechnungenK.length === 0) return result;

  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);

  const originalRechnungIds = Array.from(
    new Set(
      rechnungenK
        .map((rk) => rk.original_rechnung_id)
        .filter((v): v is string => !!v),
    ),
  );
  const auftragIds = Array.from(
    new Set(
      rechnungenK
        .map((rk) => rk.auftrag_id)
        .filter((v): v is number => typeof v === "number"),
    ),
  );

  const [rechnungen, auftraege] = await Promise.all([
    originalRechnungIds.length
      ? rechnungRepo.find({
          where: { id: In(originalRechnungIds) },
          select: ["id", "invoice_number", "title", "created_at"],
        })
      : Promise.resolve([]),
    auftragIds.length
      ? customerOrderRepo.find({
          where: { id: In(auftragIds) },
          select: ["id", "order_no", "title", "created_at"],
        })
      : Promise.resolve([]),
  ]);

  const rechnungById = new Map(rechnungen.map((r: any) => [r.id, r]));
  const auftragById = new Map(auftraege.map((a: any) => [a.id, a]));

  for (const rk of rechnungenK) {
    const bucket = result.get(rk.id);
    if (!bucket) continue;
    if (rk.original_rechnung_id) {
      const orig = rechnungById.get(rk.original_rechnung_id);
      if (orig) bucket.rechnung.push(orig);
    }
    if (rk.auftrag_id) {
      const auftrag = auftragById.get(rk.auftrag_id);
      if (auftrag) bucket.auftrag.push(auftrag);
    }
  }

  return result;
}
/** Recomputes subtotal/tax/total on a correction invoice from its items */
async function recalculateRechnungKTotals(rechnungKId: string): Promise<void> {
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
  const rechnungK = await rechnungKRepo.findOne({
    where: { id: rechnungKId },
    relations: ["items"],
  });
  if (!rechnungK) return;

  const items = rechnungK.items || [];
  let subtotal = 0;
  for (const it of items) {
    subtotal += Number(it.total_price) || 0;
  }

  const round2 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 100) / 100;

  const taxRate = Number(rechnungK.tax_rate) || 0;
  const taxAmount = (subtotal * taxRate) / 100;

  rechnungK.subtotal = round2(subtotal);
  rechnungK.tax_amount = round2(taxAmount);
  rechnungK.total_amount = round2(subtotal + taxAmount);

  await rechnungKRepo.save(rechnungK);
}

/**
 * Get open quantities for all items in a Rechnung
 * This calculates how much quantity can still be corrected
 */
export const getRechnungOpenQuantities = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rechnungId } = req.params;

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({
      where: { id: rechnungId },
      relations: ["items"],
    });

    if (!rechnung) {
      res.status(404).json({
        success: false,
        message: "Rechnung not found",
      });
      return;
    }

    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const allRKs = await rechnungKRepo.find({
      where: { original_rechnung_id: rechnungId },
      relations: ["items"],
    });

    // Calculate corrected quantities per item
    const correctedQuantities: Record<string, number> = {};

    for (const rk of allRKs) {
      for (const item of rk.items || []) {
        if (item.sourceLineItemId) {
          const currentCorrected =
            correctedQuantities[item.sourceLineItemId] || 0;
          correctedQuantities[item.sourceLineItemId] =
            currentCorrected + (Number(item.quantity) || 0);
        }
      }
    }
    const itemsWithOpenQty = (rechnung.items || []).map((item) => {
      const originalQty = Number(item.quantity) || 0;
      const correctedQty = correctedQuantities[item.id] || 0;
      const openQty = Math.max(0, originalQty - correctedQty);

      return {
        id: item.id,
        item_name: item.item_name,
        itemNo: item.itemNo,
        material: item.material,
        quantity: originalQty,
        correctedQuantity: correctedQty,
        openQuantity: openQty,
        price: item.price,
        total_price: item.total_price,
        weight: item.weight,
        extraWeight: item.extraWeight,
        photo: item.photo,
      };
    });

    const totalOpenQuantity = itemsWithOpenQty.reduce(
      (sum, item) => sum + item.openQuantity,
      0,
    );

    res.json({
      success: true,
      data: {
        rechnungId: rechnung.id,
        invoiceNumber: rechnung.invoice_number,
        items: itemsWithOpenQty,
        totalOpenQuantity,
        totalOriginalQuantity: itemsWithOpenQty.reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching open quantities:", error);
    next(error);
  }
};

async function getCorrectedQuantityForItem(
  rechnungItemId: string,
  rechnungKIdToExclude?: string,
): Promise<number> {
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);

  // Find all RKs that have items referencing this original item
  const allRKs = await rechnungKRepo.find({
    relations: ["items"],
  });

  let totalCorrectedQty = 0;

  for (const rk of allRKs) {
    // Skip the current RK if we're excluding it (for update scenarios)
    if (rechnungKIdToExclude && rk.id === rechnungKIdToExclude) continue;

    for (const item of rk.items || []) {
      if (item.sourceLineItemId === rechnungItemId) {
        totalCorrectedQty += Number(item.quantity) || 0;
      }
    }
  }

  return totalCorrectedQty;
}

export const createRechnungKFromRechnung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rechnungId } = req.params;
    const { corrections, includeShipping, notes, internal_notes } = req.body;
    const shouldIncludeShipping = includeShipping !== false;

    if (
      !corrections ||
      !Array.isArray(corrections) ||
      corrections.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "Please provide at least one correction item with quantity and price.",
      });
      return;
    }

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const original = await rechnungRepo.findOne({
      where: { id: rechnungId },
      relations: ["items", "customer"],
    });

    if (!original) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    if (!original.customer) {
      res.status(400).json({
        success: false,
        message: "This Rechnung has no linked customer record.",
      });
      return;
    }

    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const allRKs = await rechnungKRepo.find({
      where: { original_rechnung_id: rechnungId },
      relations: ["items"],
    });

    const correctedQuantities: Record<string, number> = {};
    for (const rk of allRKs) {
      for (const item of rk.items || []) {
        if (item.sourceLineItemId) {
          correctedQuantities[item.sourceLineItemId] =
            (correctedQuantities[item.sourceLineItemId] || 0) +
            (Number(item.quantity) || 0);
        }
      }
    }

    const validationErrors = [];
    const validatedCorrections = [];

    for (const correction of corrections) {
      const originalItem = original.items.find(
        (item) => item.id === correction.itemId,
      );

      if (!originalItem) {
        validationErrors.push(
          `Item with ID ${correction.itemId} not found in original Rechnung.`,
        );
        continue;
      }

      const originalQty = Number(originalItem.quantity) || 0;
      const correctedQty = correctedQuantities[originalItem.id] || 0;
      const openQty = Math.max(0, originalQty - correctedQty);

      const correctionQty = Number(correction.quantity) || 0;

      if (correctionQty <= 0) {
        validationErrors.push(
          `Invalid quantity (${correctionQty}) for item: ${originalItem.item_name}`,
        );
        continue;
      }

      if (correctionQty > openQty) {
        validationErrors.push(
          `Cannot correct ${correctionQty} units for "${originalItem.item_name}". Only ${openQty} units remain uncorrected.`,
        );
        continue;
      }

      const correctionPrice = Number(correction.price);
      if (isNaN(correctionPrice) || correctionPrice < 0) {
        validationErrors.push(
          `Invalid price (${correctionPrice}) for item: ${originalItem.item_name}`,
        );
        continue;
      }

      // Price can never exceed the ORIGINAL line's price — a correction
      // reduces what the customer owes, it can't invent a higher price
      // than what was actually billed.
      const originalUnitPrice = Number(originalItem.price) || 0;
      if (correctionPrice > originalUnitPrice) {
        validationErrors.push(
          `Price for "${originalItem.item_name}" (${correctionPrice}) cannot exceed the original line price of ${originalUnitPrice}.`,
        );
        continue;
      }

      validatedCorrections.push({
        originalItem,
        quantity: correctionQty,
        price: correctionPrice,
      });
    }

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: "Validation errors occurred",
        errors: validationErrors,
      });
      return;
    }

    if (validatedCorrections.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid corrections to create.",
      });
      return;
    }

    const now = new Date();
    let correctionNo = "";
    try {
      correctionNo =
        await NumberSequenceService.getNextNumber("invoice_correction");
    } catch (err) {
      console.warn("Could not generate sequence number:", err);
      correctionNo = `K-${original.invoice_number}-${Date.now().toString().slice(-4)}`;
    }

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const rechnungK = rechnungKRepo.create({
      invoice_number: correctionNo,
      title: original.title,
      original_rechnung_id: original.id,
      auftrag_id: original.auftrag_id,
      auftrag_no: original.auftrag_no,
      order_number: original.order_number,
      invoice_date: now,
      due_date: original.due_date,
      delivery_date: original.delivery_date,
      date_created: dateCreatedStr,
      date_emailed: original.date_emailed,
      date_delivery: original.date_delivery,
      warehouse: original.warehouse,
      stock_where: original.stock_where || StockWhere.EU,
      subtotal: 0,
      tax_rate: original.tax_rate,
      tax_amount: 0,
      total_amount: 0,
      discount_percentage: original.discount_percentage,
      discount_amount: original.discount_amount,
      shipping_cost: shouldIncludeShipping ? original.shipping_cost : 0,
      shipping_quantity: shouldIncludeShipping ? original.shipping_quantity : 0,
      currency: original.currency,
      payment_method: original.payment_method,
      payment_terms: original.payment_terms,
      shipping_method: shouldIncludeShipping
        ? original.shipping_method
        : undefined,
      delivery_terms: original.delivery_terms,
      terms_conditions: original.terms_conditions,
      status: "open",
      // Editable at RK-creation time — falls back to the original
      // Rechnung's own comments only when nothing was typed for this RK.
      notes: notes !== undefined ? notes : original.notes,
      internal_notes:
        internal_notes !== undefined ? internal_notes : original.internal_notes,
      highlight_color: original.highlight_color,
      rechnung_customer_id: original.rechnung_customer_id,
      customerSnapshot: original.customerSnapshot,
      deliveryAddress: original.deliveryAddress,
    });

    const savedRechnungK = await rechnungKRepo.save(rechnungK);

    const itemRepo = AppDataSource.getRepository(RechnungKItem);
    const itemEntities = validatedCorrections.map(
      ({ originalItem, quantity, price }) =>
        itemRepo.create({
          rechnungId: savedRechnungK.id,
          item_name: originalItem.item_name,
          itemNo: originalItem.itemNo,
          material: originalItem.material,
          photo: originalItem.photo,
          specification: originalItem.specification,
          description: originalItem.description,
          quantity: quantity,
          max_qty: originalItem.max_qty,
          price: price,
          transferPrice: originalItem.transferPrice,
          purchasePrice: originalItem.purchasePrice,
          purchaseCurrency: originalItem.purchaseCurrency,
          taxRate: originalItem.taxRate,
          lineTotal: quantity * price,
          unit_price_eur: price,
          total_price: quantity * price,
          weight: originalItem.weight,
          extraWeight: originalItem.extraWeight,
          position: originalItem.position,
          highlightColor: originalItem.highlightColor,
          sourceLineItemId: originalItem.id,
          sourceItemId: originalItem.sourceItemId,
          order_no: originalItem.order_no,
          notes: originalItem.notes,
          remark: originalItem.remark,
          remark_order_item: originalItem.remark_order_item,
        }),
    );
    await itemRepo.save(itemEntities);

    await recalculateRechnungKTotals(savedRechnungK.id);

    const fullRechnungK = await rechnungKRepo.findOne({
      where: { id: savedRechnungK.id },
      relations: ["items", "customer"],
    });

    res.status(201).json({
      success: true,
      message: `Correction invoice ${correctionNo} created successfully`,
      data: fullRechnungK,
    });
  } catch (error) {
    console.error("Error creating Rechnung correction:", error);
    next(error);
  }
};

export const getAllRechnungenK = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungenK = await rechnungKRepo.find({
      order: { created_at: "DESC" },
      relations: ["items", "customer"],
    });

    const linkedDocumentsByRechnungKId =
      await getLinkedDocumentsForRechnungenK(rechnungenK);
    const distinctRates = Array.from(
      new Set(rechnungenK.map((rk) => Number(rk.tax_rate) || 19)),
    );
    const taxProfileByRate = new Map<number, any>();
    for (const rate of distinctRates) {
      taxProfileByRate.set(rate, await resolveFrozenTaxProfile(rate));
    }

    const rechnungenKWithLinkedDocuments = rechnungenK.map((rk: any) => {
      const linkedDocs = linkedDocumentsByRechnungKId.get(rk.id) || {
        rechnung: [],
        auftrag: [],
      };
      const title =
        rk.title ||
        linkedDocs.rechnung[0]?.title ||
        linkedDocs.auftrag[0]?.title ||
        undefined;
      return {
        ...rk,
        title,
        linkedDocuments: linkedDocs,
        taxProfile: taxProfileByRate.get(Number(rk.tax_rate) || 19),
      };
    });

    res.json({ success: true, data: rechnungenKWithLinkedDocuments });
  } catch (error) {
    next(error);
  }
};

export const getRechnungKById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungK = await rechnungKRepo.findOne({
      where: { id },
      relations: ["items", "customer"],
    });

    if (!rechnungK) {
      res
        .status(404)
        .json({ success: false, message: "Correction invoice not found" });
      return;
    }

    const linkedDocuments = await getLinkedDocumentsForRechnungK(rechnungK);
    const title =
      rechnungK.title ||
      linkedDocuments.rechnung[0]?.title ||
      linkedDocuments.auftrag[0]?.title ||
      undefined;
    const taxProfile = await resolveFrozenTaxProfile(rechnungK.tax_rate);

    res.json({
      success: true,
      data: { ...rechnungK, title, linkedDocuments, taxProfile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateRechnungKItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rechnungKId, itemId } = req.params;
    const { quantity, price } = req.body;

    if (quantity === undefined && price === undefined) {
      res.status(400).json({
        success: false,
        message: "Provide at least one of: quantity, price",
      });
      return;
    }

    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungK = await rechnungKRepo.findOne({
      where: { id: rechnungKId },
      relations: ["items"],
    });
    if (!rechnungK) {
      res
        .status(404)
        .json({ success: false, message: "Correction invoice not found" });
      return;
    }

    const itemRepo = AppDataSource.getRepository(RechnungKItem);
    const item = await itemRepo.findOne({
      where: { id: itemId, rechnungId: rechnungK.id },
    });
    if (!item) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }

    if (quantity !== undefined) {
      const parsedQty = Number(quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        res.status(400).json({
          success: false,
          message: "Quantity must be a positive number",
        });
        return;
      }

      if (item.sourceLineItemId) {
        const allRKs = await rechnungKRepo.find({
          where: { original_rechnung_id: rechnungK.original_rechnung_id },
          relations: ["items"],
        });

        let totalCorrectedQty = 0;
        for (const rk of allRKs) {
          if (rk.id === rechnungKId) continue; // Skip current RK
          for (const it of rk.items || []) {
            if (it.sourceLineItemId === item.sourceLineItemId) {
              totalCorrectedQty += Number(it.quantity) || 0;
            }
          }
        }

        const rechnungRepo = AppDataSource.getRepository(Rechnung);
        const originalRechnung = await rechnungRepo.findOne({
          where: { id: rechnungK.original_rechnung_id },
          relations: ["items"],
        });

        const originalItem = originalRechnung?.items?.find(
          (it) => it.id === item.sourceLineItemId,
        );
        const originalQty = Number(originalItem?.quantity) || 0;
        const openQty = Math.max(0, originalQty - totalCorrectedQty);

        const currentQty = Number(item.quantity) || 0;
        const availableQty = openQty + currentQty;

        if (parsedQty > availableQty) {
          res.status(400).json({
            success: false,
            message: `Cannot set quantity to ${parsedQty}. Only ${availableQty} units remain uncorrected.`,
          });
          return;
        }
      }

      item.quantity = parsedQty;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({
          success: false,
          message: "Price must be a non-negative number",
        });
        return;
      }
      item.price = parsedPrice;
    }

    const finalQty = Number(item.quantity) || 1;
    const finalPrice = Number(item.price) || 0;
    item.total_price = finalQty * finalPrice;
    item.lineTotal = finalQty * finalPrice;

    await itemRepo.save(item);
    await recalculateRechnungKTotals(rechnungK.id);

    const fullRechnungK = await rechnungKRepo.findOne({
      where: { id: rechnungK.id },
      relations: ["items", "customer"],
    });

    res.json({
      success: true,
      message: "Line item updated",
      data: { item, rechnungK: fullRechnungK },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRechnungK = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungK = await rechnungKRepo.findOne({ where: { id } });

    if (!rechnungK) {
      res
        .status(404)
        .json({ success: false, message: "Correction invoice not found" });
      return;
    }

    await rechnungKRepo.remove(rechnungK);
    res.json({ success: true, message: "Correction invoice deleted" });
  } catch (error) {
    next(error);
  }
};

export const downloadRechnungKPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungK = await rechnungKRepo.findOne({
      where: [{ id: String(id) }, { invoice_number: String(id) }],
      relations: ["items", "customer"],
    });

    if (!rechnungK) {
      res
        .status(404)
        .json({ success: false, message: "Correction invoice not found" });
      return;
    }

    const defaultTaxRate =
      rechnungK.tax_rate !== undefined && rechnungK.tax_rate !== null
        ? Number(rechnungK.tax_rate)
        : 19;

    const customerSnap = rechnungK.customerSnapshot || rechnungK.customer || {};
    const contactName =
      (req as any).user?.name || (req as any).user?.username || "";
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

    const uploadsDir = path.join(__dirname, "../../uploads/rechnungen_k");
    const filePath = path.join(
      uploadsDir,
      `rk_${rechnungK.invoice_number || rechnungK.id}.pdf`,
    );

    const rawItems = (rechnungK.items || [])
      .slice()
      .sort(
        (a: any, b: any) =>
          (Number(a.position) || 0) - (Number(b.position) || 0),
      );

    const items = rawItems.map((it: any, idx: number) => {
      const qty =
        it.quantity !== undefined && it.quantity !== null
          ? Number(it.quantity)
          : 1;
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

    const auftragNo =
      rechnungK.auftrag_no ||
      rechnungK.order_number ||
      (rechnungK as any).auftragNo;

    await generateGtechDocumentPdf({
      documentType: "RK" as any,
      documentNumber: rechnungK.invoice_number,
      documentTitle: rechnungK.title || "",
      customerSnapshot: customerSnap,
      customerEntity: rechnungK.customer,
      deliveryAddress: rechnungK.deliveryAddress,
      metadataItems: [
        ["Kontakt", String(contactName || "")],
        ["Kunde", String(kundeCombined || "")],
        ...(auftragNo
          ? [["Auftrag", String(auftragNo)] as [string, string]]
          : []),
        [
          "Datum",
          String(
            rechnungK.date_created ||
              rechnungK.created_at ||
              rechnungK.invoice_date ||
              "",
          ),
        ],
      ] as [string, string][],
      kontaktName: contactName,
      kontaktEmail: (req as any).user?.email,
      isDelivered: true,
      lineItems: items,
      showPrices: true,
      shippingMethod: rechnungK.shipping_method,
      shippingCost: Number(rechnungK.shipping_cost || 0),
      shippingQuantity: Number(rechnungK.shipping_quantity || 1),
      shippingTaxRate: defaultTaxRate,
      discountPercentage: Number(rechnungK.discount_percentage || 0),
      discountAmount: Number(rechnungK.discount_amount || 0),
      subtotal: Number(rechnungK.subtotal || 0),
      taxAmount: Number(rechnungK.tax_amount || 0),
      totalAmount: Number(rechnungK.total_amount || 0),
      taxRate: defaultTaxRate,
      currency: rechnungK.currency || "EUR",
      notes: rechnungK.notes,
      deliveryTime: (rechnungK as any).delivery_date || rechnungK.date_delivery,
      deliveryDate: (rechnungK as any).delivery_date || rechnungK.date_delivery,
      deliveryTerms: rechnungK.delivery_terms,
      paymentTerms: rechnungK.payment_terms
        ? `Zahlungsziel: ${rechnungK.payment_terms} Tage`
        : undefined,
      paymentMethod: rechnungK.payment_method,
      taxProfile:
        (rechnungK as any).tax_profile_case ||
        (rechnungK.customer as any)?.tax_profile_case ||
        (rechnungK.customer as any)?.defaultTaxProfile?.key ||
        customerSnap?.tax_profile_case ||
        customerSnap?.taxProfile,
      kundenreferenz: (rechnungK as any).kundenreferenz || undefined,
      outputFilePath: filePath,
    });

    const rawTitle =
      (rechnungK as any).title ||
      (rechnungK as any).auftrag?.title ||
      (rawItems?.[0] as any)?.item_name ||
      (rawItems?.[0] as any)?.description ||
      "";
    const cleanTitle = String(rawTitle || "")
      .trim()
      .replace(/[^\w-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    const docNo = String(rechnungK.invoice_number || rechnungK.id || "rk")
      .trim()
      .replace(/[\s_]+/g, "_");
    const downloadFileName = cleanTitle
      ? `Rechnungskorrektur_${docNo}_GTech_${cleanTitle}.pdf`
      : `Rechnungskorrektur_${docNo}_GTech.pdf`;

    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadFileName}"; filename*=UTF-8''${encodeURIComponent(downloadFileName)}`,
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

export const updateRechnungK = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      customerSnapshot,
      deliveryAddress,
      notes,
      internal_notes,
      highlight_color,
      title,
    } = req.body;

    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
    const rechnungK = await rechnungKRepo.findOne({
      where: { id },
      relations: ["items", "customer"],
    });

    if (!rechnungK) {
      res
        .status(404)
        .json({ success: false, message: "Correction invoice not found" });
      return;
    }

    if (notes !== undefined) rechnungK.notes = notes;
    if (internal_notes !== undefined) rechnungK.internal_notes = internal_notes;
    if (highlight_color !== undefined)
      rechnungK.highlight_color = highlight_color;
    if (title !== undefined) rechnungK.title = title;
    if (customerSnapshot !== undefined)
      rechnungK.customerSnapshot = { ...customerSnapshot };
    if (deliveryAddress !== undefined)
      rechnungK.deliveryAddress = { ...deliveryAddress };

    await rechnungKRepo.save(rechnungK);

    res.json({
      success: true,
      message: "Correction invoice updated successfully",
      data: rechnungK,
    });
  } catch (error) {
    console.error("[updateRechnungK] error:", error);
    next(error);
  }
};

export const downloadRechnungKEml = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    console.log("Generating EML for RechnungK ID:", id);
    const emlData = await generateRechnungKEml(id, {
      user: (req as any).user,
    });

    res.setHeader("Content-Type", "message/rfc822");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${emlData.filename}"; filename*=UTF-8''${encodeURIComponent(emlData.filename)}`,
    );
    fs.createReadStream(emlData.emlFilePath).pipe(res);
  } catch (error) {
    console.error("[downloadRechnungKEml] error:", error);
    next(error);
  }
};
