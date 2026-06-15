"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.generateCommercialInvoicePDF = exports.updateOrderItemPrice = exports.splitOrderItem = exports.updateOrderItemLabel = exports.updateOrderItemStatus = exports.generateLabelPDF = exports.deleteOrder = exports.getOrderById = exports.getAllOrders = exports.updateOrder = exports.createOrder = exports._cachedCjkFontBuffer = exports._cachedCjkFontPath = void 0;
const typeorm_1 = require("typeorm");
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const items_1 = require("../models/items");
const fs_1 = __importStar(require("fs"));
const warehouse_items_1 = require("../models/warehouse_items");
const invoice_1 = require("../models/invoice");
const cargos_1 = require("../models/cargos");
const cargo_orders_1 = require("../models/cargo_orders");
const tarics_1 = require("../models/tarics");
const customers_1 = require("../models/customers");
const supplier_items_1 = require("../models/supplier_items");
const cargo_controller_1 = require("./cargo_controller");
const _cjkFontCandidates = [
    path_1.default.join(process.cwd(), "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
    path_1.default.resolve(__dirname, "..", "..", "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
    path_1.default.join(process.cwd(), "server", "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
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
exports._cachedCjkFontPath = null;
exports._cachedCjkFontBuffer = null;
(function detectCjkFont() {
    let assetsBase = "";
    let currentDir = __dirname;
    for (let i = 0; i < 5; i++) {
        const testPath = path_1.default.join(currentDir, "assets");
        if ((0, fs_1.existsSync)(testPath)) {
            assetsBase = testPath;
            break;
        }
        currentDir = path_1.default.dirname(currentDir);
    }
    const finalCandidates = [..._cjkFontCandidates];
    if (assetsBase) {
        finalCandidates.unshift(path_1.default.join(assetsBase, "noto-sans-sc", "NotoSansSC-Regular.otf"));
        finalCandidates.unshift(path_1.default.join(assetsBase, "NotoSansCJK-Regular.ttf"));
    }
    for (const p of finalCandidates) {
        if ((0, fs_1.existsSync)(p)) {
            try {
                const testDoc = new pdfkit_1.default();
                const buf = fs_1.default.readFileSync(p);
                testDoc.font(buf, 0).text("测试");
                exports._cachedCjkFontBuffer = buf;
                exports._cachedCjkFontPath = p;
                return;
            }
            catch (e) { }
        }
    }
})();
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
                ItemID_DE: dbItem === null || dbItem === void 0 ? void 0 : dbItem.ItemID_DE,
                qty,
                remark_de: it.remark_de,
                rmb_special_price: rmbPrice,
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
                    ItemID_DE: dbItem === null || dbItem === void 0 ? void 0 : dbItem.ItemID_DE,
                    qty,
                    remark_de: it.remark_de,
                    rmb_special_price: rmbPrice,
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
            .orderBy("o.date_created", "DESC")
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
        const supplierItemRepo = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const supplierItems = yield supplierItemRepo.find({
            where: { item_id: (0, typeorm_1.In)(itemIds.length ? itemIds : [0]) },
            relations: ["supplier"],
        });
        const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
        const defaultSupplierMap = new Map();
        supplierItems.forEach((si) => {
            if (si.is_default === "Y" && si.supplier) {
                defaultSupplierMap.set(si.item_id, {
                    id: si.supplier_id,
                    name: si.supplier.company_name || si.supplier.name || null,
                });
            }
        });
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
                    const defaultSup = defaultSupplierMap.get(oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id) || 0);
                    const resolvedSupplierName = ((_a = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier) === null || _a === void 0 ? void 0 : _a.company_name) ||
                        ((_b = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier) === null || _b === void 0 ? void 0 : _b.name) ||
                        (defaultSup === null || defaultSup === void 0 ? void 0 : defaultSup.name) ||
                        ((_c = order.supplier) === null || _c === void 0 ? void 0 : _c.company_name) ||
                        ((_d = order.supplier) === null || _d === void 0 ? void 0 : _d.name) ||
                        null;
                    const rmbPrice = rmbPriceMap.get(oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id) || 0) || 0;
                    const finalPrice = rmbPrice > 0 ? rmbPrice : (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.price) || oi.price || 0;
                    return Object.assign(Object.assign({}, oi), { de_no: (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_no_de) || "-", ItemID_DE: (oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) || "-", item_id: oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id), ean: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.ean) || (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.ean) || "-", remark_de: oi.remark_de, remark_cn: oi.remarks_cn, remark_en: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.remark) || "", item_name: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.item_name) ||
                            (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_name_en) ||
                            (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_name_de) ||
                            ((oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown Item"), model: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.model) || "-", price: finalPrice, currency: "CNY", taric_id: oi.taric_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.taric_id), taric_code: oi.set_taric_code || ((_e = itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.taric) === null || _e === void 0 ? void 0 : _e.code) || "-", supplier_id: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.supplier_id) || (defaultSup === null || defaultSup === void 0 ? void 0 : defaultSup.id) || order.supplier_id, supplier_name: resolvedSupplierName || "Unassigned", rmb_price: rmbPrice, item: itemDetails, warehouse_data: warehouseItem
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
                "orderItems.item.supplier",
                "supplier",
                "category",
                "cargo",
                "cargo.customer",
                "customer",
            ],
        });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        const itemIds = (order.orderItems || [])
            .map((oi) => { var _a; return oi.item_id || ((_a = oi.item) === null || _a === void 0 ? void 0 : _a.id); })
            .filter((id) => id !== undefined && id !== null);
        const supplierItems = yield supplierItemRepository.find({
            where: { item_id: (0, typeorm_1.In)(itemIds.length ? itemIds : [0]) },
            relations: ["supplier"],
        });
        const rmbPriceMap = new Map(supplierItems.map((si) => [si.item_id, si.price_rmb]));
        const defaultSupplierMap = new Map();
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
                var _a, _b, _c, _d, _e;
                let item = oi.item;
                if (!item && oi.ItemID_DE) {
                    item = yield database_1.AppDataSource.getRepository(items_1.Item).findOne({
                        where: { ItemID_DE: oi.ItemID_DE },
                        relations: ["taric"],
                    });
                }
                const rmbPrice = rmbPriceMap.get(oi.item_id || (item === null || item === void 0 ? void 0 : item.id) || 0) || 0;
                const finalPrice = rmbPrice > 0 ? rmbPrice : (item === null || item === void 0 ? void 0 : item.price) || oi.price || 0;
                const defaultSup = defaultSupplierMap.get(oi.item_id || (item === null || item === void 0 ? void 0 : item.id) || 0);
                const resolvedSupplierId = oi.supplier_id ||
                    (item === null || item === void 0 ? void 0 : item.supplier_id) ||
                    (defaultSup === null || defaultSup === void 0 ? void 0 : defaultSup.id) ||
                    order.supplier_id ||
                    null;
                const resolvedSupplierName = ((_a = item === null || item === void 0 ? void 0 : item.supplier) === null || _a === void 0 ? void 0 : _a.company_name) ||
                    ((_b = item === null || item === void 0 ? void 0 : item.supplier) === null || _b === void 0 ? void 0 : _b.name) ||
                    (defaultSup === null || defaultSup === void 0 ? void 0 : defaultSup.name) ||
                    ((_c = order.supplier) === null || _c === void 0 ? void 0 : _c.company_name) ||
                    ((_d = order.supplier) === null || _d === void 0 ? void 0 : _d.name) ||
                    null;
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
                    remark_en: (item === null || item === void 0 ? void 0 : item.remark) || "",
                    status: oi.status,
                    price: finalPrice,
                    currency: "CNY",
                    ean: (item === null || item === void 0 ? void 0 : item.ean) || oi.ean,
                    taric_id: oi.taric_id || (item === null || item === void 0 ? void 0 : item.taric_id),
                    taric_code: oi.set_taric_code || ((_e = item === null || item === void 0 ? void 0 : item.taric) === null || _e === void 0 ? void 0 : _e.code) || "-",
                    supplier_id: resolvedSupplierId,
                    supplier_name: resolvedSupplierName,
                    itemName: (item === null || item === void 0 ? void 0 : item.item_name) ||
                        (oi.ItemID_DE ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown"),
                    rmb_price: rmbPrice,
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
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { itemId } = req.params;
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const warehouseItemRepo = database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem);
        const customerRepo = database_1.AppDataSource.getRepository(customers_1.Customer);
        const item = yield orderItemRepo.findOne({
            where: { id: Number(itemId) },
            relations: ["item"],
        });
        if (!item)
            return next(new errorHandler_1.default("Item not found", 404));
        let resolvedItem = item.item;
        if (!resolvedItem && item.ItemID_DE) {
            resolvedItem = yield database_1.AppDataSource.getRepository(items_1.Item).findOne({
                where: { ItemID_DE: item.ItemID_DE },
            });
        }
        let warehouseItem = null;
        if (item.ItemID_DE) {
            warehouseItem = yield warehouseItemRepo.findOne({
                where: { ItemID_DE: item.ItemID_DE },
            });
        }
        if (!warehouseItem && (item.item_id || (resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.id))) {
            warehouseItem = yield warehouseItemRepo.findOne({
                where: { item_id: item.item_id || (resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.id) },
            });
        }
        if (!warehouseItem && (resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.ItemID_DE)) {
            warehouseItem = yield warehouseItemRepo.findOne({
                where: { ItemID_DE: resolvedItem.ItemID_DE },
            });
        }
        const order = yield orderRepo.findOne({
            where: { id: item.order_id },
            relations: ["customer"],
        });
        const doc = new pdfkit_1.default({ size: [252, 110], margin: 0 });
        const logoPath = path_1.default.join(__dirname, "../../public/logo.png");
        let logoSource = logoPath;
        let isCustomLogoUsed = false;
        const detectImageFormat = (buf) => {
            if (buf.length >= 8 &&
                buf[0] === 0x89 &&
                buf[1] === 0x50 &&
                buf[2] === 0x4e &&
                buf[3] === 0x47)
                return "png";
            if (buf.length >= 3 &&
                buf[0] === 0xff &&
                buf[1] === 0xd8 &&
                buf[2] === 0xff)
                return "jpeg";
            if (buf.length >= 4 &&
                buf[0] === 0x47 &&
                buf[1] === 0x49 &&
                buf[2] === 0x46 &&
                buf[3] === 0x38)
                return "gif";
            if (buf.length >= 12 &&
                buf.toString("ascii", 0, 4) === "RIFF" &&
                buf.toString("ascii", 8, 12) === "WEBP")
                return "webp";
            if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d)
                return "bmp";
            const head = buf
                .toString("utf8", 0, Math.min(buf.length, 200))
                .trim()
                .toLowerCase();
            if (head.startsWith("<?xml") || head.startsWith("<svg"))
                return "svg";
            return "unknown";
        };
        let brandingCustomer = null;
        if (resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.customer_id) {
            brandingCustomer = yield customerRepo.findOne({
                where: { id: resolvedItem.customer_id },
            });
        }
        if (!(brandingCustomer === null || brandingCustomer === void 0 ? void 0 : brandingCustomer.companyLabelPrintLogo) &&
            ((_a = order === null || order === void 0 ? void 0 : order.customer) === null || _a === void 0 ? void 0 : _a.companyLabelPrintLogo)) {
            brandingCustomer = order.customer;
        }
        console.log("[label] logo decision:", {
            itemId,
            orderId: item.order_id,
            isLabelPrint: !!(resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.isLabelPrint),
            itemCustomerId: (_b = resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.customer_id) !== null && _b !== void 0 ? _b : null,
            orderCustomerId: (_d = (_c = order === null || order === void 0 ? void 0 : order.customer) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : null,
            brandingCustomerId: (_e = brandingCustomer === null || brandingCustomer === void 0 ? void 0 : brandingCustomer.id) !== null && _e !== void 0 ? _e : null,
            hasBrandingLogo: !!(brandingCustomer === null || brandingCustomer === void 0 ? void 0 : brandingCustomer.companyLabelPrintLogo),
        });
        if ((resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.isLabelPrint) && (brandingCustomer === null || brandingCustomer === void 0 ? void 0 : brandingCustomer.companyLabelPrintLogo)) {
            const raw = brandingCustomer.companyLabelPrintLogo.trim();
            let base64Part = "";
            let declaredMime = "";
            if (raw.startsWith("data:image/")) {
                const matches = raw.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
                if (matches) {
                    declaredMime = matches[1];
                    base64Part = matches[2];
                }
                else {
                    console.warn("[label] customer logo starts with `data:image/` but does not match the expected `data:image/<type>;base64,<data>` shape — using default logo");
                }
            }
            else {
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
                        console.warn("[label] customer logo decoded to 0 bytes — using default logo");
                    }
                    else if (detectedFormat === "png" || detectedFormat === "jpeg") {
                        logoSource = buf;
                        isCustomLogoUsed = true;
                    }
                    else {
                        console.warn(`[label] customer logo format "${detectedFormat}" is NOT supported by PDFKit (PNG/JPEG only) — using default logo. Ask the customer to re-upload a PNG or JPEG.`);
                    }
                }
                catch (err) {
                    console.error("[label] failed to decode customer logo base64 — using default logo:", err instanceof Error ? err.message : err);
                }
            }
            else {
                console.warn("[label] customer logo present but no base64 payload could be extracted — using default logo");
            }
        }
        const safeOrderNo = ((order === null || order === void 0 ? void 0 : order.order_no) || "N/A").replace(/[/\\?%*:|"<>\s]/g, "-");
        const safeItemNo = ((warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_no_de) || "N/A").replace(/[/\\?%*:|"<>\s]/g, "-");
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
        const orderNo = (order === null || order === void 0 ? void 0 : order.order_no) || "N/A";
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
        let itemNoDE = (warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.item_no_de) || "N/A";
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
            console.log("[label] drew", isCustomLogoUsed ? "customer logo" : "default logo");
        }
        catch (e) {
            console.error("[label] failed to draw", isCustomLogoUsed ? "customer logo" : "default logo", "-", e instanceof Error ? e.message : e);
            if (isCustomLogoUsed) {
                try {
                    doc.image(logoPath, colLogo, 14, { width: 40 });
                    console.log("[label] drew default logo as fallback");
                }
                catch (fallbackErr) {
                    console.error("[label] default logo ALSO failed to draw:", fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
                }
            }
        }
        const fontSource = exports._cachedCjkFontBuffer || exports._cachedCjkFontPath;
        if (fontSource) {
            doc.font(fontSource, 0);
        }
        else {
            doc.font("Helvetica");
        }
        doc.fontSize(8).fillColor("#222222");
        const description = (resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.item_name) || "No description available";
        const descriptionY = row1ValueY + itemNoWHeight + 1.5;
        const descriptionHeight = Math.min(doc.heightOfString(description, { width: 180 }), 18);
        doc.text(description, valColA, descriptionY, {
            width: 180,
            height: descriptionHeight,
            lineBreak: true,
        });
        const bottomSectionY = Math.max(56, Math.min(descriptionY + descriptionHeight + 4, 65));
        let remarkCNText = item.remarks_cn || "";
        doc.font("Helvetica-Oblique").fontSize(6.5).fillColor("black");
        doc.text("Hinweis", colA, bottomSectionY);
        let fontSizeCN = 10;
        if (fontSource) {
            doc.font(fontSource, 0);
        }
        else {
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
        }
        else {
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
        const barcodeValue = (((_f = resolvedItem === null || resolvedItem === void 0 ? void 0 : resolvedItem.ean) === null || _f === void 0 ? void 0 : _f.toString()) ||
            ((_g = warehouseItem === null || warehouseItem === void 0 ? void 0 : warehouseItem.ean) === null || _g === void 0 ? void 0 : _g.toString()) ||
            "").trim();
        if (barcodeValue && barcodeValue !== "-") {
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
                doc.image(barcodeBuffer, 145, 68, { width: 100 });
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
const formatPostalCity = (postalCode, city) => {
    return [postalCode, city]
        .filter((value) => value && String(value).trim())
        .join(" ")
        .trim();
};
const resolveCustomerAddress = (customer) => {
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
            (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryAddressLine1) ||
            (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.address) ||
            "",
        customer.addressLine2 || (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryAddressLine2) || "",
    ].filter(Boolean);
    return {
        street: streetParts.join(" ").trim(),
        city: customer.city ||
            (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryCity) ||
            (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.city) ||
            "",
        postalCode: customer.postalCode ||
            (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryPostalCode) ||
            (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.postalCode) ||
            "",
        country: customer.country ||
            (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryCountry) ||
            (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.country) ||
            "",
        phone: customer.contactPhoneNumber ||
            (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryContactPhone) ||
            (businessDetails === null || businessDetails === void 0 ? void 0 : businessDetails.contactPhone) ||
            "",
        contact: customer.legalName || (starCustomerDetails === null || starCustomerDetails === void 0 ? void 0 : starCustomerDetails.deliveryContactName) || "",
    };
};
const generateCommercialInvoicePDF = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { invoiceId } = req.params;
        if (!invoiceId || typeof invoiceId !== "string") {
            return next(new errorHandler_1.default("Invalid Invoice ID format.", 400));
        }
        const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
        const invoice = yield invoiceRepository.findOne({
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
        const cargo = yield database_1.AppDataSource.getRepository(cargos_1.Cargo).findOne({
            where: { cargo_no: invoice.orderNumber },
            relations: [
                "customer",
                "customer.businessDetails",
                "customer.starCustomerDetails",
            ],
        });
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        let rawOrderItems = [];
        if (cargo) {
            rawOrderItems = yield orderItemRepo.find({
                where: { cargo_id: cargo.id },
                relations: ["item", "item.taric"],
            });
        }
        else {
            const order = yield database_1.AppDataSource.getRepository(orders_1.Order).findOne({
                where: { order_no: invoice.orderNumber },
            });
            if (order)
                rawOrderItems = yield orderItemRepo.find({
                    where: { order_id: order.id },
                    relations: ["item", "item.taric"],
                });
        }
        const manualCodes = [];
        rawOrderItems.forEach((oi) => {
            if (oi.set_taric_code)
                oi.set_taric_code.split("/").forEach((c) => {
                    if (c.trim())
                        manualCodes.push(c.trim());
                });
        });
        const uniqueCodes = [...new Set(manualCodes)];
        const manualTarics = uniqueCodes.length > 0
            ? yield database_1.AppDataSource.getRepository(tarics_1.Taric).find({
                where: { code: (0, typeorm_1.In)(uniqueCodes) },
            })
            : [];
        const manualTaricMap = new Map(manualTarics.map((t) => [t.code, t]));
        const taricGroupsMap = new Map();
        rawOrderItems.forEach((oi) => {
            var _a, _b;
            const item = oi.item;
            const taricCode = ((_a = item === null || item === void 0 ? void 0 : item.taric) === null || _a === void 0 ? void 0 : _a.code) || "";
            const isProject = !taricCode || taricCode === "0" || taricCode === "0000000000";
            let groupKey;
            let hsCode;
            let desc;
            if (oi.set_taric_code) {
                const codes = oi.set_taric_code.split("/");
                const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
                groupKey = `hs_${target}`;
                hsCode = target;
                const mt = manualTaricMap.get(target);
                desc = (mt === null || mt === void 0 ? void 0 : mt.name_en) || (item === null || item === void 0 ? void 0 : item.item_name) || "Unknown";
            }
            else if (((_b = item === null || item === void 0 ? void 0 : item.taric) === null || _b === void 0 ? void 0 : _b.id) && !isProject) {
                groupKey = `hs_${taricCode}`;
                hsCode = taricCode;
                desc = item.taric.name_en || item.item_name || "Unknown";
            }
            else {
                groupKey = `item_${(item === null || item === void 0 ? void 0 : item.id) || Math.random()}`;
                hsCode = "n/a";
                desc = (item === null || item === void 0 ? void 0 : item.item_name) || "Unknown";
            }
            let unitPrice = 0;
            if ((item === null || item === void 0 ? void 0 : item.transfer_price_EUR) !== undefined &&
                (item === null || item === void 0 ? void 0 : item.transfer_price_EUR) !== null)
                unitPrice = Number(item.transfer_price_EUR);
            else if (oi.eur_special_price !== undefined &&
                oi.eur_special_price !== null)
                unitPrice = Number(oi.eur_special_price);
            else if (oi.price !== undefined && oi.price !== null)
                unitPrice = Number(oi.price);
            else if ((item === null || item === void 0 ? void 0 : item.price) !== undefined && (item === null || item === void 0 ? void 0 : item.price) !== null)
                unitPrice = Number(item.price);
            const qty = Number(oi.qty || 0);
            if (!taricGroupsMap.has(groupKey))
                taricGroupsMap.set(groupKey, { hsCode, desc, qty: 0, totalPrice: 0 });
            const g = taricGroupsMap.get(groupKey);
            g.qty += qty;
            g.totalPrice += qty * unitPrice;
        });
        const groupedItems = Array.from(taricGroupsMap.values());
        let lineItems;
        if (groupedItems.length > 0) {
            lineItems = groupedItems.map((g, i) => ({
                no: i + 1,
                desc: g.desc,
                hs: g.hsCode,
                qty: g.qty,
                unit: g.qty > 0 ? (g.totalPrice / g.qty).toFixed(3) : "0.000",
                price: g.totalPrice.toFixed(2),
            }));
        }
        else {
            lineItems = (invoice.items || []).map((item, i) => {
                var _a;
                return ({
                    no: i + 1,
                    desc: item.description || ((_a = item.item) === null || _a === void 0 ? void 0 : _a.item_name) || "Unknown Item",
                    hs: item.articleNumber || "n/a",
                    qty: Number(item.quantity || 0),
                    unit: Number(item.unitPrice || 0).toFixed(3),
                    price: Number(item.netPrice || 0).toFixed(2),
                });
            });
        }
        const totalQty = lineItems.reduce((s, it) => s + it.qty, 0);
        const subTotal = lineItems.reduce((s, it) => s + Number(it.price), 0);
        const freightCost = invoice.freightCost !== undefined && invoice.freightCost !== null
            ? Number(invoice.freightCost)
            : 0;
        const grandTotal = (subTotal + freightCost).toFixed(2);
        const customer = invoice.customer || (cargo === null || cargo === void 0 ? void 0 : cargo.customer);
        const customerAddress = resolveCustomerAddress(customer);
        const hasCargoBillTo = !!((cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_display_name) || (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_company_name));
        const rawBillName = hasCargoBillTo
            ? cargo.bill_to_display_name || cargo.bill_to_company_name || ""
            : (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_display_name) ||
                (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_company_name) ||
                (customer === null || customer === void 0 ? void 0 : customer.companyName) ||
                "";
        const billToName = rawBillName
            .replace(/^GTech$/i, "GTech Industries GmbH")
            .replace(/^GTech[-\s]?Warehouse$/i, "GTech Industries GmbH") ||
            "GTech Industries GmbH";
        const billToStreet = hasCargoBillTo
            ? (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_full_address) || customerAddress.street
            : (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_full_address) || customerAddress.street;
        const billToCity = hasCargoBillTo
            ? (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_city)
                ? formatPostalCity(cargo.bill_to_postal_code, cargo.bill_to_city)
                : formatPostalCity(customerAddress.postalCode, customerAddress.city)
            : (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_city)
                ? formatPostalCity(cargo.ship_to_postal_code, cargo.ship_to_city)
                : formatPostalCity(customerAddress.postalCode, customerAddress.city);
        const billToCountry = hasCargoBillTo
            ? (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_country) || customerAddress.country || "Germany"
            : (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_country) || customerAddress.country || "Germany";
        const billToPhone = hasCargoBillTo
            ? (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_phone_no) || customerAddress.phone
            : (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_contact_phone) || customerAddress.phone;
        const billToEori = hasCargoBillTo
            ? (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_tax_no) || (customer === null || customer === void 0 ? void 0 : customer.taxNumber) || ""
            : (customer === null || customer === void 0 ? void 0 : customer.taxNumber) || "";
        const shipToCompany = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_display_name) ||
            (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_company_name) ||
            (customer === null || customer === void 0 ? void 0 : customer.companyName) ||
            "";
        const shipToStreet = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_full_address) || customerAddress.street;
        const shipToCity = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_city)
            ? formatPostalCity(cargo.ship_to_postal_code, cargo.ship_to_city)
            : formatPostalCity(customerAddress.postalCode, customerAddress.city);
        const shipToCountry = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_country) || customerAddress.country || "";
        const shipToContact = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_contact_person) || customerAddress.contact || "";
        const shipToPhone = (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_contact_phone) || customerAddress.phone || "";
        const customerID = (() => {
            var _a;
            if ((_a = customer === null || customer === void 0 ? void 0 : customer.businessDetails) === null || _a === void 0 ? void 0 : _a.customerNumber)
                return String(customer.businessDetails.customerNumber);
            if (customer === null || customer === void 0 ? void 0 : customer.id)
                return (parseInt(customer.id.replace(/-/g, "").substring(0, 8), 16) % 100000)
                    .toString()
                    .padStart(5, "0");
            return "";
        })();
        const data = {
            invoiceNo: (invoice.invoiceNumber || "").replace(/-/g, ""),
            date: invoice.invoiceDate
                ? new Date(invoice.invoiceDate).toISOString().split("T")[0]
                : "",
            cargoNo: (cargo === null || cargo === void 0 ? void 0 : cargo.cargo_no) || invoice.orderNumber || "",
            customerID,
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
        const doc = new pdfkit_1.default({ size: "A4", margin: 40, bufferPages: true });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=Invoice_${data.invoiceNo}.pdf`);
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
        doc.text("GTech Industries Limited:   3A, 12/F, Kaiser Centre, N. 18 Centre Street, Sai Ying Pun, Hong Kong", 40, 75);
        doc.text("GTech Establishment China: West Dafeng Metallurgical Plant, Bowang Huisheng Square, Bowang, Ma'anshan, Anhui", 40, 88);
        const fontSource = exports._cachedCjkFontBuffer || exports._cachedCjkFontPath;
        if (fontSource) {
            try {
                const chineseAddress = "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
                doc
                    .font(fontSource, 0)
                    .fontSize(9)
                    .fillColor("#666666")
                    .text(chineseAddress, 152, 101, { lineBreak: false });
                doc.font("Helvetica").fillColor("#000000");
            }
            catch (err) {
                console.error(`[CJK-PDF] Render failed:`, err.message);
                if (process.platform === "win32") {
                    try {
                        doc
                            .font("C:\\Windows\\Fonts\\msyh.ttc", 0)
                            .fontSize(9)
                            .text("中国安徽...", 152, 101);
                    }
                    catch (e) { }
                }
                doc.font("Helvetica").fillColor("#000000");
            }
        }
        const GTECH_GMBH = {
            name: "GTech Industries GmbH",
            street: "Reichshofstr. 137",
            city: "58239 Schwerte",
            country: "Germany",
            phone: "+4923043389510",
            eori: "DE977540238364617",
        };
        const isGTechBillTo = data.billTo.name === "GTech Industries GmbH";
        const isSameAddr = !hasCargoBillTo ||
            (data.billTo.name === data.shipTo.company &&
                data.billTo.street === data.shipTo.street);
        const addrY = 125;
        if (isSameAddr) {
            const bName = isGTechBillTo ? GTECH_GMBH.name : data.billTo.name;
            const bStreet = isGTechBillTo ? GTECH_GMBH.street : data.billTo.street;
            const bCity = isGTechBillTo ? GTECH_GMBH.city : data.billTo.city;
            const bCountry = isGTechBillTo ? GTECH_GMBH.country : data.billTo.country;
            const bPhone = isGTechBillTo ? GTECH_GMBH.phone : data.billTo.phone;
            const bEori = isGTechBillTo ? GTECH_GMBH.eori : data.billTo.eori;
            doc
                .fillColor("black")
                .font("Helvetica-Bold")
                .fontSize(11)
                .text(bName, 40, addrY);
            doc
                .font("Helvetica")
                .fontSize(10)
                .text(bStreet, 40, addrY + 15)
                .text(bCity, 40, addrY + 28)
                .text(bCountry, 40, addrY + 41)
                .text(bPhone, 40, addrY + 55);
            doc.font("Helvetica-Bold").text(`EORI: ${bEori}`, 40, addrY + 69);
        }
        else {
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
                .text("SHIP TO:", 240, addrY - 3);
            doc
                .font("Helvetica-Bold")
                .fontSize(11)
                .text(bName, 40, addrY + 13);
            doc
                .font("Helvetica")
                .fontSize(10)
                .text(bStreet, 40, addrY + 33)
                .text(bCity, 40, addrY + 46)
                .text(bCountry, 40, addrY + 59)
                .text(bPhone, 40, addrY + 73);
            doc.font("Helvetica-Bold").text(`EORI: ${bEori}`, 40, addrY + 87);
            doc
                .font("Helvetica-Bold")
                .fontSize(11)
                .text(data.shipTo.company, 240, addrY + 13);
            doc
                .font("Helvetica")
                .fontSize(10)
                .text(data.shipTo.contact, 240, addrY + 27)
                .text(data.shipTo.street, 240, addrY + 41)
                .text(data.shipTo.city, 240, addrY + 57)
                .text(data.shipTo.country, 240, addrY + 70)
                .text(data.shipTo.phone, 240, addrY + 83);
        }
        let rightY = 130;
        doc
            .font("Helvetica")
            .fontSize(12)
            .text("Customer ID: ", 420, rightY, { continued: true })
            .font("Helvetica-Bold")
            .text(data.customerID || "");
        rightY = 157;
        doc
            .font("Helvetica")
            .fontSize(12)
            .text("Date: ", 420, rightY, { continued: true })
            .font("Helvetica-Bold")
            .text(data.date);
        rightY = 184;
        doc
            .font("Helvetica")
            .text("Invoice No: ", 420, rightY, { continued: true })
            .font("Helvetica-Bold")
            .text(data.invoiceNo);
        rightY = 211;
        doc
            .font("Helvetica")
            .text("Cargo No.: ", 420, rightY, { continued: true })
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
            .text("* Unit price is calculated and can have errors from rounding", 40, itemY);
        itemY += 25;
        doc.fontSize(10).font("Helvetica").text("Remark:", 40, itemY);
        const remarkX = 100;
        const remarkLines = [];
        if (cargo === null || cargo === void 0 ? void 0 : cargo.cargo_no) {
            remarkLines.push(`${cargo.cargo_no}`);
        }
        const orderForRemark = yield database_1.AppDataSource.getRepository(orders_1.Order).findOne({
            where: { order_no: invoice.orderNumber },
        });
        const orderComment = (orderForRemark === null || orderForRemark === void 0 ? void 0 : orderForRemark.comment) || "";
        if (orderComment)
            remarkLines.push(orderComment);
        if (invoice.remark)
            remarkLines.push(invoice.remark);
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
            .text("We hereby confirm that no raw material from Russia were used", 100, itemY, { lineBreak: false });
        itemY += 14;
        doc.text("in the production of the goods mentioned in this invoice.", 100, itemY, { lineBreak: false });
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
        const footerLogo = path_1.default.join(process.cwd(), "assets", "logo.png");
        try {
            if ((0, fs_1.existsSync)(footerLogo)) {
                doc.image(footerLogo, 420, footerY + 8, { width: 100 });
            }
        }
        catch (e) { }
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
    }
    catch (error) {
        next(error);
    }
});
exports.generateCommercialInvoicePDF = generateCommercialInvoicePDF;
