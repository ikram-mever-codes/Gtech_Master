import { Router } from "express";
import {
  createRechnungFromAuftrag,
  getAllRechnungen,
  getLieferscheine,
  getRechnungById,
  updateRechnung,
  deleteRechnung,
  uploadGelangenheitsbestaetigung,
  deleteGelangenheitsbestaetigung,
} from "../controllers/rechnung_controller";
import { uploadSingleFile } from "../middlewares/multer";
const router = Router();
router.post("/from-auftrag/:auftragId", createRechnungFromAuftrag);
router.get("/", getAllRechnungen);
router.get("/lieferscheine", getLieferscheine);
router.get("/:id", getRechnungById);
router.put("/:id", updateRechnung);
router.patch("/:id", updateRechnung);
router.delete("/:id", deleteRechnung);
router.post("/:id/gelangenheitsbestaetigung", uploadSingleFile, uploadGelangenheitsbestaetigung);
router.delete("/:id/gelangenheitsbestaetigung", deleteGelangenheitsbestaetigung);

export default router;