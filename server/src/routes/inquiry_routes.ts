import { Router } from "express";
import { InquiryController } from "../controllers/inquiry_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();
const inquiryController = new InquiryController();

// Apply authentication to all inquiry routes
router.use(authenticateUser);

// Inquiry routes - Restricted to Admin, Sales, and Purchasing
router.get(
  "/",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.getAllInquiries.bind(inquiryController)
);
router.get(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.getInquiryById.bind(inquiryController)
);
router.post(
  "/",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.createInquiry.bind(inquiryController)
);
router.put(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.updateInquiry.bind(inquiryController)
);
router.delete(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.deleteInquiry.bind(inquiryController)
);

router.post(
  "/:id/convert-to-item",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.convertInquiryToItem.bind(inquiryController)
);
router.post(
  "/:id/requests/:requestId/convert-to-item",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.convertRequestToItem.bind(inquiryController)
);

// Customer-specific inquiries
router.get(
  "/customer/:customerId",
  authorize(UserRole.SALES), // Restricted to Sales only for customer identity
  inquiryController.getInquiriesByCustomer.bind(inquiryController)
);

// Request management within inquiries
router.post(
  "/:id/requests",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.addRequestToInquiry.bind(inquiryController)
);
router.put(
  "/:id/requests/:requestId",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.updateRequestInInquiry.bind(inquiryController)
);
router.delete(
  "/:id/requests/:requestId",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  inquiryController.removeRequestFromInquiry.bind(inquiryController)
);

export default router;
