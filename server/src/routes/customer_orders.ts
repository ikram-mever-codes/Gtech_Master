import { Router } from "express";
import { authenticateUser } from "../middlewares/authorized";
import {
  createAuftragFromOffer,
  createAuftragFromItems,
  getAllCustomerOrders,
  getCustomerOrderById,
  deleteCustomerOrder,
  updateCustomerOrder,
  createOrderLineItem,
  updateOrderLineItem,
  deleteOrderLineItem,
  previewOrderLineItemPrice,
  downloadCustomerOrderPdf,
  closeCustomerOrder,
  duplicateCustomerOrder,
} from "../controllers/customer_order_controller";

const router = Router();
router.use(authenticateUser);

router.post("/from-offer/:offerId", createAuftragFromOffer);
router.post("/from-items", createAuftragFromItems);
router.post("/:id/duplicate", duplicateCustomerOrder);
router.get("/", getAllCustomerOrders);
router.get("/:id/download-pdf", downloadCustomerOrderPdf);
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

router.put("/:id/close", authenticateUser, closeCustomerOrder);

export default router;
