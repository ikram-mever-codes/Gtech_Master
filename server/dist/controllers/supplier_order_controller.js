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
exports.generatePurchaseOrderPDF = exports.deleteSupplierOrder = exports.updateSupplierOrder = exports.getSupplierOrderById = exports.getAllSupplierOrders = exports.createSupplierOrder = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const supplier_orders_1 = require("../models/supplier_orders");
const order_items_1 = require("../models/order_items");
const suppliers_1 = require("../models/suppliers");
const typeorm_1 = require("typeorm");
const pdfService_1 = require("../services/pdfService");
const createSupplierOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const queryRunner = database_1.AppDataSource.createQueryRunner();
    try {
        yield queryRunner.connect();
        yield queryRunner.startTransaction();
        const { item_ids, remark, ref_no } = req.body;
        let { supplier_id, order_type_id } = req.body;
        if (!Array.isArray(item_ids) || item_ids.length === 0) {
            throw new errorHandler_1.default("item_ids[] is required", 400);
        }
        supplier_id = (Number(supplier_id) > 0) ? Number(supplier_id) : null;
        order_type_id = (Number(order_type_id) > 0) ? Number(order_type_id) : null;
        const supplierOrderRepo = queryRunner.manager.getRepository(supplier_orders_1.SupplierOrder);
        const orderItemsRepo = queryRunner.manager.getRepository(order_items_1.OrderItem);
        if (supplier_id) {
            const supplierRepo = queryRunner.manager.getRepository(suppliers_1.Supplier);
            const supplierExists = yield supplierRepo.findOneBy({ id: supplier_id });
            if (!supplierExists) {
                supplier_id = null;
            }
        }
        if (order_type_id) {
            const { Category } = yield Promise.resolve().then(() => __importStar(require("../models/categories")));
            const categoryRepo = queryRunner.manager.getRepository(Category);
            const categoryExists = yield categoryRepo.findOneBy({ id: order_type_id });
            if (!categoryExists) {
                order_type_id = null;
            }
        }
        const supplierOrder = supplierOrderRepo.create({
            supplier_id,
            order_type_id,
            remark: remark || null,
            ref_no: ref_no || null,
            paid: "N",
            send2cargo: "N",
            is_po_created: 0,
            created_at: new Date(),
            updated_at: new Date(),
        });
        yield supplierOrderRepo.save(supplierOrder);
        yield orderItemsRepo.update({ id: (0, typeorm_1.In)(item_ids.map(Number)) }, { supplier_order_id: supplierOrder.id, status: "SO" });
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
        const { supplier_id, order_type_id, ref_no, paid, remark, send2cargo, is_po_created, po_description, comment_items, comment_attachments, comment_quality, comment_delivery_left, comment_delivery_right } = req.body;
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
        if (po_description !== undefined)
            so.po_description = po_description;
        if (comment_items !== undefined)
            so.comment_items = comment_items;
        if (comment_attachments !== undefined)
            so.comment_attachments = comment_attachments;
        if (comment_quality !== undefined)
            so.comment_quality = comment_quality;
        if (comment_delivery_left !== undefined)
            so.comment_delivery_left = comment_delivery_left;
        if (comment_delivery_right !== undefined)
            so.comment_delivery_right = comment_delivery_right;
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
const generatePurchaseOrderPDF = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const repo = database_1.AppDataSource.getRepository(supplier_orders_1.SupplierOrder);
        const so = yield repo.findOne({
            where: { id: Number(id) },
            relations: [
                "supplier",
                "order_type",
                "items",
                "items.item",
                "items.item.attachments",
                "items.item.qualityCriteria"
            ],
        });
        if (!so)
            throw new errorHandler_1.default("Purchase Order not found", 404);
        const buffer = yield (0, pdfService_1.generatePurchaseOrderPDFBuffer)(so);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=PurchaseOrder_${so.id}.pdf`);
        return res.send(buffer);
    }
    catch (error) {
        console.error("[PDF_CONTROLLER_ERROR]", error);
        if (!res.headersSent) {
            return next(error);
        }
        else {
            return res.end();
        }
    }
});
exports.generatePurchaseOrderPDF = generatePurchaseOrderPDF;
