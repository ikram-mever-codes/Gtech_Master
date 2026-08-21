import { Router } from "express";
import { authenticateUser } from "../middlewares/authorized";
import {
  createRechnungFromAuftrag,
  createRechnungOhneAusliefern,
  getAllRechnungen,
  getLieferscheine,
  getRechnungById,
  updateRechnung,
  deleteRechnung,
  uploadGelangenheitsbestaetigung,
  deleteGelangenheitsbestaetigung,
  downloadRechnungPdf,
  downloadRechnungEml,
} from "../controllers/rechnung_controller";
import { uploadSingleFile } from "../middlewares/multer";
const router = Router();
router.use(authenticateUser);
router.post("/from-auftrag/:auftragId", createRechnungFromAuftrag);
router.post("/from-auftrag-ohne-ausliefern/:auftragId", createRechnungOhneAusliefern);

router.get("/", getAllRechnungen);
router.get("/lieferscheine", getLieferscheine);
router.get("/:id/download-pdf", downloadRechnungPdf);
router.get("/:id/download-eml", downloadRechnungEml);
router.get("/:id", getRechnungById);
router.put("/:id", updateRechnung);
router.patch("/:id", updateRechnung);
router.delete("/:id", deleteRechnung);
router.post("/:id/gelangenheitsbestaetigung", uploadSingleFile, uploadGelangenheitsbestaetigung);
router.delete("/:id/gelangenheitsbestaetigung", deleteGelangenheitsbestaetigung);

export default router;