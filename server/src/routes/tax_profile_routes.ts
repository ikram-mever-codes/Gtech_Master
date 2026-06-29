import { Router } from "express";
import {
  getAllTaxProfiles,
  createTaxProfile,
  updateTaxProfile,
  deactivateTaxProfile,
} from "../controllers/tax_profile_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllTaxProfiles as any);
router.post("/", authenticateUser, createTaxProfile as any);
router.put("/:id", authenticateUser, updateTaxProfile as any);
router.patch("/:id/deactivate", authenticateUser, deactivateTaxProfile as any);

export default router;
