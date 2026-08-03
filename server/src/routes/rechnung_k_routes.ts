import { Router } from "express";
import {
  createRechnungKFromRechnung,
  getAllRechnungenK,
  getRechnungKById,
  updateRechnungKItem,
  deleteRechnungK,
  getRechnungOpenQuantities,
} from "../controllers/rechnung_k_controllers";

const router = Router();

// Get open quantities for a Rechnung
router.get("/:rechnungId/open-quantities", getRechnungOpenQuantities);

// Create correction invoice from Rechnung
router.post("/from-rechnung/:rechnungId", createRechnungKFromRechnung);

// Get all correction invoices
router.get("/", getAllRechnungenK);

// Get single correction invoice
router.get("/:id", getRechnungKById);

// Update correction invoice item
router.patch("/:rechnungKId/items/:itemId", updateRechnungKItem);

// Delete correction invoice
router.delete("/:id", deleteRechnungK);

export default router;
