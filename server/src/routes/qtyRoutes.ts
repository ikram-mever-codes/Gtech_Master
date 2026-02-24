import express from "express";

import { getCategories, } from "../controllers/category_controller";
import { authenticateUser } from "../middlewares/authorized";
const router: any = express.Router();

// category Routes

router.get("/", getCategories);
// router.get("/:categoryId", getcategoryById);
// router.put("/:categoryId", updatecategory);
// router.delete("/:categoryId", deletecategory);

export default router;
