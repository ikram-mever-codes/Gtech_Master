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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCargoOrders = exports.removeOrderFromCargo = exports.assignOrdersToCargo = exports.deleteCargo = exports.updateCargo = exports.createCargo = exports.getCargoById = exports.getAllCargos = void 0;
const database_1 = require("../config/database");
const cargos_1 = require("../models/cargos");
const cargo_orders_1 = require("../models/cargo_orders");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const invoice_1 = require("../models/invoice");
const customers_1 = require("../models/customers");
const typeorm_1 = require("typeorm");
const generateInvoicesForOrders = (orderIds) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!orderIds || orderIds.length === 0)
        return;
    try {
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const invoiceRepo = database_1.AppDataSource.getRepository(invoice_1.Invoice);
        const invoiceItemRepo = database_1.AppDataSource.getRepository(invoice_1.InvoiceItem);
        const customerRepo = database_1.AppDataSource.getRepository(customers_1.Customer);
        for (const orderId of orderIds) {
            const order = yield orderRepo.findOne({ where: { id: orderId } });
            if (!order) {
                console.warn(`[Invoice] Order ${orderId} not found, skipping.`);
                continue;
            }
            const existingInvoice = yield invoiceRepo.findOne({ where: { orderNumber: order.order_no } });
            if (existingInvoice) {
                yield invoiceItemRepo.delete({ invoice: { id: existingInvoice.id } });
                yield invoiceRepo.remove(existingInvoice);
            }
            let customer = null;
            if (order.customer_id) {
                customer = yield customerRepo.findOne({ where: { id: order.customer_id } });
                if (!customer) {
                    console.warn(`[Invoice] customer_id=${order.customer_id} not found in DB for order ${order.order_no}, proceeding without customer.`);
                }
            }
            else {
                console.info(`[Invoice] Order ${order.order_no} has no customer_id (ETL order), creating invoice without customer.`);
            }
            const orderItems = yield orderItemRepo.find({
                where: { order_id: order.id },
                relations: ["item", "item.taric"]
            });
            if (orderItems.length === 0) {
                console.warn(`[Invoice] Order ${order.order_no} has no items, skipping.`);
                continue;
            }
            let netTotal = 0;
            let taxAmount = 0;
            let grossTotal = 0;
            const invoice = invoiceRepo.create(Object.assign(Object.assign({ invoiceNumber: `INV-${Date.now().toString().slice(-6)}-${order.id}`, orderNumber: order.order_no, invoiceDate: new Date(), deliveryDate: order.date_delivery ? new Date(order.date_delivery) : new Date(), netTotal: 0, taxAmount: 0, grossTotal: 0, paidAmount: 0, outstandingAmount: 0, paymentMethod: "Bank Transfer", shippingMethod: "Standard" }, (customer ? { customer } : {})), { status: "draft" }));
            const savedInvoice = yield invoiceRepo.save(invoice);
            const invoiceItemEntities = [];
            for (const oi of orderItems) {
                const quantity = oi.qty || 1;
                const unitPrice = oi.price || oi.rmb_special_price || 0;
                const netPrice = quantity * unitPrice;
                const itemTaxRate = ((_b = (_a = oi.item) === null || _a === void 0 ? void 0 : _a.taric) === null || _b === void 0 ? void 0 : _b.duty_rate) ? Number(oi.item.taric.duty_rate) : 19;
                const itemTax = (netPrice * itemTaxRate) / 100;
                const grossPrice = netPrice + itemTax;
                netTotal += netPrice;
                taxAmount += itemTax;
                grossTotal += grossPrice;
                const invItem = invoiceItemRepo.create({
                    quantity,
                    articleNumber: ((_d = (_c = oi.item) === null || _c === void 0 ? void 0 : _c.ean) === null || _d === void 0 ? void 0 : _d.toString()) || ((_e = oi.item) === null || _e === void 0 ? void 0 : _e.model) || ((_g = (_f = oi.item) === null || _f === void 0 ? void 0 : _f.ItemID_DE) === null || _g === void 0 ? void 0 : _g.toString()) || "Unknown",
                    description: ((_h = oi.item) === null || _h === void 0 ? void 0 : _h.item_name) || "Unknown Item",
                    unitPrice,
                    netPrice,
                    taxRate: itemTaxRate,
                    taxAmount: itemTax,
                    grossPrice,
                    invoice: savedInvoice,
                });
                invoiceItemEntities.push(invItem);
            }
            yield invoiceItemRepo.save(invoiceItemEntities);
            savedInvoice.netTotal = netTotal;
            savedInvoice.taxAmount = taxAmount;
            savedInvoice.grossTotal = grossTotal;
            savedInvoice.outstandingAmount = grossTotal;
            yield invoiceRepo.save(savedInvoice);
            console.log(`[Invoice] Created invoice ${savedInvoice.invoiceNumber} for order ${order.order_no}${customer ? '' : ' (no customer)'}`);
        }
    }
    catch (e) {
        console.error("Failed to generate invoices for orders", e);
    }
});
const getAllCargos = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const { page = 1, limit = 50, search = "" } = req.query;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(100, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const whereConditions = [];
        if (search) {
            whereConditions.push({ cargo_no: (0, typeorm_1.Like)(`%${search}%`) }, { note: (0, typeorm_1.Like)(`%${search}%`) }, { remark: (0, typeorm_1.Like)(`%${search}%`) }, { cargo_status: (0, typeorm_1.Like)(`%${search}%`) });
        }
        const [cargos, total] = yield cargoRepo.findAndCount({
            where: whereConditions.length > 0 ? whereConditions : undefined,
            order: { id: "DESC" },
            skip,
            take: limitNum,
        });
        res.status(200).json({
            success: true,
            data: cargos,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalRecords: total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllCargos = getAllCargos;
const getCargoById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const cargo = yield cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }
        const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
        const cargoOrders = yield cargoOrderRepo.find({
            where: { cargo_id: cargo.id },
            relations: ["order"],
        });
        const orderIds = cargoOrders.map((co) => co.order_id);
        let orderItems = [];
        if (orderIds.length > 0) {
            const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
            orderItems = yield orderItemRepo
                .createQueryBuilder("oi")
                .leftJoinAndSelect("oi.item", "item")
                .where("oi.order_id IN (:...orderIds)", { orderIds })
                .getMany();
        }
        res.status(200).json({
            success: true,
            data: Object.assign(Object.assign({}, cargo), { orders: cargoOrders.map((co) => co.order), orderItems }),
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getCargoById = getCargoById;
const createCargo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const _a = req.body, { id, created_at, updated_at, orders, orderItems } = _a, cargoData = __rest(_a, ["id", "created_at", "updated_at", "orders", "orderItems"]);
        const cargo = cargoRepo.create(cargoData);
        const savedCargo = yield cargoRepo.save(cargo);
        if (Array.isArray(orders) && orders.length > 0) {
            const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
            const cargoOrderEntries = orders.map((orderId) => cargoOrderRepo.create({
                cargo_id: savedCargo.id,
                order_id: orderId,
            }));
            yield cargoOrderRepo.save(cargoOrderEntries);
            yield generateInvoicesForOrders(orders);
        }
        res.status(201).json({
            success: true,
            message: "Cargo created successfully",
            data: savedCargo,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.createCargo = createCargo;
const updateCargo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const cargo = yield cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }
        const _a = req.body, { id: _id, created_at, updated_at, orders, orderItems } = _a, updateData = __rest(_a, ["id", "created_at", "updated_at", "orders", "orderItems"]);
        cargoRepo.merge(cargo, updateData);
        const updatedCargo = yield cargoRepo.save(cargo);
        if (Array.isArray(orders)) {
            const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
            yield cargoOrderRepo
                .createQueryBuilder()
                .delete()
                .from(cargo_orders_1.CargoOrder)
                .where("cargo_id = :cargoId", { cargoId: cargo.id })
                .execute();
            if (orders.length > 0) {
                const cargoOrderEntries = orders.map((orderId) => cargoOrderRepo.create({
                    cargo_id: cargo.id,
                    order_id: orderId,
                }));
                yield cargoOrderRepo.save(cargoOrderEntries);
                yield generateInvoicesForOrders(orders);
            }
        }
        res.status(200).json({
            success: true,
            message: "Cargo updated successfully",
            data: updatedCargo,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.updateCargo = updateCargo;
const deleteCargo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
        const cargo = yield cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }
        yield cargoOrderRepo
            .createQueryBuilder()
            .delete()
            .from(cargo_orders_1.CargoOrder)
            .where("cargo_id = :cargoId", { cargoId: cargo.id })
            .execute();
        yield cargoRepo.delete(cargo.id);
        res.status(200).json({
            success: true,
            message: "Cargo deleted successfully",
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteCargo = deleteCargo;
const assignOrdersToCargo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { orderIds } = req.body;
        const validOrderIds = orderIds.filter(id => Boolean(id) && !isNaN(Number(id))).map(id => Number(id));
        if (validOrderIds.length === 0) {
            res.status(400).json({ success: false, message: "No valid orderIds provided" });
            return;
        }
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const cargo = yield cargoRepo.findOne({ where: { id: Number(id) } });
        if (!cargo) {
            res.status(404).json({ success: false, message: "Cargo not found" });
            return;
        }
        const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
        const existing = yield cargoOrderRepo.find({ where: { cargo_id: cargo.id } });
        const existingIds = new Set(existing.map((e) => e.order_id));
        const newEntries = orderIds
            .filter((oid) => !existingIds.has(oid))
            .map((oid) => cargoOrderRepo.create({
            cargo_id: cargo.id,
            order_id: oid,
        }));
        if (newEntries.length > 0) {
            yield cargoOrderRepo.save(newEntries);
        }
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        if (validOrderIds.length > 0) {
            yield orderItemRepo
                .createQueryBuilder()
                .update(order_items_1.OrderItem)
                .set({ cargo_id: cargo.id })
                .where("order_id IN (:...validOrderIds)", { validOrderIds })
                .execute();
        }
        yield generateInvoicesForOrders(validOrderIds);
        res.status(200).json({
            success: true,
            message: `Assigned ${newEntries.length} order(s) to cargo`,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.assignOrdersToCargo = assignOrdersToCargo;
const removeOrderFromCargo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, orderId } = req.params;
        const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
        yield cargoOrderRepo
            .createQueryBuilder()
            .delete()
            .from(cargo_orders_1.CargoOrder)
            .where("cargo_id = :cargoId AND order_id = :orderId", {
            cargoId: Number(id),
            orderId: Number(orderId),
        })
            .execute();
        res.status(200).json({
            success: true,
            message: "Order removed from cargo",
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.removeOrderFromCargo = removeOrderFromCargo;
const getCargoOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const cargoOrderRepo = database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder);
        const cargoOrders = yield cargoOrderRepo.find({
            where: { cargo_id: Number(id) },
            relations: ["order"],
        });
        const orderIds = cargoOrders.map((co) => co.order_id);
        let orderItems = [];
        if (orderIds.length > 0) {
            const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
            orderItems = yield orderItemRepo
                .createQueryBuilder("oi")
                .leftJoinAndSelect("oi.item", "item")
                .where("oi.order_id IN (:...orderIds)", { orderIds })
                .getMany();
        }
        res.status(200).json({
            success: true,
            data: {
                orders: cargoOrders.map((co) => co.order),
                orderItems,
            },
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getCargoOrders = getCargoOrders;
