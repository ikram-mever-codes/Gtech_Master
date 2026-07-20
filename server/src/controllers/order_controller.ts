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
import fs, { existsSync } from "fs";
import { WarehouseItem } from "../models/warehouse_items";
import { Invoice } from "../models/invoice";
import { Cargo } from "../models/cargos";
import { CargoOrder } from "../models/cargo_orders";
import { Taric } from "../models/tarics";
import { Customer } from "../models/customers";
import { SupplierItem } from "../models/supplier_items";
import { generateInvoicesForOrders } from "./cargo_controller";

const _cjkFontCandidates: string[] = [
  path.join(process.cwd(), "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
  path.resolve(
    __dirname,
    "..",
    "..",
    "assets",
    "noto-sans-sc",
    "NotoSansSC-Regular.otf",
  ),
  path.join(
    process.cwd(),
    "server",
    "assets",
    "noto-sans-sc",
    "NotoSansSC-Regular.otf",
  ),
  "/home/ubuntu/Master/server/assets/noto-sans-sc/NotoSansSC-Regular.otf",
  "/var/www/Master/server/assets/noto-sans-sc/NotoSansSC-Regular.otf",
  "C:\\Windows\\Fonts\\arialuni.ttf",
  "C:\\Windows\\Fonts\\simsun.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
  "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
  "C:\\Windows\\Fonts\\msyh.ttc",
  "C:\\Windows\\Fonts\\msyh.ttf",
  "C:\\Windows\\Fonts\\msyhl.ttc",
  "C:\\Windows\\Fonts\\simsun.ttc",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\msgothic.ttc",
];

export let _cachedCjkFontPath: string | null = null;
export let _cachedCjkFontBuffer: Buffer | null = null;

(function detectCjkFont() {
  let assetsBase = "";
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const testPath = path.join(currentDir, "assets");
    if (existsSync(testPath)) {
      assetsBase = testPath;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  const finalCandidates = [..._cjkFontCandidates];
  if (assetsBase) {
    finalCandidates.unshift(
      path.join(assetsBase, "noto-sans-sc", "NotoSansSC-Regular.otf"),
    );
    finalCandidates.unshift(path.join(assetsBase, "NotoSansCJK-Regular.ttf"));
  }

  for (const p of finalCandidates) {
    if (existsSync(p)) {
      try {
        const testDoc = new PDFDocument();
        const buf = fs.readFileSync(p);
        testDoc.font(buf, 0).text("测试");
        _cachedCjkFontBuffer = buf;
        _cachedCjkFontPath = p;
        return;
      } catch (e: any) { }
    }
  }
})();

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
    const supplierItemRepo = queryRunner.manager.getRepository(SupplierItem);

    const itemIds = items.map((it: any) => Number(it.item_id));
    const dbItems = await itemRepo
      .createQueryBuilder("i")
      .where("i.id IN (:...itemIds)", { itemIds })
      .getMany();
    const itemMap = new Map(dbItems.map((i) => [i.id, i]));

    const supplierItems = await supplierItemRepo
      .createQueryBuilder("si")
      .where("si.item_id IN (:...itemIds)", { itemIds })
      .getMany();
    const rmbPriceMap = new Map(
      supplierItems.map((si) => [si.item_id, si.price_rmb]),
    );

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
      const rmbPrice = rmbPriceMap.get(item_id);

      return orderItemsRepo.create({
        order_id: order.id,
        item_id,
        ItemID_DE: dbItem?.ItemID_DE,
        qty,
        remark_de: it.remark_de,
        rmb_special_price: rmbPrice,
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
    } catch { }
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch { }
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
      const supplierItemRepo = queryRunner.manager.getRepository(SupplierItem);

      const itemIds = items.map((it: any) => Number(it.item_id));
      const dbItems = await itemRepo
        .createQueryBuilder("i")
        .where("i.id IN (:...itemIds)", { itemIds })
        .getMany();
      const itemMap = new Map(dbItems.map((i) => [i.id, i]));

      const supplierItems = await supplierItemRepo
        .createQueryBuilder("si")
        .where("si.item_id IN (:...itemIds)", { itemIds })
        .getMany();
      const rmbPriceMap = new Map(
        supplierItems.map((si) => [si.item_id, si.price_rmb]),
      );

      const newLines = items.map((it: any) => {
        const item_id = Number(it.item_id);
        const qty = Number(it.qty);

        if (!Number.isFinite(item_id) || item_id <= 0)
          throw new ErrorHandler("Invalid item_id in items[]", 400);
        if (!Number.isFinite(qty) || qty <= 0)
          throw new ErrorHandler("Invalid qty in items[]", 400);

        const dbItem = itemMap.get(item_id);
        const rmbPrice = rmbPriceMap.get(item_id);

        return orderItemsRepo.create({
          order_id: order.id,
          item_id,
          ItemID_DE: dbItem?.ItemID_DE,
          qty,
          remark_de: it.remark_de,
          rmb_special_price: rmbPrice,
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
    } catch { }
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch { }
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
      .orderBy("o.date_created", "DESC")
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

    const supplierItemRepo = AppDataSource.getRepository(SupplierItem);
    const supplierItems = await supplierItemRepo.find({
      where: { item_id: In(itemIds.length ? itemIds : [0]) },
      relations: ["supplier"],
    });
    const rmbPriceMap = new Map(
      supplierItems.map((si) => [si.item_id, si.price_rmb]),
    );

    const defaultSupplierMap = new Map<
      number,
      { id: number; name: string | null }
    >();
    supplierItems.forEach((si) => {
      if (si.is_default === "Y" && si.supplier) {
        defaultSupplierMap.set(si.item_id, {
          id: si.supplier_id,
          name: si.supplier.company_name || si.supplier.name || null,
        });
      }
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

        const defaultSup = defaultSupplierMap.get(
          oi.item_id || itemDetails?.id || 0,
        );

        const resolvedSupplierName =
          itemDetails?.supplier?.company_name ||
          itemDetails?.supplier?.name ||
          defaultSup?.name ||
          order.supplier?.company_name ||
          order.supplier?.name ||
          null;

        const rmbPrice =
          rmbPriceMap.get(oi.item_id || itemDetails?.id || 0) || 0;

        const finalPrice =
          rmbPrice > 0 ? rmbPrice : itemDetails?.price || oi.price || 0;

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
          price: finalPrice,
          currency: "CNY",
          taric_id: oi.taric_id || itemDetails?.taric_id,
          taric_code: oi.set_taric_code || itemDetails?.taric?.code || "-",
          supplier_id:
            itemDetails?.supplier_id || defaultSup?.id || order.supplier_id,
          supplier_name: resolvedSupplierName || "Unassigned",
          rmb_price: rmbPrice,
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
    const supplierItemRepository = AppDataSource.getRepository(SupplierItem);

    const order = await orderRepository.findOne({
      where: { id: Number(orderId) },
      relations: [
        "orderItems",
        "orderItems.item",
        "orderItems.item.taric",
        "orderItems.item.supplier",
        "supplier",
        "category",
        "cargo",
        "cargo.customer",
        "customer",
      ],
    });

    if (!order) return next(new ErrorHandler("Order not found", 404));

    const itemIds = (order.orderItems || [])
      .map((oi) => oi.item_id || oi.item?.id)
      .filter((id) => id !== undefined && id !== null);

    const supplierItems = await supplierItemRepository.find({
      where: { item_id: In(itemIds.length ? itemIds : [0]) },
      relations: ["supplier"],
    });
    const rmbPriceMap = new Map(
      supplierItems.map((si) => [si.item_id, si.price_rmb]),
    );

    const defaultSupplierMap = new Map<
      number,
      { id: number; name: string | null }
    >();
    supplierItems.forEach((si) => {
      if (si.is_default === "Y" && si.supplier) {
        defaultSupplierMap.set(si.item_id, {
          id: si.supplier_id,
          name: si.supplier.company_name || si.supplier.name || null,
        });
      }
    });

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

          const rmbPrice = rmbPriceMap.get(oi.item_id || item?.id || 0) || 0;

          const finalPrice =
            rmbPrice > 0 ? rmbPrice : item?.price || oi.price || 0;

          const defaultSup = defaultSupplierMap.get(
            oi.item_id || item?.id || 0,
          );

          const resolvedSupplierId =
            (oi as any).supplier_id ||
            item?.supplier_id ||
            defaultSup?.id ||
            order.supplier_id ||
            null;

          const resolvedSupplierName =
            item?.supplier?.company_name ||
            item?.supplier?.name ||
            defaultSup?.name ||
            order.supplier?.company_name ||
            order.supplier?.name ||
            null;

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
            remark_en: item?.remark || "",
            status: oi.status,
            price: finalPrice,
            currency: "CNY",
            ean: item?.ean || oi.ean,
            taric_id: oi.taric_id || item?.taric_id,
            taric_code: oi.set_taric_code || item?.taric?.code || "-",
            supplier_id: resolvedSupplierId,
            supplier_name: resolvedSupplierName,
            itemName:
              item?.item_name ||
              (oi.ItemID_DE ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown"),
            rmb_price: rmbPrice,
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
    } catch { }
    return next(error);
  } finally {
    try {
      await queryRunner.release();
    } catch { }
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
    const customerRepo = AppDataSource.getRepository(Customer);

    const item = await orderItemRepo.findOne({
      where: { id: Number(itemId) },
      relations: ["item"],
    });

    if (!item) return next(new ErrorHandler("Item not found", 404));
    let resolvedItem: Item | null = item.item;
    if (!resolvedItem && item.ItemID_DE) {
      resolvedItem = await AppDataSource.getRepository(Item).findOne({
        where: { ItemID_DE: item.ItemID_DE },
      });
    }

    let warehouseItem = null;
    if (item.ItemID_DE) {
      warehouseItem = await warehouseItemRepo.findOne({
        where: { ItemID_DE: item.ItemID_DE },
      });
    }
    if (!warehouseItem && (item.item_id || resolvedItem?.id)) {
      warehouseItem = await warehouseItemRepo.findOne({
        where: { item_id: item.item_id || resolvedItem?.id },
      });
    }
    if (!warehouseItem && resolvedItem?.ItemID_DE) {
      warehouseItem = await warehouseItemRepo.findOne({
        where: { ItemID_DE: resolvedItem.ItemID_DE },
      });
    }
    const order = await orderRepo.findOne({
      where: { id: item.order_id },
      relations: ["customer"],
    });

    const doc = new PDFDocument({ size: [252, 110], margin: 0 });
    const logoPath = path.join(__dirname, "../../public/logo.png");

    let logoSource: string | Buffer = logoPath;
    let isCustomLogoUsed = false;

    const detectImageFormat = (buf: Buffer): string => {
      if (
        buf.length >= 8 &&
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      )
        return "png";
      if (
        buf.length >= 3 &&
        buf[0] === 0xff &&
        buf[1] === 0xd8 &&
        buf[2] === 0xff
      )
        return "jpeg";
      if (
        buf.length >= 4 &&
        buf[0] === 0x47 &&
        buf[1] === 0x49 &&
        buf[2] === 0x46 &&
        buf[3] === 0x38
      )
        return "gif";
      if (
        buf.length >= 12 &&
        buf.toString("ascii", 0, 4) === "RIFF" &&
        buf.toString("ascii", 8, 12) === "WEBP"
      )
        return "webp";
      if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
      const head = buf
        .toString("utf8", 0, Math.min(buf.length, 200))
        .trim()
        .toLowerCase();
      if (head.startsWith("<?xml") || head.startsWith("<svg")) return "svg";
      return "unknown";
    };

    let brandingCustomer: Customer | null = null;

    if (resolvedItem?.customer_id) {
      brandingCustomer = await customerRepo.findOne({
        where: { id: resolvedItem.customer_id },
      });
    }

    console.log("[label] logo decision:", {
      itemId,
      orderId: item.order_id,
      isLabelPrint: !!resolvedItem?.isLabelPrint,
      itemCustomerId: resolvedItem?.customer_id ?? null,
      orderCustomerId: order?.customer?.id ?? null,
      brandingCustomerId: brandingCustomer?.id ?? null,
      hasBrandingLogo: !!brandingCustomer?.companyLabelPrintLogo,
    });

    if (resolvedItem?.isLabelPrint && brandingCustomer?.companyLabelPrintLogo) {
      const raw = brandingCustomer.companyLabelPrintLogo.trim();
      let base64Part = "";
      let declaredMime = "";

      if (raw.startsWith("data:image/")) {
        const matches = raw.match(
          /^data:image\/([a-zA-Z0-9.+-]+);base64,([\s\S]+)$/,
        );
        if (matches) {
          declaredMime = matches[1];
          base64Part = matches[2];
        } else {
          console.warn(
            "[label] customer logo starts with `data:image/` but does not match the expected `data:image/<type>;base64,<data>` shape — using default logo",
          );
        }
      } else {
        base64Part = raw;
      }
      base64Part = base64Part.replace(/\s/g, "");

      if (base64Part) {
        try {
          const buf = Buffer.from(base64Part, "base64");
          const detectedFormat = detectImageFormat(buf);
          console.log("[label] customer logo parsed:", {
            declaredMime: declaredMime || "(plain base64)",
            detectedFormat,
            bytes: buf.length,
          });

          if (buf.length === 0) {
            console.warn(
              "[label] customer logo decoded to 0 bytes — using default logo",
            );
          } else if (detectedFormat === "png" || detectedFormat === "jpeg") {
            logoSource = buf;
            isCustomLogoUsed = true;
          } else {
            console.warn(
              `[label] customer logo format "${detectedFormat}" is NOT supported by PDFKit (PNG/JPEG only) — using default logo. Ask the customer to re-upload a PNG or JPEG.`,
            );
          }
        } catch (err) {
          console.error(
            "[label] failed to decode customer logo base64 — using default logo:",
            err instanceof Error ? err.message : err,
          );
        }
      } else {
        console.warn(
          "[label] customer logo present but no base64 payload could be extracted — using default logo",
        );
      }
    }
    const safeOrderNo = (order?.order_no || "N/A").replace(
      /[/\\?%*:|"<>\s]/g,
      "-",
    );
    const safeItemNo = (warehouseItem?.item_no_de || "N/A").replace(
      /[/\\?%*:|"<>\s]/g,
      "-",
    );
    const qtyLabel = item.qty_label || 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const filename = `label_${safeOrderNo}_${safeItemNo}_${qtyLabel}pcs_${dateStr}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    doc.pipe(res);

    const colA = 12;
    const valColA = 16;
    const colLogo = 207;
    const qtyLabelColStart = 170;
    const rightEdgeOrderQty = 155;
    const row1LabelY = 10;
    const row1ValueY = 22;
    const orderNo = order?.order_no || "N/A";
    const qtyOrderText = `/${item.qty}`;

    doc.font("Helvetica-Bold").fontSize(10);
    const orderNoWidth = doc.widthOfString(orderNo);

    doc.font("Helvetica").fontSize(9);
    const qtyOrderWidth = doc.widthOfString(qtyOrderText);

    const orderNoX = rightEdgeOrderQty - qtyOrderWidth - 2 - orderNoWidth;
    const qtyOrderX = rightEdgeOrderQty - qtyOrderWidth;

    const itemNoWWidth = orderNoX - 3 - valColA;

    doc.fillColor("black").font("Helvetica-Oblique").fontSize(6.5);
    doc.text("Artikelnr.", colA, row1LabelY);
    doc.text("Lieferung / Menge", orderNoX, row1LabelY);
    doc.text("Menge", qtyLabelColStart, row1LabelY);

    doc.font("Helvetica-Bold").fontSize(10);
    let itemNoDE = warehouseItem?.item_no_de || "N/A";
    const itemNoWHeight = doc.heightOfString(itemNoDE, { width: itemNoWWidth });
    doc.text(itemNoDE, valColA, row1ValueY, {
      width: itemNoWWidth,
      lineBreak: true,
    });

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(orderNo, orderNoX, row1ValueY);

    doc.font("Helvetica").fontSize(9);
    doc.text(qtyOrderText, qtyOrderX, row1ValueY + 1.5);

    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(`${item.qty_label || 0}`, qtyLabelColStart, row1ValueY);

    try {
      doc.image(logoSource, colLogo, 14, { width: 40 });
      console.log(
        "[label] drew",
        isCustomLogoUsed ? "customer logo" : "default logo",
      );
    } catch (e) {
      console.error(
        "[label] failed to draw",
        isCustomLogoUsed ? "customer logo" : "default logo",
        "-",
        e instanceof Error ? e.message : e,
      );
      if (isCustomLogoUsed) {
        try {
          doc.image(logoPath, colLogo, 14, { width: 40 });
          console.log("[label] drew default logo as fallback");
        } catch (fallbackErr) {
          console.error(
            "[label] default logo ALSO failed to draw:",
            fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
          );
        }
      }
    }

    const fontSource = _cachedCjkFontBuffer || _cachedCjkFontPath;
    if (fontSource) {
      doc.font(fontSource, 0);
    } else {
      doc.font("Helvetica");
    }
    doc.fontSize(8).fillColor("#222222");
    const description = resolvedItem?.item_name || "No description available";
    const descriptionY = row1ValueY + itemNoWHeight + 1.5;
    const descriptionHeight = Math.min(
      doc.heightOfString(description, { width: 180 }),
      18,
    );
    doc.text(description, valColA, descriptionY, {
      width: 180,
      height: descriptionHeight,
      lineBreak: true,
    });

    const bottomSectionY = Math.max(
      56,
      Math.min(descriptionY + descriptionHeight + 4, 65),
    );

    let remarkCNText = item.remarks_cn || "";
    doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("black");
    doc.text("Hinweis", colA, bottomSectionY);

    let fontSizeCN = 10;
    if (fontSource) {
      doc.font(fontSource, 0);
    } else {
      doc.font("Helvetica");
    }
    while (fontSizeCN > 4.5) {
      doc.fontSize(fontSizeCN);
      if (doc.widthOfString(remarkCNText) <= 125) {
        break;
      }
      fontSizeCN -= 0.5;
    }
    doc.text(remarkCNText, valColA, bottomSectionY + 8, {
      width: 125,
      lineBreak: false,
    });

    let remarkWText = item.remark_de || "";
    const remarkWLabelY = bottomSectionY + 8 + Math.max(fontSizeCN, 8) + 7;
    doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("black");
    doc.text("Lieferhinweis", colA, remarkWLabelY);

    let fontSizeW = 8;
    if (fontSource) {
      doc.font(fontSource, 0);
    } else {
      doc.font("Helvetica");
    }
    while (fontSizeW > 4.5) {
      doc.fontSize(fontSizeW);
      if (doc.widthOfString(remarkWText) <= 125) {
        break;
      }
      fontSizeW -= 0.5;
    }
    doc.text(remarkWText, valColA, remarkWLabelY + 8, {
      width: 125,
      lineBreak: false,
    });

    const barcodeValue = (
      resolvedItem?.ean?.toString() ||
      warehouseItem?.ean?.toString() ||
      ""
    ).trim();
    if (barcodeValue && barcodeValue !== "-") {
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

        doc.image(barcodeBuffer, 145, 68, { width: 100 });
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

    const cargoIdsToRefresh: number[] = [];
    if (oldCargoId) cargoIdsToRefresh.push(Number(oldCargoId));
    if (newCargoId) cargoIdsToRefresh.push(Number(newCargoId));

    await generateInvoicesForOrders(
      [Number(orderItem.order_id)],
      cargoIdsToRefresh,
    );

    return res.status(200).json({
      success: true,
      message: "Order item updated successfully",
      data: orderItem,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateOrderItemLabel = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { splitQty, remarks_cn } = req.body;

    const orderItemsRepo = AppDataSource.getRepository(OrderItem);
    const orderItem = await orderItemsRepo.findOne({
      where: { id: Number(id) },
    });

    if (!orderItem) {
      return next(new ErrorHandler("Order item not found", 404));
    }

    orderItem.qty_label = Number(splitQty) || 0;
    if (remarks_cn !== undefined) {
      orderItem.remarks_cn = remarks_cn;
    }
    orderItem.updated_at = new Date();

    await orderItemsRepo.save(orderItem);

    return res.status(200).json({
      success: true,
      message: "Label quantity and review updated successfully",
      data: orderItem,
    });
  } catch (error) {
    console.error("Error in updateOrderItemLabel:", error);
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
    const { splitQty, targetCargoId, remarks_cn } = req.body;

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

    const newItem = orderItemsRepo.create({
      ...orderItem,
      id: undefined,
      qty: splitQty,
      cargo_id: targetCargoId || orderItem.cargo_id,
      remarks_cn: remarks_cn || orderItem.remarks_cn,
      created_at: new Date(),
      updated_at: new Date(),
    });

    orderItem.qty = (orderItem.qty || 0) - splitQty;
    orderItem.updated_at = new Date();

    await orderItemsRepo.save(orderItem);
    await orderItemsRepo.save(newItem);

    if (targetCargoId) {
      const cargoOrderRepo = queryRunner.manager.getRepository(CargoOrder);
      const existingLink = await cargoOrderRepo.findOne({
        where: {
          cargo_id: Number(targetCargoId),
          order_id: Number(orderItem.order_id),
        },
      });
      if (!existingLink) {
        await cargoOrderRepo.save(
          cargoOrderRepo.create({
            cargo_id: Number(targetCargoId),
            order_id: Number(orderItem.order_id),
          }),
        );
      }
    }

    await queryRunner.commitTransaction();

    const cargoIdsToRefresh: number[] = [];
    if (orderItem.cargo_id) cargoIdsToRefresh.push(Number(orderItem.cargo_id));
    if (targetCargoId) cargoIdsToRefresh.push(Number(targetCargoId));

    await generateInvoicesForOrders(
      [Number(orderItem.order_id)],
      cargoIdsToRefresh,
    );

    return res.status(200).json({
      success: true,
      message: "Order item split successfully",
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

    if (orderItem.order_id) {
      await generateInvoicesForOrders(
        [Number(orderItem.order_id)],
        orderItem.cargo_id ? [Number(orderItem.cargo_id)] : [],
      );
    }

    return res.status(200).json({
      success: true,
      message: "Order item price updated successfully",
      data: orderItem,
    });
  } catch (error) {
    return next(error);
  }
};

type ResolvedCustomerAddress = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  contact: string;
};

const formatPostalCity = (
  postalCode?: string | null,
  city?: string | null,
): string => {
  return [postalCode, city]
    .filter((value) => value && String(value).trim())
    .join(" ")
    .trim();
};

const formatCountry = (country?: string | null): string => {
  if (!country) return "";
  const code = country.trim().toUpperCase();
  if (code === "DE") return "Germany";
  if (code === "AT") return "Austria";
  if (code === "CH") return "Switzerland";
  return country.trim();
};

const resolveCustomerAddress = (
  customer: Customer | null | undefined,
): ResolvedCustomerAddress => {
  if (!customer) {
    return {
      street: "",
      city: "",
      postalCode: "",
      country: "",
      phone: "",
      contact: "",
    };
  }

  const businessDetails = customer.businessDetails;
  const starCustomerDetails = customer.starCustomerDetails;

  const streetParts = [
    customer.addressLine1 ||
    starCustomerDetails?.deliveryAddressLine1 ||
    businessDetails?.address ||
    "",
    customer.addressLine2 || starCustomerDetails?.deliveryAddressLine2 || "",
  ].filter(Boolean);

  return {
    street: streetParts.join(" ").trim(),
    city:
      customer.city ||
      starCustomerDetails?.deliveryCity ||
      businessDetails?.city ||
      "",
    postalCode:
      customer.postalCode ||
      starCustomerDetails?.deliveryPostalCode ||
      businessDetails?.postalCode ||
      "",
    country: formatCountry(
      customer.country ||
      starCustomerDetails?.deliveryCountry ||
      businessDetails?.country ||
      ""
    ),
    phone:
      customer.contactPhoneNumber ||
      starCustomerDetails?.deliveryContactPhone ||
      businessDetails?.contactPhone ||
      "",
    contact:
      customer.legalName || starCustomerDetails?.deliveryContactName || "",
  };
};

export const generateCommercialInvoicePDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId || typeof invoiceId !== "string") {
      return next(new ErrorHandler("Invalid Invoice ID format.", 400));
    }

    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const invoice = await invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: [
        "customer",
        "customer.businessDetails",
        "customer.starCustomerDetails",
        "items",
        "items.item",
      ],
    });
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    const cargo = await AppDataSource.getRepository(Cargo).findOne({
      where: { cargo_no: invoice.orderNumber },
      relations: [
        "customer",
        "customer.businessDetails",
        "customer.starCustomerDetails",
      ],
    });

    const orderItemRepo = AppDataSource.getRepository(OrderItem);
    let rawOrderItems: any[] = [];
    if (cargo) {
      rawOrderItems = await orderItemRepo.find({
        where: { cargo_id: cargo.id },
        relations: ["item", "item.taric"],
      });
    } else {
      const order = await AppDataSource.getRepository(Order).findOne({
        where: { order_no: invoice.orderNumber },
      });
      if (order)
        rawOrderItems = await orderItemRepo.find({
          where: { order_id: order.id },
          relations: ["item", "item.taric"],
        });
    }

    const manualCodes: string[] = [];
    rawOrderItems.forEach((oi: any) => {
      if (oi.set_taric_code)
        oi.set_taric_code.split("/").forEach((c: string) => {
          if (c.trim()) manualCodes.push(c.trim());
        });
    });
    const uniqueCodes = [...new Set(manualCodes)];
    const manualTarics =
      uniqueCodes.length > 0
        ? await AppDataSource.getRepository(Taric).find({
          where: { code: In(uniqueCodes) },
        })
        : [];
    const manualTaricMap = new Map(manualTarics.map((t) => [t.code, t]));

    const taricGroupsMap = new Map<
      string,
      { hsCode: string; desc: string; qty: number; totalPrice: number }
    >();
    rawOrderItems.forEach((oi: any) => {
      const item = oi.item;
      const taricCode = item?.taric?.code || "";
      const isProject =
        !taricCode || taricCode === "0" || taricCode === "0000000000";
      let groupKey: string;
      let hsCode: string;
      let desc: string;
      if (oi.set_taric_code) {
        const codes = oi.set_taric_code.split("/");
        const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
        groupKey = `hs_${target}`;
        hsCode = target;
        const mt = manualTaricMap.get(target);
        desc = mt?.name_en || item?.item_name || "Unknown";
      } else if (item?.taric?.id && !isProject) {
        groupKey = `hs_${taricCode}`;
        hsCode = taricCode;
        desc = item.taric.name_en || item.item_name || "Unknown";
      } else {
        groupKey = `item_${item?.id || Math.random()}`;
        hsCode = "n/a";
        desc = item?.item_name || "Unknown";
      }
      let unitPrice = 0;
      if (
        item?.transfer_price_EUR !== undefined &&
        item?.transfer_price_EUR !== null
      )
        unitPrice = Number(item.transfer_price_EUR);
      else if (
        oi.eur_special_price !== undefined &&
        oi.eur_special_price !== null
      )
        unitPrice = Number(oi.eur_special_price);
      else if (oi.price !== undefined && oi.price !== null)
        unitPrice = Number(oi.price);
      else if (item?.price !== undefined && item?.price !== null)
        unitPrice = Number(item.price);
      const qty = Number(oi.qty || 0);
      if (!taricGroupsMap.has(groupKey))
        taricGroupsMap.set(groupKey, { hsCode, desc, qty: 0, totalPrice: 0 });
      const g = taricGroupsMap.get(groupKey)!;
      g.qty += qty;
      g.totalPrice += qty * unitPrice;
    });

    const groupedItems = Array.from(taricGroupsMap.values());

    type LineItem = {
      no: number;
      desc: string;
      hs: string;
      qty: number;
      unit: string;
      price: string;
    };
    let lineItems: LineItem[];
    if (groupedItems.length > 0) {
      lineItems = groupedItems.map((g, i) => ({
        no: i + 1,
        desc: g.desc,
        hs: g.hsCode,
        qty: g.qty,
        unit: g.qty > 0 ? (g.totalPrice / g.qty).toFixed(3) : "0.000",
        price: g.totalPrice.toFixed(2),
      }));
    } else {
      lineItems = (invoice.items || []).map((item: any, i: number) => ({
        no: i + 1,
        desc: item.description || item.item?.item_name || "Unknown Item",
        hs: item.articleNumber || "n/a",
        qty: Number(item.quantity || 0),
        unit: Number(item.unitPrice || 0).toFixed(3),
        price: Number(item.netPrice || 0).toFixed(2),
      }));
    }

    const totalQty = lineItems.reduce((s, it) => s + it.qty, 0);
    const subTotal = lineItems.reduce((s, it) => s + Number(it.price), 0);
    const freightCost =
      invoice.freightCost !== undefined && invoice.freightCost !== null
        ? Number(invoice.freightCost)
        : 0;
    const grandTotal = (subTotal + freightCost).toFixed(2);
    const customer = invoice.customer || cargo?.customer;
    const customerAddress = resolveCustomerAddress(customer);

    const GTECH_GMBH = {
      name: "GTech Industries GmbH",
      street: "Antonio-Segni-Str. 4",
      city: "44263 Dortmund",
      country: "Germany",
      phone: "+4923158697565",
      eori: "DE977540238364617",
    };

    const billToName = GTECH_GMBH.name;
    const billToStreet = GTECH_GMBH.street;
    const billToCity = GTECH_GMBH.city;
    const billToCountry = GTECH_GMBH.country;
    const billToPhone = GTECH_GMBH.phone;
    const billToEori = GTECH_GMBH.eori;

    const shipToCompany =
      cargo?.ship_to_company_name ||
      customer?.companyName ||
      customer?.legalName ||
      "";
    const shipToStreet = cargo?.ship_to_full_address || customerAddress.street;
    const shipToCity = cargo?.ship_to_city
      ? formatPostalCity(cargo.ship_to_postal_code, cargo.ship_to_city)
      : formatPostalCity(customerAddress.postalCode, customerAddress.city);
    const shipToCountry = formatCountry(
      cargo?.ship_to_country || customerAddress.country || ""
    );
    const isContactSameAsLegalName = !!(
      customerAddress.contact &&
      customer?.legalName &&
      customerAddress.contact.trim().toLowerCase() === customer.legalName.trim().toLowerCase()
    );
    const shipToContact =
      cargo?.ship_to_contact_person ||
      (!isContactSameAsLegalName ? customerAddress.contact : "") ||
      "";
    const shipToPhone =
      cargo?.ship_to_contact_phone || customerAddress.phone || "";

    const customerNo: string = (() => {
      if (customer?.customerNumber) return customer.customerNumber;
      if ((customer as any)?.businessDetails?.customerNumber)
        return String((customer as any).businessDetails.customerNumber);
      if (customer?.id)
        return (
          parseInt(customer.id.replace(/-/g, "").substring(0, 8), 16) % 100000
        )
          .toString()
          .padStart(5, "0");
      return "";
    })();

    const formatGermanDate = (dateVal: any): string => {
      if (!dateVal) return "";
      const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
      if (!(d instanceof Date) || isNaN(d.getTime())) return String(dateVal);
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };

    const isClosedInvoice =
      invoice.status === "closed" ||
      invoice.status === "Closed" ||
      (invoice as any).isClosed;

    const invoiceNoVal = (invoice.invoiceNumber || "").replace(/-/g, "").trim();
    const formattedDateVal = formatGermanDate(invoice.invoiceDate);
    const cargoNoVal = (cargo?.cargo_no || invoice.orderNumber || "").trim();

    const data = {
      invoiceNo: isClosedInvoice ? (invoiceNoVal || "Draft") : (invoiceNoVal || "Draft"),
      date: isClosedInvoice ? (formattedDateVal || "Draft") : (formattedDateVal || "Draft"),
      cargoNo: isClosedInvoice ? (cargoNoVal || "Draft") : (cargoNoVal || "Draft"),
      customerNo,
      billTo: {
        name: billToName,
        street: billToStreet,
        city: billToCity,
        country: billToCountry,
        phone: billToPhone,
        eori: billToEori,
      },
      shipTo: {
        company: shipToCompany,
        contact: shipToContact,
        street: shipToStreet,
        city: shipToCity,
        country: shipToCountry,
        phone: shipToPhone,
      },
    };

    const safeInvoiceNo = (data.invoiceNo || "").trim() || "CI";
    const safeCargoNo = (data.cargoNo || "").trim() || "NoCargo";
    const filename = `${safeInvoiceNo}_${safeCargoNo}.pdf`
      .replace(/[/\\?%*:|"<>\s]/g, "_");

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`,
    );
    doc.pipe(res);

    doc
      .fillColor("#777777")
      .font("Helvetica")
      .fontSize(22)
      .text("GTech Industries Limited", 40, 20, { align: "right" });
    const tickColor = "#777777";
    doc.fontSize(11).fillColor("#777777");
    doc.text("Engineering", 325, 48);
    doc
      .save()
      .translate(387, 48)
      .scale(0.8)
      .moveTo(0, 5)
      .lineTo(3, 8)
      .lineTo(8, 0)
      .strokeColor(tickColor)
      .lineWidth(2)
      .stroke()
      .restore();
    doc.text("Design", 412, 48);
    doc
      .save()
      .translate(448, 48)
      .scale(0.8)
      .moveTo(0, 5)
      .lineTo(3, 8)
      .lineTo(8, 0)
      .strokeColor(tickColor)
      .lineWidth(2)
      .stroke()
      .restore();
    doc.text("Manufacturing", 473, 48);
    doc
      .save()
      .translate(546, 48)
      .scale(0.8)
      .moveTo(0, 5)
      .lineTo(3, 8)
      .lineTo(8, 0)
      .strokeColor(tickColor)
      .lineWidth(2)
      .stroke()
      .restore();
    doc
      .moveTo(40, 65)
      .lineTo(555, 65)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    doc.fontSize(9).fillColor("#666666");
    doc.text(
      "GTech Industries Limited:   3A, 12/F, Kaiser Centre, N. 18 Centre Street, Sai Ying Pun, Hong Kong",
      40,
      75,
    );
    doc.text(
      "GTech Establishment China: West Dafeng Metallurgical Plant, Bowang Huisheng Square, Bowang, Ma'anshan, Anhui",
      40,
      88,
    );

    const fontSource = _cachedCjkFontBuffer || _cachedCjkFontPath;
    if (fontSource) {
      try {
        const chineseAddress =
          "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
        doc
          .font(fontSource, 0)
          .fontSize(9)
          .fillColor("#666666")
          .text(chineseAddress, 152, 101, { lineBreak: false });
        doc.font("Helvetica").fillColor("#000000");
      } catch (err: any) {
        console.error(`[CJK-PDF] Render failed:`, err.message);
        if (process.platform === "win32") {
          try {
            doc
              .font("C:\\Windows\\Fonts\\msyh.ttc", 0)
              .fontSize(9)
              .text("中国安徽...", 152, 101);
          } catch (e) { }
        }
        doc.font("Helvetica").fillColor("#000000");
      }
    }
    const isGTechBillTo = data.billTo.name === "GTech Industries GmbH";
    const isSameAddr =
      data.billTo.name === data.shipTo.company &&
      data.billTo.street === data.shipTo.street;

    const addrY = 125;
    if (isSameAddr) {
      const bName = isGTechBillTo ? GTECH_GMBH.name : data.billTo.name;
      const bStreet = isGTechBillTo ? GTECH_GMBH.street : data.billTo.street;
      const bCity = isGTechBillTo ? GTECH_GMBH.city : data.billTo.city;
      const bCountry = isGTechBillTo ? GTECH_GMBH.country : data.billTo.country;
      const bPhone = isGTechBillTo ? GTECH_GMBH.phone : data.billTo.phone;
      const bEori = isGTechBillTo ? GTECH_GMBH.eori : data.billTo.eori;

      let billY = addrY;
      doc.fillColor("black").font("Helvetica-Bold").fontSize(10.5).text(bName, 40, billY, { width: 360 });
      billY = doc.y + 2;
      doc.font("Helvetica").fontSize(9.5);
      if (bStreet) { doc.text(bStreet, 40, billY, { width: 360 }); billY = doc.y + 1; }
      if (bCity) { doc.text(bCity, 40, billY, { width: 360 }); billY = doc.y + 1; }
      if (bCountry) { doc.text(bCountry, 40, billY, { width: 360 }); billY = doc.y + 1; }
      if (bPhone) { doc.text(bPhone, 40, billY, { width: 360 }); billY = doc.y + 1; }
      if (bEori) { doc.font("Helvetica-Bold").text(`EORI: ${bEori}`, 40, billY, { width: 360 }); }
    } else {
      const bName = isGTechBillTo ? GTECH_GMBH.name : data.billTo.name;
      const bStreet = isGTechBillTo ? GTECH_GMBH.street : data.billTo.street;
      const bCity = isGTechBillTo ? GTECH_GMBH.city : data.billTo.city;
      const bCountry = isGTechBillTo ? GTECH_GMBH.country : data.billTo.country;
      const bPhone = isGTechBillTo ? GTECH_GMBH.phone : data.billTo.phone;
      const bEori = isGTechBillTo ? GTECH_GMBH.eori : data.billTo.eori;

      doc
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .text("BILL TO:", 40, addrY - 3)
        .text("SHIP TO:", 205, addrY - 3);

      let billY = addrY + 12;
      doc.font("Helvetica-Bold").fontSize(10.5).text(bName, 40, billY, { width: 155 });
      billY = doc.y + 1;
      doc.font("Helvetica").fontSize(9.5);
      if (bStreet) { doc.text(bStreet, 40, billY, { width: 155 }); billY = doc.y + 1; }
      if (bCity) { doc.text(bCity, 40, billY, { width: 155 }); billY = doc.y + 1; }
      if (bCountry) { doc.text(bCountry, 40, billY, { width: 155 }); billY = doc.y + 1; }
      if (bPhone) { doc.text(bPhone, 40, billY, { width: 155 }); billY = doc.y + 1; }
      if (bEori) { doc.font("Helvetica-Bold").text(`EORI: ${bEori}`, 40, billY, { width: 155 }); }

      let shipY = addrY + 12;
      doc.font("Helvetica-Bold").fontSize(10.5).text(data.shipTo.company, 205, shipY, { width: 195 });
      shipY = doc.y + 1;
      doc.font("Helvetica").fontSize(9.5);
      if (data.shipTo.contact) { doc.text(data.shipTo.contact, 205, shipY, { width: 195 }); shipY = doc.y + 1; }
      if (data.shipTo.street) { doc.text(data.shipTo.street, 205, shipY, { width: 195 }); shipY = doc.y + 1; }
      if (data.shipTo.city) { doc.text(data.shipTo.city, 205, shipY, { width: 195 }); shipY = doc.y + 1; }
      if (data.shipTo.country) { doc.text(data.shipTo.country, 205, shipY, { width: 195 }); shipY = doc.y + 1; }
      if (data.shipTo.phone) { doc.text(data.shipTo.phone, 205, shipY, { width: 195 }); shipY = doc.y + 1; }
    }

    let rightY = 115;
    const rightX = 412;
    const rightW = 143;

    // Invoice No
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Invoice No: ", rightX, rightY, { continued: true, width: rightW })
      .font("Helvetica-Bold")
      .text(data.invoiceNo);

    // Date — directly below Invoice No (as requested)
    rightY = 140;
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Date: ", rightX, rightY, { continued: true, width: rightW })
      .font("Helvetica-Bold")
      .text(data.date);

    // Customer No
    rightY = 165;
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Customer No.: ", rightX, rightY, { continued: true, width: rightW })
      .font("Helvetica-Bold")
      .text(data.customerNo || "N/A");

    // Cargo No
    rightY = 190;
    doc
      .font("Helvetica")
      .fontSize(11)
      .text("Cargo No.: ", rightX, rightY, { continued: true, width: rightW })
      .font("Helvetica-Bold")
      .text(data.cargoNo);
    doc
      .fontSize(15)
      .font("Helvetica-Bold")
      .text("Commercial Invoice", 0, 240, { align: "center" });

    const tableTop = 272;
    doc
      .moveTo(40, tableTop)
      .lineTo(555, tableTop)
      .strokeColor("#bb0000")
      .lineWidth(1.5)
      .stroke();
    doc.fontSize(11).font("Helvetica-Bold");
    doc
      .text("No", 40, tableTop + 10)
      .text("Description", 75, tableTop + 10)
      .text("(EU HS code)", 340, tableTop + 10);
    doc.text("Qty", 425, tableTop + 4).text("(pcs)", 425, tableTop + 16);
    doc.text("Unit", 470, tableTop + 4).text("(€)*", 470, tableTop + 16);
    doc.text("Price", 525, tableTop + 4).text("(€)", 525, tableTop + 16);
    doc
      .moveTo(40, tableTop + 32)
      .lineTo(555, tableTop + 32)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    let itemY = tableTop + 46;
    const pageH = 841.89;
    const footerReserve = 140;
    const minRowH = 28;
    const rowPad = 12;

    lineItems.forEach((item) => {
      doc.font("Helvetica").fontSize(11);
      const descH = doc.heightOfString(item.desc, { width: 250 });
      const actualRowH = Math.max(minRowH, descH + rowPad);

      if (itemY + actualRowH > pageH - footerReserve) {
        doc.addPage();
        itemY = 50;
      }

      const midOffset = (actualRowH - 13) / 2;
      doc.text(item.no.toString(), 40, itemY + midOffset);
      doc.text(item.desc, 75, itemY, { width: 250 });
      doc.text(item.hs, 340, itemY + midOffset);
      doc.text(item.qty.toString(), 425, itemY + midOffset);
      doc.text(item.unit, 463, itemY + midOffset);
      doc.text(item.price, 510, itemY + midOffset, {
        align: "right",
        width: 45,
      });

      doc
        .moveTo(40, itemY + actualRowH - 2)
        .lineTo(555, itemY + actualRowH - 2)
        .strokeColor("#eeeeee")
        .lineWidth(0.5)
        .stroke();

      itemY += actualRowH;
    });

    if (itemY + minRowH > pageH - footerReserve) {
      doc.addPage();
      itemY = 50;
    }
    doc.font("Helvetica").fontSize(11);
    doc.text("Freight cost", 75, itemY);
    doc.text("n/a", 340, itemY).text("n/a", 425, itemY).text("n/a", 470, itemY);
    doc.text(freightCost.toFixed(2), 510, itemY, { align: "right", width: 45 });
    itemY += minRowH + 4;

    doc
      .moveTo(40, itemY)
      .lineTo(555, itemY)
      .strokeColor("black")
      .lineWidth(1)
      .stroke();
    itemY += 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Total :", 360, itemY, { underline: true });
    doc.text(totalQty.toString(), 425, itemY, { underline: true });
    doc.text(`${grandTotal} €`, 485, itemY, {
      width: 70,
      align: "right",
      underline: true,
    });

    itemY += 25;
    if (itemY + 110 > pageH - footerReserve) {
      doc.addPage();
      itemY = 50;
    }
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        "* Unit price is calculated and can have errors from rounding",
        40,
        itemY,
      );
    itemY += 25;
    doc.fontSize(10).font("Helvetica").text("Remark:", 40, itemY);
    const remarkX = 100;
    const remarkLines: string[] = [];
    if (cargo?.cargo_no) {
      remarkLines.push(`${cargo.cargo_no}`);
    }
    const orderForRemark = await AppDataSource.getRepository(Order).findOne({
      where: { order_no: invoice.orderNumber },
    });
    const orderComment = orderForRemark?.comment || "";
    if (orderComment) remarkLines.push(orderComment);
    if (invoice.remark) remarkLines.push(invoice.remark);
    remarkLines.forEach((line, idx) => {
      doc.text(line, remarkX, itemY + idx * 15);
    });
    const nextRemarkY = itemY + Math.max(remarkLines.length, 1) * 15;

    itemY = nextRemarkY + 30;
    if (itemY + 30 > pageH - footerReserve) {
      doc.addPage();
      itemY = 50;
    }
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#000000")
      .text(
        "We hereby confirm that no raw material from Russia were used",
        100,
        itemY,
        { lineBreak: false },
      );
    itemY += 14;
    doc.text(
      "in the production of the goods mentioned in this invoice.",
      100,
      itemY,
      { lineBreak: false },
    );

    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    let range = doc.bufferedPageRange();
    let totalPagesCount = range.count;
    let lastPageIdx = range.start + totalPagesCount - 1;
    const footerY = pageH - 100;

    doc.switchToPage(lastPageIdx);
    doc
      .moveTo(40, footerY)
      .lineTo(555, footerY)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();
    doc.fontSize(8).fillColor("#000000").font("Helvetica-Bold");
    doc.text("GTech Industries Limited", 40, footerY + 10);
    doc.fontSize(8).font("Helvetica").fillColor("#444444");
    doc.text("Acc. No 478798112483", 40, footerY + 22);
    doc.text("Swift Code: DHBKHKHH", 40, footerY + 34);
    doc.text("DBS Bank (Hong Kong)", 40, footerY + 46);
    doc.text("+86 555 6767 199", 220, footerY + 10);
    doc.text("+86 17355524828", 220, footerY + 22);
    doc.text("Contact: lili", 220, footerY + 34);
    doc.text("info@gtech-industries.net", 220, footerY + 46);

    const footerLogo = path.join(process.cwd(), "assets", "logo.png");
    try {
      if (existsSync(footerLogo)) {
        doc.image(footerLogo, 420, footerY + 8, { width: 100 });
      }
    } catch (e) { }

    range = doc.bufferedPageRange();
    totalPagesCount = range.count;

    for (let i = 0; i < totalPagesCount; i++) {
      doc.switchToPage(range.start + i);
      doc.fontSize(8).fillColor("#999999").font("Helvetica");
      const numY = i === totalPagesCount - 1 ? footerY + 55 : 780;
      doc.text(`${i + 1} / ${totalPagesCount}`, 490, numY, {
        align: "right",
        width: 60,
        lineBreak: false,
      });
    }

    doc.page.margins.bottom = originalBottomMargin;

    doc.end();
  } catch (error) {
    next(error);
  }
};
