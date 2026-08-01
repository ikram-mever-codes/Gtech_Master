import { Router } from "express";
import {
  getAllGtechCompanies,
  getGtechCompanyById,
  createGtechCompany,
  updateGtechCompany,
  deleteGtechCompany,
} from "../controllers/gtech_company_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllGtechCompanies as any);
router.post("/", authenticateUser, createGtechCompany as any);
router.get("/:id", authenticateUser, getGtechCompanyById as any);
router.put("/:id", authenticateUser, updateGtechCompany as any);
router.delete("/:id", authenticateUser, deleteGtechCompany as any);

export default router;
