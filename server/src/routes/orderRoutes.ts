import express from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  generateLabelPDF,
  updateOrderItemStatus,
  splitOrderItem,
} from "../controllers/order_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = express.Router();
router.use(authenticateUser);

router.post("/", authorize(UserRole.SALES, UserRole.PURCHASING), createOrder);
router.get("/", authorize(UserRole.SALES, UserRole.PURCHASING), getAllOrders);

router.get("/item/:itemId/label", authorize(UserRole.SALES, UserRole.PURCHASING), generateLabelPDF);

router.get("/:orderId", authorize(UserRole.SALES, UserRole.PURCHASING), getOrderById);
router.put("/:orderId", authorize(UserRole.SALES, UserRole.PURCHASING), updateOrder);
router.delete("/:orderId", authorize(UserRole.SALES, UserRole.PURCHASING), deleteOrder);
router.put(
  "/items/:id/status",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  updateOrderItemStatus,
);
router.post("/items/:id/split", authorize(UserRole.SALES, UserRole.PURCHASING), splitOrderItem);

export default router;
