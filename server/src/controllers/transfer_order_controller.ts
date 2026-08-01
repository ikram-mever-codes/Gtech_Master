import { In } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { TransferOrder } from "../models/transfer_order";
import { TransferOrderItem } from "../models/transfer_order_items";
import { CustomerOrder } from "../models/customer_orders";
import { Item } from "../models/items";
import { NumberSequenceService } from "../services/number_sequence_service";
import {
  parseFlexibleNumber,
  parseFlexibleNumberOrZero,
} from "../utils/decimal";

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
    const price = Number(it.price) || 0;
    subtotal += qty * price;
    netWeight += (Number(it.weight) || 0) * qty;
    extraWeight += Number(it.extraWeight) || 0;
  }

  const taxAmount = subtotal * ((Number(order.tax_rate) || 19) / 100);
  const round2 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 100) / 100;
  const round3 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 1000) / 1000;

  order.subtotal = round2(subtotal);
  order.tax_amount = round2(taxAmount);
  order.total_amount = round2(subtotal + taxAmount);
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

    const orderItemsToCreate: Partial<TransferOrderItem>[] = [];

    selectedItems.forEach((selItem: any, idx: number) => {
      const lineItem = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.lineItemId),
      );

      const qty = Number(selItem.qty ?? selItem.quantity) || 1;
      const price = Number(selItem.price ?? lineItem?.price ?? 0);
      const lineTotal = qty * price;

      orderItemsToCreate.push({
        itemName: lineItem ? lineItem.itemName : selItem.itemName || "Item",
        material: lineItem?.material || "",
        itemNo: lineItem?.itemNo || lineItem?.material || "",
        photo: lineItem?.photo || undefined,
        specification: lineItem?.specification || "",
        description: lineItem?.description || "",
        weight: lineItem?.weight || undefined,
        qty,
        max_qty: qty,
        price,
        lineTotal,
        position: idx + 1,
        sourceLineItemId: lineItem?.id || undefined,
        sourceItemId: lineItem?.sourceItemId || undefined,
        notes: lineItem?.notes || "",
      });
    });

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const transferOrder = transferOrderRepo.create({
      order_no: orderNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      customer_id: auftrag.customer_id || undefined,
      title: auftrag.title,
      status: "draft",
      currency: auftrag.currency || "EUR",
      tax_rate: Number(auftrag.tax_rate ?? 19),
      notes: auftrag.notes || "",
      customerSnapshot: auftrag.customerSnapshot || null,
      date_created: dateCreatedStr,
      date_delivery: auftrag.date_delivery,
    });

    const savedOrder = await transferOrderRepo.save(transferOrder);

    const transferOrderItemRepo =
      AppDataSource.getRepository(TransferOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      transferOrderItemRepo.create({
        ...item,
        transferOrder: savedOrder,
        transferOrderId: savedOrder.id,
      }),
    );
    await transferOrderItemRepo.save(itemEntities);
    await calculateTransferOrderTotals(savedOrder.id);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["orderItems", "customer"],
    });

    res.status(201).json({
      success: true,
      message: `Bestellung ${orderNo} created successfully`,
      data: fullOrder,
    });
  } catch (error) {
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
      relations: ["orderItems", "customer"],
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
      relations: ["orderItems", "customer"],
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
        order.tax_amount = updated.tax_amount;
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
      taxRate,
      notes,
      dateDelivery,
      highlightColor,
      receiver,
    } = req.body;

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const bestellung = await transferOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer"],
    });

    if (!bestellung) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    if (title !== undefined) bestellung.title = title;
    if (status !== undefined) bestellung.status = status;
    if (currency !== undefined) bestellung.currency = currency;
    if (notes !== undefined) bestellung.notes = notes;
    if (dateDelivery !== undefined) bestellung.date_delivery = dateDelivery;
    if (highlightColor !== undefined)
      bestellung.highlight_color = highlightColor;
    if (receiver !== undefined) bestellung.receiver = receiver;

    const taxRateChanged =
      taxRate !== undefined && Number(taxRate) !== Number(bestellung.tax_rate);
    if (taxRate !== undefined)
      bestellung.tax_rate = parseFlexibleNumber(taxRate) ?? 19;

    await transferOrderRepo.save(bestellung);
    if (taxRateChanged) await calculateTransferOrderTotals(bestellung.id);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: bestellung.id },
      relations: ["orderItems", "customer"],
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
    const price = parseFlexibleNumberOrZero(body.price);

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
      price,
      transferPrice:
        body.transferPrice !== undefined
          ? (parseFlexibleNumber(body.transferPrice) ?? undefined)
          : undefined,
      purchasePrice:
        body.purchasePrice !== undefined
          ? (parseFlexibleNumber(body.purchasePrice) ?? undefined)
          : undefined,
      lineTotal: qty * price,
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
    if (body.price !== undefined)
      lineItem.price = parseFlexibleNumberOrZero(body.price);
    if (body.extraWeight !== undefined)
      lineItem.extraWeight = parseFlexibleNumberOrZero(body.extraWeight);
    if (body.transferPrice !== undefined)
      lineItem.transferPrice =
        parseFlexibleNumber(body.transferPrice) ?? undefined;
    if (body.purchasePrice !== undefined)
      lineItem.purchasePrice =
        parseFlexibleNumber(body.purchasePrice) ?? undefined;

    lineItem.lineTotal = Number(lineItem.qty) * Number(lineItem.price);

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
    });

    if (!bestellung) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    bestellung.status = status;
    await transferOrderRepo.save(bestellung);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: bestellung.id },
      relations: ["orderItems", "customer"],
    });

    res.json({
      success: true,
      message: "Bestellung status updated successfully",
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};
