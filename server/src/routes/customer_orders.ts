import { Router } from "express";
import {
  createAuftragFromOffer,
  createAuftragFromInquiry,
  createAuftragFromItems,
  getAllCustomerOrders,
  getCustomerOrderById,
  deleteCustomerOrder,
  updateCustomerOrder,
  createOrderLineItem,
  updateOrderLineItem,
  deleteOrderLineItem,
  previewOrderLineItemPrice,
} from "../controllers/customer_order_controller";

const router = Router();

router.post("/from-offer/:offerId", createAuftragFromOffer);
router.post("/from-inquiry/:inquiryId", createAuftragFromInquiry);
router.post("/from-items", createAuftragFromItems);
router.get("/", getAllCustomerOrders);
router.get("/:id", getCustomerOrderById);
router.put("/:id", updateCustomerOrder);
router.delete("/:id", deleteCustomerOrder);

router.post("/:orderId/line-items", createOrderLineItem);
router.put("/:orderId/line-items/:lineItemId", updateOrderLineItem);
router.delete("/:orderId/line-items/:lineItemId", deleteOrderLineItem);
router.get(
  "/:orderId/line-items/:lineItemId/price-preview",
  previewOrderLineItemPrice,
);

export default router;
