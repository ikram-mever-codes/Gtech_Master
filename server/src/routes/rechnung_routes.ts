import { Router } from "express";
import {
  createRechnungFromAuftrag,
  getAllRechnungen,
  getLieferscheine,
  getRechnungById,
  updateRechnung,
  deleteRechnung,
} from "../controllers/rechnung_controller";

const router = Router();

router.post("/from-auftrag/:auftragId", createRechnungFromAuftrag);
router.get("/", getAllRechnungen);
router.get("/lieferscheine", getLieferscheine);
router.get("/:id", getRechnungById);
router.patch("/:id", updateRechnung);
router.delete("/:id", deleteRechnung);

export default router;
