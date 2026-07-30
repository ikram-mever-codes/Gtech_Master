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
exports.deletePaymentMethod = exports.updatePaymentMethod = exports.createPaymentMethod = exports.getPaymentMethodById = exports.getAllPaymentMethods = void 0;
const database_1 = require("../config/database");
const payment_methods_1 = require("../models/payment_methods");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const getAllPaymentMethods = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethodRepository = database_1.AppDataSource.getRepository(payment_methods_1.PaymentMethod);
        const includeInactive = req.query.all === "true";
        const paymentMethods = yield paymentMethodRepository.find({
            where: includeInactive ? {} : { is_active: true },
            order: {
                name: "ASC",
            },
        });
        return res.status(200).json({
            success: true,
            data: paymentMethods,
        });
    }
    catch (error) {
        console.error("Error fetching payment methods:", error);
        return next(new errorHandler_1.default("Failed to retrieve payment methods", 500));
    }
});
exports.getAllPaymentMethods = getAllPaymentMethods;
const getPaymentMethodById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethodRepository = database_1.AppDataSource.getRepository(payment_methods_1.PaymentMethod);
        const { id } = req.params;
        const paymentMethod = yield paymentMethodRepository.findOne({
            where: { id },
        });
        if (!paymentMethod) {
            return res.status(404).json({
                success: false,
                message: "Payment Method not found.",
            });
        }
        return res.status(200).json({
            success: true,
            data: paymentMethod,
        });
    }
    catch (error) {
        console.error("Error fetching payment method by ID:", error);
        return next(new errorHandler_1.default("Failed to retrieve payment method details", 500));
    }
});
exports.getPaymentMethodById = getPaymentMethodById;
const createPaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethodRepository = database_1.AppDataSource.getRepository(payment_methods_1.PaymentMethod);
        const { name, is_prepayment } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Payment Method name is required.",
            });
        }
        const existing = yield paymentMethodRepository.findOne({
            where: { name: name.trim() },
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "Payment Method with this name already exists.",
            });
        }
        const paymentMethod = paymentMethodRepository.create({
            name: name.trim(),
            is_prepayment: !!is_prepayment,
            is_active: true,
        });
        const saved = yield paymentMethodRepository.save(paymentMethod);
        return res.status(201).json({
            success: true,
            data: saved,
        });
    }
    catch (error) {
        console.error("Error creating payment method:", error);
        return next(new errorHandler_1.default("Failed to create payment method", 500));
    }
});
exports.createPaymentMethod = createPaymentMethod;
const updatePaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethodRepository = database_1.AppDataSource.getRepository(payment_methods_1.PaymentMethod);
        const { id } = req.params;
        const { name, is_prepayment, is_active } = req.body;
        const paymentMethod = yield paymentMethodRepository.findOne({
            where: { id },
        });
        if (!paymentMethod) {
            return res.status(404).json({
                success: false,
                message: "Payment Method not found.",
            });
        }
        if (name !== undefined) {
            const trimmedName = name.trim();
            if (!trimmedName) {
                return res.status(400).json({
                    success: false,
                    message: "Payment Method name cannot be empty.",
                });
            }
            const existing = yield paymentMethodRepository.findOne({
                where: { name: trimmedName },
            });
            if (existing && existing.id !== id) {
                return res.status(400).json({
                    success: false,
                    message: "Payment Method with this name already exists.",
                });
            }
            paymentMethod.name = trimmedName;
        }
        if (is_prepayment !== undefined) {
            paymentMethod.is_prepayment = !!is_prepayment;
        }
        if (is_active !== undefined) {
            paymentMethod.is_active = !!is_active;
        }
        const updated = yield paymentMethodRepository.save(paymentMethod);
        return res.status(200).json({
            success: true,
            data: updated,
        });
    }
    catch (error) {
        console.error("Error updating payment method:", error);
        return next(new errorHandler_1.default("Failed to update payment method", 500));
    }
});
exports.updatePaymentMethod = updatePaymentMethod;
const deletePaymentMethod = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentMethodRepository = database_1.AppDataSource.getRepository(payment_methods_1.PaymentMethod);
        const { id } = req.params;
        const paymentMethod = yield paymentMethodRepository.findOne({
            where: { id },
        });
        if (!paymentMethod) {
            return res.status(404).json({
                success: false,
                message: "Payment Method not found.",
            });
        }
        yield paymentMethodRepository.remove(paymentMethod);
        return res.status(200).json({
            success: true,
            message: "Payment Method deleted successfully.",
        });
    }
    catch (error) {
        console.error("Error deleting payment method:", error);
        return next(new errorHandler_1.default("Failed to delete payment method", 500));
    }
});
exports.deletePaymentMethod = deletePaymentMethod;
