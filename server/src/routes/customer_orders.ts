import { Router } from "express";
import {
  createAuftragFromOffer,
  getAllCustomerOrders,
  getCustomerOrderById,
  deleteCustomerOrder,
} from "../controllers/customer_order_controller";

const router = Router();

router.post("/from-offer/:offerId", createAuftragFromOffer);
router.get("/", getAllCustomerOrders);
router.get("/:id", getCustomerOrderById);
router.delete("/:id", deleteCustomerOrder);

export default router;
