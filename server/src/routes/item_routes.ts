// src/routes/itemRoutes.ts
import express from "express";
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
  bulkUpdateItems,
  getItemStatistics,
  searchItems,
  getParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  searchParents,
  getWarehouseItems,
  updateWarehouseStock,
  getItemVariations,
  updateItemVariations,
  getItemQualityCriteria,
  createQualityCriterion,
  updateQualityCriterion,
  deleteQualityCriterion,
  getAllTarics,
  getTaricById,
  createTaric,
  updateTaric,
  deleteTaric,
  searchTarics,
  getTaricStatistics,
  bulkUpsertTarics,
} from "../controllers/items_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = express.Router();

router.use(authenticateUser);

// =============
// ===============================
// ITEM ROUTES
// ============================================

// Get all  with pagination and filters
router.get("/", getItems);

// Get item by ID with all details
router.get("/:id", getItemById);

// Create new item
router.post("/", createItem);

// Update item
router.put("/:id", updateItem);

// Delete item
router.delete("/:id", deleteItem);

// Toggle item status
router.patch("/:id/status", toggleItemStatus);

// Bulk update
router.patch("/bulk-update", bulkUpdateItems);

// Get item statistics
router.get("/stats/statistics", getItemStatistics);

// Search
router.get("/search/quick-search", searchItems);

// ============================================
// PARENT ROUTES
// ============================================

// Get all parents with pagination and filters
router.get("/parents/items", getParents);

// Get parent by ID with child
router.get("/parents/:id", getParentById);

// Create new parent
router.post("/parents", createParent);

// Update parent
router.put("/parents/:id", updateParent);

// Delete parent
router.delete("/parents/:id", deleteParent);

// Search parents
router.get("/parents/search/quick-search", searchParents);

// ============================================
// WAREHOUSE ROUTES
// ============================================

// Get warehouse
router.get("/warehouse/items", getWarehouseItems);

// Update warehouse stock
router.patch("/warehouse/:id/stock", updateWarehouseStock);

// ============================================
// VARIATION ROUTES
// ============================================

// Get item variations
router.get("/:itemId/variations", getItemVariations);

// Update item variations
router.put("/:itemId/variations", updateItemVariations);

// ============================================
// QUALITY CRITERIA ROUTES
// ============================================

// Get item quality criteria
router.get("/:itemId/quality", getItemQualityCriteria);

// Create quality criterion
router.post("/:itemId/quality", createQualityCriterion);

// Update quality criterion
router.put("/quality/:id", updateQualityCriterion);

// Delete quality criterions
router.delete("/quality/:id", deleteQualityCriterion);

router.get("/tarics/all", getAllTarics);

// Get taric by ID with relationships
router.get("/tarics/:id", getTaricById);

// Create new taric
router.post("/tarics/create", createTaric);

// Update taric
router.put("/tarics/edit/:id", updateTaric);

// Delete taric
router.delete("/tarics/delete/:id", deleteTaric);

// Search tarics by code or name
router.get("/tarics/search/quick-search", searchTarics);

// Get taric statistics
router.get("/tarics/stats/statistics", getTaricStatistics);

// Bulk create/update tarics
router.post("/tarics/bulk-upsert", bulkUpsertTarics);

export default router;
