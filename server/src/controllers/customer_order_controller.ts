import { In, IsNull } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import {
  AuftragStatus,
  CustomerOrder,
  StockWhere,
} from "../models/customer_orders";
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
import path from "path";
import fs from "fs";
import { generateGtechDocumentPdf } from "../services/gtechPdfGenerator";
import { Rechnung } from "../models/rechnung";
import { Rechnung_k } from "../models/rechnung_k";
import { TransferOrder } from "../models/transfer_order";
import { RechnungItem } from "../models/rechnung_items";

const salesPriceRepository = AppDataSource.getRepository(SalesPrice);

/**
 * Helper function to check if any of the order's line items are stock items
 * Returns true if at least one line item has is_stock_item = "Y"
 */
async function hasStockItems(orderId: number): Promise<boolean> {
  const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);
  const orderItems = await orderItemRepo.find({
    where: { customerOrderId: orderId },
  });

  const sourceItemIds = Array.from(
    new Set(
      orderItems
        .filter((li: any) => li.sourceItemId)
        .map((li: any) => parseInt(li.sourceItemId, 10))
        .filter((id: number) => !isNaN(id)),
    ),
  );

  let itemById = new Map<string, any>();
  if (sourceItemIds.length > 0) {
    const itemRepo = AppDataSource.getRepository(Item);
    const items = await itemRepo.find({
      where: { id: In(sourceItemIds) },
      select: ["id", "is_stock_item"],
    });
    itemById = new Map(items.map((it: any) => [String(it.id), it]));
  }

  for (const item of orderItems) {
    if (item.sourceItemId) {
      const sourceItem = itemById.get(String(item.sourceItemId));
      if (sourceItem && sourceItem.is_stock_item === "Y") {
        return true;
      }
    }
    // Also check if the line item itself has isStockItem flag
    if ((item as any).isStockItem === true) {
      return true;
    }
  }
  return false;
}
/**
 * Helper function to determine if stock_where should be set
 * Only sets stock_where if there's at least one stock item in the order
 */
async function shouldSetStockWhere(orderId: number): Promise<boolean> {
  return await hasStockItems(orderId);
}

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

  const ownSalesPrice = parseFloat(String(item.sales_price ?? ""));
  if (!isNaN(ownSalesPrice) && ownSalesPrice > 0) return ownSalesPrice;

  return Number(item.price) || 0;
}

const isFreetextLine = (li: CustomerOrderItem) =>
  !li.sourceItemId && !li.sourceLineItemId;

const isValidUuid = (value: any): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

async function getLinkedDocumentsForAuftrag(
  auftragId: number,
  offerId?: string | null,
) {
  const offerRepo = AppDataSource.getRepository(Offer);
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
  const transferOrderRepo = AppDataSource.getRepository(TransferOrder);

  const safeOfferId = isValidUuid(offerId) ? offerId : null;

  const [offer, rechnungen, rechnungenK, bestellungen] = await Promise.all([
    safeOfferId
      ? offerRepo.findOne({
          where: { id: safeOfferId },
          select: ["id", "offerNumber", "createdAt"],
        })
      : Promise.resolve(null),
    rechnungRepo.find({
      where: { auftrag_id: auftragId },
      select: ["id", "invoice_number", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
    rechnungKRepo.find({
      where: { auftrag_id: auftragId },
      select: ["id", "invoice_number", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
    transferOrderRepo.find({
      where: { auftrag_id: auftragId },
      select: ["id", "order_no", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
  ]);

  return {
    offers: offer ? [offer] : [],
    rechnungen,
    rechnungenK,
    bestellungen,
  };
}

async function getLinkedDocumentsForAuftraege(
  auftragIds: number[],
  offerIdByAuftragId: Map<number, string | null | undefined>,
) {
  const empty = () => ({
    offers: [] as any[],
    rechnungen: [] as any[],
    rechnungenK: [] as any[],
    bestellungen: [] as any[],
  });

  const result = new Map<number, ReturnType<typeof empty>>();
  auftragIds.forEach((id) => result.set(id, empty()));

  if (auftragIds.length === 0) return result;

  const offerRepo = AppDataSource.getRepository(Offer);
  const rechnungRepo = AppDataSource.getRepository(Rechnung);
  const rechnungKRepo = AppDataSource.getRepository(Rechnung_k);
  const transferOrderRepo = AppDataSource.getRepository(TransferOrder);

  // Only well-formed UUIDs go into the Offer query — anything else in
  // offer_id is stray data and is silently skipped rather than crashing
  // the whole request.
  const offerIds = Array.from(
    new Set(Array.from(offerIdByAuftragId.values()).filter(isValidUuid)),
  );

  const [offers, rechnungen, rechnungenK, bestellungen] = await Promise.all([
    offerIds.length
      ? offerRepo.find({
          where: { id: In(offerIds) },
          select: ["id", "offerNumber", "createdAt"],
        })
      : Promise.resolve([]),
    rechnungRepo.find({
      where: { auftrag_id: In(auftragIds) },
      select: ["id", "invoice_number", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
    rechnungKRepo.find({
      where: { auftrag_id: In(auftragIds) },
      select: ["id", "invoice_number", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
    transferOrderRepo.find({
      where: { auftrag_id: In(auftragIds) },
      select: ["id", "order_no", "created_at", "auftrag_id"],
      order: { created_at: "DESC" },
    }),
  ]);

  const offerById = new Map(offers.map((o: any) => [o.id, o]));

  for (const [auftragId, offerId] of offerIdByAuftragId.entries()) {
    if (!isValidUuid(offerId)) continue;
    const bucket = result.get(auftragId);
    const offer = offerById.get(offerId);
    if (bucket && offer) bucket.offers.push(offer);
  }

  const push = (
    key: "rechnungen" | "rechnungenK" | "bestellungen",
    rows: any[],
  ) => {
    for (const row of rows) {
      const bucket = result.get(row.auftrag_id);
      if (bucket) bucket[key].push(row);
    }
  };

  push("rechnungen", rechnungen);
  push("rechnungenK", rechnungenK);
  push("bestellungen", bestellungen);

  return result;
}

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
    const { selectedItems, stock_where } = req.body;

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

    const itemRepository = AppDataSource.getRepository(Item);

    const sourceItemIds = Array.from(
      new Set(
        (offer.lineItems || [])
          .filter((li: any) => li.sourceItemId)
          .map((li: any) => Number(li.sourceItemId))
          .filter((id: number) => !isNaN(id)),
      ),
    );

    let sourceItemById = new Map<string, any>();
    if (sourceItemIds.length > 0) {
      const sourceItems = await itemRepository.find({
        where: { id: In(sourceItemIds) },
        relations: ["parent"],
      });
      sourceItemById = new Map(
        sourceItems.map((it: any) => [String(it.id), it]),
      );
    }

    // item_no_de and ItemID_DE now live on Item directly — no more
    // WarehouseItem lookup needed here.
    const getDeNo = (it: any): string =>
      it.item_no_de || it.parent?.de_no || "";

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
    const hasStockItem = selectedItems.some((selItem: any) => {
      const lineItem = (offer.lineItems || []).find(
        (li) => li.id === selItem.lineItemId,
      );
      if (lineItem?.sourceItemId) {
        const src = sourceItemById.get(String(lineItem.sourceItemId));
        return src?.is_stock_item === "Y";
      }
      return false;
    });

    selectedItems.forEach((selItem: any, idx: number) => {
      const lineItem = (offer.lineItems || []).find(
        (li) => li.id === selItem.lineItemId,
      );

      const qty = Number(selItem.quantity) || 1;
      const price = Number(selItem.price) || 0;
      const lineTotal = qty * price;

      // Seed material/itemNo/photo from the source Item whenever the
      // line's own stored values are missing — same fallback order as
      // OfferController's backfill (material -> item_no_de, photo ->
      // Item.photo).
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

    let finalStockWhere = null;
    if (hasStockItem && stock_where) {
      finalStockWhere = stock_where;
    } else if (hasStockItem && !stock_where) {
      finalStockWhere = StockWhere.CN;
    }

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
      ...(finalStockWhere && { stock_where: finalStockWhere }),
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

/**
 * Attaches computed delivered/open quantity to every order item across the
 * given orders, in a single batched query against rechnung_item — same
 * pattern as attachStockInfoToOrders below.
 *
 * quantity on CustomerOrderItem is the fixed ordered amount and is never
 * mutated. "Delivered" is derived by summing rechnung_item.quantity for
 * every Rechnung line that traces back to this order line
 * (sourceLineItemId), and "open" is quantity - delivered, floored at 0.
 * This is computed on every read rather than stored, so it can't drift out
 * of sync with the actual Rechnungen the way a stored counter could.
 */
async function attachDeliveredQuantityToOrders(
  orders: CustomerOrder[],
): Promise<void> {
  const lineItemIds = orders
    .flatMap((o) => o.orderItems || [])
    .map((li: any) => li.id)
    .filter(Boolean);

  let deliveredByLineId = new Map<string, number>();
  if (lineItemIds.length > 0) {
    const rechnungItemRepo = AppDataSource.getRepository(RechnungItem);
    const rows = await rechnungItemRepo
      .createQueryBuilder("ri")
      .select("ri.sourceLineItemId", "sourceLineItemId")
      .addSelect("SUM(ri.quantity)", "delivered")
      .where("ri.sourceLineItemId IN (:...ids)", { ids: lineItemIds })
      .groupBy("ri.sourceLineItemId")
      .getRawMany();

    deliveredByLineId = new Map(
      rows.map((r: any) => [
        String(r.sourceLineItemId),
        Number(r.delivered) || 0,
      ]),
    );
  }

  for (const order of orders) {
    for (const li of (order.orderItems || []) as any[]) {
      const delivered = deliveredByLineId.get(String(li.id)) || 0;
      const ordered = Number(li.quantity) || 0;
      li.deliveredQuantity = delivered;
      li.openQuantity = Math.max(0, ordered - delivered);
    }
  }
}

export const getAllCustomerOrders = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const orders = await customerOrderRepo.find({
      order: { created_at: "DESC" },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
    });

    await attachStockInfoToOrders(orders);
    await attachDeliveredQuantityToOrders(orders);

    const auftragIds = orders.map((o) => o.id);
    const offerIdByAuftragId = new Map(orders.map((o) => [o.id, o.offer_id]));
    const linkedDocumentsByAuftragId = await getLinkedDocumentsForAuftraege(
      auftragIds,
      offerIdByAuftragId,
    );

    const ordersWithLinkedDocuments = orders.map((order: any) => ({
      ...order,
      linkedDocuments: linkedDocumentsByAuftragId.get(order.id) || {
        offers: [],
        rechnungen: [],
        rechnungenK: [],
        bestellungen: [],
      },
    }));

    res.json({ success: true, data: ordersWithLinkedDocuments });
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
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
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

    await attachStockInfoToOrders([order]);
    await attachDeliveredQuantityToOrders([order]);

    const linkedDocuments = await getLinkedDocumentsForAuftrag(
      order.id,
      order.offer_id,
    );

    res.json({ success: true, data: { ...order, linkedDocuments } });
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
      stock_where,
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

    // Check if any selected item is a stock item
    const hasStockItem = selectedItems.some((selItem: any) => {
      const matchedItem = itemMap.get(String(selItem.itemId || selItem.id));
      return matchedItem?.is_stock_item === "Y";
    });

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

      // material/itemNo now sourced from Item.item_no_de directly, with
      // the model/EAN fallback kept as before.
      const material =
        matchedItem?.item_no_de ||
        matchedItem?.model ||
        (matchedItem?.ean ? String(matchedItem.ean) : undefined);

      orderItemsToCreate.push({
        itemName: itemName,
        material,
        itemNo: matchedItem?.item_no_de || undefined,
        photo: matchedItem?.photo || matchedItem?.pix_path || undefined,
        specification: matchedItem?.remark || undefined,
        description: selItem.notes || matchedItem?.remark || undefined,
        notes: matchedItem?.remark_ex || undefined,
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

    let finalStockWhere = null;
    if (hasStockItem && stock_where) {
      finalStockWhere = stock_where;
    } else if (hasStockItem && !stock_where) {
      finalStockWhere = StockWhere.CN;
    }

    const customerOrder = customerOrderRepo.create({
      order_no: auftragNo,
      title: orderTitle,
      customer_id: customer.id,
      status: "open",
      currency: "EUR",
      tax_rate: taxRate,
      payment_method: paymentMethod,
      shipping_method: shippingMethod,
      notes: notes || "",
      customerSnapshot: customerSnapshot,
      date_created: dateCreatedStr,
      ...(finalStockWhere && { stock_where: finalStockWhere }),
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
      stock_where,
      auftrag_status,
      auftragStatus,
      real_delivery_date,
      realDeliveryDate,
      is_weiterversand,
      isWeiterversand,
      weiterversand_service_provider_id,
      weiterversandServiceProviderId,
      weiterversand_labels,
      weiterversandLabels,
      weiterversand_tracking,
      weiterversandTracking,
    } = req.body;

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const auftrag = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
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

    // Extra fields mapping
    const finalAuftragStatus =
      auftrag_status !== undefined ? auftrag_status : auftragStatus;
    if (finalAuftragStatus !== undefined)
      auftrag.auftrag_status = finalAuftragStatus;

    const finalRealDeliveryDate =
      real_delivery_date !== undefined ? real_delivery_date : realDeliveryDate;
    if (finalRealDeliveryDate !== undefined)
      auftrag.real_delivery_date = finalRealDeliveryDate || (null as any);

    const finalIsWeiterversand =
      is_weiterversand !== undefined ? is_weiterversand : isWeiterversand;
    if (finalIsWeiterversand !== undefined)
      auftrag.is_weiterversand = Boolean(finalIsWeiterversand);

    const finalProviderId =
      weiterversand_service_provider_id !== undefined
        ? weiterversand_service_provider_id
        : weiterversandServiceProviderId;
    if (finalProviderId !== undefined)
      auftrag.weiterversand_service_provider_id = finalProviderId
        ? Number(finalProviderId)
        : (null as any);

    const finalLabels =
      weiterversand_labels !== undefined
        ? weiterversand_labels
        : weiterversandLabels;
    if (finalLabels !== undefined) auftrag.weiterversand_labels = finalLabels;

    const finalTracking =
      weiterversand_tracking !== undefined
        ? weiterversand_tracking
        : weiterversandTracking;
    if (finalTracking !== undefined)
      auftrag.weiterversand_tracking = finalTracking;

    // Only update stock_where if the order has stock items
    if (stock_where !== undefined) {
      const hasStock = await hasStockItems(Number(id));
      if (hasStock) {
        // Validate that the value is either "EU" or "CN"
        if (stock_where === StockWhere.EU || stock_where === StockWhere.CN) {
          auftrag.stock_where = stock_where;
        } else {
          res.status(400).json({
            success: false,
            message: "stock_where must be either 'EU' or 'CN'",
          });
          return;
        }
      } else {
        // If no stock items, remove stock_where if it exists
        auftrag.stock_where = undefined as any;
      }
    }

    const taxRateChanged =
      taxRate !== undefined && Number(taxRate) !== Number(auftrag.tax_rate);
    if (taxRate !== undefined)
      auftrag.tax_rate = parseFlexibleNumber(taxRate) ?? 19;

    await customerOrderRepo.save(auftrag);
    await calculateOrderTotals(auftrag.id);
    const fullOrder = await customerOrderRepo.findOne({
      where: { id: auftrag.id },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
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
    let isStockItem = false;

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
        isStockItem = sourceItem.is_stock_item === "Y";
      }
    }

    const taxRate =
      !body.sourceItemId && body.taxRate !== undefined
        ? (parseFlexibleNumber(body.taxRate) ?? order.tax_rate ?? 19)
        : undefined;

    const orderItemRepo = AppDataSource.getRepository(CustomerOrderItem);

    // Build the line item data WITHOUT the relation
    const lineItemData: any = {
      customerOrderId: order.id, // Set the foreign key directly
      itemName: String(body.itemName).trim(),
      itemNo: body.itemNo,
      material: body.material,
      specification: body.specification,
      description: body.description,
      weight:
        body.weight !== undefined
          ? (parseFlexibleNumber(body.weight) ?? undefined)
          : undefined,
      quantity: quantity,
      price: price,
      taxRate: taxRate,
      lineTotal: quantity * price,
      position: nextPosition,
      sourceItemId: body.sourceItemId || undefined,
      notes: body.notes,
    };

    // Create and save the line item
    const lineItem = orderItemRepo.create(lineItemData);
    const saved: any = await orderItemRepo.save(lineItem);

    // Recalculate totals WITHOUT fetching the order again
    await calculateOrderTotals(order.id);

    // After adding a line item, check if we need to update stock_where on the order
    if (isStockItem) {
      if (!order.stock_where) {
        // Fetch the order fresh to avoid stale data issues
        const freshOrder = await customerOrderRepo.findOne({
          where: { id: order.id },
        });
        if (freshOrder) {
          freshOrder.stock_where = StockWhere.CN;
          await customerOrderRepo.save(freshOrder);
        }
      }
    } else if (!isStockItem && order.stock_where) {
      const hasOtherStock = await hasStockItems(order.id);
      if (!hasOtherStock) {
        const freshOrder = await customerOrderRepo.findOne({
          where: { id: order.id },
        });
        if (freshOrder) {
          freshOrder.stock_where = undefined as any;
          await customerOrderRepo.save(freshOrder);
        }
      }
    }

    // Fetch the complete line item with relations for the response
    const completeLineItem = await orderItemRepo.findOne({
      where: { id: saved.id },
      relations: ["customerOrder"],
    });

    res.status(201).json({
      success: true,
      message: "Line item added",
      data: completeLineItem || saved,
    });
  } catch (error) {
    console.error("Error creating order line item:", error);
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

    // Check if this was a stock item before deleting
    let wasStockItem = false;
    if (lineItem.sourceItemId) {
      const itemRepo = AppDataSource.getRepository(Item);
      const sourceItem = await itemRepo.findOne({
        where: { id: parseInt(lineItem.sourceItemId, 10) },
      });
      if (sourceItem && sourceItem.is_stock_item === "Y") {
        wasStockItem = true;
      }
    }

    await orderItemRepo.remove(lineItem);
    await calculateOrderTotals(Number(orderId));

    // If we deleted a stock item, check if any stock items remain
    if (wasStockItem) {
      const hasStock = await hasStockItems(Number(orderId));
      if (!hasStock) {
        // If no stock items remain, remove stock_where from the order
        const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
        const order = await customerOrderRepo.findOne({
          where: { id: Number(orderId) },
        });
        if (order && order.stock_where) {
          order.stock_where = undefined as any;
          await customerOrderRepo.save(order);
        }
      }
    }

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

/**
 * Attaches stock info to every order item across the given orders, in a
 * single batched Item query — mirrors the Offer backfill pattern. Sends
 * BOTH stock_eu and stock_cn per line so the frontend can switch the
 * warehouse selector locally without a re-fetch. is_stock_item is always
 * attached too, even for non-stock lines ("N"), so the frontend never has
 * to guess.
 */
async function attachStockInfoToOrders(orders: CustomerOrder[]): Promise<void> {
  const itemRepo = AppDataSource.getRepository(Item);

  const sourceItemIds = Array.from(
    new Set(
      orders
        .flatMap((o) => o.orderItems || [])
        .filter((li: any) => li.sourceItemId)
        .map((li: any) => parseInt(li.sourceItemId, 10))
        .filter((id: number) => !isNaN(id)),
    ),
  );

  let itemById = new Map<string, any>();
  if (sourceItemIds.length > 0) {
    const items = await itemRepo.find({
      where: { id: In(sourceItemIds) },
      select: ["id", "is_stock_item", "stockEU", "stockCN"],
    });
    itemById = new Map(items.map((it: any) => [String(it.id), it]));
  }

  for (const order of orders) {
    for (const li of (order.orderItems || []) as any[]) {
      const src = li.sourceItemId
        ? itemById.get(String(li.sourceItemId))
        : undefined;
      if (!src) {
        li.is_stock_item = "N";
        li.stock_eu = null;
        li.stock_cn = null;
        continue;
      }
      li.is_stock_item = src.is_stock_item || "N";
      li.stock_eu = src.is_stock_item === "Y" ? Number(src.stockEU) || 0 : null;
      li.stock_cn = src.is_stock_item === "Y" ? Number(src.stockCN) || 0 : null;
    }
  }
}

export const downloadCustomerOrderPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: [{ id: Number(id) || 0 }, { order_no: String(id) }],
      relations: ["orderItems", "customer", "customer.defaultTaxProfile"],
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const defaultTaxRate =
      order.tax_rate !== undefined && order.tax_rate !== null
        ? Number(order.tax_rate)
        : order.customer?.defaultTaxProfile?.tax_rate !== undefined &&
            order.customer?.defaultTaxProfile?.tax_rate !== null
          ? Number(order.customer.defaultTaxProfile.tax_rate)
          : 19;

    const customerSnap = order.customerSnapshot || order.customer || {};
    const contactName =
      (req as any).user?.name || (req as any).user?.username || "Admin";
    const customerCompName = (
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

    const uploadsDir = path.join(__dirname, "../../uploads/customer_orders");
    const filePath = path.join(
      uploadsDir,
      `auftrag_${order.order_no || order.id}.pdf`,
    );

    const isFreetext = (it: any) =>
      !it.sourceItemId && !it.material && (it.itemName || it.description);

    const rawItems = (order.orderItems || [])
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
      const unitPrice = Number(it.price || 0);
      const lineTotal =
        it.lineTotal !== undefined && it.lineTotal !== null
          ? Number(it.lineTotal)
          : qty * unitPrice;
      return {
        position: it.position || idx + 1,
        artNr: it.itemNo || it.material || "—",
        bezeichnung: it.itemName || it.description || "Item",
        remarks:
          it.notes || it.specification || it.remark || it.remark_ex || "-",
        vatRate:
          it.taxRate !== undefined && it.taxRate !== null
            ? Number(it.taxRate)
            : defaultTaxRate,
        quantity: qty,
        unitPrice: unitPrice,
        lineTotal: lineTotal,
      };
    });

    const isDelivered =
      order.auftrag_status === AuftragStatus.DELIVERED ||
      order.auftrag_status === ("delivered" as any) ||
      order.auftrag_status === AuftragStatus.CLOSED ||
      order.auftrag_status === ("closed" as any) ||
      String(order.status || "").toLowerCase() === "delivered" ||
      String(order.status || "").toLowerCase() === "completed" ||
      String(order.status || "").toLowerCase() === "closed" ||
      !!order.real_delivery_date;

    const effectiveDeliveryDate =
      (isDelivered && order.real_delivery_date) ||
      order.date_delivery ||
      order.delivery_terms;

    await generateGtechDocumentPdf({
      documentType: "Auftrag" as any,
      documentNumber: order.order_no,
      customerSnapshot: customerSnap,
      customerEntity: order.customer,
      deliveryAddress: order.deliveryAddress,
      metadataItems: [
        ["Ansprechpartner", contactName],
        ["Kunde", kundeCombined],
        ["Datum", order.date_created || order.created_at],
      ],
      isDelivered: isDelivered,
      lineItems: items,
      showPrices: true,
      shippingMethod: order.shipping_method,
      shippingCost: Number(order.shipping_cost || 0),
      shippingQuantity: Number(order.shipping_quantity || 1),
      shippingTaxRate: defaultTaxRate,
      discountPercentage: Number(order.discount_percentage || 0),
      discountAmount: Number(order.discount_amount || 0),
      subtotal: Number(order.subtotal || 0),
      taxAmount: Number(order.tax_amount || 0),
      totalAmount: Number(order.total_amount || 0),
      taxRate: defaultTaxRate,
      currency: order.currency || "EUR",
      notes: order.notes,
      deliveryTime: effectiveDeliveryDate,
      deliveryDate: effectiveDeliveryDate,
      deliveryTerms: order.delivery_terms,
      paymentTerms: order.payment_terms
        ? `Zahlungsziel: ${order.payment_terms} Tage`
        : undefined,
      paymentMethod: order.payment_method,
      outputFilePath: filePath,
    });

    const cleanTitle = (order.title || "")
      .trim()
      .replace(/[^\w-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
    const docNo = String(order.order_no || order.id || "order")
      .trim()
      .replace(/[\s_]+/g, "_");
    const downloadFileName = cleanTitle
      ? `Auftrag_${docNo}_GTech_${cleanTitle}.pdf`
      : `Auftrag_${docNo}_GTech.pdf`;

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

export const closeCustomerOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { real_delivery_date } = req.body;

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const order = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer"],
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Auftrag not found",
      });
      return;
    }

    // Check if order is already closed
    if (order.auftrag_status === AuftragStatus.CLOSED) {
      res.status(400).json({
        success: false,
        message: "Order is already closed",
      });
      return;
    }

    order.auftrag_status = AuftragStatus.CLOSED;

    if (real_delivery_date) {
      order.real_delivery_date = real_delivery_date;
    } else {
      const today = new Date();
      order.real_delivery_date = today.toISOString().split("T")[0];
    }

    order.status = "Closed";

    await customerOrderRepo.save(order);

    const updatedOrder = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
    });

    res.json({
      success: true,
      message: `Order ${order.order_no} closed successfully`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error closing customer order:", error);
    next(error);
  }
};

export const duplicateCustomerOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const customerOrderItemRepo =
      AppDataSource.getRepository(CustomerOrderItem);

    const originalOrder = await customerOrderRepo.findOne({
      where: { id: Number(id) },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
    });

    if (!originalOrder) {
      res.status(404).json({
        success: false,
        message: "Auftrag not found",
      });
      return;
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `B${yy}${mm}-`;

    let newOrderNo = "";
    try {
      newOrderNo = await NumberSequenceService.getNextNumber("customer_order");
    } catch (err) {
      console.warn(
        "Could not generate sequence number for customer_order:",
        err,
      );
      newOrderNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
      now.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}.${now.getFullYear()}`;

    const duplicatedOrder = customerOrderRepo.create({
      order_no: newOrderNo,
      customer_id: originalOrder.customer_id,
      offer_id: originalOrder.offer_id,
      title: originalOrder.title,
      status: "open",
      auftrag_status: AuftragStatus.OPEN,
      currency: originalOrder.currency || "EUR",
      tax_rate: originalOrder.tax_rate ?? 19,
      discount_percentage: originalOrder.discount_percentage ?? 0,
      discount_amount: originalOrder.discount_amount ?? 0,
      shipping_cost: originalOrder.shipping_cost ?? 0,
      shipping_quantity: originalOrder.shipping_quantity ?? 1,
      payment_method: originalOrder.payment_method,
      shipping_method: originalOrder.shipping_method,
      payment_terms: originalOrder.payment_terms,
      delivery_terms: originalOrder.delivery_terms,
      terms_conditions: originalOrder.terms_conditions,
      highlight_color: originalOrder.highlight_color,
      subtotal: originalOrder.subtotal ?? 0,
      tax_amount: originalOrder.tax_amount ?? 0,
      total_amount: originalOrder.total_amount ?? 0,
      notes: originalOrder.notes,
      internal_notes: originalOrder.internal_notes,
      customerSnapshot: originalOrder.customerSnapshot,
      deliveryAddress: originalOrder.deliveryAddress,
      date_created: dateCreatedStr,
      date_emailed: undefined,
      date_delivery: originalOrder.date_delivery,
      stock_where: originalOrder.stock_where || StockWhere.EU,
      real_delivery_date: undefined,
      is_weiterversand: originalOrder.is_weiterversand || false,
      weiterversand_service_provider_id:
        originalOrder.weiterversand_service_provider_id,
      weiterversand_labels: originalOrder.weiterversand_labels,
      weiterversand_tracking: originalOrder.weiterversand_tracking,
    });

    const savedOrder = await customerOrderRepo.save(duplicatedOrder);

    if (originalOrder.orderItems && originalOrder.orderItems.length > 0) {
      // Deliberately NOT copying delivered/open state — this is a brand
      // new Auftrag with its own quantity, and delivered quantity is
      // computed from rechnung_item.sourceLineItemId, which naturally
      // starts at 0 for these new line items since nothing references
      // them yet.
      const itemsToCreate = originalOrder.orderItems.map((it, idx) =>
        customerOrderItemRepo.create({
          customerOrderId: savedOrder.id,
          itemName: it.itemName,
          itemNo: it.itemNo,
          material: it.material,
          photo: it.photo,
          specification: it.specification,
          description: it.description,
          weight: it.weight,
          extraWeight: it.extraWeight,
          quantity: it.quantity,
          price: it.price,
          taxRate: it.taxRate,
          highlightColor: it.highlightColor,
          lineTotal: it.lineTotal,
          position: it.position || idx + 1,
          sourceLineItemId: it.sourceLineItemId,
          sourceItemId: it.sourceItemId,
          notes: it.notes,
        }),
      );
      await customerOrderItemRepo.save(itemsToCreate);
      await calculateOrderTotals(savedOrder.id);
    }

    const fullOrder = await customerOrderRepo.findOne({
      where: { id: savedOrder.id },
      relations: ["orderItems", "customer", "weiterversandServiceProvider"],
    });

    res.status(201).json({
      success: true,
      message: `Auftrag duplicated successfully as ${newOrderNo}`,
      data: fullOrder,
    });
  } catch (error) {
    console.error("Error duplicating customer order:", error);
    next(error);
  }
};
