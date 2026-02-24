"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOrder = exports.getOrderById = exports.getAllOrders = exports.updateOrder = exports.createOrder = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const padorder_no = (n) => `MA${String(n).padStart(4, "0")}`;
const parseorder_noNumber = (order_no) => {
    const m = /^MA(\d+)$/i.exec((order_no || "").trim());
    if (!m)
        return null;
    const num = parseInt(m[1], 10);
    return Number.isFinite(num) ? num : null;
};
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const { category_id, customer_id, supplier_id, status, comment, items, } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            throw new errorHandler_1.default("items[] is required and cannot be empty", 400);
        }
        const orderRepo = queryRunner.manager.getRepository(orders_1.Order);
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const lastOrder = yield orderRepo
            .createQueryBuilder("o")
            .setLock("pessimistic_write")
            .where("o.order_no LIKE :prefix", { prefix: "MA%" })
            .orderBy("o.id", "DESC")
            .getOne();
        let nextNumber = 1;
        if (lastOrder === null || lastOrder === void 0 ? void 0 : lastOrder.order_no) {
            const lastNum = parseorder_noNumber(lastOrder.order_no);
            if (lastNum !== null)
                nextNumber = lastNum + 1;
        }
        const generatedorder_no = padorder_no(nextNumber);
        const order = orderRepo.create({
            order_no: generatedorder_no,
            category_id: category_id || null,
            customer_id: customer_id || null,
            supplier_id: supplier_id || null,
            status: status !== null && status !== void 0 ? status : 1,
            comment: comment || null,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield orderRepo.save(order);
        const lines = items.map((it) => {
            var _a;
            const item_id = Number(it.item_id);
            const qty = Number(it.qty);
            if (!Number.isFinite(item_id) || item_id <= 0) {
                throw new errorHandler_1.default("Invalid item_id in items[]", 400);
            }
            if (!Number.isFinite(qty) || qty <= 0) {
                throw new errorHandler_1.default("Invalid qty in items[]", 400);
            }
            return orderItemsRepo.create({
                order_id: order.id,
                item_id,
                qty,
                remark_de: (_a = it.remark_de) !== null && _a !== void 0 ? _a : null,
                created_at: new Date(),
                updated_at: new Date(),
            });
        });
        yield orderItemsRepo.save(lines);
        yield queryRunner.commitTransaction();
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
    }
    catch (error) {
        try {
            yield queryRunner.rollbackTransaction();
        }
        catch (_a) { }
        return next(error);
    }
    finally {
        try {
            yield queryRunner.release();
        }
        catch (_b) { }
    }
});
exports.createOrder = createOrder;
const updateOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        const { orderId } = req.params;
        const { order_no, category_id, customer_id, supplier_id, status, comment, items } = req.body;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const orderRepo = queryRunner.manager.getRepository(orders_1.Order);
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const order = yield orderRepo.findOne({ where: { id: Number(orderId) } });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        if (typeof order_no === "string" && order_no.trim() && order_no.trim() !== order.order_no) {
            const existing = yield orderRepo.findOne({ where: { order_no: order_no.trim() } });
            if (existing)
                return next(new errorHandler_1.default("Order number already exists", 400));
            order.order_no = order_no.trim();
        }
        if (category_id !== undefined)
            order.category_id = category_id || null;
        if (customer_id !== undefined)
            order.customer_id = customer_id || null;
        if (supplier_id !== undefined)
            order.supplier_id = supplier_id || null;
        if (status !== undefined)
            order.status = status !== null && status !== void 0 ? status : order.status;
        if (comment !== undefined)
            order.comment = comment !== null && comment !== void 0 ? comment : order.comment;
        order.updated_at = new Date();
        yield orderRepo.save(order);
        if (Array.isArray(items)) {
            if (items.length === 0)
                return next(new errorHandler_1.default("items[] cannot be empty when provided", 400));
            yield orderItemsRepo
                .createQueryBuilder()
                .delete()
                .from(order_items_1.OrderItem)
                .where("order_id = :order_id", { order_id: order.id })
                .execute();
            const newLines = items.map((it) => {
                var _a;
                const item_id = Number(it.item_id);
                const qty = Number(it.qty);
                if (!Number.isFinite(item_id) || item_id <= 0)
                    throw new errorHandler_1.default("Invalid item_id in items[]", 400);
                if (!Number.isFinite(qty) || qty <= 0)
                    throw new errorHandler_1.default("Invalid qty in items[]", 400);
                return orderItemsRepo.create({
                    order_id: order.id,
                    item_id,
                    qty,
                    remark_de: (_a = it.remark_de) !== null && _a !== void 0 ? _a : null,
                    created_at: new Date(),
                    updated_at: new Date(),
                });
            });
            yield orderItemsRepo.save(newLines);
        }
        yield queryRunner.commitTransaction();
        const freshOrder = yield orderRepo.findOne({ where: { id: order.id } });
        const freshItems = yield orderItemsRepo.find({ where: { order_id: order.id } });
        return res.status(200).json({
            success: true,
            message: "Order updated successfully",
            data: {
                id: freshOrder.id,
                order_no: freshOrder.order_no,
                category_id: freshOrder.category_id,
                customer_id: freshOrder.customer_id,
                supplier_id: freshOrder.supplier_id,
                status: freshOrder.status,
                comment: freshOrder.comment,
                created_at: freshOrder.created_at,
                updated_at: freshOrder.updated_at,
                items: freshItems.map((oi) => ({
                    id: oi.id,
                    order_id: oi.order_id,
                    item_id: oi.item_id,
                    qty: oi.qty,
                    remark_de: oi.remark_de,
                })),
            },
        });
    }
    catch (error) {
        try {
            yield queryRunner.rollbackTransaction();
        }
        catch (_a) { }
        return next(error);
    }
    finally {
        try {
            yield queryRunner.release();
        }
        catch (_b) { }
    }
});
exports.updateOrder = updateOrder;
const getAllOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const { search = "", status = "" } = (req.query || {});
        const qb = orderRepo
            .createQueryBuilder("o")
            .select([
            "o.id",
            "o.order_no",
            "o.category_id",
            "o.customer_id",
            "o.supplier_id",
            "o.status",
            "o.comment",
            "o.created_at",
            "o.updated_at",
        ]);
        if (status)
            qb.andWhere("o.status = :status", { status });
        if (search)
            qb.andWhere("(o.order_no LIKE :q OR o.comment LIKE :q)", { q: `%${search}%` });
        const orders = yield qb.orderBy("o.id", "DESC").getMany();
        return res.status(200).json({
            success: true,
            data: orders,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllOrders = getAllOrders;
const getOrderById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
        const orderItemsRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const order = yield orderRepository.findOne({ where: { id: Number(orderId) } });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        const lines = yield orderItemsRepository.find({ where: { order_id: order.id } });
        return res.status(200).json({
            success: true,
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
    }
    catch (error) {
        return next(error);
    }
});
exports.getOrderById = getOrderById;
const deleteOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        const { orderId } = req.params;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const orderRepository = queryRunner.manager.getRepository(orders_1.Order);
        const orderItemsRepository = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const order = yield orderRepository.findOne({ where: { id: Number(orderId) } });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        yield orderItemsRepository
            .createQueryBuilder()
            .delete()
            .from(order_items_1.OrderItem)
            .where("order_id = :order_id", { order_id: order.id })
            .execute();
        yield orderRepository.delete(order.id);
        yield queryRunner.commitTransaction();
        return res.status(200).json({
            success: true,
            message: "Order deleted successfully",
        });
    }
    catch (error) {
        try {
            yield queryRunner.rollbackTransaction();
        }
        catch (_a) { }
        return next(error);
    }
    finally {
        try {
            yield queryRunner.release();
        }
        catch (_b) { }
    }
});
exports.deleteOrder = deleteOrder;
