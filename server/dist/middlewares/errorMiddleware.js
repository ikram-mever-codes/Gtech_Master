"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const errorMiddleware = (err, req, res, next) => {
    const status = err instanceof errorHandler_1.default ? err.status : 500;
    const success = err instanceof errorHandler_1.default ? err.success : false;
    console.log(err);
    return res.status(status).json({
        success,
        message: err.message || "Internal Server Error",
        errors: err instanceof errorHandler_1.default ? err.errors : undefined,
    });
};
exports.default = errorMiddleware;
