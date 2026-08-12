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
import { In } from "typeorm";
import { CustomerOrder } from "../models/customer_orders";

/** Fetches documents linked to a correction invoice (Rechnung_k): the
 * original Rechnung it was created from, and the originating Auftrag
 * (CustomerOrder). Full records, not just ids. */
async function getLinkedDocumentsForRechnungK(rechnungK: Rechnung_k) {
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);

  const [originalRechnung, auftrag] = await Promise.all([
    rechnungK.original_rechnung_id
      ? rechnungRepo.findOne({
        where: { id: rechnungK.original_rechnung_id },
        select: ["id", "invoice_number", "created_at"],
      })
      : Promise.resolve(null),
    rechnungK.auftrag_id
      ? customerOrderRepo.findOne({
        where: { id: rechnungK.auftrag_id },
        select: ["id", "order_no", "created_at"],
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
        select: ["id", "invoice_number", "created_at"],
      })
      : Promise.resolve([]),
    auftragIds.length
      ? customerOrderRepo.find({
        where: { id: In(auftragIds) },
        select: ["id", "order_no", "created_at"],
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

    // Get all correction invoices (RK) for this Rechnung
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

    // Build response with open quantities
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

/**
 * Get the corrected quantity for a specific item across all RKs
 * This calculates how much quantity has already been corrected
 */
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
    const { corrections } = req.body;

    // If corrections is not provided, create correction for all items with open quantity
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

    // Get current open quantities
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

    // Validate corrections and check open quantities
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

    // Create the correction invoice
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
      shipping_cost: original.shipping_cost,
      shipping_quantity: original.shipping_quantity,
      currency: original.currency,
      payment_method: original.payment_method,
      payment_terms: original.payment_terms,
      shipping_method: original.shipping_method,
      delivery_terms: original.delivery_terms,
      terms_conditions: original.terms_conditions,
      status: "open",
      notes: original.notes,
      internal_notes: original.internal_notes,
      highlight_color: original.highlight_color,
      rechnung_customer_id: original.rechnung_customer_id,
      customerSnapshot: original.customerSnapshot,
      deliveryAddress: original.deliveryAddress,
    });

    const savedRechnungK = await rechnungKRepo.save(rechnungK);

    // Create items for the correction invoice
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

    const rechnungenKWithLinkedDocuments = rechnungenK.map((rk: any) => ({
      ...rk,
      linkedDocuments: linkedDocumentsByRechnungKId.get(rk.id) || {
        rechnung: [],
        auftrag: [],
      },
    }));

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

    res.json({ success: true, data: { ...rechnungK, linkedDocuments } });
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

    // Validate quantity doesn't exceed open quantity for this item
    if (quantity !== undefined) {
      const parsedQty = Number(quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        res.status(400).json({
          success: false,
          message: "Quantity must be a positive number",
        });
        return;
      }

      // Check if this is a correction item with source reference
      if (item.sourceLineItemId) {
        // Get all RKs for this original Rechnung
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

        // Get original quantity from the source item
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

        // Add back the current item's quantity if it's being updated
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

    const uploadsDir = path.join(__dirname, "../../uploads/rechnungen_k");
    const filePath = path.join(
      uploadsDir,
      `rk_${rechnungK.invoice_number || rechnungK.id}.pdf`,
    );

    const items = (rechnungK.items || []).map((it: any, idx: number) => ({
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
      documentType: "RK" as any,
      documentNumber: rechnungK.invoice_number,
      customerSnapshot: customerSnap,
      customerEntity: rechnungK.customer,
      deliveryAddress: rechnungK.deliveryAddress,
      metadataItems: [
        ["Ansprechpartner", contactName],
        ["Kunde", kundeCombined],
        [
          "Datum",
          rechnungK.date_created ||
          rechnungK.created_at ||
          rechnungK.invoice_date,
        ],
      ],
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
      deliveryTime: rechnungK.date_delivery,
      deliveryTerms: rechnungK.delivery_terms,
      paymentTerms: rechnungK.payment_terms
        ? `Zahlungsziel: ${rechnungK.payment_terms} Tage`
        : undefined,
      paymentMethod: rechnungK.payment_method,
      outputFilePath: filePath,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rk_${rechnungK.invoice_number}.pdf`,
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};