// src/routes/lieferschein_routes.ts
import { Router } from "express";
import {
  getAllLieferscheine,
  getLieferscheinById,
  updateLieferscheinStatus,
  updateLieferscheinDeliveryDate,
  deleteLieferschein,
} from "../controllers/lieferschein_controller";

const router = Router();

// Get all Lieferscheine
router.get("/", getAllLieferscheine);

// Get Lieferschein by ID
router.get("/:id", getLieferscheinById);

// Update Lieferschein status
router.patch("/:id/status", updateLieferscheinStatus);

// Update Lieferschein delivery date
router.patch("/:id/delivery-date", updateLieferscheinDeliveryDate);

// Delete Lieferschein
router.delete("/:id", deleteLieferschein);

export default router;
