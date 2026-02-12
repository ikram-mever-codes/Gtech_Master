import { Router } from "express";
import { OfferController } from "../controllers/offer_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();
const offerController = new OfferController();

// Apply authentication to all offer routes
router.use(authenticateUser);

// Offer CRUD operations - Restricted to Admin and Sales
router.post(
  "/inquiry/:inquiryId",
  authorize(UserRole.SALES),
  offerController.createOfferFromInquiry.bind(offerController)
);
router.get(
  "",
  authorize(UserRole.SALES),
  offerController.getAllOffers.bind(offerController)
);
router.get(
  "/:id",
  authorize(UserRole.SALES),
  offerController.getOfferById.bind(offerController)
);
router.put(
  "/:id",
  authorize(UserRole.SALES),
  offerController.updateOffer.bind(offerController)
);
router.delete(
  "/:id",
  authorize(UserRole.SALES),
  offerController.deleteOffer.bind(offerController)
);

// Offer revisions
router.post(
  "/:id/revisions",
  offerController.createRevision.bind(offerController)
);

// Offer PDF generation
router.post(
  "/:id/generate-pdf",
  offerController.generatePdf.bind(offerController)
);
router.get(
  "/:id/download-pdf",
  offerController.downloadPdf.bind(offerController)
);

// Line item operations
router.put(
  "/:offerId/line-items/:lineItemId",
  offerController.updateLineItem.bind(offerController)
);
router.put(
  "/:offerId/line-items/bulk",
  offerController.bulkUpdateLineItems.bind(offerController)
);

// Price management operations
router.post(
  "/line-items/:lineItemId/quantity-prices",
  offerController.addQuantityPrice.bind(offerController)
);
router.post(
  "/line-items/:lineItemId/unit-prices",
  offerController.addUnitPrice.bind(offerController)
);

// Unit price operations (offer level)
router.post(
  "/:offerId/toggle-unit-prices",
  offerController.toggleOfferUnitPrices.bind(offerController)
);
router.put(
  "/:offerId/bulk-update-unit-prices",
  offerController.bulkUpdateOfferUnitPrices.bind(offerController)
);
router.post(
  "/:offerId/sync-unit-prices",
  offerController.syncUnitPricesAcrossOffer.bind(offerController)
);

// Set active price for line items
router.put(
  "/line-items/:lineItemId/active-price/:priceType/:priceIndex",
  offerController.setActivePrice.bind(offerController)
);

// Copy/paste operations
router.post(
  "/:offerId/copy-paste-prices",
  offerController.copyPastePrices.bind(offerController)
);

// Inquiry-specific offers
router.get(
  "/inquiry/:inquiryId",
  offerController.getOffersByInquiry.bind(offerController)
);

// Statistics and metadata
router.get(
  "/statistics",
  offerController.getOfferStatistics.bind(offerController)
);
router.get("/statuses", offerController.getOfferStatuses.bind(offerController));
router.get(
  "/currencies",
  offerController.getAvailableCurrencies.bind(offerController)
);

export default router;
