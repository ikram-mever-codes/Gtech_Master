import { Router } from "express";
import {
  getAllCountries,
  getCountryById,
  createCountry,
  updateCountry,
  deactivateCountry,
  deleteCountry,
} from "../controllers/country_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllCountries as any);
router.get("/:id", authenticateUser, getCountryById as any);

router.post("/", authenticateUser, createCountry as any);
router.put("/:id", authenticateUser, updateCountry as any);
router.patch("/:id/deactivate", authenticateUser, deactivateCountry as any);
router.delete("/:id", authenticateUser, deleteCountry as any);

export default router;
