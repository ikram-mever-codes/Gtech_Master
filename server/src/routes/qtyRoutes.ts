import express from "express";

import {
  getCategories,
  migrateAndCleanupCategories,
} from "../controllers/category_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = express.Router();

router.get("/", getCategories);

router.post("/migrate-cleanup", migrateAndCleanupCategories);

export default router;
