// src/routes/lieferschein_routes.ts
import { Router } from "express";
import {
  getAllLieferscheine,
  getLieferscheinById,
  updateLieferscheinStatus,
  deleteLieferschein,
} from "../controllers/lieferschein_controller";

const router = Router();

router.get("/", getAllLieferscheine);
router.get("/:id", getLieferscheinById);
router.patch("/:id/status", updateLieferscheinStatus);
router.delete("/:id", deleteLieferschein);

export default router;
