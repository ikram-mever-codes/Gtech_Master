
import express from "express";
import { getAllSuppliers, getSupplierItems } from "../controllers/supplier_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = express.Router();

router.use(authenticateUser);

router.route("/").get(getAllSuppliers);
router.route("/:id/items").get(getSupplierItems);

export default router;
