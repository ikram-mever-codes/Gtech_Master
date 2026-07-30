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
exports.deleteShippingMethod = exports.updateShippingMethod = exports.createShippingMethod = exports.getShippingMethodById = exports.getAllShippingMethods = void 0;
const database_1 = require("../config/database");
const shipping_methods_1 = require("../models/shipping_methods");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const getAllShippingMethods = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingMethodRepository = database_1.AppDataSource.getRepository(shipping_methods_1.ShippingMethod);
        const includeInactive = req.query.all === "true";
        const shippingMethods = yield shippingMethodRepository.find({
            where: includeInactive ? {} : { is_active: true },
            order: {
                name: "ASC",
            },
        });
        return res.status(200).json({
            success: true,
            data: shippingMethods,
        });
    }
    catch (error) {
        console.error("Error fetching shipping methods:", error);
        return next(new errorHandler_1.default("Failed to retrieve shipping methods", 500));
    }
});
exports.getAllShippingMethods = getAllShippingMethods;
const getShippingMethodById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingMethodRepository = database_1.AppDataSource.getRepository(shipping_methods_1.ShippingMethod);
        const { id } = req.params;
        const shippingMethod = yield shippingMethodRepository.findOne({
            where: { id },
        });
        if (!shippingMethod) {
            return res.status(404).json({
                success: false,
                message: "Shipping Method not found.",
            });
        }
        return res.status(200).json({
            success: true,
            data: shippingMethod,
        });
    }
    catch (error) {
        console.error("Error fetching shipping method by ID:", error);
        return next(new errorHandler_1.default("Failed to retrieve shipping method details", 500));
    }
});
exports.getShippingMethodById = getShippingMethodById;
const createShippingMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingMethodRepository = database_1.AppDataSource.getRepository(shipping_methods_1.ShippingMethod);
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Shipping Method name is required.",
            });
        }
        const existing = yield shippingMethodRepository.findOne({
            where: { name: name.trim() },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Shipping Method with this name already exists.",
            });
        }
        const shippingMethod = shippingMethodRepository.create({
            name: name.trim(),
            is_active: true,
        });
        const saved = yield shippingMethodRepository.save(shippingMethod);
        return res.status(201).json({
            success: true,
            data: saved,
        });
    }
    catch (error) {
        console.error("Error creating shipping method:", error);
        return next(new errorHandler_1.default("Failed to create shipping method", 500));
    }
});
exports.createShippingMethod = createShippingMethod;
const updateShippingMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingMethodRepository = database_1.AppDataSource.getRepository(shipping_methods_1.ShippingMethod);
        const { id } = req.params;
        const { name, is_active } = req.body;
        const shippingMethod = yield shippingMethodRepository.findOne({
            where: { id },
        });
        if (!shippingMethod) {
            return res.status(404).json({
                success: false,
                message: "Shipping Method not found.",
            });
        }
        if (name !== undefined) {
            const trimmedName = name.trim();
            if (!trimmedName) {
                return res.status(400).json({
                    success: false,
                    message: "Shipping Method name cannot be empty.",
                });
            }
            const existing = yield shippingMethodRepository.findOne({
                where: { name: trimmedName },
            });
            if (existing && existing.id !== id) {
                return res.status(400).json({
                    success: false,
                    message: "Shipping Method with this name already exists.",
                });
            }
            shippingMethod.name = trimmedName;
        }
        if (is_active !== undefined) {
            shippingMethod.is_active = !!is_active;
        }
        const updated = yield shippingMethodRepository.save(shippingMethod);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating shipping method:", error);
        return next(new errorHandler_1.default("Failed to update shipping method", 500));
    }
});
exports.updateShippingMethod = updateShippingMethod;
const deleteShippingMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const shippingMethodRepository = database_1.AppDataSource.getRepository(shipping_methods_1.ShippingMethod);
        const { id } = req.params;
        const shippingMethod = yield shippingMethodRepository.findOne({
            where: { id },
        });
        if (!shippingMethod) {
            return res.status(404).json({
                success: false,
                message: "Shipping Method not found.",
            });
        }
        yield shippingMethodRepository.remove(shippingMethod);
        return res.status(200).json({
            success: true,
            message: "Shipping Method deleted successfully.",
        });
    }
    catch (error) {
        console.error("Error deleting shipping method:", error);
        return next(new errorHandler_1.default("Failed to delete shipping method", 500));
    }
});
exports.deleteShippingMethod = deleteShippingMethod;
