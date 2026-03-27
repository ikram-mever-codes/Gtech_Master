// src/routes/itemRoutes.ts
import express, { Request, Response } from "express";
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
  exportItemsToCSV,
  resetUpdatedFlag, // Add the new reset function
} from "../controllers/items_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { AppDataSource } from "../config/database";
import { Parent } from "../models/parents";
import { UserRole } from "../models/users";
import { Item } from "../models/items";

const router: any = express.Router();

router.use(authenticateUser);

router.use(authorize(UserRole.ADMIN, UserRole.SALES, UserRole.PURCHASING));

// Item routes
router.get("/", getItems);
router.get("/export/csv", exportItemsToCSV);
router.get("/:id", getItemById);
router.post("/", createItem);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);
router.patch("/:id/status", toggleItemStatus);
router.patch("/bulk-update", bulkUpdateItems);
router.get("/stats/statistics", getItemStatistics);
router.get("/search/quick-search", searchItems);

// Sync management routes
router.post("/sync/reset-flags", resetUpdatedFlag);
router.get("/sync/pending-count", async (req: Request, res: Response) => {
  try {
    const itemRepository = AppDataSource.getRepository(Item);
    const pendingCount = await itemRepository.count({
      where: { is_updated: true },
    });
    res.json({
      success: true,
      data: {
        pendingCount,
        needsSync: pendingCount > 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending sync count",
    });
  }
});

// Parent routes
router.get("/parents/simple", async (req: Request, res: Response) => {
  try {
    const parents = await AppDataSource.getRepository(Parent).find({
      select: ["id", "name_de", "de_no"],
      where: { is_active: "Y" },
      order: { name_de: "ASC" },
    });
    res.json({ success: true, data: parents });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch parents" });
  }
});

router.get("/parents/items", getParents);
router.get("/parents/:id", getParentById);
router.post("/parents", createParent);
router.put("/parents/:id", updateParent);
router.delete("/parents/:id", deleteParent);
router.get("/parents/search/quick-search", searchParents);

// Warehouse routes
router.get("/warehouse/items", getWarehouseItems);
router.patch("/warehouse/:id/stock", updateWarehouseStock);

// Variation routes
router.get("/:itemId/variations", getItemVariations);
router.put("/:itemId/variations", updateItemVariations);

// Quality criteria routes
router.get("/:itemId/quality", getItemQualityCriteria);
router.post("/:itemId/quality", createQualityCriterion);
router.put("/quality/:id", updateQualityCriterion);
router.delete("/quality/:id", deleteQualityCriterion);

// TARIC routes
router.get("/tarics/all", getAllTarics);
router.get("/tarics/:id", getTaricById);
router.post("/tarics/create", createTaric);
router.put("/tarics/edit/:id", updateTaric);
router.delete("/tarics/delete/:id", deleteTaric);
router.get("/tarics/search/quick-search", searchTarics);
router.get("/tarics/stats/statistics", getTaricStatistics);
router.post("/tarics/bulk-upsert", bulkUpsertTarics);

export default router;
