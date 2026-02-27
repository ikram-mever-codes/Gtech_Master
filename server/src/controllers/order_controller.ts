import { Request, Response, NextFunction } from "express";

import ErrorHandler from "../utils/errorHandler";
import { AppDataSource } from "../config/database";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";

const padorder_no = (n: number) => `MA${String(n).padStart(4, "0")}`;

const parseorder_noNumber = (order_no: string) => {
  const m = /^MA(\d+)$/i.exec((order_no || "").trim());
  if (!m) return null;
  const num = parseInt(m[1], 10);
  return Number.isFinite(num) ? num : null;
};


export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const {
      category_id,
      customer_id,
      supplier_id,
      status,
      comment,
      items,
    } = req.body;

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

    const lines = items.map((it: any) => {
      const item_id = Number(it.item_id);
      const qty = Number(it.qty);

      if (!Number.isFinite(item_id) || item_id <= 0) {
        throw new ErrorHandler("Invalid item_id in items[]", 400);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ErrorHandler("Invalid qty in items[]", 400);
      }

      return orderItemsRepo.create({
        order_id: order.id,
        item_id,
        qty,
        remark_de: it.remark_de ?? null,
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

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { orderId } = req.params;
    const { order_no, category_id, customer_id, supplier_id, status, comment, items } = req.body;

    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const orderRepo = queryRunner.manager.getRepository(Order);
    const orderItemsRepo = queryRunner.manager.getRepository(OrderItem);

    const order = await orderRepo.findOne({ where: { id: Number(orderId) } });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    if (typeof order_no === "string" && order_no.trim() && order_no.trim() !== order.order_no) {
      const existing = await orderRepo.findOne({ where: { order_no: order_no.trim() } });
      if (existing) return next(new ErrorHandler("Order number already exists", 400));
      order.order_no = order_no.trim();
    }

    if (category_id !== undefined) order.category_id = category_id || null;
    if (customer_id !== undefined) (order as any).customer_id = customer_id || null;
    if (supplier_id !== undefined) order.supplier_id = supplier_id || null;
    if (status !== undefined) order.status = status ?? order.status;
    if (comment !== undefined) order.comment = comment ?? order.comment;
    order.updated_at = new Date();

    await orderRepo.save(order);

    if (Array.isArray(items)) {
      if (items.length === 0) return next(new ErrorHandler("items[] cannot be empty when provided", 400));

      await orderItemsRepo
        .createQueryBuilder()
        .delete()
        .from(OrderItem)
        .where("order_id = :order_id", { order_id: order.id })
        .execute();

      const newLines = items.map((it: any) => {
        const item_id = Number(it.item_id);
        const qty = Number(it.qty);

        if (!Number.isFinite(item_id) || item_id <= 0) throw new ErrorHandler("Invalid item_id in items[]", 400);
        if (!Number.isFinite(qty) || qty <= 0) throw new ErrorHandler("Invalid qty in items[]", 400);

        return orderItemsRepo.create({
          order_id: order.id,
          item_id,
          qty,
          remark_de: it.remark_de ?? null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });

      await orderItemsRepo.save(newLines);
    }

    await queryRunner.commitTransaction();

    const freshOrder = await orderRepo.findOne({ where: { id: order.id } });
    const freshItems = await orderItemsRepo.find({ where: { order_id: order.id as any } as any });

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

export const getAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderRepo = AppDataSource.getRepository(Order);
    const { search = "", status = "" } = (req.query || {}) as any;

    const qb = orderRepo
      .createQueryBuilder("o")
      .leftJoinAndSelect("o.orderItems", "items")
      .select([
        "o.id",
        "o.order_no",
        "o.category_id",
        "o.customer_id",
        "o.supplier_id",
        "o.cargo_id",
        "o.status",
        "o.comment",
        "o.created_at",
        "o.updated_at",
        "items.id",
        "items.order_id",
        "items.item_id",
        "items.qty",
        "items.remark_de",
        "items.qty_delivered",
        "items.category_id",
        "items.rmb_special_price",
        "items.eur_special_price",
        "items.taric_id",
        "items.set_taric_code",
        "items.status",
        "items.remarks_cn",
        "items.problems",
        "items.qty_label",
        "items.qty_split",
        "items.supplier_order_id",
        "items.ref_no",
        "items.cargo_id",
        "items.printed",
        "items.cargo_date",
      ]);

    if (status) qb.andWhere("o.status = :status", { status });
    if (search) qb.andWhere("(o.order_no LIKE :q OR o.comment LIKE :q)", { q: `%${search}%` });

    const orders = await qb.orderBy("o.id", "DESC").addOrderBy("items.id", "ASC").getMany();

    const mappedOrders = orders.map((order: any) => ({
      ...order,
      items: order.orderItems || [],
      orderItems: undefined,
    }));

    return res.status(200).json({
      success: true,
      data: mappedOrders,
    });
  } catch (error) {
    return next(error);
  }
};
export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemsRepository = AppDataSource.getRepository(OrderItem);

    const order = await orderRepository.findOne({ where: { id: Number(orderId) } });
    if (!order) return next(new ErrorHandler("Order not found", 404));

    const lines = await orderItemsRepository.find({ where: { order_id: order.id as any } as any });

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
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  const queryRunner = AppDataSource.createQueryRunner();

  try {
    const { orderId } = req.params;
    if (!orderId) return next(new ErrorHandler("Order ID is required", 400));

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const orderRepository = queryRunner.manager.getRepository(Order);
    const orderItemsRepository = queryRunner.manager.getRepository(OrderItem);

    const order = await orderRepository.findOne({ where: { id: Number(orderId) } });
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
