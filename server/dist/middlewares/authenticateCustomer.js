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
exports.authenticateCustomer = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const authenticateCustomer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
    if (!token) {
        return next(new errorHandler_1.default("Session expired! Please login again", 401));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
        const customer = yield customerRepository.findOne({
            where: { id: decoded.id },
            relations: ["starCustomerDetails"], // Load the relation
        });
        if (!customer) {
            return next(new errorHandler_1.default("Customer not found", 404));
        }
        // Check if customer has starCustomerDetails
        if (!customer.starCustomerDetails) {
            return next(new errorHandler_1.default("Customer details not found", 404));
        }
        // Check email verification status from starCustomerDetails
        if (!customer.starCustomerDetails.isEmailVerified) {
            return next(new errorHandler_1.default("Please verify your email first", 401));
        }
        // Check account verification status from starCustomerDetails
        if (customer.starCustomerDetails.accountVerificationStatus !== "verified") {
            return next(new errorHandler_1.default("Your account is not verified yet", 403));
        }
        req.customer = customer;
        next();
    }
    catch (error) {
        console.log("Authentication error:", error);
        return next(new errorHandler_1.default("Session expired! Please login again", 401));
    }
});
exports.authenticateCustomer = authenticateCustomer;
