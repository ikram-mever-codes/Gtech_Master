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
const express_1 = require("express");
const dbUtils_1 = require("../utils/dbUtils");
const order_controller_1 = require("../controllers/order_controller");
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
router.get("/fix-sequences", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, dbUtils_1.fixSequences)();
        res.status(200).json({ success: true, message: "Database sequences fixed successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fix sequences", error: error.message });
    }
}));
router.get("/font-status", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const fontPath = order_controller_1._cachedCjkFontPath;
        const exists = fontPath ? fs_1.default.existsSync(fontPath) : false;
        const stats = exists ? fs_1.default.statSync(fontPath) : null;
        res.status(200).json({
            success: true,
            data: {
                cachedPath: fontPath,
                exists: exists,
                size: stats ? stats.size : 0,
                __dirname: __dirname,
                cwd: process.cwd()
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to check font status", error: error.message });
    }
}));
exports.default = router;
