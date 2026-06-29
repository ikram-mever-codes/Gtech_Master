import { Router } from "express";
import {
  getAllCountries,
  createCountry,
  updateCountry,
  deactivateCountry,
} from "../controllers/country_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

// Public (authenticated) — used by dropdowns across the app
router.get("/", authenticateUser, getAllCountries as any);

// Admin CRUD
router.post("/", authenticateUser, createCountry as any);
router.put("/:id", authenticateUser, updateCountry as any);
router.patch("/:id/deactivate", authenticateUser, deactivateCountry as any);

export default router;
