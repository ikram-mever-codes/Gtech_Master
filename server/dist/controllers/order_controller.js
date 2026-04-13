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
exports.updateOrderItemPrice = exports.splitOrderItem = exports.updateOrderItemLabel = exports.updateOrderItemStatus = exports.generateLabelPDF = exports.deleteOrder = exports.getOrderById = exports.getAllOrders = exports.updateOrder = exports.createOrder = void 0;
const typeorm_1 = require("typeorm");
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const items_1 = require("../models/items");
const warehouse_items_1 = require("../models/warehouse_items");
const cargo_orders_1 = require("../models/cargo_orders");
const supplier_items_1 = require("../models/supplier_items");
const cargo_controller_1 = require("./cargo_controller");
const padorder_no = (n) => `MA${String(n).padStart(4, "0")}`;
const parseorder_noNumber = (order_no) => {
    const m = /^MA(\d+)$/i.exec((order_no || "").trim());
    if (!m)
        return null;
    const num = parseInt(m[1], 10);
    return Number.isFinite(num) ? num : null;
};
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const { category_id, customer_id, supplier_id, status, comment, items } = req.body;
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
        const itemRepo = queryRunner.manager.getRepository(items_1.Item);
        const supplierItemRepo = queryRunner.manager.getRepository(supplier_items_1.SupplierItem);
        const itemIds = items.map((it) => Number(it.item_id));
        const dbItems = yield itemRepo
            .createQueryBuilder("i")
            .where("i.id IN (:...itemIds)", { itemIds })
            .getMany();
        const itemMap = new Map(dbItems.map((i) => [i.id, i]));
        // Fetch RMB_Price from supplier_items for all items
        const supplierItems = yield supplierItemRepo
            .createQueryBuilder("si")
            .where("si.item_id IN (:...itemIds)", { itemIds })
            .getMany();
        const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
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
            const dbItem = itemMap.get(item_id);
            const rmbPrice = rmbPriceMap.get(item_id);
            return orderItemsRepo.create({
                order_id: order.id,
                item_id,
                qty,
                remark_de: it.remark_de,
                rmb_special_price: rmbPrice, // Use RMB_Price from supplier_items
                price: dbItem === null || dbItem === void 0 ? void 0 : dbItem.price,
                currency: dbItem === null || dbItem === void 0 ? void 0 : dbItem.currency,
                taric_id: dbItem === null || dbItem === void 0 ? void 0 : dbItem.taric_id,
                category_id: (_a = dbItem === null || dbItem === void 0 ? void 0 : dbItem.cat_id) !== null && _a !== void 0 ? _a : order.category_id,
                cargo_id: order.cargo_id,
                status: "NSO",
                created_at: new Date(),
                updated_at: new Date(),
            });
        });
        yield orderItemsRepo.save(lines);
        yield queryRunner.commitTransaction();
        const finalOrder = yield queryRunner.manager.getRepository(orders_1.Order).findOne({
            where: { id: order.id },
            relations: ["cargo", "cargo.customer", "customer", "supplier"],
        });
        return res.status(201).json({
            success: true,
            message: "Order created successfully",
            data: {
                id: finalOrder.id,
                order_no: finalOrder.order_no,
                category_id: finalOrder.category_id,
                customer_id: finalOrder.customer_id,
                customer_name: ((_b = (_a = finalOrder.cargo) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.companyName) ||
                    ((_c = finalOrder.cargo) === null || _c === void 0 ? void 0 : _c.bill_to_display_name) ||
                    ((_d = finalOrder.customer) === null || _d === void 0 ? void 0 : _d.companyName) ||
                    "No Customer",
                supplier_id: finalOrder.supplier_id,
                supplier_name: ((_e = finalOrder.supplier) === null || _e === void 0 ? void 0 : _e.company_name) ||
                    ((_f = finalOrder.supplier) === null || _f === void 0 ? void 0 : _f.name) ||
                    "Unassigned",
                status: finalOrder.status,
                comment: finalOrder.comment,
                created_at: finalOrder.created_at,
                updated_at: finalOrder.updated_at,
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
    }
    catch (error) {
        try {
            yield queryRunner.rollbackTransaction();
        }
        catch (_g) { }
        return next(error);
    }
    finally {
        try {
            yield queryRunner.release();
        }
        catch (_h) { }
    }
});
exports.createOrder = createOrder;
const updateOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        const { orderId } = req.params;
        const { order_no, category_id, customer_id, supplier_id, status, comment, items, } = req.body;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const orderRepo = queryRunner.manager.getRepository(orders_1.Order);
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const order = yield orderRepo.findOne({ where: { id: Number(orderId) } });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        if (typeof order_no === "string" &&
            order_no.trim() &&
            order_no.trim() !== order.order_no) {
            const existing = yield orderRepo.findOne({
                where: { order_no: order_no.trim() },
            });
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
            const itemRepo = queryRunner.manager.getRepository(items_1.Item);
            const supplierItemRepo = queryRunner.manager.getRepository(supplier_items_1.SupplierItem);
            const itemIds = items.map((it) => Number(it.item_id));
            const dbItems = yield itemRepo
                .createQueryBuilder("i")
                .where("i.id IN (:...itemIds)", { itemIds })
                .getMany();
            const itemMap = new Map(dbItems.map((i) => [i.id, i]));
            // Fetch RMB_Price from supplier_items for all items
            const supplierItems = yield supplierItemRepo
                .createQueryBuilder("si")
                .where("si.item_id IN (:...itemIds)", { itemIds })
                .getMany();
            const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
            const newLines = items.map((it) => {
                var _a;
                const item_id = Number(it.item_id);
                const qty = Number(it.qty);
                if (!Number.isFinite(item_id) || item_id <= 0)
                    throw new errorHandler_1.default("Invalid item_id in items[]", 400);
                if (!Number.isFinite(qty) || qty <= 0)
                    throw new errorHandler_1.default("Invalid qty in items[]", 400);
                const dbItem = itemMap.get(item_id);
                const rmbPrice = rmbPriceMap.get(item_id);
                return orderItemsRepo.create({
                    order_id: order.id,
                    item_id,
                    qty,
                    remark_de: it.remark_de,
                    rmb_special_price: rmbPrice, // Use RMB_Price from supplier_items
                    price: dbItem === null || dbItem === void 0 ? void 0 : dbItem.price,
                    currency: dbItem === null || dbItem === void 0 ? void 0 : dbItem.currency,
                    taric_id: dbItem === null || dbItem === void 0 ? void 0 : dbItem.taric_id,
                    category_id: (_a = dbItem === null || dbItem === void 0 ? void 0 : dbItem.cat_id) !== null && _a !== void 0 ? _a : order.category_id,
                    cargo_id: order.cargo_id,
                    status: "NSO",
                    created_at: new Date(),
                    updated_at: new Date(),
                });
            });
            yield orderItemsRepo.save(newLines);
        }
        yield queryRunner.commitTransaction();
        const finalOrder = yield orderRepo.findOne({
            where: { id: order.id },
            relations: ["cargo", "cargo.customer", "customer", "supplier"],
        });
        const freshItems = yield orderItemsRepo.find({
            where: { order_id: order.id },
        });
        return res.status(200).json({
            success: true,
            message: "Order updated successfully",
            data: {
                id: finalOrder.id,
                order_no: finalOrder.order_no,
                category_id: finalOrder.category_id,
                customer_id: finalOrder.customer_id,
                customer_name: ((_b = (_a = finalOrder.cargo) === null || _a === void 0 ? void 0 : _a.customer) === null || _b === void 0 ? void 0 : _b.companyName) ||
                    ((_c = finalOrder.cargo) === null || _c === void 0 ? void 0 : _c.bill_to_display_name) ||
                    ((_d = finalOrder.customer) === null || _d === void 0 ? void 0 : _d.companyName) ||
                    "No Customer",
                supplier_id: finalOrder.supplier_id,
                supplier_name: ((_e = finalOrder.supplier) === null || _e === void 0 ? void 0 : _e.company_name) ||
                    ((_f = finalOrder.supplier) === null || _f === void 0 ? void 0 : _f.name) ||
                    "Unassigned",
                status: finalOrder.status,
                comment: finalOrder.comment,
                created_at: finalOrder.created_at,
                updated_at: finalOrder.updated_at,
                items: freshItems.map((oi) => ({
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
    }
    catch (error) {
        try {
            yield queryRunner.rollbackTransaction();
        }
        catch (_g) { }
        return next(error);
    }
    finally {
        try {
            yield queryRunner.release();
        }
        catch (_h) { }
    }
});
exports.updateOrder = updateOrder;
const getAllOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const warehouseRepo = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const { search = "", status = "" } = (req.query || {});
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
            .orderBy("o.date_emailed", "DESC")
            .addOrderBy("o.created_at", "DESC")
            .addOrderBy("o.id", "DESC")
            .addOrderBy("oi.id", "ASC");
        if (search) {
            qb.where("(o.order_no LIKE :search OR o.comment LIKE :search)", {
                search: `%${search}%`,
            });
            if (status)
                qb.andWhere("o.status = :status", { status });
        }
        else if (status) {
            qb.where("o.status = :status", { status });
        }
        const orders = yield qb.getMany();
        const itemIds = [];
        const itemIdDEs = [];
        orders.forEach((order) => {
            var _a;
            (_a = order.orderItems) === null || _a === void 0 ? void 0 : _a.forEach((oi) => {
                var _a;
                if (oi.item_id)
                    itemIds.push(oi.item_id);
                if (oi.ItemID_DE)
                    itemIdDEs.push(oi.ItemID_DE);
                if ((_a = oi.item) === null || _a === void 0 ? void 0 : _a.id)
                    itemIds.push(oi.item.id);
            });
        });
        const warehouseItems = yield warehouseRepo
            .createQueryBuilder("wi")
            .where("wi.item_id IN (:...itemIds)", {
            itemIds: itemIds.length ? itemIds : [0],
        })
            .orWhere("wi.ItemID_DE IN (:...itemIdDEs)", {
            itemIdDEs: itemIdDEs.length ? itemIdDEs : [0],
        })
            .getMany();
        const warehouseByItemId = new Map();
        const warehouseByItemIdDE = new Map();
        warehouseItems.forEach((wi) => {
            if (wi.item_id)
                warehouseByItemId.set(wi.item_id, wi);
            if (wi.ItemID_DE)
                warehouseByItemIdDE.set(wi.ItemID_DE, wi);
        });
        const itemRepo = database_1.AppDataSource.getRepository(items_1.Item);
        const fallbackItems = yield itemRepo.find({
            where: {
                ItemID_DE: (0, typeorm_1.In)(itemIdDEs.filter((id) => id !== undefined && id !== null)),
            },
            relations: ["supplier", "taric"],
        });
        const itemByDE = new Map();
        fallbackItems.forEach((item) => {
            if (item.ItemID_DE)
                itemByDE.set(item.ItemID_DE, item);
        });
        // Fetch RMB_Price from supplier_items for all items
        const supplierItemRepo = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const supplierItems = yield supplierItemRepo.find({
            where: { item_id: (0, typeorm_1.In)(itemIds.length ? itemIds : [0]) },
        });
        const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
        const mappedOrders = orders.map((order) => {
            var _a, _b, _c, _d, _e, _f;
            return (Object.assign(Object.assign({}, order), { supplier_name: ((_a = order.supplier) === null || _a === void 0 ? void 0 : _a.company_name) || ((_b = order.supplier) === null || _b === void 0 ? void 0 : _b.name) || "Unassigned", customer_name: ((_d = (_c = order.cargo) === null || _c === void 0 ? void 0 : _c.customer) === null || _d === void 0 ? void 0 : _d.companyName) ||
                    ((_e = order.cargo) === null || _e === void 0 ? void 0 : _e.bill_to_display_name) ||
                    ((_f = order.customer) === null || _f === void 0 ? void 0 : _f.companyName) ||
                    "No Customer", items: (order.orderItems || []).map((oi) => {
                    var _a, _b, _c, _d, _e;
                    const itemDetails = oi.item || (oi.ItemID_DE ? itemByDE.get(oi.ItemID_DE) : null);
                    console.log(itemDetails);
                    let warehouseItem = null;
                    if (oi.item_id) {
                        warehouseItem = warehouseByItemId.get(oi.item_id);
                    }
                    if (!warehouseItem && oi.ItemID_DE) {
                        warehouseItem = warehouseByItemIdDE.get(oi.ItemID_DE);
                    }
                    if (!warehouseItem && (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id)) {
                        warehouseItem = warehouseByItemId.get(itemDetails.id);
                    }
                    const resolvedSupplierName = ((_a = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier) === null || _a === void 0 ? void 0 : _a.company_name) ||
                        ((_b = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier) === null || _b === void 0 ? void 0 : _b.name) ||
                        ((_c = order.supplier) === null || _c === void 0 ? void 0 : _c.company_name) ||
                        ((_d = order.supplier) === null || _d === void 0 ? void 0 : _d.name) ||
                        null;
                    // Get RMB_Price from supplier_items
                    const rmbPrice = rmbPriceMap.get(oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id) || 0) || 0;
                    // Determine the price to use (priority: rmb_price from supplier_items > item.price)
                    const finalPrice = rmbPrice > 0 ? rmbPrice : (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.price) || oi.price || 0;
                    return Object.assign(Object.assign({}, oi), { de_no: (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_no_de) || "-", ItemID_DE: (oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) || "-", item_id: oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id), ean: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.ean) || (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.ean) || "-", remark_de: oi.remark_de, remark_cn: oi.remarks_cn, remark_en: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.remark) || "", item_name: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.item_name) ||
                            (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_name_en) ||
                            (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_name_de) ||
                            ((oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown Item"), model: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.model) || "-", price: finalPrice, currency: "CNY", taric_id: oi.taric_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.taric_id), taric_code: oi.set_taric_code || ((_e = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.taric) === null || _e === void 0 ? void 0 : _e.code) || "-", supplier_id: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier_id) || order.supplier_id, supplier_name: resolvedSupplierName || "Unassigned", rmb_price: rmbPrice, item: itemDetails, warehouse_data: warehouseItem
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
                            : null });
                }), orderItems: undefined }));
        });
        return res.status(200).json({
            success: true,
            data: mappedOrders,
        });
    }
    catch (error) {
        console.error("Error in getAllOrders:", error);
        next(error);
    }
});
exports.getAllOrders = getAllOrders;
const getOrderById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { orderId } = req.params;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
        const orderItemsRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const supplierItemRepository = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const order = yield orderRepository.findOne({
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
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        // Get all item IDs from order items
        const itemIds = (order.orderItems || [])
            .map((oi) => { var _a; return oi.item_id || ((_a = oi.item) === null || _a === void 0 ? void 0 : _a.id); })
            .filter((id) => id !== undefined && id !== null);
        // Fetch RMB_Price from supplier_items for all items
        const supplierItems = yield supplierItemRepository.find({
            where: { item_id: (0, typeorm_1.In)(itemIds.length ? itemIds : [0]) },
        });
        const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
        const result = {
            id: order.id,
            order_no: order.order_no,
            category_id: order.category_id,
            category_name: (_a = order.category) === null || _a === void 0 ? void 0 : _a.name,
            customer_id: order.customer_id,
            customer_name: ((_c = (_b = order.cargo) === null || _b === void 0 ? void 0 : _b.customer) === null || _c === void 0 ? void 0 : _c.companyName) ||
                ((_d = order.cargo) === null || _d === void 0 ? void 0 : _d.bill_to_display_name) ||
                ((_e = order.customer) === null || _e === void 0 ? void 0 : _e.companyName) ||
                "No Customer",
            supplier_id: order.supplier_id,
            supplier_name: ((_f = order.supplier) === null || _f === void 0 ? void 0 : _f.company_name) || ((_g = order.supplier) === null || _g === void 0 ? void 0 : _g.name),
            status: order.status,
            comment: order.comment,
            created_at: order.created_at,
            updated_at: order.updated_at,
            items: yield Promise.all((order.orderItems || []).map((oi) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                let item = oi.item;
                if (!item && oi.ItemID_DE) {
                    item = yield database_1.AppDataSource.getRepository(items_1.Item).findOne({
                        where: { ItemID_DE: oi.ItemID_DE },
                        relations: ["taric"],
                    });
                }
                const rmbPrice = rmbPriceMap.get(oi.item_id || (item === null || item === void 0 ? void 0 : item.id) || 0) || 0;
                // Determine the price to use (priority: rmb_price from supplier_items > item.price)
                const finalPrice = rmbPrice > 0 ? rmbPrice : (item === null || item === void 0 ? void 0 : item.price) || oi.price || 0;
                return {
                    id: oi.id,
                    order_id: oi.order_id,
                    item_id: oi.item_id || (item === null || item === void 0 ? void 0 : item.id),
                    ItemID_DE: oi.ItemID_DE,
                    qty: oi.qty,
                    qty_delivered: oi.qty_delivered,
                    qty_label: oi.qty_label,
                    remark_de: oi.remark_de,
                    remarks_cn: oi.remarks_cn,
                    status: oi.status,
                    price: finalPrice, // Use price from supplier_items (rmb_price) or fallback to item price
                    currency: "CNY", // RMB_Price is always in CNY
                    ean: (item === null || item === void 0 ? void 0 : item.ean) || oi.ean,
                    taric_id: oi.taric_id || (item === null || item === void 0 ? void 0 : item.taric_id),
                    taric_code: oi.set_taric_code || ((_a = item === null || item === void 0 ? void 0 : item.taric) === null || _a === void 0 ? void 0 : _a.code) || "-",
                    itemName: (item === null || item === void 0 ? void 0 : item.item_name) ||
                        (oi.ItemID_DE ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown"),
                    rmb_price: rmbPrice, // Add RMB_Price from supplier_items
                    item: item,
                };
            }))),
        };
        console.log(`[BACKEND] getOrderById(${orderId}) result:`, JSON.stringify(result, null, 2).substring(0, 1000) + "...");
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Error in getOrderById:", error);
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
        const order = yield orderRepository.findOne({
            where: { id: Number(orderId) },
        });
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
const generateLabelPDF = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { itemId } = req.params;
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const warehouseItemRepo = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const item = yield orderItemRepo.findOne({
            where: { id: Number(itemId) },
            relations: ["item"],
        });
        if (!item)
            return next(new errorHandler_1.default("Item not found", 404));
        const warehouseItem = yield warehouseItemRepo.findOne({
            where: { ItemID_DE: item.ItemID_DE },
        });
        const order = yield orderRepo.findOne({ where: { id: item.order_id } });
        const doc = new pdfkit_1.default({ size: [252, 110], margin: 0 });
        const logo = path_1.default.join(__dirname, "../../public/logo.png");
        const k1 = path_1.default.join(__dirname, "../../public/k1.png");
        const k2 = path_1.default.join(__dirname, "../../public/k2.png");
        let logoPath = logo;
        if ((((_a = item.item) === null || _a === void 0 ? void 0 : _a.item_name) && item.item.item_name.includes("K011111")) ||
            ((_b = item.remarks_cn) === null || _b === void 0 ? void 0 : _b.includes("K011111"))) {
            logoPath = k1;
        }
        else if ((((_c = item.item) === null || _c === void 0 ? void 0 : _c.item_name) && item.item.item_name.includes("K022222")) ||
            ((_d = item.remarks_cn) === null || _d === void 0 ? void 0 : _d.includes("K022222"))) {
            logoPath = k2;
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=label_${item.id}.pdf`);
        doc.pipe(res);
        const colA = 12;
        const valColA = 16;
        const colB = 85;
        const colD = 180;
        const colLogo = 205;
        const row1LabelY = 10;
        const row1ValueY = 22;
        doc.fillColor("black").font("Helvetica-Oblique").fontSize(6.5);
        doc.text("ItemNoW", colA, row1LabelY);
        doc.text("Order No / Qty", colB, row1LabelY);
        doc.text("Qty", colD, row1LabelY);
        doc.font("Helvetica-Bold").fontSize(10);
        /**
         * ITEM NO DE TRUNCATION
         * If length > 10, take first 10 chars and add "..."
         */
        let itemNoDE = (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_no_de) || "N/A";
        if (itemNoDE.length > 10) {
            itemNoDE = itemNoDE.substring(0, 10) + "...";
        }
        doc.text(itemNoDE, valColA, row1ValueY, {
            width: 68,
            lineBreak: false,
        });
        const orderNo = (order === null || order === void 0 ? void 0 : order.order_no) || "N/A";
        doc.text(orderNo, colB, row1ValueY);
        doc.text(`${item.qty_label || 0}`, colD, row1ValueY);
        const orderNoWidth = doc.widthOfString(orderNo);
        doc
            .font("Helvetica")
            .fontSize(9)
            .text(`/${item.qty}`, colB + orderNoWidth + 2, row1ValueY + 4);
        try {
            doc.image(logoPath, colLogo, 14, { width: 40 });
        }
        catch (e) {
            console.error("Logo missing at path:", logoPath);
        }
        doc.font("Helvetica").fontSize(8).fillColor("#222222");
        const description = ((_e = item.item) === null || _e === void 0 ? void 0 : _e.item_name) || "No description available";
        doc.text(description, valColA, 42, {
            width: 180,
            height: 20,
            lineBreak: true,
        });
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
        const barcodeValue = ((_f = warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.ean) === null || _f === void 0 ? void 0 : _f.toString()) || "";
        if (barcodeValue) {
            try {
                const barcodeBuffer = yield bwip_js_1.default.toBuffer({
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
            }
            catch (barcodeErr) {
                console.error("Barcode generation failed:", barcodeErr);
            }
        }
        doc.end();
    }
    catch (error) {
        return next(error);
    }
});
exports.generateLabelPDF = generateLabelPDF;
const updateOrderItemStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const body = req.body;
        const orderItemsRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderItem = yield orderItemsRepo.findOne({
            where: { id: Number(id) },
            relations: ["order"],
        });
        if (!orderItem) {
            return next(new errorHandler_1.default("Order Item not found", 404));
        }
        const oldCargoId = orderItem.cargo_id;
        const newCargoId = body.cargo_id;
        Object.keys(body).forEach((key) => {
            if (key === "supplier_order_id" && body[key] === null) {
                orderItem.supplier_order_id = undefined;
            }
            else if (key !== "id" && key !== "updated_at") {
                orderItem[key] = body[key];
            }
        });
        orderItem.updated_at = new Date();
        yield orderItemsRepo.save(orderItem);
        const cargoIdsToRefresh = [];
        if (oldCargoId)
            cargoIdsToRefresh.push(Number(oldCargoId));
        if (newCargoId)
            cargoIdsToRefresh.push(Number(newCargoId));
        yield (0, cargo_controller_1.generateInvoicesForOrders)([Number(orderItem.order_id)], cargoIdsToRefresh);
        return res.status(200).json({
            success: true,
            message: "Order item updated successfully",
            data: orderItem,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateOrderItemStatus = updateOrderItemStatus;
const updateOrderItemLabel = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { splitQty, remarks_cn } = req.body;
        const orderItemsRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderItem = yield orderItemsRepo.findOne({
            where: { id: Number(id) },
        });
        if (!orderItem) {
            return next(new errorHandler_1.default("Order item not found", 404));
        }
        orderItem.qty_label = Number(splitQty) || 0;
        if (remarks_cn !== undefined) {
            orderItem.remarks_cn = remarks_cn;
        }
        orderItem.updated_at = new Date();
        yield orderItemsRepo.save(orderItem);
        return res.status(200).json({
            success: true,
            message: "Label quantity and review updated successfully",
            data: orderItem,
        });
    }
    catch (error) {
        console.error("Error in updateOrderItemLabel:", error);
        return next(error);
    }
});
exports.updateOrderItemLabel = updateOrderItemLabel;
const splitOrderItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        const { id } = req.params;
        const { splitQty, targetCargoId, remarks_cn } = req.body;
        if (!splitQty || splitQty <= 0) {
            return next(new errorHandler_1.default("Split quantity must be greater than 0", 400));
        }
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const orderItem = yield orderItemsRepo.findOne({
            where: { id: Number(id) },
            relations: ["order"],
        });
        if (!orderItem) {
            throw new errorHandler_1.default("Order item not found", 404);
        }
        if (splitQty >= (orderItem.qty || 0)) {
            throw new errorHandler_1.default("Split quantity must be less than current quantity", 400);
        }
        const newItem = orderItemsRepo.create(Object.assign(Object.assign({}, orderItem), { id: undefined, qty: splitQty, cargo_id: targetCargoId || orderItem.cargo_id, remarks_cn: remarks_cn || orderItem.remarks_cn, created_at: new Date(), updated_at: new Date() }));
        orderItem.qty = (orderItem.qty || 0) - splitQty;
        orderItem.updated_at = new Date();
        yield orderItemsRepo.save(orderItem);
        yield orderItemsRepo.save(newItem);
        if (targetCargoId) {
            const cargoOrderRepo = queryRunner.manager.getRepository(cargo_orders_1.CargoOrder);
            const existingLink = yield cargoOrderRepo.findOne({
                where: {
                    cargo_id: Number(targetCargoId),
                    order_id: Number(orderItem.order_id),
                },
            });
            if (!existingLink) {
                yield cargoOrderRepo.save(cargoOrderRepo.create({
                    cargo_id: Number(targetCargoId),
                    order_id: Number(orderItem.order_id),
                }));
            }
        }
        yield queryRunner.commitTransaction();
        const cargoIdsToRefresh = [];
        if (orderItem.cargo_id)
            cargoIdsToRefresh.push(Number(orderItem.cargo_id));
        if (targetCargoId)
            cargoIdsToRefresh.push(Number(targetCargoId));
        yield (0, cargo_controller_1.generateInvoicesForOrders)([Number(orderItem.order_id)], cargoIdsToRefresh);
        return res.status(200).json({
            success: true,
            message: "Order item split successfully",
            data: { original: orderItem, split: newItem },
        });
    }
    catch (error) {
        if (queryRunner.isTransactionActive) {
            yield queryRunner.rollbackTransaction();
        }
        return next(error);
    }
    finally {
        yield queryRunner.release();
    }
});
exports.splitOrderItem = splitOrderItem;
const updateOrderItemPrice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { eur_special_price } = req.body;
        if (eur_special_price === undefined) {
            return next(new errorHandler_1.default("eur_special_price is required", 400));
        }
        const orderItemsRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderItem = yield orderItemsRepo.findOne({
            where: { id: Number(id) },
        });
        if (!orderItem) {
            return next(new errorHandler_1.default("Order Item not found", 404));
        }
        orderItem.eur_special_price = Number(eur_special_price);
        orderItem.updated_at = new Date();
        yield orderItemsRepo.save(orderItem);
        if (orderItem.order_id) {
            yield (0, cargo_controller_1.generateInvoicesForOrders)([Number(orderItem.order_id)], orderItem.cargo_id ? [Number(orderItem.cargo_id)] : []);
        }
        return res.status(200).json({
            success: true,
            message: "Order item price updated successfully",
            data: orderItem,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateOrderItemPrice = updateOrderItemPrice;
