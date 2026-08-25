import { Router } from "express";
import { authenticateUser } from "../middlewares/authorized";
import {
  createRechnungKFromRechnung,
  getAllRechnungenK,
  getRechnungKById,
  updateRechnungKItem,
  updateRechnungK,
  deleteRechnungK,
  getRechnungOpenQuantities,
  downloadRechnungKPdf,
  downloadRechnungKEml,
} from "../controllers/rechnung_k_controllers";

const router = Router();
router.use(authenticateUser);

router.get("/:rechnungId/open-quantities", getRechnungOpenQuantities);

router.post("/from-rechnung/:rechnungId", createRechnungKFromRechnung);

router.get("/", getAllRechnungenK);

router.get("/:id/download-pdf", downloadRechnungKPdf);
router.get("/:id/download-eml", downloadRechnungKEml);

router.get("/:id", getRechnungKById);

router.patch("/:id", updateRechnungK);

router.patch("/:rechnungKId/items/:itemId", updateRechnungKItem);

router.delete("/:id", deleteRechnungK);

export default router;