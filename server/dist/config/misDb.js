"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dbConfig = {
    host: process.env.MIS_DB_HOST || "",
    user: process.env.MIS_DB_USER || "admin",
    password: process.env.MIS_DB_PASSWORD || "",
    database: process.env.MIS_DB_NAME || "misgtech",
    port: parseInt(process.env.MIS_DB_PORT || "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};
exports.pool = promise_1.default.createPool(dbConfig);
const getConnection = () => exports.pool.getConnection();
exports.getConnection = getConnection;
