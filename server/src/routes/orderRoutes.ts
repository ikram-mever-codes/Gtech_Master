import express from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} from "../controllers/order_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";
const router: any = express.Router();

// Apply authentication to all order routes
router.use(authenticateUser);

// Order Routes - Restricted to Admin and Sales
router.post("/", authorize(UserRole.SALES), createOrder);
router.get("/", authorize(UserRole.SALES), getAllOrders);
router.get("/:orderId", authorize(UserRole.SALES), getOrderById);
router.put("/:orderId", authorize(UserRole.SALES), updateOrder);
router.delete("/:orderId", authorize(UserRole.SALES), deleteOrder);

export default router;
