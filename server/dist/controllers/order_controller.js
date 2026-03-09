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
exports.splitOrderItem = exports.updateOrderItemStatus = exports.generateLabelPDF = exports.deleteOrder = exports.getOrderById = exports.getAllOrders = exports.updateOrder = exports.createOrder = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const path_1 = __importDefault(require("path"));
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const items_1 = require("../models/items");
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
        const itemIds = items.map((it) => Number(it.item_id));
        const dbItems = yield itemRepo
            .createQueryBuilder("i")
            .where("i.id IN (:...itemIds)", { itemIds })
            .getMany();
        const itemMap = new Map(dbItems.map((i) => [i.id, i]));
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
            return orderItemsRepo.create({
                order_id: order.id,
                item_id,
                qty,
                remark_de: it.remark_de,
                rmb_special_price: dbItem === null || dbItem === void 0 ? void 0 : dbItem.RMB_Price,
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
            const itemIds = items.map((it) => Number(it.item_id));
            const dbItems = yield itemRepo
                .createQueryBuilder("i")
                .where("i.id IN (:...itemIds)", { itemIds })
                .getMany();
            const itemMap = new Map(dbItems.map((i) => [i.id, i]));
            const newLines = items.map((it) => {
                var _a;
                const item_id = Number(it.item_id);
                const qty = Number(it.qty);
                if (!Number.isFinite(item_id) || item_id <= 0)
                    throw new errorHandler_1.default("Invalid item_id in items[]", 400);
                if (!Number.isFinite(qty) || qty <= 0)
                    throw new errorHandler_1.default("Invalid qty in items[]", 400);
                const dbItem = itemMap.get(item_id);
                return orderItemsRepo.create({
                    order_id: order.id,
                    item_id,
                    qty,
                    remark_de: it.remark_de,
                    rmb_special_price: dbItem === null || dbItem === void 0 ? void 0 : dbItem.RMB_Price,
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
        const freshOrder = yield orderRepo.findOne({ where: { id: order.id } });
        const freshItems = yield orderItemsRepo.find({
            where: { order_id: order.id },
        });
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
            .leftJoinAndSelect("o.orderItems", "oi")
            .leftJoinAndSelect("oi.item", "item")
            .orderBy("o.created_at", "DESC")
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
        const mappedOrders = orders.map((order) => (Object.assign(Object.assign({}, order), { items: (order.orderItems || []).map((oi) => {
                const itemDetails = oi.item;
                return Object.assign(Object.assign({}, oi), { ItemID_DE: (oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) || "-", item_id: oi.item_id || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.id), ean: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.ean) || "-", item_name: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.item_name) || ((oi === null || oi === void 0 ? void 0 : oi.ItemID_DE) ? `Unknown (DE: ${oi.ItemID_DE})` : "Unknown Item"), model: (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.model) || "-", price: oi.price || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.price) || 0, currency: oi.currency || (itemDetails === null || itemDetails === void 0 ? void 0 : itemDetails.currency) || "CNY", item: itemDetails });
            }), orderItems: undefined })));
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
    try {
        const { orderId } = req.params;
        if (!orderId)
            return next(new errorHandler_1.default("Order ID is required", 400));
        const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
        const orderItemsRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const order = yield orderRepository.findOne({
            where: { id: Number(orderId) },
        });
        if (!order)
            return next(new errorHandler_1.default("Order not found", 404));
        const lines = yield orderItemsRepository.find({
            where: { order_id: order.id },
        });
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
                    price: oi.price,
                    currency: oi.currency,
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
    var _a, _b, _c, _d;
    try {
        const { itemId } = req.params;
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const item = yield orderItemRepo.findOne({
            where: { id: Number(itemId) },
            relations: ["item"],
        });
        if (!item)
            return next(new errorHandler_1.default("Item not found", 404));
        const order = yield orderRepo.findOne({ where: { id: item.order_id } });
        const doc = new pdfkit_1.default({ size: [252, 102], margin: 0 });
        const logoPath = path_1.default.join(__dirname, "../../public/logo.png");
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
        doc.font("Helvetica-Bold").fontSize(14);
        const itemID = ((_b = (_a = item === null || item === void 0 ? void 0 : item.item) === null || _a === void 0 ? void 0 : _a.ItemID_DE) === null || _b === void 0 ? void 0 : _b.toString()) || "N/A";
        doc.text(itemID, valColA, row1ValueY);
        const orderNo = (order === null || order === void 0 ? void 0 : order.order_no) || "N/A";
        doc.text(orderNo, colB, row1ValueY);
        doc.text(`${item.qty || 0}`, colD, row1ValueY);
        const orderNoWidth = doc.widthOfString(orderNo);
        doc
            .font("Helvetica")
            .fontSize(9)
            .text(`/${item.qty_label}`, colB + orderNoWidth + 2, row1ValueY + 4);
        try {
            doc.image(logoPath, colLogo, 8, { width: 40 });
        }
        catch (e) {
            console.error("Logo missing at path:", logoPath);
        }
        doc.font("Helvetica").fontSize(8).fillColor("#222222");
        const description = ((_c = item.item) === null || _c === void 0 ? void 0 : _c.item_name) || "No description available";
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
        const barcodeValue = ((_d = item.item.ean) === null || _d === void 0 ? void 0 : _d.toString()) || "";
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
        });
        if (!orderItem) {
            return next(new errorHandler_1.default("Order Item not found", 404));
        }
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
const splitOrderItem = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        const { id } = req.params;
        const { splitQty } = req.body;
        if (!splitQty || splitQty <= 0) {
            return next(new errorHandler_1.default("Split quantity must be greater than 0", 400));
        }
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const orderItem = yield orderItemsRepo.findOne({
            where: { id: Number(id) },
        });
        if (!orderItem) {
            throw new errorHandler_1.default("Order item not found", 404);
        }
        if (splitQty >= (orderItem.qty || 0)) {
            throw new errorHandler_1.default("Split quantity must be less than current quantity", 400);
        }
        const newItem = orderItemsRepo.create(Object.assign(Object.assign({}, orderItem), { id: undefined, qty: splitQty, created_at: new Date(), updated_at: new Date() }));
        orderItem.qty = (orderItem.qty || 0) - splitQty;
        orderItem.updated_at = new Date();
        yield orderItemsRepo.save(orderItem);
        yield orderItemsRepo.save(newItem);
        yield queryRunner.commitTransaction();
        return res.status(200).json({
            success: true,
            message: "Order item split successfully",
            data: { original: orderItem, new: newItem },
        });
    }
    catch (error) {
        yield queryRunner.rollbackTransaction();
        return next(error);
    }
    finally {
        yield queryRunner.release();
    }
});
exports.splitOrderItem = splitOrderItem;
