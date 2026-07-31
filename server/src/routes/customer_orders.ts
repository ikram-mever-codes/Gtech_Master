import { Router } from "express";
import {
  createAuftragFromOffer,
  createAuftragFromInquiry,
  createAuftragFromItems,
  getAllCustomerOrders,
  getCustomerOrderById,
  deleteCustomerOrder,
} from "../controllers/customer_order_controller";

const router = Router();

router.post("/from-offer/:offerId", createAuftragFromOffer);
router.post("/from-inquiry/:inquiryId", createAuftragFromInquiry);
router.post("/from-items", createAuftragFromItems);
router.get("/", getAllCustomerOrders);
router.get("/:id", getCustomerOrderById);
router.delete("/:id", deleteCustomerOrder);

export default router;
