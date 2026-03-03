import express from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  updateOrderItemStatus,
} from "../controllers/order_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";
const router: any = express.Router();
router.use(authenticateUser);

router.post("/", authorize(UserRole.SALES), createOrder);
router.get("/", authorize(UserRole.SALES), getAllOrders);
router.get("/:orderId", authorize(UserRole.SALES), getOrderById);
router.put("/:orderId", authorize(UserRole.SALES), updateOrder);
router.delete("/:orderId", authorize(UserRole.SALES), deleteOrder);

router.put("/items/:id/status", authorize(UserRole.SALES), updateOrderItemStatus);

export default router;
