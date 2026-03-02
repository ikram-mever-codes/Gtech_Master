import express from "express";
import {
    createSupplierOrder,
    getAllSupplierOrders,
    getSupplierOrderById,
    updateSupplierOrder,
    deleteSupplierOrder,
} from "../controllers/supplier_order_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = express.Router();

router.use(authenticateUser);

router.post("/", authorize(UserRole.ADMIN), createSupplierOrder);
router.get("/", authorize(UserRole.ADMIN), getAllSupplierOrders);
router.get("/:id", authorize(UserRole.ADMIN), getSupplierOrderById);
router.put("/:id", authorize(UserRole.ADMIN), updateSupplierOrder);
router.delete("/:id", authorize(UserRole.ADMIN), deleteSupplierOrder);

export default router;
