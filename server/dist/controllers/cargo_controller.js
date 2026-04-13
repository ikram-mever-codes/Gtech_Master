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
exports.getCargoOrders = exports.removeOrderFromCargo = exports.assignOrdersToCargo = exports.deleteCargo = exports.updateCargo = exports.createCargo = exports.getCargoById = exports.getAllCargos = exports.generateInvoicesForOrders = void 0;
const database_1 = require("../config/database");
const cargos_1 = require("../models/cargos");
const cargo_orders_1 = require("../models/cargo_orders");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
const invoice_1 = require("../models/invoice");
const customers_1 = require("../models/customers");
const tarics_1 = require("../models/tarics");
const typeorm_1 = require("typeorm");
const generateInvoicesForOrders = (orderIds_1, ...args_1) => __awaiter(void 0, [orderIds_1, ...args_1], void 0, function* (orderIds, cargoIds = []) {
    var _a;
    try {
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const invoiceRepo = database_1.AppDataSource.getRepository(invoice_1.Invoice);
        const invoiceItemRepo = database_1.AppDataSource.getRepository(invoice_1.InvoiceItem);
        const customerRepo = database_1.AppDataSource.getRepository(customers_1.Customer);
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const cargoNumbers = new Set();
        const orderNumbers = new Set();
        if (cargoIds.length > 0) {
            const cargos = yield cargoRepo.find({ where: { id: (0, typeorm_1.In)(cargoIds) } });
            cargos.forEach(c => c.cargo_no && cargoNumbers.add(c.cargo_no));
        }
        if (orderIds.length > 0) {
            const orders = yield orderRepo.find({
                where: { id: (0, typeorm_1.In)(orderIds) },
                relations: ["orderItems", "orderItems.cargo"]
            });
            for (const order of orders) {
                orderNumbers.add(order.order_no);
                if (order.orderItems) {
                    for (const oi of order.orderItems) {
                        if (oi.cargo_id && ((_a = oi.cargo) === null || _a === void 0 ? void 0 : _a.cargo_no)) {
                            cargoNumbers.add(oi.cargo.cargo_no);
                        }
                    }
                }
            }
        }
        for (const cargoNo of Array.from(cargoNumbers)) {
            const cargo = yield cargoRepo.findOne({ where: { cargo_no: cargoNo }, relations: ["customer"] });
            if (!cargo)
                continue;
            const items = yield orderItemRepo.find({
                where: { cargo_id: cargo.id },
                relations: ["item", "item.taric", "order"]
            });
            yield syncInvoiceRecord(cargoNo, items, cargo.customer || null, invoiceRepo, invoiceItemRepo, customerRepo);
        }
        for (const orderNo of Array.from(orderNumbers)) {
            const items = yield orderItemRepo.find({
                where: {
                    order: { order_no: orderNo },
                    cargo_id: (0, typeorm_1.IsNull)()
                },
                relations: ["item", "item.taric", "order"]
            });
            const order = yield orderRepo.findOne({ where: { order_no: orderNo }, relations: ["customer"] });
            if (!order)
                continue;
            yield syncInvoiceRecord(orderNo, items, order.customer || null, invoiceRepo, invoiceItemRepo, customerRepo);
        }
    }
    catch (e) {
        console.error("Failed to sync invoices", e);
    }
});
exports.generateInvoicesForOrders = generateInvoicesForOrders;
const syncInvoiceRecord = (orderNumber, items, customer, invoiceRepo, invoiceItemRepo, customerRepo) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    let invoice = yield invoiceRepo.findOne({ where: { orderNumber }, relations: ["items"] });
    if (!invoice && items.length === 0)
        return;
    if (invoice) {
        yield invoiceItemRepo.delete({ invoice: { id: invoice.id } });
    }
    else {
        invoice = invoiceRepo.create({
            invoiceNumber: `INV-${orderNumber.startsWith("MA") ? orderNumber : "C-" + orderNumber}-${Date.now().toString().slice(-4)}`,
            orderNumber: orderNumber,
            invoiceDate: new Date(),
            deliveryDate: new Date(),
            status: "draft",
            customer,
            netTotal: 0,
            taxAmount: 0,
            grossTotal: 0,
            paidAmount: 0,
            outstandingAmount: 0,
            paymentMethod: "Bank Transfer",
            shippingMethod: "Cargo",
        });
        yield invoiceRepo.save(invoice);
    }
    let netTotal = 0;
    let taxAmount = 0;
    let grossTotal = 0;
    const invoiceItems = [];
    const manualTaricCodes = [];
    items.forEach(oi => {
        if (oi.set_taric_code) {
            const parts = oi.set_taric_code.split("/");
            manualTaricCodes.push(parts[parts.length - 1].trim());
        }
    });
    const uniqueCodes = [...new Set(manualTaricCodes)];
    const manualTaricsList = uniqueCodes.length > 0
        ? yield database_1.AppDataSource.getRepository(tarics_1.Taric).find({ where: { code: (0, typeorm_1.In)(uniqueCodes) } })
        : [];
    const manualTaricMap = new Map(manualTaricsList.map(t => [t.code, t]));
    for (const oi of items) {
        const quantity = oi.qty || 1;
        const unitPrice = oi.eur_special_price || oi.price || oi.rmb_special_price || 0;
        const netPrice = quantity * unitPrice;
        let itemTaxRate = ((_b = (_a = oi.item) === null || _a === void 0 ? void 0 : _a.taric) === null || _b === void 0 ? void 0 : _b.duty_rate) !== undefined ? Number((_d = (_c = oi.item) === null || _c === void 0 ? void 0 : _c.taric) === null || _d === void 0 ? void 0 : _d.duty_rate) : 19;
        let itemDescription = ((_e = oi.item) === null || _e === void 0 ? void 0 : _e.item_name) || "Unknown Item";
        if (oi.set_taric_code) {
            const parts = oi.set_taric_code.split("/");
            const targetCode = parts[parts.length - 1].trim();
            const mTaric = manualTaricMap.get(targetCode);
            if (mTaric) {
                itemTaxRate = mTaric.duty_rate !== undefined ? Number(mTaric.duty_rate) : itemTaxRate;
                itemDescription = mTaric.name_en || itemDescription;
            }
        }
        const itemTax = (netPrice * itemTaxRate) / 100;
        const total = netPrice + itemTax;
        netTotal += netPrice;
        taxAmount += itemTax;
        grossTotal += total;
        invoiceItems.push(invoiceItemRepo.create({
            quantity,
            articleNumber: ((_g = (_f = oi.item) === null || _f === void 0 ? void 0 : _f.ean) === null || _g === void 0 ? void 0 : _g.toString()) || ((_h = oi.item) === null || _h === void 0 ? void 0 : _h.model) || "Unknown",
            description: itemDescription,
            unitPrice,
            netPrice,
            taxRate: itemTaxRate,
            taxAmount: itemTax,
            grossPrice: total,
            invoice,
        }));
    }
    if (invoiceItems.length > 0) {
        yield invoiceItemRepo.save(invoiceItems);
    }
    else if (invoice === null || invoice === void 0 ? void 0 : invoice.id) {
        yield invoiceRepo.delete(invoice.id);
        return;
    }
    invoice.netTotal = netTotal;
    invoice.taxAmount = taxAmount;
    invoice.grossTotal = grossTotal;
    invoice.outstandingAmount = Math.max(0, grossTotal - (invoice.paidAmount || 0));
    invoice.updatedAt = new Date();
    if (customer)
        invoice.customer = customer;
    yield invoiceRepo.save(invoice);
});
const getAllCargos = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const { page = 1, limit = 50, search = "", unassignedOnly = "false", status = "", availableOnly = "false" } = req.query;
        const pageNum = Math.max(1, Number(page));
        const limitNum = Math.max(1, Math.min(1000, Number(limit)));
        const skip = (pageNum - 1) * limitNum;
        const qb = cargoRepo.createQueryBuilder("cargo");
        if (status) {
            const statuses = status.split(",").map((s) => s.trim());
            qb.andWhere("cargo.cargo_status IN (:...statuses)", { statuses });
        }
        if (availableOnly === "true") {
            qb.andWhere("cargo.cargo_status != 'Shipped'");
            qb.leftJoin(invoice_1.Invoice, "invoice", "invoice.orderNumber = cargo.cargo_no");
            qb.andWhere("(invoice.id IS NULL OR invoice.status NOT IN ('sent', 'paid', 'overdue', 'cancelled'))");
        }
        if (search) {
            qb.andWhere("(cargo.cargo_no LIKE :search OR cargo.note LIKE :search OR cargo.remark LIKE :search OR cargo.cargo_status LIKE :search)", { search: `%${search}%` });
        }
        if (unassignedOnly === "true") {
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select("o.cargo_id")
                    .from(orders_1.Order, "o")
                    .where("o.cargo_id IS NOT NULL")
                    .getQuery();
                return "cargo.id NOT IN " + subQuery;
            });
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select("co.cargo_id")
                    .from(cargo_orders_1.CargoOrder, "co")
                    .where("co.cargo_id IS NOT NULL")
                    .getQuery();
                return "cargo.id NOT IN " + subQuery;
            });
        }
        const [cargos, total] = yield qb
            .orderBy("cargo.id", "DESC")
            .groupBy("cargo.id")
            .skip(skip)
            .take(limitNum)
            .getManyAndCount();
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
            yield (0, exports.generateInvoicesForOrders)(orders);
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
                yield (0, exports.generateInvoicesForOrders)(orders);
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
        const { isSplitMove } = req.body;
        const existing = yield cargoOrderRepo.find({ where: { cargo_id: cargo.id } });
        const existingIds = new Set(existing.map((e) => e.order_id));
        const newEntries = validOrderIds
            .filter((oid) => !existingIds.has(oid))
            .map((oid) => cargoOrderRepo.create({
            cargo_id: cargo.id,
            order_id: oid,
        }));
        if (newEntries.length > 0) {
            yield cargoOrderRepo.save(newEntries);
        }
        const orderItemRepo = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        if (validOrderIds.length > 0 && !isSplitMove) {
            const orders = yield orderRepo.find({ where: { id: (0, typeorm_1.In)(validOrderIds) } });
            for (const order of orders) {
                const oldCargoId = order.cargo_id;
                const qb = orderItemRepo
                    .createQueryBuilder()
                    .update(order_items_1.OrderItem)
                    .set({ cargo_id: cargo.id })
                    .where("order_id = :orderId", { orderId: order.id });
                if (oldCargoId) {
                    qb.andWhere("cargo_id = :oldCargoId", { oldCargoId });
                }
                else {
                    qb.andWhere("cargo_id IS NULL");
                }
                yield qb.execute();
                order.cargo_id = cargo.id;
                yield orderRepo.save(order);
            }
        }
        yield (0, exports.generateInvoicesForOrders)(validOrderIds);
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
