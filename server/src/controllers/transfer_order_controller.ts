import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { TransferOrder } from "../models/transfer_order";
import { TransferOrderItem } from "../models/transfer_order_items";
import { CustomerOrder } from "../models/customer_orders";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { NumberSequenceService } from "../services/number_sequence_service";

export const createBestellungFromAuftrag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { auftragId } = req.params;
    const { selectedItems, notes } = req.body;

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 line item must be selected for Bestellung",
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
    const defaultPrefix = `DE${yy}${mm}-`;

    let bestellungNo = "";
    try {
      bestellungNo = await NumberSequenceService.getNextNumber("transfer_order");
    } catch (err) {
      console.warn("Could not generate sequence number for transfer_order:", err);
      bestellungNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    let subtotal = 0;
    const itemsToCreate: Partial<TransferOrderItem>[] = [];

    selectedItems.forEach((selItem: any, idx: number) => {
      const sourceLine = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.sourceLineItemId),
      );

      const qty = Number(selItem.qty) || 1;
      const max_qty = Number(selItem.max_qty || sourceLine?.quantity || qty) || qty;
      const price = Number(selItem.price || sourceLine?.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      itemsToCreate.push({
        itemName: selItem.itemName || sourceLine?.itemName || "Line Item",
        itemNo: selItem.itemNo || sourceLine?.itemNo || undefined,
        material: selItem.material || sourceLine?.material || undefined,
        photo: selItem.photo || sourceLine?.photo || undefined,
        specification: selItem.specification || sourceLine?.specification || undefined,
        description: selItem.description || sourceLine?.description || undefined,
        weight: selItem.weight || sourceLine?.weight || undefined,
        qty: qty,
        max_qty: max_qty,
        price: price,
        lineTotal: lineTotal,
        position: idx + 1,
        sourceLineItemId: selItem.sourceLineItemId ? String(selItem.sourceLineItemId) : undefined,
        sourceItemId: selItem.sourceItemId || sourceLine?.sourceItemId || undefined,
        notes: selItem.notes || sourceLine?.notes || undefined,
      });
    });

    const taxRate = Number(auftrag.tax_rate ?? 19);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const transferOrder = transferOrderRepo.create({
      order_no: bestellungNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      customer_id: auftrag.customer_id,
      status: "draft",
      currency: auftrag.currency || "EUR",
      tax_rate: taxRate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: notes || auftrag.notes || "",
      customerSnapshot: auftrag.customerSnapshot || null,
      date_created: dateCreatedStr,
      is_fulfilled_shifted: false,
    });

    const savedTransferOrder = await transferOrderRepo.save(transferOrder);

    const transferOrderItemRepo = AppDataSource.getRepository(TransferOrderItem);
    const itemEntities = itemsToCreate.map((item) =>
      transferOrderItemRepo.create({
        ...item,
        transferOrder: savedTransferOrder,
        transferOrderId: savedTransferOrder.id,
      }),
    );
    await transferOrderItemRepo.save(itemEntities);

    const fullOrder = await transferOrderRepo.findOne({
      where: { id: savedTransferOrder.id },
      relations: ["orderItems", "customer"],
    });

    res.status(201).json({
      success: true,
      message: `Bestellung ${bestellungNo} created successfully as draft`,
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};

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

    res.json({
      success: true,
      data: orders,
    });
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

    res.json({
      success: true,
      data: order,
    });
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
    const { status, notes } = req.body;

    const validStatuses = ["draft", "to be processed", "partially delivered", "delivered"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      return;
    }

    const transferOrderRepo = AppDataSource.getRepository(TransferOrder);
    const order = await transferOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer"],
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    if (status) order.status = status;
    if (notes !== undefined) order.notes = notes;

    // Shift to Fulfillment Orders when status becomes "to be processed" or "partially delivered"
    if ((order.status === "to be processed" || order.status === "partially delivered") && !order.is_fulfilled_shifted) {
      const orderRepo = AppDataSource.getRepository(Order);
      const orderItemRepo = AppDataSource.getRepository(OrderItem);

      const fulfillmentOrder = orderRepo.create({
        order_no: order.order_no,
        customer_id: order.customer_id || undefined,
        status: 2,
        comment: `[Shifted from Bestellung ${order.order_no}] ${order.notes || ""}`.trim(),
        date_created: new Date().toISOString(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      const savedFulfillmentOrder = (await orderRepo.save(fulfillmentOrder)) as unknown as Order;

      const lines = (order.orderItems || []).map((it) => {
        const item_id = it.sourceItemId ? Number(it.sourceItemId) : undefined;
        return orderItemRepo.create({
          order_id: savedFulfillmentOrder.id,
          item_id: item_id && Number.isFinite(item_id) ? item_id : undefined,
          qty: it.qty,
          remark_de: it.itemName,
          price: it.price,
          currency: order.currency || "EUR",
          status: "NSO",
          created_at: new Date(),
          updated_at: new Date(),
        });
      });

      if (lines.length > 0) {
        await orderItemRepo.save(lines);
      }

      order.is_fulfilled_shifted = true;
    }

    await transferOrderRepo.save(order);

    res.json({
      success: true,
      message: `Bestellung updated to status ${order.status}`,
      data: order,
    });
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
    const order = await transferOrderRepo.findOne({ where: { id: Number(id) } });

    if (!order) {
      res.status(404).json({ success: false, message: "Bestellung not found" });
      return;
    }

    await transferOrderRepo.remove(order);
    res.json({
      success: true,
      message: "Bestellung deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
