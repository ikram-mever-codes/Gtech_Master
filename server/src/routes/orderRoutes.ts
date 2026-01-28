import express from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
 
} from "../controllers/order_controller";
import { authenticateUser } from "../middlewares/authorized";
const router: any = express.Router();

// Order Routes
router.post("/", createOrder);
router.get("/", getAllOrders);
router.get("/:orderId", getOrderById);
router.put("/:orderId", updateOrder);
router.delete("/:orderId", deleteOrder);

export default router;
