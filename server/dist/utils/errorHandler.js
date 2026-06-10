"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ErrorHandler extends Error {
    constructor(message, status, errors) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
        this.success = false;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = ErrorHandler;
