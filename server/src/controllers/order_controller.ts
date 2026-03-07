import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import path from "path";
import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Like } from "typeorm";

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

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: {
        id: order.id,
        order_no: order.order_no,
        category_id: order.category_id,
        customer_id: order.customer_id,
        supplier_id: order.supplier_id,
        status: order.status,
        comment: order.comment,
        created_at: order.created_at,
        updated_at: order.updated_at,
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

    const freshOrder = await orderRepo.findOne({ where: { id: order.id } });
    const freshItems = await orderItemsRepo.find({
      where: { order_id: order.id as any } as any,
    });

    return res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: {
        id: freshOrder!.id,
        order_no: freshOrder!.order_no,
        category_id: freshOrder!.category_id,
        customer_id: (freshOrder as any).customer_id,
        supplier_id: freshOrder!.supplier_id,
        status: freshOrder!.status,
        comment: freshOrder!.comment,
        created_at: freshOrder!.created_at,
        updated_at: freshOrder!.updated_at,
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
    const { search = "", status = "" } = (req.query || {}) as any;

    // Build the find options
    const orders = await orderRepo.find({
      where: search
        ? [
            { order_no: Like(`%${search}%`), ...(status && { status }) },
            { comment: Like(`%${search}%`), ...(status && { status }) },
          ]
        : status
          ? { status }
          : {},

      // THIS IS THE KEY: Deep nesting to get Item inside OrderItem
      relations: ["orderItems", "orderItems.item"],

      order: {
        id: "DESC",
        // @ts-ignore - TypeORM supports nested ordering in find options
        orderItems: {
          id: "ASC",
        },
      },
    });

    // Format data for frontend to prevent "Unknown" or "-"
    const mappedOrders = orders.map((order) => ({
      ...order,
      // Map 'orderItems' (DB name) to 'items' (Frontend name)
      items: (order.orderItems || []).map((oi) => {
        // Access the nested item relation
        const itemDetails = oi.item;

        return {
          ...oi,
          ItemID_DE: oi?.ItemID_DE || "-",
          item_id: oi.item_id || itemDetails?.id,
          // Pre-formatted fields so frontend doesn't need complex logic
          ean: itemDetails?.ean || "-",
          item_name:
            itemDetails?.item_name || itemDetails?.item_name || "Unknown Item",
          model: itemDetails?.model || "-",
          // Ensure price/currency from Item is available if missing on OrderItem
          price: oi.price || itemDetails?.price || 0,
          currency: oi.currency || itemDetails?.currency || "CNY",
          item: itemDetails, // Keep raw relation data if needed
        };
      }),
      // Remove original array to keep payload clean
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
    });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    const lines = await orderItemsRepository.find({
      where: { order_id: order.id as any } as any,
    });
    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        order_no: order.order_no,
        category_id: order.category_id,
        customer_id: (order as any).customer_id,
        supplier_id: order.supplier_id,
        status: order.status,
        comment: order.comment,
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: lines.map((oi: any) => ({
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

    const item = await orderItemRepo.findOne({
      where: { id: Number(itemId) },
      relations: ["item"],
    });

    if (!item) return next(new ErrorHandler("Item not found", 404));

    const order = await orderRepo.findOne({ where: { id: item.order_id } });

    /**
     * DIMENSIONS (300 DPI Calibration):
     * Width: 1050px / 300 * 72 = 252pt
     * Height: 425px / 300 * 72 = 102pt
     */
    const doc = new PDFDocument({ size: [252, 102], margin: 0 });
    const logoPath = path.join(__dirname, "../../public/logo.png");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=label_${item.id}.pdf`,
    );
    doc.pipe(res);

    // --- Layout Constants ---
    const colA = 12; // Label "ItemNoW" start
    const valColA = 16; // Values (ID, Name, Remarks) start under the 'W'
    const colB = 85; // Order No Column
    const colD = 180; // Qty Column (Pushed right to avoid overlap)
    const colLogo = 205; // Logo position

    const row1LabelY = 10;
    const row1ValueY = 22; // Vertical space between label and value

    // 1. TOP ROW: Labels (Italicized)
    doc.fillColor("black").font("Helvetica-Oblique").fontSize(6.5);
    doc.text("ItemNoW", colA, row1LabelY);
    doc.text("Order No / Qty", colB, row1LabelY);
    doc.text("Qty", colD, row1LabelY);

    // 2. TOP ROW: Values (Bold)
    doc.font("Helvetica-Bold").fontSize(14);

    // Item ID (aligned to valColA)
    const itemID = item?.item?.ItemID_DE?.toString() || "N/A";
    doc.text(itemID, valColA, row1ValueY);

    // Order Number
    const orderNo = order?.order_no || "N/A";
    doc.text(orderNo, colB, row1ValueY);

    // Main Quantity
    doc.text(`${item.qty || 0}`, colD, row1ValueY);

    // 3. SECTION C: Dynamic Split QTY (The "/20" part)
    // Measures the Order No to place the split text immediately after it
    const orderNoWidth = doc.widthOfString(orderNo);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(`/${item.qty_label}`, colB + orderNoWidth + 2, row1ValueY + 4);

    // 4. LOGO
    try {
      doc.image(logoPath, colLogo, 8, { width: 40 });
    } catch (e) {
      console.error("Logo missing at path:", logoPath);
    }

    // 5. SECTION E: Item Description (Aligned to valColA)
    doc.font("Helvetica").fontSize(8).fillColor("#222222");
    const description = item.item?.item_name || "No description available";
    doc.text(description, valColA, 42, {
      width: 180,
      height: 20,
      lineBreak: true,
    });

    // 6. SECTION F & G: Remarks
    const bottomSectionY = 68;

    // Chinese Remark
    doc
      .font("Helvetica-Oblique")
      .fontSize(6.5)
      .text("RemarkCN", colA, bottomSectionY);
    doc
      .font("Helvetica")
      .fontSize(10)
      .text(item.remarks_cn || "/", valColA, bottomSectionY + 8);

    // Warehouse Remark Label
    doc
      .font("Helvetica-Oblique")
      .fontSize(6.5)
      .text("RemarkW", colA, bottomSectionY + 22);

    // 7. SECTION H: Barcode (Bottom Right)
    const barcodeValue = item.item.ean?.toString() || "";
    try {
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: barcodeValue,
        scale: 2,
        height: 10,
        includetext: true,
        textsize: 10,
        textgaps: 4, // Increased vertical spacing between bars and EAN text
        textxalign: "center",
      });

      doc.image(barcodeBuffer, 145, 62, { width: 100 });
    } catch (barcodeErr) {
      console.error("Barcode generation failed:", barcodeErr);
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
    });

    if (!orderItem) {
      return next(new ErrorHandler("Order Item not found", 404));
    }

    Object.keys(body).forEach((key) => {
      if (key === "supplier_order_id" && body[key] === null) {
        orderItem.supplier_order_id = undefined;
      } else if (key !== "id" && key !== "updated_at") {
        (orderItem as any)[key] = body[key];
      }
    });

    orderItem.updated_at = new Date();
    await orderItemsRepo.save(orderItem);

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
    const { splitQty } = req.body;

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
    const newItem = orderItemsRepo.create({
      ...orderItem,
      id: undefined,
      qty: splitQty,
      created_at: new Date(),
      updated_at: new Date(),
    });

    orderItem.qty = (orderItem.qty || 0) - splitQty;
    orderItem.updated_at = new Date();

    await orderItemsRepo.save(orderItem);
    await orderItemsRepo.save(newItem);

    await queryRunner.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Order item split successfully",
      data: { original: orderItem, new: newItem },
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    return next(error);
  } finally {
    await queryRunner.release();
  }
};
