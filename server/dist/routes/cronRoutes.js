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
// routes/cronRoutes.ts
const express_1 = require("express");
const cronJob_1 = require("../services/cronJob");
const router = (0, express_1.Router)();
const cronJobs = cronJob_1.CronJobs.getInstance();
router.get("/start", (req, res) => {
    cronJobs.start();
    res.json({
        success: true,
        message: "Cron jobs started",
        status: cronJobs.getStatus(),
    });
});
router.post("/stop", (req, res) => {
    cronJobs.stop();
    res.json({
        success: true,
        message: "Cron jobs stopped",
        status: cronJobs.getStatus(),
    });
});
router.get("/status", (req, res) => {
    res.json({
        success: true,
        status: cronJobs.getStatus(),
    });
});
router.post("/refresh-list/:listId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { listId } = req.params;
        const success = yield cronJobs.refreshSpecificList(listId);
        res.json({
            success,
            message: success
                ? "List refreshed successfully"
                : "Failed to refresh list",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error refreshing list",
        });
    }
}));
router.post("/refresh-all", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield cronJobs.refreshAllLists();
        res.json({
            success: true,
            message: "All lists refresh triggered",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error triggering refresh",
        });
    }
}));
exports.default = router;
