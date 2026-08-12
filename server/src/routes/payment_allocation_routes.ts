import { Router } from "express";
import {
  createPaymentAllocation,
  deletePaymentAllocation,
  getAllocationsForPaymentInbound,
  getAllocationsForTarget,
} from "../controllers/payment_allocations_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

// Assign part (or all) of a Payment Inbound to an Auftrag or Rechnung.
// Body: { paymentInboundId, targetType: "auftrag" | "rechnung", targetId, amount, notes? }
router.post("/", authenticateUser, createPaymentAllocation);

// All allocations for one Payment Inbound, plus its allocated/open summary.
router.get(
  "/inbound/:paymentInboundId",
  authenticateUser,
  getAllocationsForPaymentInbound as any,
);

// All allocations covering one Auftrag or Rechnung (e.g. to show
// "paid via: ..." on that document's own preview).
router.get(
  "/target/:targetType/:targetId",
  authenticateUser,
  getAllocationsForTarget as any,
);

// Undo a single assignment — the amount becomes open on the Payment
// Inbound again.
router.delete(
  "/:allocationId",
  authenticateUser,
  deletePaymentAllocation as any,
);

export default router;
