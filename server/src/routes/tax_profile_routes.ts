import { Router } from "express";
import { getAllTaxProfiles } from "../controllers/tax_profile_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllTaxProfiles as any);

export default router;
