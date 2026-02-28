import { Router } from "express";
import { EtlController } from "../controllers/etl_controller";

const router = Router();

/**
 * @route   GET /api/etl/sync-orders
 * @desc    Synchronizes orders and items based on today's date
 */
router.get("/sync-orders", EtlController.findTargetDate);

/**
 * @route   GET /api/etl/sync-warehouse
 * @desc    Updates warehouse stock and info from warehouseItems.csv
 */
router.get("/sync-warehouse", EtlController.whareHouseSync);

/**
 * @route   GET /api/etl/sync-ids
 * @desc    Syncs ItemID_DE across Items, Warehouse, and OrderItems via ItemIDs.csv
 */
router.get("/sync-ids", async (req, res, next) => {
  try {
    await EtlController.synchIDs();
    res
      .status(200)
      .json({ success: true, message: "ItemID_DEs synched successfully!" });
  } catch (error) {
    next(error);
  }
});

export default router;
