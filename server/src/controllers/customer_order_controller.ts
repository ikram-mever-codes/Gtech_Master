import { In, IsNull } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Customer } from "../models/customers";
import { Item } from "../models/items";
import { Offer } from "../models/offer";
import { Inquiry } from "../models/inquiry";
import { SalesPrice } from "../models/sales_prices";
import { NumberSequenceService } from "../services/number_sequence_service";
import {
  parseFlexibleNumber,
  parseFlexibleNumberOrZero,
} from "../utils/decimal";
import { WarehouseItem } from "../models/warehouse_items";

const salesPriceRepository = AppDataSource.getRepository(SalesPrice);

// --- Tiered sales price resolution — identical rule to the Offer flow ----
async function resolveSalesPrice(
  itemId: number,
  customerId: string | null | undefined,
  quantity: number,
): Promise<number | null> {
  if (!itemId || isNaN(itemId)) return null;
  const qty = Number(quantity) || 1;

  const query = salesPriceRepository
    .createQueryBuilder("sp")
    .where("sp.item_id = :itemId", { itemId });

  if (customerId) {
    query.andWhere("(sp.customer_id = :customerId OR sp.customer_id IS NULL)", {
      customerId,
    });
  } else {
    query.andWhere("sp.customer_id IS NULL");
  }

  const allPrices: SalesPrice[] = await query.getMany();
  if (allPrices.length === 0) return null;

  const minQty = (p: SalesPrice) => parseFloat(String(p.min_quantity));
  const unitPrice = (p: SalesPrice) => parseFloat(String(p.unit_price_eur));
  const isCustomerScoped = (p: SalesPrice) => !!p.customer_id;

  const qualifying = allPrices.filter((p) => minQty(p) <= qty);
  if (qualifying.length > 0) {
    qualifying.sort((a, b) => {
      const diff = minQty(b) - minQty(a);
      if (diff !== 0) return diff;
      return (isCustomerScoped(b) ? 1 : 0) - (isCustomerScoped(a) ? 1 : 0);
    });
    return unitPrice(qualifying[0]);
  }

  const sortedByMinQty = allPrices
    .slice()
    .sort((a, b) => minQty(a) - minQty(b));
  const customerFallback = sortedByMinQty.find(isCustomerScoped);
  const chosen = customerFallback || sortedByMinQty[0];
  return unitPrice(chosen);
}

async function getEffectiveUnitPrice(
  item: any,
  customerId: string | null | undefined,
  quantity: number,
): Promise<number> {
  const tiered = await resolveSalesPrice(Number(item.id), customerId, quantity);
  if (tiered !== null) return tiered;
  return Number(item.price) || 0;
}

/** A line item is "Freizeile" (freetext) if it wasn't sourced from a
 * catalog item or an offer line — same rule as isFreetextLine on the
 * frontend. Only these lines may carry their own taxRate override. */
const isFreetextLine = (li: CustomerOrderItem) =>
  !li.sourceItemId && !li.sourceLineItemId;

/** Recomputes subtotal/tax/total from the order's line items, discount,
 * and shipping — mirrors Offer.calculateOfferTotals, including the
 * per-line effective tax rate (line.taxRate for Freizeile lines, the
 * order's own tax_rate for everything else, shipping always taxed at the
 * order's tax_rate). */
async function calculateOrderTotals(orderId: number): Promise<void> {
  const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
  const order = await customerOrderRepo.findOne({
    where: { id: orderId },
    relations: ["orderItems"],
  });
  if (!order) return;

  const items = order.orderItems || [];
  let subtotal = 0;
  let taxAmount = 0;

  for (const it of items) {
    const qty = Number(it.quantity) || 1;
    const price = Number(it.price) || 0;
    const lineTotal = qty * price;
    subtotal += lineTotal;

    const lineTaxRate = isFreetextLine(it)
      ? (it.taxRate ?? order.tax_rate ?? 19)
      : (order.tax_rate ?? 19);
    taxAmount += lineTotal * (Number(lineTaxRate) / 100);
  }

  let total = subtotal;

  if (order.discount_percentage && order.discount_percentage > 0) {
    const discount = subtotal * (order.discount_percentage / 100);
    total = subtotal - discount;
    order.discount_amount = discount;
    taxAmount *= 1 - order.discount_percentage / 100;
  } else if (order.discount_amount && order.discount_amount > 0) {
    total = subtotal - order.discount_amount;
  }

  const shippingQty = order.shipping_quantity || 1;
  const shippingTotal = (order.shipping_cost || 0) * shippingQty;
  if (shippingTotal > 0) {
    total += shippingTotal;
    taxAmount += shippingTotal * ((order.tax_rate ?? 19) / 100);
  }

  const round2 = (n: number) =>
    isNaN(n) || !isFinite(n) ? 0 : Math.round(n * 100) / 100;

  order.subtotal = round2(subtotal);
  order.tax_amount = round2(taxAmount);
  order.total_amount = round2(total + taxAmount);
  await customerOrderRepo.save(order);
}

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

    // ---------------------------------------------------------------
    // Backfill material (Art.-Nr.) / photo for any offer line item that's
    // still missing them, exactly like OfferController.getOfferById does —
    // reading the offer straight from its repository here skips that
    // backfill, so without this step the Auftrag would inherit blank
    // Art.-Nr./thumbnail for older line items.
    // ---------------------------------------------------------------
    const itemRepository = AppDataSource.getRepository(Item);
    const warehouseRepository = AppDataSource.getRepository(WarehouseItem);

    const sourceItemIds = Array.from(
      new Set(
        (offer.lineItems || [])
          .filter((li: any) => li.sourceItemId)
          .map((li: any) => Number(li.sourceItemId))
          .filter((id: number) => !isNaN(id)),
      ),
    );

    let sourceItemById = new Map<string, any>();
    let warehouseItems: any[] = [];
    if (sourceItemIds.length > 0) {
      const sourceItems = await itemRepository.find({
        where: { id: In(sourceItemIds) },
        relations: ["parent"],
      });
      sourceItemById = new Map(
        sourceItems.map((it: any) => [String(it.id), it]),
      );

      const itemIdDEs = sourceItems
        .map((it: any) => it.ItemID_DE)
        .filter((v: any): v is number => !!v);
      try {
        warehouseItems = await warehouseRepository.find({
          where: itemIdDEs.length
            ? [
                { ItemID_DE: In(itemIdDEs) },
                { item_id: In(sourceItems.map((it: any) => it.id)) },
              ]
            : { item_id: In(sourceItems.map((it: any) => it.id)) },
        });
      } catch (e: any) {
        console.warn(
          "warehouse_items table not available while creating Auftrag from offer:",
          e?.message,
        );
      }
    }

    const getDeNo = (it: any): string => {
      const warehouseMatch =
        warehouseItems.find(
          (wi) => it.ItemID_DE && wi.ItemID_DE === it.ItemID_DE,
        ) || warehouseItems.find((wi) => wi.item_id === it.id);
      return warehouseMatch?.item_no_de || it.parent?.de_no || "";
    };

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `B${yy}${mm}-`;

    let auftragNo = "";
    try {
      auftragNo = await NumberSequenceService.getNextNumber("customer_order");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for customer_order:",
        err,
      );
      auftragNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const orderItemsToCreate: Partial<CustomerOrderItem>[] = [];

    selectedItems.forEach((selItem: any, idx: number) => {
      const lineItem = (offer.lineItems || []).find(
        (li) => li.id === selItem.lineItemId,
      );

      const qty = Number(selItem.quantity) || 1;
      const price = Number(selItem.price) || 0;
      const lineTotal = qty * price;

      // Seed material/itemNo/photo from the source Item whenever the
      // line's own stored values are missing — same fallback order as
      // OfferController's backfill (material -> de_no, photo -> Item.photo).
      const src = lineItem?.sourceItemId
        ? sourceItemById.get(String(lineItem.sourceItemId))
        : undefined;

      const material =
        lineItem?.material && lineItem.material !== ""
          ? lineItem.material
          : src
            ? getDeNo(src)
            : "";
      const photo =
        lineItem?.photo && lineItem.photo !== ""
          ? lineItem.photo
          : src?.photo || undefined;

      orderItemsToCreate.push({
        itemName: lineItem ? lineItem.itemName : selItem.itemName || "Item",
        material,
        itemNo: material,
        photo,
        specification: lineItem?.specification || "",
        description: lineItem?.description || "",
        weight: lineItem?.weight || undefined,
        quantity: qty,
        price: price,
        // Only Freizeile lines carry their own taxRate; catalog lines
        // always follow the Auftrag's own tax_rate, so leave theirs unset.
        taxRate:
          lineItem && !lineItem.sourceItemId && !lineItem.requestedItemId
            ? (lineItem.taxRate ?? undefined)
            : undefined,
        lineTotal: lineTotal,
        position: idx + 1,
        sourceLineItemId: lineItem?.id || undefined,
        sourceItemId: lineItem?.sourceItemId || undefined,
        notes: lineItem?.notes || "",
      });
    });

    const taxRate = Number(offer.taxRate ?? 19);
    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const customerOrderRepo: any = AppDataSource.getRepository(CustomerOrder);
    const customerOrder = customerOrderRepo.create({
      order_no: auftragNo,
      offer_id: offer.id,
      title: offer.title,
      customer_id: offer.customerId || undefined,
      status: "Draft",
      currency: offer.currency || "EUR",
      tax_rate: taxRate,
      discount_percentage: offer.discountPercentage || 0,
      discount_amount: offer.discountAmount || 0,
      shipping_cost: offer.shippingCost || 0,
      shipping_quantity: offer.shippingQuantity || 1,
      payment_method: offer.paymentMethod,
      shipping_method: offer.shippingMethod,
      payment_terms: offer.paymentDueDays ? String(offer.paymentDueDays) : "30",
      delivery_terms: offer.deliveryTerms,
      terms_conditions: offer.termsConditions,
      notes: offer.notes || "",
      internal_notes: offer.internalNotes || "",
      customerSnapshot: offer.customerSnapshot || null,
      deliveryAddress: offer.deliveryAddress || null,
      date_created: dateCreatedStr,
      date_delivery: offer.deliveryTime,
    });

    const savedOrder: any = await customerOrderRepo.save(customerOrder);

    const customerOrderItemRepo =
      AppDataSource.getRepository(CustomerOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      customerOrderItemRepo.create({
        ...item,
        customerOrder: savedOrder,
        customerOrderId: savedOrder.id,
      }),
    );
    await customerOrderItemRepo.save(itemEntities);
    await calculateOrderTotals(savedOrder.id);

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

    res.json({ success: true, data: orders });
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

    if (Number(order.subtotal) === 0 && Number(order.total_amount) === 0) {
      await calculateOrderTotals(order.id);
      const updated = await customerOrderRepo.findOne({
        where: { id: order.id },
      });
      if (updated) {
        order.subtotal = updated.subtotal;
        order.tax_amount = updated.tax_amount;
        order.total_amount = updated.total_amount;
      }
    }

    res.json({ success: true, data: order });
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
    const order = await customerOrderRepo.findOne({
      where: { id: Number(id) },
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    await customerOrderRepo.remove(order);
    res.json({ success: true, message: "Auftrag deleted successfully" });
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
      res.status(404).json({
        success: false,
        message: "Customer not found for this inquiry",
      });
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
      console.warn(
        "Could not generate sequence number for customer_order:",
        err,
      );
      auftragNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const orderItemsToCreate: Partial<CustomerOrderItem>[] = [];
    const requests = inquiry.requests || [];
    requests.forEach((reqItem: any, idx: number) => {
      const qty = Number(reqItem.qty) || 1;
      const price = Number(reqItem.salesPrice || reqItem.purchasePrice || 0);
      const lineTotal = qty * price;

      orderItemsToCreate.push({
        itemName: reqItem.itemName || "Item",
        material: reqItem.material || "",
        itemNo: reqItem.material || "",
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
      title: title || inquiry.name,
      customer_id: customer.id,
      status: "Draft",
      currency: "EUR",
      tax_rate: taxRate,
      payment_method: paymentMethod,
      shipping_method: shippingMethod,
      notes: notes || inquiry.description || "",
      customerSnapshot: customerSnapshot,
      date_created: dateCreatedStr,
    });

    const savedOrder = await customerOrderRepo.save(customerOrder);

    const customerOrderItemRepo =
      AppDataSource.getRepository(CustomerOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      customerOrderItemRepo.create({
        ...item,
        customerOrder: savedOrder,
        customerOrderId: savedOrder.id,
      }),
    );
    await customerOrderItemRepo.save(itemEntities);
    await calculateOrderTotals(savedOrder.id);

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
    const {
      customerId,
      selectedItems,
      title,
      paymentMethod,
      shippingMethod,
      notes,
    } = req.body;

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: "Recipient customer is required for Auftrag",
      });
      return;
    }

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 item MUST be selected for Auftrag",
      });
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
    const itemIds = selectedItems
      .map((s: any) => Number(s.itemId || s.id))
      .filter(Boolean);
    const dbItems =
      itemIds.length > 0
        ? await itemRepo.find({ where: { id: In(itemIds) } })
        : [];
    const itemMap = new Map(dbItems.map((it) => [String(it.id), it]));

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `B${yy}${mm}-`;

    let auftragNo = "";
    try {
      auftragNo = await NumberSequenceService.getNextNumber("customer_order");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for customer_order:",
        err,
      );
      auftragNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const orderItemsToCreate: Partial<CustomerOrderItem>[] = [];

    for (let idx = 0; idx < selectedItems.length; idx++) {
      const selItem = selectedItems[idx];
      const matchedItem = itemMap.get(String(selItem.itemId || selItem.id));
      const qty = Number(selItem.qty || selItem.quantity) || 1;

      let price = Number(selItem.price ?? 0);
      if (!selItem.price && matchedItem) {
        price = await getEffectiveUnitPrice(matchedItem, customer.id, qty);
      }
      const lineTotal = qty * price;

      const itemName =
        selItem.itemName ||
        matchedItem?.item_name ||
        (matchedItem as any)?.itemName ||
        "Item";

      orderItemsToCreate.push({
        itemName: itemName,
        material:
          matchedItem?.model ||
          (matchedItem?.ean ? String(matchedItem.ean) : undefined),
        itemNo: matchedItem?.model || undefined,
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
    }

    const taxRate = 19;
    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const firstItemName = orderItemsToCreate[0]?.itemName || "Customer Items";
    const orderTitle =
      title?.trim() ||
      (orderItemsToCreate.length > 1
        ? `${firstItemName} +${orderItemsToCreate.length - 1} more`
        : firstItemName);

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
      title: orderTitle,
      customer_id: customer.id,
      status: "Draft",
      currency: "EUR",
      tax_rate: taxRate,
      payment_method: paymentMethod,
      shipping_method: shippingMethod,
      notes: notes || "",
      customerSnapshot: customerSnapshot,
      date_created: dateCreatedStr,
    });

    const savedOrder = await customerOrderRepo.save(customerOrder);

    const customerOrderItemRepo =
      AppDataSource.getRepository(CustomerOrderItem);
    const itemEntities = orderItemsToCreate.map((item) =>
      customerOrderItemRepo.create({
        ...item,
        customerOrder: savedOrder,
        customerOrderId: savedOrder.id,
      }),
    );
    await customerOrderItemRepo.save(itemEntities);
    await calculateOrderTotals(savedOrder.id);

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

export const updateCustomerOrder = async (
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
      discountPercentage,
      shippingCost,
      shippingQuantity,
      notes,
      internalNotes,
      customerSnapshot,
      deliveryAddress,
      dateDelivery,
      paymentMethod,
      shippingMethod,
      paymentTerms,
      deliveryTerms,
      termsConditions,
      highlightColor,
    } = req.body;

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const auftrag = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer"],
    });

    if (!auftrag) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    if (title !== undefined) auftrag.title = title;
    if (status !== undefined) auftrag.status = status;
    if (currency !== undefined) auftrag.currency = currency;
    if (notes !== undefined) auftrag.notes = notes;
    if (internalNotes !== undefined) auftrag.internal_notes = internalNotes;
    if (customerSnapshot !== undefined)
      auftrag.customerSnapshot = customerSnapshot;
    if (deliveryAddress !== undefined)
      auftrag.deliveryAddress = deliveryAddress;
    if (dateDelivery !== undefined) auftrag.date_delivery = dateDelivery;
    if (paymentMethod !== undefined) auftrag.payment_method = paymentMethod;
    if (shippingMethod !== undefined) auftrag.shipping_method = shippingMethod;
    if (paymentTerms !== undefined) auftrag.payment_terms = paymentTerms;
    if (deliveryTerms !== undefined) auftrag.delivery_terms = deliveryTerms;
    if (termsConditions !== undefined)
      auftrag.terms_conditions = termsConditions;
    if (highlightColor !== undefined) auftrag.highlight_color = highlightColor;
    if (shippingCost !== undefined)
      auftrag.shipping_cost = parseFlexibleNumberOrZero(shippingCost);
    if (shippingQuantity !== undefined)
      auftrag.shipping_quantity =
        parseFlexibleNumberOrZero(shippingQuantity) || 1;
    if (discountPercentage !== undefined)
      auftrag.discount_percentage =
        parseFlexibleNumberOrZero(discountPercentage);

    const taxRateChanged =
      taxRate !== undefined && Number(taxRate) !== Number(auftrag.tax_rate);
    if (taxRate !== undefined)
      auftrag.tax_rate = parseFlexibleNumber(taxRate) ?? 19;

    await customerOrderRepo.save(auftrag);

    // Any of these touch subtotal/tax/total, so always recalc.
    await calculateOrderTotals(auftrag.id);

    const fullOrder = await customerOrderRepo.findOne({
      where: { id: auftrag.id },
      relations: ["orderItems", "customer"],
    });

    res.json({
      success: true,
      message: "Auftrag updated successfully",
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
};

// ---------------------------------------------------------------------
// Line items
// ---------------------------------------------------------------------

export const createOrderLineItem = async (
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

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: { id: Number(orderId) },
      relations: ["orderItems"],
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const nextPosition =
      (order.orderItems || []).reduce(
        (max, li) => Math.max(max, li.position || 0),
        0,
      ) + 1;

    const quantity = parseFlexibleNumber(body.quantity) || 1;
    let price = parseFlexibleNumber(body.price) ?? 0;

    if (body.sourceItemId) {
      const itemRepository = AppDataSource.getRepository(Item);
      const sourceItem = await itemRepository.findOne({
        where: { id: parseInt(body.sourceItemId, 10) },
      });
      if (sourceItem) {
        price = await getEffectiveUnitPrice(
          sourceItem,
          order.customer_id,
          quantity,
        );
      }
    }

    // Only Freizeile lines (no sourceItemId) may set their own taxRate;
    // falls back to the order's own tax_rate if not provided.
    const taxRate =
      !body.sourceItemId && body.taxRate !== undefined
        ? (parseFlexibleNumber(body.taxRate) ?? order.tax_rate ?? 19)
        : undefined;

    const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
    const lineItem = orderItemRepo.create({
      customerOrder: order,
      customerOrderId: order.id,
      itemName: String(body.itemName).trim(),
      itemNo: body.itemNo,
      material: body.material,
      specification: body.specification,
      description: body.description,
      weight:
        body.weight !== undefined
          ? (parseFlexibleNumber(body.weight) ?? undefined)
          : undefined,
      quantity,
      price,
      taxRate,
      lineTotal: quantity * price,
      position: nextPosition,
      sourceItemId: body.sourceItemId || undefined,
      notes: body.notes,
    });

    const saved = await orderItemRepo.save(lineItem);
    await calculateOrderTotals(order.id);

    res
      .status(201)
      .json({ success: true, message: "Line item added", data: saved });
  } catch (error) {
    next(error);
  }
};

export const updateOrderLineItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId, lineItemId } = req.params;
    const body = req.body || {};

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: { id: Number(orderId) },
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
    const lineItem = await orderItemRepo.findOne({
      where: { id: lineItemId, customerOrderId: order.id },
    });
    if (!lineItem) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }

    // Re-resolve the tiered price when quantity changes on a catalog line
    // and no explicit price override was sent in the same request.
    if (
      body.quantity !== undefined &&
      body.price === undefined &&
      lineItem.sourceItemId
    ) {
      const itemRepository = AppDataSource.getRepository(Item);
      const sourceItem = await itemRepository.findOne({
        where: { id: parseInt(lineItem.sourceItemId, 10) },
      });
      if (sourceItem) {
        const qtyNum = parseFlexibleNumber(body.quantity) || 1;
        body.price = await getEffectiveUnitPrice(
          sourceItem,
          order.customer_id,
          qtyNum,
        );
      }
    }

    if (body.itemName !== undefined) lineItem.itemName = body.itemName;
    if (body.itemNo !== undefined) lineItem.itemNo = body.itemNo;
    if (body.material !== undefined) lineItem.material = body.material;
    if (body.specification !== undefined)
      lineItem.specification = body.specification;
    if (body.description !== undefined) lineItem.description = body.description;
    if (body.notes !== undefined) lineItem.notes = body.notes;
    if (body.highlightColor !== undefined)
      lineItem.highlightColor = body.highlightColor;
    if (body.quantity !== undefined) {
      lineItem.quantity = parseFlexibleNumber(body.quantity) || 1;
    }
    if (body.price !== undefined) {
      lineItem.price = parseFlexibleNumberOrZero(body.price);
    }
    if (body.extraWeight !== undefined) {
      lineItem.extraWeight = parseFlexibleNumber(body.extraWeight) ?? undefined;
    }
    // taxRate only meaningful (and only editable in the UI) for Freizeile
    // lines, but we don't gate it server-side beyond honoring it if sent.
    if (body.taxRate !== undefined) {
      lineItem.taxRate =
        parseFlexibleNumber(body.taxRate) ?? order.tax_rate ?? 19;
    }

    lineItem.lineTotal = Number(lineItem.quantity) * Number(lineItem.price);

    const updated = await orderItemRepo.save(lineItem);
    await calculateOrderTotals(order.id);

    res
      .status(200)
      .json({ success: true, message: "Line item updated", data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteOrderLineItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId, lineItemId } = req.params;
    const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
    const lineItem = await orderItemRepo.findOne({
      where: { id: lineItemId, customerOrderId: Number(orderId) },
    });
    if (!lineItem) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }
    await orderItemRepo.remove(lineItem);
    await calculateOrderTotals(Number(orderId));

    res.status(200).json({ success: true, message: "Line item deleted" });
  } catch (error) {
    next(error);
  }
};

export const previewOrderLineItemPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId, lineItemId } = req.params;
    const quantity = parseFlexibleNumber(req.query.quantity as string) || 1;

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: { id: Number(orderId) },
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
    const lineItem = await orderItemRepo.findOne({
      where: { id: lineItemId, customerOrderId: order.id },
    });
    if (!lineItem) {
      res.status(404).json({ success: false, message: "Line item not found" });
      return;
    }

    if (!lineItem.sourceItemId) {
      res.status(200).json({ success: true, data: { price: null } });
      return;
    }

    const itemRepository = AppDataSource.getRepository(Item);
    const sourceItem = await itemRepository.findOne({
      where: { id: parseInt(lineItem.sourceItemId, 10) },
    });
    if (!sourceItem) {
      res.status(200).json({ success: true, data: { price: null } });
      return;
    }

    const price = await getEffectiveUnitPrice(
      sourceItem,
      order.customer_id,
      quantity,
    );
    res.status(200).json({ success: true, data: { price } });
  } catch (error) {
    next(error);
  }
};
