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
exports.deleteSupplierOrder = exports.updateSupplierOrder = exports.getSupplierOrderById = exports.getAllSupplierOrders = exports.createSupplierOrder = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const supplier_orders_1 = require("../models/supplier_orders");
const order_items_1 = require("../models/order_items");
const typeorm_1 = require("typeorm");
const createSupplierOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const { supplier_id, order_type_id, item_ids, remark, ref_no } = req.body;
        if (!Array.isArray(item_ids) || item_ids.length === 0) {
            throw new errorHandler_1.default("item_ids[] is required", 400);
        }
        const supplierOrderRepo = queryRunner.manager.getRepository(supplier_orders_1.SupplierOrder);
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const supplierOrder = supplierOrderRepo.create({
            supplier_id: supplier_id || null,
            order_type_id: order_type_id || null,
            remark: remark || null,
            ref_no: ref_no || null,
            paid: "N",
            send2cargo: "N",
            is_po_created: 0,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield supplierOrderRepo.save(supplierOrder);
        yield orderItemsRepo.update({ id: (0, typeorm_1.In)(item_ids.map(Number)) }, { supplier_order_id: supplierOrder.id });
        yield queryRunner.commitTransaction();
        return res.status(201).json({
            success: true,
            message: "Supplier order created successfully",
            data: supplierOrder,
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
exports.createSupplierOrder = createSupplierOrder;
const getAllSupplierOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder);
        const { search = "" } = req.query;
        const qb = repo
            .createQueryBuilder("so")
            .leftJoinAndSelect("so.supplier", "s")
            .leftJoinAndSelect("so.order_type", "cat")
            .leftJoinAndSelect("so.items", "items")
            .orderBy("so.id", "DESC");
        if (search) {
            qb.andWhere("(so.ref_no LIKE :q OR so.remark LIKE :q OR s.company_name LIKE :q)", { q: `%${search}%` });
        }
        const data = yield qb.getMany();
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllSupplierOrders = getAllSupplierOrders;
const getSupplierOrderById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const repo = database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder);
        const data = yield repo.findOne({
            where: { id: Number(id) },
            relations: ["supplier", "order_type", "items", "items.item"],
        });
        if (!data)
            throw new errorHandler_1.default("Supplier order not found", 404);
        return res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.getSupplierOrderById = getSupplierOrderById;
const updateSupplierOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const repo = database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder);
        let so = yield repo.findOneBy({ id: Number(id) });
        if (!so)
            throw new errorHandler_1.default("Supplier order not found", 404);
        const { supplier_id, order_type_id, ref_no, paid, remark, send2cargo, is_po_created } = req.body;
        if (supplier_id !== undefined)
            so.supplier_id = supplier_id;
        if (order_type_id !== undefined)
            so.order_type_id = order_type_id;
        if (ref_no !== undefined)
            so.ref_no = ref_no;
        if (paid !== undefined)
            so.paid = paid;
        if (remark !== undefined)
            so.remark = remark;
        if (send2cargo !== undefined)
            so.send2cargo = send2cargo;
        if (is_po_created !== undefined)
            so.is_po_created = is_po_created;
        yield repo.save(so);
        return res.status(200).json({
            success: true,
            data: so,
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.updateSupplierOrder = updateSupplierOrder;
const deleteSupplierOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const { id } = req.params;
        const repo = queryRunner.manager.getRepository(supplier_orders_1.SupplierOrder);
        const itemRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        const so = yield repo.findOneBy({ id: Number(id) });
        if (!so)
            throw new errorHandler_1.default("Supplier order not found", 404);
        yield itemRepo.update({ supplier_order_id: so.id }, { supplier_order_id: undefined });
        yield repo.delete(id);
        yield queryRunner.commitTransaction();
        return res.status(200).json({
            success: true,
            message: "Supplier order deleted",
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
exports.deleteSupplierOrder = deleteSupplierOrder;
