import { Router } from "express";
import {
  createRechnungKFromRechnung,
  getAllRechnungenK,
  getRechnungKById,
  updateRechnungKItem,
  deleteRechnungK,
} from "../controllers/rechnung_k_controllers";

const router = Router();

router.post("/from-rechnung/:rechnungId", createRechnungKFromRechnung);
router.get("/", getAllRechnungenK);
router.get("/:id", getRechnungKById);
router.patch("/:rechnungKId/items/:itemId", updateRechnungKItem);
router.delete("/:id", deleteRechnungK);

export default router;
