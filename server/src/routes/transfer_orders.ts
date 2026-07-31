import { Router } from "express";
import {
  createBestellungFromAuftrag,
  getAllTransferOrders,
  getTransferOrderById,
  updateTransferOrderStatus,
  deleteTransferOrder,
} from "../controllers/transfer_order_controller";

const router = Router();

router.post("/from-auftrag/:auftragId", createBestellungFromAuftrag);
router.get("/", getAllTransferOrders);
router.get("/:id", getTransferOrderById);
router.put("/:id/status", updateTransferOrderStatus);
router.delete("/:id", deleteTransferOrder);

export default router;
