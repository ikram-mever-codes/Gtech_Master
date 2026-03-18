import { Request, Response, NextFunction } from "express";
import { In } from "typeorm";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import path from "path";
import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { stat } from "fs";
import { WarehouseItem } from "../models/warehouse_items";
import { Invoice } from "../models/invoice";
import { Cargo } from "../models/cargos";
import { Customer } from "../models/customers";

const padorder_no = (n: number) => `MA${String(n).padStart(4, "0")}`;

const parseorder_noNumber = (order_no: string) => {
  const m = /^MA(\d+)$/i.exec((order_no || "").trim());
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return Number.isFinite(num) ? num : null;
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const { category_id, customer_id, supplier_id, status, comment, items } =
      req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new ErrorHandler("items[] is required and cannot be empty", 400);
    }

    const orderRepo = queryRunner.manager.getRepository(Order);
    const orderItemsRepo = queryRunner.manager.getRepository(OrderItem);

    const lastOrder = await orderRepo
      .createQueryBuilder("o")
      .setLock("pessimistic_write")
      .where("o.order_no LIKE :prefix", { prefix: "MA%" })
      .orderBy("o.id", "DESC")
      .getOne();

    let nextNumber = 1;
    if (lastOrder?.order_no) {
      const lastNum = parseorder_noNumber(lastOrder.order_no);
      if (lastNum !== null) nextNumber = lastNum + 1;
    }

    const generatedorder_no = padorder_no(nextNumber);

    const order = orderRepo.create({
      order_no: generatedorder_no,
      category_id: category_id || null,
      customer_id: customer_id || null,
      supplier_id: supplier_id || null,
      status: status ?? 1,
      comment: comment || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await orderRepo.save(order);

    const itemRepo = queryRunner.manager.getRepository(Item);
    const itemIds = items.map((it: any) => Number(it.item_id));
    const dbItems = await itemRepo
      .createQueryBuilder("i")
      .where("i.id IN (:...itemIds)", { itemIds })
      .getMany();
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    const lines = items.map((it: any) => {
      const item_id = Number(it.item_id);
      const qty = Number(it.qty);

      if (!Number.isFinite(item_id) || item_id <= 0) {
        throw new ErrorHandler("Invalid item_id in items[]", 400);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ErrorHandler("Invalid qty in items[]", 400);
      }

      const dbItem = itemMap.get(item_id);

      return orderItemsRepo.create({
        order_id: order.id,
        item_id,
        qty,
        remark_de: it.remark_de,
        rmb_special_price: dbItem?.RMB_Price,
        price: dbItem?.price,
        currency: dbItem?.currency,
        taric_id: dbItem?.taric_id,
        category_id: dbItem?.cat_id ?? order.category_id,
        cargo_id: order.cargo_id,
        status: "NSO",
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    await orderItemsRepo.save(lines);

    await queryRunner.commitTransaction();

    const finalOrder = await queryRunner.manager.getRepository(Order).findOne({
      where: { id: order.id },
      relations: ["cargo", "cargo.customer", "customer", "supplier"],
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        id: finalOrder!.id,
        order_no: finalOrder!.order_no,
        category_id: finalOrder!.category_id,
        customer_id: finalOrder!.customer_id,
        customer_name:
          finalOrder!.cargo?.customer?.companyName ||
          finalOrder!.cargo?.bill_to_display_name ||
          finalOrder!.customer?.companyName ||
          "No Customer",
        supplier_id: finalOrder!.supplier_id,
        supplier_name:
          finalOrder!.supplier?.company_name ||
          finalOrder!.supplier?.name ||
          "Unassigned",
        status: finalOrder!.status,
        comment: finalOrder!.comment,
        created_at: finalOrder!.created_at,
        updated_at: finalOrder!.updated_at,
        items: lines.map((oi) => ({
          id: oi.id,
          order_id: oi.order_id,
          item_id: oi.item_id,
          qty: oi.qty,
          remark_de: oi.remark_de,
          price: oi.price,
          currency: oi.currency,
        })),
      },
    });
  } catch (error) {
    try {
      await queryRunner.rollbackTransaction();
    } catch {}
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch {}
  }
};

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { orderId } = req.params;
    const {
      order_no,
      category_id,
      customer_id,
      supplier_id,
      status,
      comment,
      items,
    } = req.body;

    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const orderRepo = queryRunner.manager.getRepository(Order);
    const orderItemsRepo = queryRunner.manager.getRepository(OrderItem);

    const order = await orderRepo.findOne({ where: { id: Number(orderId) } });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (
      typeof order_no === "string" &&
      order_no.trim() &&
      order_no.trim() !== order.order_no
    ) {
      const existing = await orderRepo.findOne({
        where: { order_no: order_no.trim() },
      });
      if (existing)
        return next(new ErrorHandler("Order number already exists", 400));
      order.order_no = order_no.trim();
    }

    if (category_id !== undefined) order.category_id = category_id || null;
    if (customer_id !== undefined)
      (order as any).customer_id = customer_id || null;
    if (supplier_id !== undefined) order.supplier_id = supplier_id || null;
    if (status !== undefined) order.status = status ?? order.status;
    if (comment !== undefined) order.comment = comment ?? order.comment;
    order.updated_at = new Date();

    await orderRepo.save(order);

    if (Array.isArray(items)) {
      if (items.length === 0)
        return next(
          new ErrorHandler("items[] cannot be empty when provided", 400),
        );

      await orderItemsRepo
        .createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where("order_id = :order_id", { order_id: order.id })
        .execute();

      const itemRepo = queryRunner.manager.getRepository(Item);
      const itemIds = items.map((it: any) => Number(it.item_id));
      const dbItems = await itemRepo
        .createQueryBuilder("i")
        .where("i.id IN (:...itemIds)", { itemIds })
        .getMany();
      const itemMap = new Map(dbItems.map((i) => [i.id, i]));

      const newLines = items.map((it: any) => {
        const item_id = Number(it.item_id);
        const qty = Number(it.qty);

        if (!Number.isFinite(item_id) || item_id <= 0)
          throw new ErrorHandler("Invalid item_id in items[]", 400);
        if (!Number.isFinite(qty) || qty <= 0)
          throw new ErrorHandler("Invalid qty in items[]", 400);

        const dbItem = itemMap.get(item_id);

        return orderItemsRepo.create({
          order_id: order.id,
          item_id,
          qty,
          remark_de: it.remark_de,
          rmb_special_price: dbItem?.RMB_Price,
          price: dbItem?.price,
          currency: dbItem?.currency,
          taric_id: dbItem?.taric_id,
          category_id: dbItem?.cat_id ?? order.category_id,
          cargo_id: order.cargo_id,
          status: "NSO",
          created_at: new Date(),
          updated_at: new Date(),
        });
      });

      await orderItemsRepo.save(newLines);
    }

    await queryRunner.commitTransaction();

    const finalOrder = await orderRepo.findOne({
      where: { id: order.id },
      relations: ["cargo", "cargo.customer", "customer", "supplier"],
    });
    const freshItems = await orderItemsRepo.find({
      where: { order_id: order.id as any } as any,
    });

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: {
        id: finalOrder!.id,
        order_no: finalOrder!.order_no,
        category_id: finalOrder!.category_id,
        customer_id: finalOrder!.customer_id,
        customer_name:
          finalOrder!.cargo?.customer?.companyName ||
          finalOrder!.cargo?.bill_to_display_name ||
          finalOrder!.customer?.companyName ||
          "No Customer",
        supplier_id: finalOrder!.supplier_id,
        supplier_name:
          finalOrder!.supplier?.company_name ||
          finalOrder!.supplier?.name ||
          "Unassigned",
        status: finalOrder!.status,
        comment: finalOrder!.comment,
        created_at: finalOrder!.created_at,
        updated_at: finalOrder!.updated_at,
        items: freshItems.map((oi: any) => ({
          id: oi.id,
          order_id: oi.order_id,
          item_id: oi.item_id,
          qty: oi.qty,
          remark_de: oi.remark_de,
          price: oi.price,
          currency: oi.currency,
        })),
      },
    });
  } catch (error) {
    try {
      await queryRunner.rollbackTransaction();
    } catch {}
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch {}
  }
};

export const getAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const warehouseRepo = AppDataSource.getRepository(WarehouseItem);
    const { search = "", status = "" } = (req.query || {}) as any;

    const qb = orderRepo
      .createQueryBuilder("o")
      .leftJoinAndSelect("o.orderItems", "oi")
      .leftJoinAndSelect("oi.item", "item")
      .leftJoinAndSelect("item.taric", "taric")
      .leftJoinAndSelect("o.supplier", "s")
      .leftJoinAndSelect("item.supplier", "item_supplier")
      .leftJoinAndSelect("o.cargo", "cargo")
      .leftJoinAndSelect("cargo.customer", "cust")
      .leftJoinAndSelect("o.customer", "orderCust")
      .orderBy("o.created_at", "DESC")
      .addOrderBy("o.id", "DESC")
      .addOrderBy("oi.id", "ASC");

    if (search) {
      qb.where("(o.order_no LIKE :search OR o.comment LIKE :search)", {
        search: `%${search}%`,
      });
      if (status) qb.andWhere("o.status = :status", { status });
    } else if (status) {
      qb.where("o.status = :status", { status });
    }

    const orders = await qb.getMany();

    const itemIds: number[] = [];
    const itemIdDEs: (number | undefined)[] = [];

    orders.forEach((order) => {
      order.orderItems?.forEach((oi) => {
        if (oi.item_id) itemIds.push(oi.item_id);
        if (oi.ItemID_DE) itemIdDEs.push(oi.ItemID_DE);
        if (oi.item?.id) itemIds.push(oi.item.id);
      });
    });

    const warehouseItems = await warehouseRepo
      .createQueryBuilder("wi")
      .where("wi.item_id IN (:...itemIds)", {
        itemIds: itemIds.length ? itemIds : [0],
      })
      .orWhere("wi.ItemID_DE IN (:...itemIdDEs)", {
        itemIdDEs: itemIdDEs.length ? itemIdDEs : [0],
      })
      .getMany();

    const warehouseByItemId = new Map<number, WarehouseItem>();
    const warehouseByItemIdDE = new Map<number, WarehouseItem>();

    warehouseItems.forEach((wi) => {
      if (wi.item_id) warehouseByItemId.set(wi.item_id, wi);
      if (wi.ItemID_DE) warehouseByItemIdDE.set(wi.ItemID_DE, wi);
    });

    const itemRepo = AppDataSource.getRepository(Item);
    const fallbackItems = await itemRepo.find({
      where: {
        ItemID_DE: In(
          itemIdDEs.filter((id) => id !== undefined && id !== null) as number[],
        ),
      },
      relations: ["supplier", "taric"],
    });

    const itemByDE = new Map<number, Item>();
    fallbackItems.forEach((item) => {
      if (item.ItemID_DE) itemByDE.set(item.ItemID_DE, item);
    });

    const mappedOrders = orders.map((order) => ({
      ...order,
      supplier_name:
        order.supplier?.company_name || order.supplier?.name || "Unassigned",
      customer_name:
        order.cargo?.customer?.companyName ||
        order.cargo?.bill_to_display_name ||
        order.customer?.companyName ||
        "No Customer",
      items: (order.orderItems || []).map((oi) => {
        const itemDetails =
          oi.item || (oi.ItemID_DE ? itemByDE.get(oi.ItemID_DE) : null);
        console.log(itemDetails);
        let warehouseItem = null;
        if (oi.item_id) {
          warehouseItem = warehouseByItemId.get(oi.item_id);
        }
        if (!warehouseItem && oi.ItemID_DE) {
          warehouseItem = warehouseByItemIdDE.get(oi.ItemID_DE);
        }
        if (!warehouseItem && itemDetails?.id) {
          warehouseItem = warehouseByItemId.get(itemDetails.id);
        }

        const resolvedSupplierName =
          itemDetails?.supplier?.company_name ||
          itemDetails?.supplier?.name ||
          order.supplier?.company_name ||
          order.supplier?.name ||
          null;

        return {
          ...oi,
          de_no: warehouseItem?.item_no_de || "-",
          ItemID_DE: oi?.ItemID_DE || "-",
          item_id: oi.item_id || itemDetails?.id,
          ean: itemDetails?.ean || warehouseItem?.ean || "-",
          remark_de: oi.remark_de,
          remark_cn: oi.remarks_cn,
          remark_en: itemDetails?.remark || "",
          item_name:
            itemDetails?.item_name ||
            warehouseItem?.item_name_en ||
            warehouseItem?.item_name_de ||
            (oi?.ItemID_DE ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown Item"),
          model: itemDetails?.model || "-",
          price: itemDetails?.price || oi.price || 0,
          currency: itemDetails?.currency || oi.currency || "CNY",
          taric_id: oi.taric_id || itemDetails?.taric_id,
          taric_code: oi.set_taric_code || itemDetails?.taric?.code || "-",
          supplier_id: itemDetails?.supplier_id || order.supplier_id,
          supplier_name: resolvedSupplierName || "Unassigned",
          item: itemDetails,
          warehouse_data: warehouseItem
            ? {
                id: warehouseItem.id,
                item_no_de: warehouseItem.item_no_de,
                item_name_de: warehouseItem.item_name_de,
                item_name_en: warehouseItem.item_name_en,
                stock_qty: warehouseItem.stock_qty,
                msq: warehouseItem.msq,
                buffer: warehouseItem.buffer,
                is_stock_item: warehouseItem.is_stock_item,
                is_SnSI: warehouseItem.is_SnSI,
                ship_class: warehouseItem.ship_class,
                is_active: warehouseItem.is_active,
                is_no_auto_order: warehouseItem.is_no_auto_order,
                category_id: warehouseItem.category_id,
              }
            : null,
        };
      }),
      orderItems: undefined,
    }));

    return res.status(200).json({
      success: true,
      data: mappedOrders,
    });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemsRepository = AppDataSource.getRepository(OrderItem);

    const order = await orderRepository.findOne({
      where: { id: Number(orderId) },
      relations: [
        "orderItems",
        "orderItems.item",
        "orderItems.item.taric",
        "supplier",
        "category",
        "cargo",
        "cargo.customer",
        "customer",
      ],
    });

    if (!order) return next(new ErrorHandler("Order not found", 404));

    const result = {
      id: order.id,
      order_no: order.order_no,
      category_id: order.category_id,
      category_name: order.category?.name,
      customer_id: order.customer_id,
      customer_name:
        order.cargo?.customer?.companyName ||
        order.cargo?.bill_to_display_name ||
        order.customer?.companyName ||
        "No Customer",
      supplier_id: order.supplier_id,
      supplier_name: order.supplier?.company_name || order.supplier?.name,
      status: order.status,
      comment: order.comment,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: await Promise.all(
        (order.orderItems || []).map(async (oi: any) => {
          let item = oi.item;
          if (!item && oi.ItemID_DE) {
            item = await AppDataSource.getRepository(Item).findOne({
              where: { ItemID_DE: oi.ItemID_DE },
              relations: ["taric"],
            });
          }
          return {
            id: oi.id,
            order_id: oi.order_id,
            item_id: oi.item_id || item?.id,
            ItemID_DE: oi.ItemID_DE,
            qty: oi.qty,
            qty_delivered: oi.qty_delivered,
            qty_label: oi.qty_label,
            remark_de: oi.remark_de,
            remarks_cn: oi.remarks_cn,
            status: oi.status,
            price: item?.price || oi.price,
            currency: item?.currency || oi.currency || "CNY",
            ean: item?.ean || oi.ean,
            taric_id: oi.taric_id || item?.taric_id,
            taric_code: oi.set_taric_code || item?.taric?.code || "-",
            itemName:
              item?.item_name ||
              (oi.ItemID_DE ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown"),
            item: item,
          };
        }),
      ),
    };

    console.log(
      `[BACKEND] getOrderById(${orderId}) result:`,
      JSON.stringify(result, null, 2).substring(0, 1000) + "...",
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error in getOrderById:", error);
    return next(error);
  }
};

export const deleteOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { orderId } = req.params;
    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const orderRepository = queryRunner.manager.getRepository(Order);
    const orderItemsRepository = queryRunner.manager.getRepository(OrderItem);

    const order = await orderRepository.findOne({
      where: { id: Number(orderId) },
    });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    await orderItemsRepository
      .createQueryBuilder()
      .delete()
      .from(OrderItem)
      .where("order_id = :order_id", { order_id: order.id })
      .execute();

    await orderRepository.delete(order.id);

    await queryRunner.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    try {
      await queryRunner.rollbackTransaction();
    } catch {}
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch {}
  }
};
export const generateLabelPDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { itemId } = req.params;
    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    const orderRepo = AppDataSource.getRepository(Order);
    const warehouseItemRepo = AppDataSource.getRepository(WarehouseItem);

    const item = await orderItemRepo.findOne({
      where: { id: Number(itemId) },
      relations: ["item"],
    });

    if (!item) return next(new ErrorHandler("Item not found", 404));

    const warehouseItem = await warehouseItemRepo.findOne({
      where: { ItemID_DE: item.ItemID_DE },
    });
    const order = await orderRepo.findOne({ where: { id: item.order_id } });

    const doc = new PDFDocument({ size: [252, 110], margin: 0 });
    const logo = path.join(__dirname, "../../public/logo.png");
    const k1 = path.join(__dirname, "../../public/k1.png");
    const k2 = path.join(__dirname, "../../public/k2.png");
    let logoPath = logo;

    // Logo Selection Logic
    if (
      (item.item?.item_name && item.item.item_name.includes("K011111")) ||
      item.remarks_cn?.includes("K011111")
    ) {
      logoPath = k1;
    } else if (
      (item.item?.item_name && item.item.item_name.includes("K022222")) ||
      item.remarks_cn?.includes("K022222")
    ) {
      logoPath = k2;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=label_${item.id}.pdf`,
    );
    doc.pipe(res);

    // --- Layout Constants ---
    const colA = 12;
    const valColA = 16;
    const colB = 85;
    const colD = 180;
    const colLogo = 205;

    const row1LabelY = 10;
    const row1ValueY = 22;

    // 1. TOP ROW: Labels
    doc.fillColor("black").font("Helvetica-Oblique").fontSize(6.5);
    doc.text("ItemNoW", colA, row1LabelY);
    doc.text("Order No / Qty", colB, row1LabelY);
    doc.text("Qty", colD, row1LabelY);

    doc.font("Helvetica-Bold").fontSize(10);

    /**
     * ITEM NO DE TRUNCATION
     * If length > 10, take first 10 chars and add "..."
     */
    let itemNoDE = warehouseItem?.item_no_de || "N/A";
    if (itemNoDE.length > 10) {
      itemNoDE = itemNoDE.substring(0, 10) + "...";
    }

    // We still keep the width safety to prevent any overlap
    doc.text(itemNoDE, valColA, row1ValueY, {
      width: 68,
      lineBreak: false,
    });

    const orderNo = order?.order_no || "N/A";
    doc.text(orderNo, colB, row1ValueY);

    doc.text(`${item.qty_label || 0}`, colD, row1ValueY);

    // 3. SECTION C: Split Qty
    const orderNoWidth = doc.widthOfString(orderNo);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`/${item.qty}`, colB + orderNoWidth + 2, row1ValueY + 4);

    // 4. LOGO: Repositioned lower to Y:14 (centered between label and value)
    try {
      doc.image(logoPath, colLogo, 14, { width: 40 });
    } catch (e) {
      console.error("Logo missing at path:", logoPath);
    }

    // 5. SECTION E: Description
    doc.font("Helvetica").fontSize(8).fillColor("#222222");
    const description = item.item?.item_name || "No description available";
    doc.text(description, valColA, 42, {
      width: 180,
      height: 20,
      lineBreak: true,
    });

    // 6. SECTION F & G: Remarks
    const bottomSectionY = 68;

    doc
      .font("Helvetica-Oblique")
      .fontSize(6.5)
      .text("RemarkCN", colA, bottomSectionY);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(item.remarks_cn || "/", valColA, bottomSectionY + 8);

    doc
      .font("Helvetica-Oblique")
      .fontSize(6.5)
      .text("RemarkW", colA, bottomSectionY + 22);
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(item.remark_de || "/", valColA, bottomSectionY + 30);

    // 7. BARCODE
    const barcodeValue = warehouseItem?.ean?.toString() || "";
    if (barcodeValue) {
      try {
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: barcodeValue,
          scale: 2,
          height: 10,
          includetext: true,
          textsize: 10,
          textgaps: 4,
          textxalign: "center",
        });

        doc.image(barcodeBuffer, 145, 62, { width: 100 });
      } catch (barcodeErr) {
        console.error("Barcode generation failed:", barcodeErr);
      }
    }

    doc.end();
  } catch (error) {
    return next(error);
  }
};

export const updateOrderItemStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const orderItemsRepo = AppDataSource.getRepository(OrderItem);
    const orderItem = await orderItemsRepo.findOne({
      where: { id: Number(id) },
      relations: ["order"],
    });

    if (!orderItem) {
      return next(new ErrorHandler("Order Item not found", 404));
    }

    const oldCargoId = orderItem.cargo_id;
    const newCargoId = body.cargo_id;

    Object.keys(body).forEach((key) => {
      if (key === "supplier_order_id" && body[key] === null) {
        orderItem.supplier_order_id = undefined;
      } else if (key !== "id" && key !== "updated_at") {
        (orderItem as any)[key] = body[key];
      }
    });

    orderItem.updated_at = new Date();
    await orderItemsRepo.save(orderItem);

    if (newCargoId && String(newCargoId) !== String(oldCargoId)) {
      const cargoRepo = AppDataSource.getRepository(Cargo);
      const invoiceRepo = AppDataSource.getRepository(Invoice);
      const targetCargo = await cargoRepo.findOne({
        where: { id: Number(newCargoId) },
      });

      if (targetCargo && targetCargo.cargo_no) {
        const existingInvoice = await invoiceRepo.findOne({
          where: { orderNumber: targetCargo.cargo_no },
        });
        if (!existingInvoice) {
          const customerRepo = AppDataSource.getRepository(Customer);
          const customer = await customerRepo.findOne({
            where: { id: orderItem.order.customer_id as any },
          });

          if (customer) {
            const newInvoice = invoiceRepo.create({
              invoiceNumber: `INV-${targetCargo.cargo_no}-${Date.now().toString().slice(-4)}`,
              orderNumber: targetCargo.cargo_no,
              invoiceDate: new Date().toISOString().split("T")[0],
              deliveryDate: new Date().toISOString().split("T")[0],
              status: "draft",
              customer: customer,
              netTotal: 0,
              taxAmount: 0,
              grossTotal: 0,
              paidAmount: 0,
              outstandingAmount: 0,
              paymentMethod: "Bank Transfer",
              shippingMethod: "Sea",
            });
            await invoiceRepo.save(newInvoice);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Order item updated successfully",
      data: orderItem,
    });
  } catch (error) {
    return next(error);
  }
};
export const splitOrderItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { id } = req.params;
    const { splitQty, targetCargoId, remarks } = req.body;

    if (!splitQty || splitQty <= 0) {
      return next(
        new ErrorHandler("Split quantity must be greater than 0", 400),
      );
    }

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const orderItemsRepo = queryRunner.manager.getRepository(OrderItem);
    const orderItem = await orderItemsRepo.findOne({
      where: { id: Number(id) },
      relations: ["order"],
    });

    if (!orderItem) {
      throw new ErrorHandler("Order item not found", 404);
    }

    if (splitQty >= (orderItem.qty || 0)) {
      throw new ErrorHandler(
        "Split quantity must be less than current quantity",
        400,
      );
    }

    if (!orderItem.qty_split) {
      orderItem.qty_split = orderItem.qty;
    }

    const newItem = orderItemsRepo.create({
      ...orderItem,
      id: undefined,
      qty: splitQty,
      cargo_id: targetCargoId || orderItem.cargo_id,
      remark_de: remarks || orderItem.remark_de,
      qty_split: orderItem.qty_split,
      created_at: new Date(),
      updated_at: new Date(),
    });

    orderItem.qty = (orderItem.qty || 0) - splitQty;
    orderItem.updated_at = new Date();

    await orderItemsRepo.save(orderItem);
    await orderItemsRepo.save(newItem);

    if (targetCargoId && targetCargoId !== orderItem.cargo_id) {
      const cargoRepo = queryRunner.manager.getRepository(Cargo);
      const invoiceRepo = queryRunner.manager.getRepository(Invoice);
      const targetCargo = await cargoRepo.findOne({
        where: { id: targetCargoId },
      });

      if (targetCargo && targetCargo.cargo_no) {
        const existingInvoice = await invoiceRepo.findOne({
          where: { orderNumber: targetCargo.cargo_no },
        });
        if (!existingInvoice) {
          const customerRepo = queryRunner.manager.getRepository(Customer);
          const customer = await customerRepo.findOne({
            where: { id: orderItem.order.customer_id as any },
          });

          if (customer) {
            const newInvoice = invoiceRepo.create({
              invoiceNumber: `INV-${targetCargo.cargo_no}-${Date.now().toString().slice(-4)}`,
              orderNumber: targetCargo.cargo_no,
              invoiceDate: new Date().toISOString().split("T")[0],
              deliveryDate: new Date().toISOString().split("T")[0],
              status: "draft",
              customer: customer,
              netTotal: 0,
              taxAmount: 0,
              grossTotal: 0,
              paidAmount: 0,
              outstandingAmount: 0,
              paymentMethod: "Bank Transfer",
              shippingMethod: "Sea",
            });
            await invoiceRepo.save(newInvoice);
          }
        }
      }
    }

    await queryRunner.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Order item split and moved successfully",
      data: { original: orderItem, split: newItem },
    });
  } catch (error) {
    if (queryRunner.isTransactionActive) {
      await queryRunner.rollbackTransaction();
    }
    return next(error);
  } finally {
    await queryRunner.release();
  }
};

export const updateOrderItemPrice = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { eur_special_price } = req.body;

    if (eur_special_price === undefined) {
      return next(new ErrorHandler("eur_special_price is required", 400));
    }

    const orderItemsRepo = AppDataSource.getRepository(OrderItem);
    const orderItem = await orderItemsRepo.findOne({
      where: { id: Number(id) },
    });

    if (!orderItem) {
      return next(new ErrorHandler("Order Item not found", 404));
    }

    orderItem.eur_special_price = Number(eur_special_price);
    orderItem.updated_at = new Date();
    await orderItemsRepo.save(orderItem);

    return res.status(200).json({
      success: true,
      message: "Order item price updated successfully",
      data: orderItem,
    });
  } catch (error) {
    return next(error);
  }
};
