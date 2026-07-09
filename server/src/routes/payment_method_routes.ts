import { Router } from "express";
import {
  getAllPaymentMethods,
  getPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} from "../controllers/payment_method_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllPaymentMethods as any);
router.post("/", authenticateUser, createPaymentMethod as any);
router.get("/:id", authenticateUser, getPaymentMethodById as any);
router.put("/:id", authenticateUser, updatePaymentMethod as any);
router.delete("/:id", authenticateUser, deletePaymentMethod as any);

export default router;
