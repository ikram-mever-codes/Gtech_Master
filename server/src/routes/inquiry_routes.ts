import { Router } from "express";
import { InquiryController } from "../controllers/inquiry_controller";

const router: any = Router();
const inquiryController = new InquiryController();

// Inquiry routes
router.get("/", inquiryController.getAllInquiries.bind(inquiryController));
router.get("/:id", inquiryController.getInquiryById.bind(inquiryController));
router.post("/", inquiryController.createInquiry.bind(inquiryController));
router.put("/:id", inquiryController.updateInquiry.bind(inquiryController));
router.delete("/:id", inquiryController.deleteInquiry.bind(inquiryController));

router.post(
  "/:id/convert-to-item",
  inquiryController.convertInquiryToItem.bind(inquiryController)
);
router.post(
  "/:id/requests/:requestId/convert-to-item",
  inquiryController.convertRequestToItem.bind(inquiryController)
);

// Customer-specific inquiries
router.get(
  "/customer/:customerId",
  inquiryController.getInquiriesByCustomer.bind(inquiryController)
);

// Request management within inquiries
router.post(
  "/:id/requests",
  inquiryController.addRequestToInquiry.bind(inquiryController)
);
router.put(
  "/:id/requests/:requestId",
  inquiryController.updateRequestInInquiry.bind(inquiryController)
);
router.delete(
  "/:id/requests/:requestId",
  inquiryController.removeRequestFromInquiry.bind(inquiryController)
);

export default router;
