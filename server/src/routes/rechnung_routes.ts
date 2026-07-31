import { Router } from "express";
import {
  createRechnungFromAuftrag,
  getAllRechnungen,
  getLieferscheine,
  getRechnungById,
  deleteRechnung,
} from "../controllers/rechnung_controller";

const router = Router();

router.post("/from-auftrag/:auftragId", createRechnungFromAuftrag);
router.get("/", getAllRechnungen);
router.get("/lieferscheine", getLieferscheine);
router.get("/:id", getRechnungById);
router.delete("/:id", deleteRechnung);

export default router;
