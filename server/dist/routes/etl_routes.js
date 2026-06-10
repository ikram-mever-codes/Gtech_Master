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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const etl_controller_1 = require("../controllers/etl_controller");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/etl/sync-orders
 * @desc    Synchronizes orders and items based on today's date
 */
router.get("/sync-orders", etl_controller_1.EtlController.findTargetDate);
/**
 * @route   GET /api/etl/sync-warehouse
 * @desc    Updates warehouse stock and info from warehouseItems.csv
 */
router.get("/sync-warehouse", etl_controller_1.EtlController.whareHouseSync);
/**
 * @route   GET /api/etl/sync-ids
 * @desc    Syncs ItemID_DE across Items, Warehouse, and OrderItems via ItemIDs.csv
 */
router.get("/sync-ids", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield etl_controller_1.EtlController.synchIDs();
        res
            .status(200)
            .json({ success: true, message: "ItemID_DEs synched successfully!" });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = router;
