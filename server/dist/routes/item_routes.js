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
const express_1 = __importDefault(require("express"));
const items_controller_1 = require("../controllers/items_controller");
const database_1 = require("../config/database");
const parents_1 = require("../models/parents");
const items_1 = require("../models/items");
const router = express_1.default.Router();
router.get("/pricing/transfer-prices", items_controller_1.feedTransferPrices);
router.get("/cat/fix", items_controller_1.syncSuppCatWithCategoryName);
router.get("/", items_controller_1.getItems);
router.post("/", items_controller_1.createItem);
router.get("/export/csv", items_controller_1.exportItemsToCSV);
router.get("/export/new-items-csv", items_controller_1.exportNewItemsToCSV);
router.get("/new-items", items_controller_1.getNewItems);
router.get("/new-items/count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const count = yield itemRepository.count({ where: { is_new: "Y" } });
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Failed to get new items count" });
    }
}));
router.get("/stats/statistics", items_controller_1.getItemStatistics);
router.get("/search/quick-search", items_controller_1.searchItems);
router.patch("/bulk-update", items_controller_1.bulkUpdateItems);
router.post("/sync/reset-flags", items_controller_1.resetUpdatedFlag);
router.get("/sync/pending-count", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemRepository = database_1.AppDataSource.getRepository(items_1.Item);
        const pendingCount = yield itemRepository.count({
            where: { is_updated: true },
        });
        res.json({
            success: true,
            data: { pendingCount, needsSync: pendingCount > 0 },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Sync count failed" });
    }
}));
router.get("/:id", items_controller_1.getItemById);
router.put("/:id", items_controller_1.updateItem);
router.delete("/:id", items_controller_1.deleteItem);
router.get("/parents/simple", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parents = yield database_1.AppDataSource.getRepository(parents_1.Parent).find({
            select: ["id", "name_de", "de_no"],
            where: { is_active: "Y" },
            order: { name_de: "ASC" },
        });
        res.json({ success: true, data: parents });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch parents" });
    }
}));
router.get("/parents/items", items_controller_1.getParents);
router.get("/parents/:id", items_controller_1.getParentById);
router.post("/parents", items_controller_1.createParent);
router.put("/parents/:id", items_controller_1.updateParent);
router.delete("/parents/:id", items_controller_1.deleteParent);
router.get("/parents/search/quick-search", items_controller_1.searchParents);
router.get("/tarics/all", items_controller_1.getAllTarics);
router.get("/tarics/:id", items_controller_1.getTaricById);
router.post("/tarics/create", items_controller_1.createTaric);
router.put("/tarics/edit/:id", items_controller_1.updateTaric);
router.delete("/tarics/delete/:id", items_controller_1.deleteTaric);
router.get("/tarics/search/quick-search", items_controller_1.searchTarics);
router.get("/tarics/stats/statistics", items_controller_1.getTaricStatistics);
router.post("/tarics/bulk-upsert", items_controller_1.bulkUpsertTarics);
router.get("/warehouse/items", items_controller_1.getWarehouseItems);
router.patch("/warehouse/:id/stock", items_controller_1.updateWarehouseStock);
router.get("/:itemId/variations", items_controller_1.getItemVariations);
router.put("/:itemId/variations", items_controller_1.updateItemVariations);
router.get("/:itemId/quality", items_controller_1.getItemQualityCriteria);
router.post("/:itemId/quality", items_controller_1.createQualityCriterion);
router.put("/quality/:id", items_controller_1.updateQualityCriterion);
router.delete("/quality/:id", items_controller_1.deleteQualityCriterion);
exports.default = router;
