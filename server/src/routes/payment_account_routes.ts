import { Router } from "express";
import {
  getAllPaymentAccounts,
  getPaymentAccountById,
  createPaymentAccount,
  updatePaymentAccount,
  deletePaymentAccount,
} from "../controllers/payment_account_controller";
import { authenticateUser } from "../middlewares/authorized";

const router = Router();

router.get("/", authenticateUser, getAllPaymentAccounts as any);
router.get("/:id", authenticateUser, getPaymentAccountById as any);
router.post("/", authenticateUser, createPaymentAccount as any);
router.put("/:id", authenticateUser, updatePaymentAccount as any);
router.delete("/:id", authenticateUser, deletePaymentAccount as any);

export default router;
