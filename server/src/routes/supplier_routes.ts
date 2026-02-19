
import express from "express";
import {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierItems,
} from "../controllers/supplier_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = express.Router();

router.use(authenticateUser);

router.route("/").get(getAllSuppliers);
router.route("/").post(createSupplier);
router.route("/:id").get(getSupplierById);
router.route("/:id").put(updateSupplier);
router.route("/:id").delete(deleteSupplier);
router.route("/:id/items").get(getSupplierItems);

export default router;
