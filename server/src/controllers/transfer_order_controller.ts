import { In } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { TransferOrder } from "../models/transfer_order";
import { TransferOrderItem } from "../models/transfer_order_items";
import { CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Item } from "../models/items";
import { Supplier } from "../models/suppliers";
import { SupplierItem } from "../models/supplier_items";
import { ReceiverType } from "../models/transfer_order";
import { NumberSequenceService } from "../services/number_sequence_service";
import {
  parseFlexibleNumber,
  parseFlexibleNumberOrZero,
} from "../utils/decimal";
import { Customer } from "../models/customers";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";

/** Recomputes subtotal/tax/total AND the stored weight columns from the
 * order's line items — TransferOrder persists net/extra/total weight
 * directly on the order row (unlike Offer/Auftrag, which derive them on
 * read), so this keeps those columns in sync whenever a line item
 * changes. */
async function calculateTransferOrderTotals(orderId: number): Promise<void> {
  const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
  const order = await transferOrderRepo.findOne({
    where: { id: orderId },
    relations: ["orderItems"],
  });
  if (!order) return;

  const items = order.orderItems || [];
  let subtotal = 0;
  let netWeight = 0;
  let extraWeight = 0;

  for (const it of items) {
    const qty = Number(it.qty) || 1;
    // Use transferPrice if available, otherwise fallback to purchasePrice
    // This ensures we use the correct price after refreshLineItemPurchasePrices
    const price = Number(it.transferPrice ?? it.purchasePrice ?? 0);
    const lineTotal = qty * price;

    // Update the line item's lineTotal
    it.lineTotal = lineTotal;

    subtotal += lineTotal;
    netWeight += (Number(it.weight) || 0) * qty;
    extraWeight += Number(it.extraWeight) || 0;

    // Save each line item to persist the lineTotal
    await AppDataSource.getRepository(TransferOrderItem).save(it);
  }

  const round2 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 100) / 100;
  const round3 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 1000) / 1000;

  order.subtotal = round2(subtotal);
  order.total_amount = round2(subtotal); // No tax for transfer orders
  order.net_weight = round3(netWeight);
  order.extra_weight = round3(extraWeight);
  order.total_weight = round3(netWeight + extraWeight);

  await transferOrderRepo.save(order);
}

// ---------------------------------------------------------------------
// Create from Auftrag (customer_order)
// ---------------------------------------------------------------------

export const createTransferOrderFromAuftrag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { auftragId } = req.params;
    const { selectedItems } = req.body;
    console.log("Selected Items:", JSON.stringify(selectedItems, null, 2));

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 item MUST be selected for Bestellung",
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
    const defaultPrefix = `T${yy}${mm}-`;

    let orderNo: any = "";
    try {
      orderNo = await NumberSequenceService.getNextNumber("transfer_order");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for transfer_order:",
        err,
      );
      orderNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const orderItemsToCreate: Partial<TransferOrderItem>[] = [];

    // Filter selectedItems to only include catalog items (those with sourceItemId)
    const catalogItems = selectedItems.filter((selItem: any) => {
      const lineItem = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.sourceLineItemId),
      );
      return lineItem && lineItem.sourceItemId;
    });

    if (catalogItems.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "No catalog items selected for Bestellung. Freizeile items cannot be transferred.",
      });
      return;
    }

    const skippedCount = selectedItems.length - catalogItems.length;
    if (skippedCount > 0) {
      console.warn(
        `Skipped ${skippedCount} Freizeile item(s) (no sourceItemId) while creating Bestellung from Auftrag ${auftragId}`,
      );
    }

    catalogItems.forEach((selItem: any, idx: number) => {
      const lineItem = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.sourceLineItemId),
      );

      const qty = Number(selItem.qty ?? selItem.quantity) || 1;

      // IMPORTANT: Use transferPrice if available, otherwise use price from selItem or lineItem
      // but DO NOT calculate lineTotal yet - it will be calculated after purchase prices are resolved
      const transferPrice =
        selItem.transferPrice || selItem.price || lineItem?.price || 0;

      // Store the price but don't calculate lineTotal yet
      // lineTotal will be calculated in calculateTransferOrderTotals after purchase prices are resolved

      orderItemsToCreate.push({
        sourceLineItemId: lineItem?.id || selItem.sourceLineItemId || undefined,
        sourceItemId:
          lineItem?.sourceItemId || selItem.sourceItemId || undefined,
        itemName: selItem.itemName || lineItem?.itemName || "Item",
        itemNo: selItem.itemNo || lineItem?.itemNo || lineItem?.material || "",
        material: selItem.material || lineItem?.material || "",
        photo: selItem.photo || lineItem?.photo || undefined,
        specification: selItem.specification || lineItem?.specification || "",
        description: selItem.description || lineItem?.description || "",
        notes: selItem.notes || lineItem?.notes || "",
        qty: qty,
        max_qty: qty,
        weight: selItem.weight || lineItem?.weight || undefined,
        extraWeight: selItem.extraWeight || lineItem?.extraWeight || 0,
        // Set transferPrice from the Auftrag line item
        transferPrice: transferPrice,
        // DO NOT set lineTotal here - it will be calculated after purchase prices are resolved
        // lineTotal: 0, // Will be calculated later
        position: idx + 1,
      });
    });

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const transferOrderRepo: any = AppDataSource.getRepository(TransferOrder);
    const transferOrder = transferOrderRepo.create({
      order_no: orderNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      customer_id: auftrag.customer_id || undefined,
      title: auftrag.title,
      status: "draft",
      currency: auftrag.currency || "EUR",
      notes: auftrag.notes || "",
      customerSnapshot: auftrag.customerSnapshot || null,
      date_created: dateCreatedStr,
      date_delivery: auftrag.date_delivery,
      highlight_color: auftrag.highlight_color || "",
      deliveryAddress: auftrag.deliveryAddress || null,
    });

    const savedOrder: any = await transferOrderRepo.save(transferOrder);

    const transferOrderItemRepo =
      AppDataSource.getRepository(TransferOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      transferOrderItemRepo.create({
        ...item,
        transferOrder: savedOrder,
        transferOrderId: savedOrder.id,
        // Set lineTotal to 0 initially - will be recalculated
        lineTotal: 0,
      }),
    );
    await transferOrderItemRepo.save(itemEntities);

    // After creating the order, refresh purchase prices based on receiver
    await refreshLineItemPurchasePrices(savedOrder.id);
    // This will recalculate all totals including lineTotal for each item
    await calculateTransferOrderTotals(savedOrder.id);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["orderItems", "customer", "supplier"],
    });

    res.status(201).json({
      success: true,
      message: `Bestellung ${orderNo} created successfully with ${orderItemsToCreate.length} catalog item(s)${skippedCount > 0 ? ` (${skippedCount} Freizeile item(s) skipped)` : ""}`,
      data: fullOrder,
    });
  } catch (error) {
    console.error("Error creating Bestellung from Auftrag:", error);
    next(error);
  }
};

// ---------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------

export const getAllTransferOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const orders = await transferOrderRepo.find({
      order: { created_at: "DESC" },
      relations: ["orderItems", "customer", "supplier"],
    });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const getTransferOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer", "supplier"],
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    if (Number(order.subtotal) === 0 && Number(order.total_amount) === 0) {
      await calculateTransferOrderTotals(order.id);
      const updated = await transferOrderRepo.findOne({
        where: { id: order.id },
      });
      if (updated) {
        order.subtotal = updated.subtotal;
        order.total_amount = updated.total_amount;
        order.net_weight = updated.net_weight;
        order.extra_weight = updated.extra_weight;
        order.total_weight = updated.total_weight;
      }
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const deleteTransferOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepo.findOne({
      where: { id: Number(id) },
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }
    await transferOrderRepo.remove(order);
    res.json({ success: true, message: "Bestellung deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// In the updateTransferOrder controller, add customer_id handling
export const updateTransferOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const {
      title,
      status,
      currency,
      notes,
      dateDelivery,
      highlightColor,
      receiver,
      supplierId,
      customerId, // Add this
    } = req.body;

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const bestellung = await transferOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer", "supplier"],
    });

    if (!bestellung) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    // Check if order is from Auftrag - if so, prevent customer editing
    const isFromAuftrag =
      bestellung.auftrag_id !== null && bestellung.auftrag_id !== undefined;

    if (customerId !== undefined) {
      if (isFromAuftrag) {
        res.status(403).json({
          success: false,
          message: "Cannot change customer for Bestellung created from Auftrag",
        });
        return;
      }

      // Validate customer exists
      const customerRepo = AppDataSource.getRepository(Customer);
      const customer = await customerRepo.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }
      bestellung.customer_id = customerId;
    }

    if (title !== undefined) bestellung.title = title;
    if (status !== undefined) bestellung.status = status;
    if (currency !== undefined) bestellung.currency = currency;
    if (notes !== undefined) bestellung.notes = notes;
    if (dateDelivery !== undefined) bestellung.date_delivery = dateDelivery;
    if (highlightColor !== undefined)
      bestellung.highlight_color = highlightColor;

    let receiverOrSupplierChanged = false;

    if (receiver !== undefined) {
      if (!Object.values(ReceiverType).includes(receiver)) {
        res.status(400).json({
          success: false,
          message: `receiver must be one of: ${Object.values(ReceiverType).join(", ")}`,
        });
        return;
      }
      if (bestellung.receiver !== receiver) {
        bestellung.receiver = receiver;
        receiverOrSupplierChanged = true;
      }
      if (receiver === ReceiverType.GTECH_HK) {
        bestellung.supplier_id = undefined;
      }
    }

    if (supplierId !== undefined) {
      const supplierRepo = AppDataSource.getRepository(Supplier);
      if (supplierId === null) {
        bestellung.supplier_id = undefined;
        receiverOrSupplierChanged = true;
      } else {
        const supplier = await supplierRepo.findOne({
          where: { id: Number(supplierId) },
        });
        if (!supplier) {
          res
            .status(404)
            .json({ success: false, message: "Supplier not found" });
          return;
        }
        if (Number(bestellung.supplier_id) !== Number(supplierId)) {
          bestellung.supplier_id = Number(supplierId);
          receiverOrSupplierChanged = true;
        }
      }
    }

    await transferOrderRepo.save(bestellung);

    if (receiverOrSupplierChanged) {
      await refreshLineItemPurchasePrices(bestellung.id);
    }
    await calculateTransferOrderTotals(bestellung.id);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: bestellung.id },
      relations: ["orderItems", "customer", "supplier"],
    });

    res.json({
      success: true,
      message: "Bestellung updated successfully",
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};
// ---------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------

export const createTransferOrderLineItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.params;
    const body = req.body || {};

    if (!body.itemName || !String(body.itemName).trim()) {
      res.status(400).json({ success: false, message: "itemName is required" });
      return;
    }

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepo.findOne({
      where: { id: Number(orderId) },
      relations: ["orderItems"],
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    const nextPosition =
      (order.orderItems || []).reduce(
        (max, li) => Math.max(max, li.position || 0),
        0,
      ) + 1;

    const qty = parseFlexibleNumber(body.qty) || 1;

    const orderItemRepo = AppDataSource.getRepository(TransferOrderItem);
    const lineItem = orderItemRepo.create({
      transferOrder: order,
      transferOrderId: order.id,
      itemName: String(body.itemName).trim(),
      itemNo: body.itemNo,
      material: body.material,
      specification: body.specification,
      description: body.description,
      weight:
        body.weight !== undefined
          ? (parseFlexibleNumber(body.weight) ?? undefined)
          : undefined,
      qty,
      max_qty: qty,
      transferPrice:
        body.transferPrice !== undefined
          ? (parseFlexibleNumber(body.transferPrice) ?? undefined)
          : undefined,
      purchasePrice:
        body.purchasePrice !== undefined
          ? (parseFlexibleNumber(body.purchasePrice) ?? undefined)
          : undefined,
      remark_order_item: body.remark_order_item || "",
      position: nextPosition,
      sourceItemId: body.sourceItemId || undefined,
      notes: body.notes,
    });

    const saved = await orderItemRepo.save(lineItem);
    await calculateTransferOrderTotals(order.id);

    res
      .status(201)
      .json({ success: true, message: "Line item added", data: saved });
  } catch (error) {
    next(error);
  }
};

export const updateTransferOrderLineItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId, lineItemId } = req.params;
    const body = req.body || {};

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepo.findOne({
      where: { id: Number(orderId) },
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    const orderItemRepo = AppDataSource.getRepository(TransferOrderItem);
    const lineItem = await orderItemRepo.findOne({
      where: { id: lineItemId, transferOrderId: order.id },
    });
    if (!lineItem) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }

    if (body.itemName !== undefined) lineItem.itemName = body.itemName;
    if (body.itemNo !== undefined) lineItem.itemNo = body.itemNo;
    if (body.material !== undefined) lineItem.material = body.material;
    if (body.specification !== undefined)
      lineItem.specification = body.specification;
    if (body.description !== undefined) lineItem.description = body.description;
    if (body.notes !== undefined) lineItem.notes = body.notes;
    if (body.qty !== undefined)
      lineItem.qty = parseFlexibleNumber(body.qty) || 1;
    if (body.extraWeight !== undefined)
      lineItem.extraWeight = parseFlexibleNumberOrZero(body.extraWeight);
    if (body.transferPrice !== undefined)
      lineItem.transferPrice =
        parseFlexibleNumber(body.transferPrice) ?? undefined;
    if (body.purchasePrice !== undefined)
      lineItem.purchasePrice =
        parseFlexibleNumber(body.purchasePrice) ?? undefined;
    if (body.remark_order_item !== undefined)
      lineItem.remark_order_item = body.remark_order_item;

    const updated = await orderItemRepo.save(lineItem);
    await calculateTransferOrderTotals(order.id);

    res
      .status(200)
      .json({ success: true, message: "Line item updated", data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteTransferOrderLineItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId, lineItemId } = req.params;
    const orderItemRepo = AppDataSource.getRepository(TransferOrderItem);
    const lineItem = await orderItemRepo.findOne({
      where: { id: lineItemId, transferOrderId: Number(orderId) },
    });
    if (!lineItem) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }
    await orderItemRepo.remove(lineItem);
    await calculateTransferOrderTotals(Number(orderId));

    res.status(200).json({ success: true, message: "Line item deleted" });
  } catch (error) {
    next(error);
  }
};

async function createOrderFromBestellung(
  bestellung: TransferOrder,
): Promise<{ createdOrderId: number; skippedCount: number } | null> {
  const allItems = bestellung.orderItems || [];
  const catalogItems = allItems.filter(
    (li) =>
      li.sourceItemId !== undefined &&
      li.sourceItemId !== null &&
      !isNaN(parseInt(li.sourceItemId, 10)),
  );
  const skippedCount = allItems.length - catalogItems.length;

  if (catalogItems.length === 0) {
    console.warn(
      `Bestellung ${bestellung.order_no}: no catalog line items with a valid sourceItemId — skipping Order creation (${skippedCount} Freizeile line(s) present).`,
    );
    return null;
  }

  const now = new Date();
  const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}.${now.getFullYear()}`;

  let createdOrderId = 0;

  await AppDataSource.transaction(async (manager) => {
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);

    // Order.order_no is unique — check for a pre-existing Order with the
    // same order_no before insert, since a Bestellung could theoretically
    // be reprocessed. Guards against a duplicate-key failure instead of
    // silently colliding.
    const existing = await orderRepo.findOne({
      where: { order_no: bestellung.order_no },
    });
    if (existing) {
      createdOrderId = existing.id;
      console.warn(
        `Order ${bestellung.order_no} already exists (id ${existing.id}) — reusing it instead of creating a duplicate.`,
      );
      return;
    }

    const order = orderRepo.create({
      // Reuse the Bestellung's own order_no rather than generating a new
      // sequence number — it's already unique and identifies the same
      // commercial document.
      order_no: bestellung.order_no,
      customer_id: bestellung.customer_id || undefined,
      category_id: undefined,
      // 1 = Draft/New, matching the status codes already used in the
      // Order status filter dropdown on the frontend.
      status: 1,
      comment:
        [bestellung.title, bestellung.notes].filter(Boolean).join(" — ") ||
        `Created automatically from Bestellung ${bestellung.order_no}`,
      supplier_id: bestellung.supplier_id || undefined,
      cargo_id: undefined,
      date_created: bestellung.date_created || dateCreatedStr,
      date_delivery: bestellung.date_delivery || undefined,
    });
    const savedOrder = await orderRepo.save(order);
    createdOrderId = savedOrder.id;

    const orderItemEntities = catalogItems.map((li) =>
      orderItemRepo.create({
        item_id: parseInt(li.sourceItemId as string, 10),
        order_id: savedOrder.id,
        // OrderItem.qty is an integer column; TransferOrderItem.qty is
        // decimal, so round rather than truncate, and never drop below 1.
        qty: Math.max(1, Math.round(Number(li.qty) || 1)),
        remark_de: li.remark_order_item || li.notes || undefined,
        price:
          li.transferPrice !== undefined && li.transferPrice !== null
            ? li.transferPrice
            : (li.purchasePrice ?? undefined),
        currency: li.purchaseCurrency || bestellung.currency || "EUR",
        status: "NSO",
      }),
    );
    await orderItemRepo.save(orderItemEntities);
  });

  console.log(
    `Bestellung ${bestellung.order_no} → created Order ${bestellung.order_no} (id ${createdOrderId}) with ${catalogItems.length} item(s), ${skippedCount} Freizeile line(s) skipped.`,
  );

  return { createdOrderId, skippedCount };
}

export const updateTransferOrderStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "draft",
      "to be processed",
      "partially delivered",
      "delivered",
    ];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
      return;
    }

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const bestellung = await transferOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems"],
    });

    if (!bestellung) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    const previousStatus = bestellung.status;
    bestellung.status = status;
    await transferOrderRepo.save(bestellung);

    let conversionResult: {
      createdOrderId: number;
      skippedCount: number;
    } | null = null;

    // Only fires on the exact draft → "to be processed" transition, so a
    // Bestellung is never converted more than once even if it's later
    // moved back and forth between statuses.
    if (previousStatus === "draft" && status === "to be processed") {
      try {
        conversionResult = await createOrderFromBestellung(bestellung);
      } catch (conversionErr) {
        console.error(
          `Failed to create Order/OrderItems from Bestellung ${bestellung.order_no}:`,
          conversionErr,
        );
        // The status change itself already committed above and stays in
        // effect — don't roll it back over a downstream conversion
        // failure, just surface it in the response message.
      }
    }

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: bestellung.id },
      relations: ["orderItems", "customer"],
    });

    let message = "Bestellung status updated successfully";
    if (previousStatus === "draft" && status === "to be processed") {
      if (conversionResult) {
        message += ` — Order created${
          conversionResult.skippedCount > 0
            ? ` (${conversionResult.skippedCount} Freizeile line(s) skipped)`
            : ""
        }.`;
      } else {
        message +=
          " — no Order was created (no catalog line items found on this Bestellung).";
      }
    }

    res.json({
      success: true,
      message,
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};
async function refreshLineItemPurchasePrices(orderId: number): Promise<void> {
  const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
  const order = await transferOrderRepo.findOne({
    where: { id: orderId },
    relations: ["orderItems"],
  });
  if (!order) return;

  const items = order.orderItems || [];
  const catalogLines = items.filter((li) => !!li.sourceItemId);
  if (catalogLines.length === 0) return;

  const itemRepo = AppDataSource.getRepository(Item);
  const supplierItemRepo = AppDataSource.getRepository(SupplierItem);
  const orderItemRepo = AppDataSource.getRepository(TransferOrderItem);

  const sourceIds = catalogLines.map((li) => parseInt(li.sourceItemId!, 10));

  if (order.receiver === ReceiverType.SUPPLIER && order.supplier_id) {
    const supplierItems = await supplierItemRepo.find({
      where: { item_id: In(sourceIds), supplier_id: order.supplier_id },
    });
    const bySourceId = new Map(
      supplierItems.map((si) => [String(si.item_id), si]),
    );

    for (const li of catalogLines) {
      const match = bySourceId.get(String(li.sourceItemId));
      li.purchasePrice = match ? Number(match.price_rmb) || 0 : undefined;
      li.purchaseCurrency = match ? match.currency : undefined;
      await orderItemRepo.save(li);
    }
  } else {
    const sourceItems = await itemRepo.find({
      where: { id: In(sourceIds) },
      select: ["id", "transfer_price_EUR"],
    });
    const bySourceId = new Map(
      sourceItems.map((it: any) => [String(it.id), it]),
    );

    for (const li of catalogLines) {
      const match = bySourceId.get(String(li.sourceItemId));
      li.purchasePrice = match
        ? Number(match.transfer_price_EUR) || 0
        : undefined;
      li.purchaseCurrency = "EUR";
      await orderItemRepo.save(li);
    }
  }
}

export const createTransferOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      title,
      status = "draft",
      currency = "EUR",
      notes,
      highlightColor,
      dateDelivery,
      receiver = ReceiverType.GTECH_HK,
      supplierId,
      customerId,
    } = req.body;

    // Title is now optional - remove the validation
    // Just trim it if provided, or set to empty string
    const trimmedTitle = title?.trim() || "";

    // Validate customer exists - only if customerId is provided
    let customer = null;
    if (customerId) {
      const customerRepo = AppDataSource.getRepository(Customer);
      customer = await customerRepo.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
        });
        return;
      }
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `T${yy}${mm}-`;

    let orderNo = "";
    try {
      orderNo = await NumberSequenceService.getNextNumber("transfer_order");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for transfer_order:",
        err,
      );
      orderNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const transferOrder = transferOrderRepo.create({
      order_no: orderNo,
      customer_id: customerId || undefined,
      title: trimmedTitle,
      status: status,
      currency: currency,
      notes: notes || "",
      highlight_color: highlightColor || "",
      date_delivery: dateDelivery || "",
      receiver: receiver,
      supplier_id: receiver === ReceiverType.SUPPLIER ? supplierId : null,
      date_created: `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${now.getFullYear()}`,
    });

    const savedOrder = await transferOrderRepo.save(transferOrder);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["orderItems", "customer", "supplier"],
    });

    res.status(201).json({
      success: true,
      message: `Bestellung ${orderNo} created successfully`,
      data: fullOrder,
    });
  } catch (error) {
    console.error("Error creating Bestellung:", error);
    next(error);
  }
};
