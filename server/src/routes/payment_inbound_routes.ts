import { Router } from "express";
import {
  getAllPaymentInbounds,
  getPaymentInboundById,
  createPaymentInbound,
  updatePaymentInbound,
  deletePaymentInbound,
} from "../controllers/payment_inbound_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllPaymentInbounds as any);
router.get("/:id", authenticateUser, getPaymentInboundById as any);
router.post("/", authenticateUser, createPaymentInbound as any);
router.put("/:id", authenticateUser, updatePaymentInbound as any);
router.delete("/:id", authenticateUser, deletePaymentInbound as any);

export default router;
