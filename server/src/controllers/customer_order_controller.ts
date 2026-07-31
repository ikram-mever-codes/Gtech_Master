import { In } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Customer } from "../models/customers";
import { Item } from "../models/items";
import { Offer } from "../models/offer";
import { Inquiry } from "../models/inquiry";
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

export const createAuftragFromInquiry = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { inquiryId } = req.params;
    const { title, paymentMethod, shippingMethod, notes } = req.body;

    const inquiryRepo = AppDataSource.getRepository(Inquiry);
    const inquiry = await inquiryRepo.findOne({
      where: { id: inquiryId },
      relations: ["customer", "customer.businessDetails", "requests"],
    });

    if (!inquiry) {
      res.status(404).json({ success: false, message: "Inquiry not found" });
      return;
    }

    const customer = inquiry.customer;
    if (!customer) {
      res.status(404).json({ success: false, message: "Customer not found for this inquiry" });
      return;
    }

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

    const requests = inquiry.requests || [];
    requests.forEach((reqItem: any, idx: number) => {
      const qty = Number(reqItem.qty) || 1;
      const price = Number(reqItem.salesPrice || reqItem.purchasePrice || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      orderItemsToCreate.push({
        itemName: reqItem.itemName || "Item",
        material: reqItem.material || "",
        photo: (reqItem as any).photo || (reqItem as any).picture || undefined,
        specification: reqItem.specification || "",
        description: reqItem.comment || reqItem.extraNote || "",
        weight: reqItem.weight || undefined,
        quantity: qty,
        price: price,
        lineTotal: lineTotal,
        position: idx + 1,
        sourceLineItemId: reqItem.id || undefined,
        notes: reqItem.comment || "",
      });
    });

    const taxRate = 19;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const customerSnapshot = {
      id: customer.id,
      customerNumber: customer.customerNumber,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      vatId: customer.vatTaxId || customer.taxNumber || "",
      address: customer.businessDetails?.address || "",
      city: customer.businessDetails?.city || "",
      postalCode: customer.businessDetails?.postalCode || "",
      country: customer.businessDetails?.country || customer.country || "",
      street: (customer.businessDetails as any)?.street,
    };

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const customerOrder = customerOrderRepo.create({
      order_no: auftragNo,
      offer_id: title || inquiry.name,
      customer_id: customer.id,
      status: "Draft",
      currency: "EUR",
      tax_rate: taxRate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: notes || inquiry.description || "",
      customerSnapshot: customerSnapshot,
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

export const createAuftragFromItems = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { customerId, selectedItems, title, paymentMethod, shippingMethod, notes } = req.body;

    if (!customerId) {
      res.status(400).json({ success: false, message: "Recipient customer is required for Auftrag" });
      return;
    }

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({ success: false, message: "Minimum 1 item MUST be selected for Auftrag" });
      return;
    }

    const customerRepo = AppDataSource.getRepository(Customer);
    const customer = await customerRepo.findOne({
      where: { id: customerId },
      relations: ["businessDetails"],
    });

    if (!customer) {
      res.status(404).json({ success: false, message: "Customer not found" });
      return;
    }

    const itemRepo = AppDataSource.getRepository(Item);
    const itemIds = selectedItems.map((s: any) => Number(s.itemId || s.id)).filter(Boolean);
    const dbItems = itemIds.length > 0 ? await itemRepo.find({ where: { id: In(itemIds) } }) : [];
    const itemMap = new Map(dbItems.map((it) => [String(it.id), it]));

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
      const matchedItem = itemMap.get(String(selItem.itemId || selItem.id));
      const qty = Number(selItem.qty || selItem.quantity) || 1;
      const price = Number(selItem.price || matchedItem?.sales_price || matchedItem?.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      const itemName = selItem.itemName || matchedItem?.item_name || (matchedItem as any)?.itemName || "Item";

      orderItemsToCreate.push({
        itemName: itemName,
        material: matchedItem?.model || (matchedItem?.ean ? String(matchedItem.ean) : undefined),
        photo: matchedItem?.photo || matchedItem?.pix_path || undefined,
        specification: matchedItem?.remark || undefined,
        description: selItem.notes || matchedItem?.remark || undefined,
        weight: matchedItem?.weight || undefined,
        quantity: qty,
        price: price,
        lineTotal: lineTotal,
        position: idx + 1,
        sourceItemId: String(matchedItem?.id || selItem.itemId || selItem.id),
      });
    });

    const taxRate = 19;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const firstItemName = orderItemsToCreate[0]?.itemName || "Customer Items";
    const orderTitle = title?.trim() || (orderItemsToCreate.length > 1 ? `${firstItemName} +${orderItemsToCreate.length - 1} more` : firstItemName);

    const customerSnapshot = {
      id: customer.id,
      customerNumber: customer.customerNumber,
      companyName: customer.companyName,
      legalName: customer.legalName,
      email: customer.email,
      contactEmail: customer.contactEmail,
      contactPhoneNumber: customer.contactPhoneNumber,
      vatId: customer.vatTaxId || customer.taxNumber || "",
      address: customer.businessDetails?.address || "",
      city: customer.businessDetails?.city || "",
      postalCode: customer.businessDetails?.postalCode || "",
      country: customer.businessDetails?.country || customer.country || "",
      street: (customer.businessDetails as any)?.street,
    };

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const customerOrder = customerOrderRepo.create({
      order_no: auftragNo,
      offer_id: orderTitle,
      customer_id: customer.id,
      status: "Draft",
      currency: "EUR",
      tax_rate: taxRate,
      subtotal: subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      notes: notes || "",
      customerSnapshot: customerSnapshot,
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

