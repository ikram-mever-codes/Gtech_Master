import express from "express";
import { getAuditReports } from "../controllers/dashboard_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = express.Router();

router.get("/reports-control", authenticateUser, getAuditReports);

export default router;
