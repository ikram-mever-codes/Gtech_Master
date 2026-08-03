import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Rechnung, StockWhere } from "../models/rechnung";
import { RechnungItem } from "../models/rechnung_items";
import { Rechnung_k } from "../models/rechnung_k";
import { RechnungKItem } from "../models/rechnung_k_items";
import { NumberSequenceService } from "../services/number_sequence_service";
import { numericTransformer } from "../utils/numeric-transformer";

/** Recomputes subtotal/tax/total on a correction invoice from its items —
 * mirrors the recompute logic pattern used elsewhere (e.g. TransferOrder),
 * since RechnungKItem.price/quantity are directly editable by the user. */
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

export const createRechnungKFromRechnung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { rechnungId } = req.params;

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
        message:
          "This Rechnung has no linked customer record — cannot create a correction invoice.",
      });
      return;
    }

    const now = new Date();
    let correctionNo = "";
    try {
      correctionNo =
        await NumberSequenceService.getNextNumber("invoice_correction");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for invoice_correction:",
        err,
      );
      correctionNo = `K-${original.invoice_number}-${Date.now().toString().slice(-4)}`;
    }

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
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
      // Financials are copied as a starting point — they'll be
      // recalculated below once items are copied and after any price/qty
      // corrections are made.
      subtotal: original.subtotal,
      tax_rate: original.tax_rate,
      tax_amount: original.tax_amount,
      total_amount: original.total_amount,
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
      // Customer data always comes from the shared RechnungCustomer row —
      // no snapshot copy is made, per the correction-invoice rule that
      // only price/quantity may differ from the original.
      rechnung_customer_id: original.rechnung_customer_id,
      customerSnapshot: original.customerSnapshot,
      deliveryAddress: original.deliveryAddress,
    });

    const savedRechnungK = await rechnungKRepo.save(rechnungK);

    const itemRepo = AppDataSource.getRepository(RechnungKItem);
    const itemEntities = (original.items || []).map((it: RechnungItem) =>
      itemRepo.create({
        rechnungId: savedRechnungK.id,
        item_name: it.item_name,
        itemNo: it.itemNo,
        material: it.material,
        photo: it.photo,
        specification: it.specification,
        description: it.description,
        quantity: it.quantity,
        max_qty: it.max_qty,
        price: it.price,
        transferPrice: it.transferPrice,
        purchasePrice: it.purchasePrice,
        purchaseCurrency: it.purchaseCurrency,
        taxRate: it.taxRate,
        lineTotal: it.lineTotal,
        unit_price_eur: it.unit_price_eur,
        total_price: it.total_price,
        weight: it.weight,
        extraWeight: it.extraWeight,
        position: it.position,
        highlightColor: it.highlightColor,
        sourceLineItemId: it.sourceLineItemId,
        sourceItemId: it.sourceItemId,
        order_no: it.order_no,
        notes: it.notes,
        remark: it.remark,
        remark_order_item: it.remark_order_item,
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

    res.json({ success: true, data: rechnungenK });
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

    res.json({ success: true, data: rechnungK });
  } catch (error) {
    next(error);
  }
};

/** The only mutable fields on a correction-invoice line item — everything
 * else (name, weight, remarks, etc.) is a fixed copy from the original
 * Rechnung and is intentionally not accepted here. */
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
          message: "quantity must be a positive number",
        });
        return;
      }
      item.quantity = parsedQty;
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({
          success: false,
          message: "price must be a non-negative number",
        });
        return;
      }
      item.price = parsedPrice;
    }

    const finalQty = Number(item.quantity) || 1;
    const finalPrice = Number(item.price) || 0;
    item.total_price = numericTransformer.to(finalQty * finalPrice) as any;
    item.total_price = finalQty * finalPrice;
    item.lineTotal = finalQty * finalPrice;

    const updated = await itemRepo.save(item);
    await recalculateRechnungKTotals(rechnungK.id);

    const fullRechnungK = await rechnungKRepo.findOne({
      where: { id: rechnungK.id },
      relations: ["items", "customer"],
    });

    res.json({
      success: true,
      message: "Line item updated",
      data: { item: updated, rechnungK: fullRechnungK },
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
