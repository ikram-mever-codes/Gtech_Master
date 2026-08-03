import { Router } from "express";
import { authenticateUser } from "../middlewares/authorized";
import {
  getAllLieferscheine,
  getLieferscheinById,
  updateLieferscheinStatus,
  updateLieferscheinDeliveryDate,
  deleteLieferschein,
  downloadLieferscheinPdf,
} from "../controllers/lieferschein_controller";

const router = Router();
router.use(authenticateUser);

router.get("/", getAllLieferscheine);

router.get("/:id/download-pdf", downloadLieferscheinPdf);

router.get("/:id", getLieferscheinById);

router.patch("/:id/status", updateLieferscheinStatus);

router.patch("/:id/delivery-date", updateLieferscheinDeliveryDate);

router.delete("/:id", deleteLieferschein);

export default router;
