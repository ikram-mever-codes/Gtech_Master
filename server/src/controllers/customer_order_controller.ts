import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Offer } from "../models/offer";
import { NumberSequenceService } from "../services/number_sequence_service";

export const createAuftragFromOffer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { offerId } = req.params;
    const { selectedItems } = req.body;

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 item MUST be selected for Auftrag",
      });
      return;
    }

    const offerRepo = AppDataSource.getRepository(Offer);
    const offer = await offerRepo.findOne({
      where: { id: offerId },
      relations: ["lineItems"],
    });

    if (!offer) {
      res.status(404).json({ success: false, message: "Offer not found" });
      return;
    }

    // Generate AuftragNo B{yy}{mm}-{number}
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `B${yy}${mm}-`;

    let auftragNo = "";
    try {
      auftragNo = await NumberSequenceService.getNextNumber("customer_order");
    } catch (err) {
      console.warn("Could not generate sequence number for customer_order:", err);
      auftragNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    let subtotal = 0;
    const orderItemsToCreate: Partial<CustomerOrderItem>[] = [];

    selectedItems.forEach((selItem: any, idx: number) => {
      const lineItem = (offer.lineItems || []).find(
        (li) => li.id === selItem.lineItemId,
      );

      const qty = Number(selItem.quantity) || 1;
      const price = Number(selItem.price) || 0;
      const lineTotal = qty * price;
      subtotal += lineTotal;

      orderItemsToCreate.push({
        itemName: lineItem ? lineItem.itemName : selItem.itemName || "Item",
        material: lineItem?.material || "",
        photo: lineItem?.photo || undefined,
        specification: lineItem?.specification || "",
        description: lineItem?.description || "",
        weight: lineItem?.weight || undefined,
        quantity: qty,
        price: price,
        lineTotal: lineTotal,
        position: idx + 1,
        sourceLineItemId: lineItem?.id || undefined,
        sourceItemId: lineItem?.sourceItemId || undefined,
        notes: lineItem?.notes || "",
      });
    });

    const taxRate = Number(offer.taxRate ?? 19);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const customerOrder = customerOrderRepo.create({
      order_no: auftragNo,
      offer_id: offer.id,
      customer_id: offer.customerId || undefined,
      status: "Draft",
      currency: offer.currency || "EUR",
      tax_rate: taxRate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: offer.notes || "",
      customerSnapshot: offer.customerSnapshot || null,
      date_created: dateCreatedStr,
    });

    const savedOrder = await customerOrderRepo.save(customerOrder);

    const customerOrderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      customerOrderItemRepo.create({
        ...item,
        customerOrder: savedOrder,
        customerOrderId: savedOrder.id,
      }),
    );
    await customerOrderItemRepo.save(itemEntities);

    // Update Offer conversion count
    offer.conversionCount = (offer.conversionCount || 0) + 1;
    await offerRepo.save(offer);

    const fullOrder = await customerOrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["orderItems", "customer"],
    });

    res.status(201).json({
      success: true,
      message: `Auftrag ${auftragNo} created successfully`,
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllCustomerOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const orders = await customerOrderRepo.find({
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

export const getCustomerOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer"],
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
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

export const deleteCustomerOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({ where: { id: Number(id) } });

    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    await customerOrderRepo.remove(order);
    res.json({
      success: true,
      message: "Auftrag deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};