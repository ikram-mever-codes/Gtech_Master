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
exports.authorize = exports.isAdmin = exports.authenticateUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const users_1 = require("../models/users");
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const database_1 = require("../config/database");
const authenticateUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const authReq = req;
    const token = (_a = authReq.cookies) === null || _a === void 0 ? void 0 : _a.token;
    if (!token) {
        return next(new errorHandler_1.default("Session expired! Please login again", 401));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userRepository = database_1.AppDataSource.getRepository(users_1.User);
        const user = yield userRepository.findOne({
            where: { id: decoded.id },
            relations: ["permissions"],
        });
        if (!user) {
            return next(new errorHandler_1.default("User not found", 404));
        }
        if (!user.isEmailVerified) {
            return next(new errorHandler_1.default("Please verify your email first", 401));
        }
        if (!user.isLoginEnabled) {
            return next(new errorHandler_1.default("Your account has been disabled. Please contact support.", 403));
        }
        authReq.user = user;
        next();
    }
    catch (error) {
        console.error(error);
        return next(new errorHandler_1.default("Session expired! Please login again", 401));
    }
});
exports.authenticateUser = authenticateUser;
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authReq = req;
    try {
        if (!authReq.user) {
            return next(new errorHandler_1.default("Authentication required", 401));
        }
        if (authReq.user.role !== users_1.UserRole.ADMIN) {
            return next(new errorHandler_1.default("Access Denied", 403));
        }
        next();
    }
    catch (error) {
        console.error("Admin check error:", error);
        return next(new errorHandler_1.default("Authorization failed", 500));
    }
});
exports.isAdmin = isAdmin;
const authorize = (...roles) => {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return next(new errorHandler_1.default("Authentication required", 401));
        }
        if (authReq.user.role === users_1.UserRole.ADMIN) {
            return next();
        }
        if (roles.length && !roles.includes(authReq.user.role)) {
            return next(new errorHandler_1.default(`Access Denied`, 403));
        }
        next();
    };
};
exports.authorize = authorize;
