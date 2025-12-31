"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/itemRoutes.ts
const express_1 = __importDefault(require("express"));
const items_controller_1 = require("../controllers/items_controller");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
router.use(authorized_1.authenticateUser);
// =============
// ===============================
// ITEM ROUTES
// ============================================
// Get all  with pagination and filters
router.get("/", items_controller_1.getItems);
// Get item by ID with all details
router.get("/:id", items_controller_1.getItemById);
// Create new item
router.post("/", items_controller_1.createItem);
// Update item
router.put("/:id", items_controller_1.updateItem);
// Delete item
router.delete("/:id", items_controller_1.deleteItem);
// Toggle item status
router.patch("/:id/status", items_controller_1.toggleItemStatus);
// Bulk update
router.patch("/bulk-update", items_controller_1.bulkUpdateItems);
// Get item statistics
router.get("/stats/statistics", items_controller_1.getItemStatistics);
// Search
router.get("/search/quick-search", items_controller_1.searchItems);
// ============================================
// PARENT ROUTES
// ============================================
// Get all parents with pagination and filters
router.get("/parents/items", items_controller_1.getParents);
// Get parent by ID with child
router.get("/parents/:id", items_controller_1.getParentById);
// Create new parent
router.post("/parents", items_controller_1.createParent);
// Update parent
router.put("/parents/:id", items_controller_1.updateParent);
// Delete parent
router.delete("/parents/:id", items_controller_1.deleteParent);
// Search parents
router.get("/parents/search/quick-search", items_controller_1.searchParents);
// ============================================
// WAREHOUSE ROUTES
// ============================================
// Get warehouse
router.get("/warehouse/items", items_controller_1.getWarehouseItems);
// Update warehouse stock
router.patch("/warehouse/:id/stock", items_controller_1.updateWarehouseStock);
// ============================================
// VARIATION ROUTES
// ============================================
// Get item variations
router.get("/:itemId/variations", items_controller_1.getItemVariations);
// Update item variations
router.put("/:itemId/variations", items_controller_1.updateItemVariations);
// ============================================
// QUALITY CRITERIA ROUTES
// ============================================
// Get item quality criteria
router.get("/:itemId/quality", items_controller_1.getItemQualityCriteria);
// Create quality criterion
router.post("/:itemId/quality", items_controller_1.createQualityCriterion);
// Update quality criterion
router.put("/quality/:id", items_controller_1.updateQualityCriterion);
// Delete quality criterions
router.delete("/quality/:id", items_controller_1.deleteQualityCriterion);
router.get("/tarics/all", items_controller_1.getAllTarics);
// Get taric by ID with relationships
router.get("/tarics/:id", items_controller_1.getTaricById);
// Create new taric
router.post("/tarics/create", items_controller_1.createTaric);
// Update taric
router.put("/tarics/edit/:id", items_controller_1.updateTaric);
// Delete taric
router.delete("/tarics/delete/:id", items_controller_1.deleteTaric);
// Search tarics by code or name
router.get("/tarics/search/quick-search", items_controller_1.searchTarics);
// Get taric statistics
router.get("/tarics/stats/statistics", items_controller_1.getTaricStatistics);
// Bulk create/update tarics
router.post("/tarics/bulk-upsert", items_controller_1.bulkUpsertTarics);
exports.default = router;
