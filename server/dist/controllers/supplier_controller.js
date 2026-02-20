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
exports.getSupplierItems = exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getAllSuppliers = void 0;
const database_1 = require("../config/database");
const suppliers_1 = require("../models/suppliers");
const supplier_items_1 = require("../models/supplier_items");
const typeorm_1 = require("typeorm");
const getAllSuppliers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const supplierRepo = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const search = req.query.search || "";
        const skip = (page - 1) * limit;
        let whereClause = {};
        if (search) {
            whereClause = [
                { name: (0, typeorm_1.Like)(`%${search}%`) },
                { name_cn: (0, typeorm_1.Like)(`%${search}%`) },
                { company_name: (0, typeorm_1.Like)(`%${search}%`) },
                { email: (0, typeorm_1.Like)(`%${search}%`) },
                { contact_person: (0, typeorm_1.Like)(`%${search}%`) },
                { city: (0, typeorm_1.Like)(`%${search}%`) },
                { province: (0, typeorm_1.Like)(`%${search}%`) },
            ];
        }
        const [suppliers, totalRecords] = yield supplierRepo.findAndCount({
            where: whereClause,
            order: { id: "DESC" },
            skip,
            take: limit,
        });
        const totalPages = Math.ceil(totalRecords / limit);
        res.status(200).json({
            success: true,
            data: suppliers,
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages,
            },
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getAllSuppliers = getAllSuppliers;
const getSupplierById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplierRepo = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const supplier = yield supplierRepo.findOne({
            where: { id: Number(id) },
        });
        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: supplier,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getSupplierById = getSupplierById;
const createSupplier = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const supplierRepo = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const _a = req.body, { id, created_at, updated_at, supplierItems, parents, supplier: _supplier } = _a, supplierData = __rest(_a, ["id", "created_at", "updated_at", "supplierItems", "parents", "supplier"]);
        const newSupplier = supplierRepo.create(supplierData);
        const savedSupplier = yield supplierRepo.save(newSupplier);
        res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            data: savedSupplier,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.createSupplier = createSupplier;
const updateSupplier = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplierRepo = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const supplier = yield supplierRepo.findOne({
            where: { id: Number(id) },
        });
        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }
        const _a = req.body, { id: _id, created_at, updated_at, supplierItems, parents, supplier: _supplier } = _a, updateData = __rest(_a, ["id", "created_at", "updated_at", "supplierItems", "parents", "supplier"]);
        supplierRepo.merge(supplier, updateData);
        const updatedSupplier = yield supplierRepo.save(supplier);
        res.status(200).json({
            success: true,
            message: "Supplier updated successfully",
            data: updatedSupplier,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.updateSupplier = updateSupplier;
const deleteSupplier = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplierRepo = database_1.AppDataSource.getRepository(suppliers_1.Supplier);
        const supplier = yield supplierRepo.findOne({
            where: { id: Number(id) },
        });
        if (!supplier) {
            res.status(404).json({
                success: false,
                message: "Supplier not found",
            });
            return;
        }
        yield supplierRepo.remove(supplier);
        res.status(200).json({
            success: true,
            message: "Supplier deleted successfully",
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.deleteSupplier = deleteSupplier;
const getSupplierItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const supplierItemRepo = database_1.AppDataSource.getRepository(supplier_items_1.SupplierItem);
        const supplierItems = yield supplierItemRepo.find({
            where: { supplier_id: Number(id) },
            relations: ["item"]
        });
        const items = supplierItems
            .filter((si) => si.item)
            .map((si) => si.item);
        res.status(200).json({
            success: true,
            data: items,
        });
        return;
    }
    catch (error) {
        return next(error);
    }
});
exports.getSupplierItems = getSupplierItems;
