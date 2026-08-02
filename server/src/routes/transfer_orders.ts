import { Router } from "express";
import {
  createTransferOrderFromAuftrag,
  getAllTransferOrders,
  getTransferOrderById,
  updateTransferOrder,
  updateTransferOrderStatus,
  deleteTransferOrder,
  createTransferOrderLineItem,
  updateTransferOrderLineItem,
  deleteTransferOrderLineItem,
} from "../controllers/transfer_order_controller";

const router = Router();

router.post("/from-auftrag/:auftragId", createTransferOrderFromAuftrag);
router.get("/", getAllTransferOrders);
router.get("/:id", getTransferOrderById);
router.put("/:id", updateTransferOrder);
router.put("/:id/status", updateTransferOrderStatus);
router.delete("/:id", deleteTransferOrder);

router.patch("/:id/status", updateTransferOrderStatus);

router.post("/:orderId/line-items", createTransferOrderLineItem);
router.put("/:orderId/line-items/:lineItemId", updateTransferOrderLineItem);
router.delete("/:orderId/line-items/:lineItemId", deleteTransferOrderLineItem);

export default router;
