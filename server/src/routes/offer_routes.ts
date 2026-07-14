import { Router } from "express";
import { OfferController } from "../controllers/offer_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();
const offerController = new OfferController();

// Apply authentication to all offer routes
router.use(authenticateUser);

// ---------------------------------------------------------------------------
// Offer creation - Restricted to Admin and Sales
// ---------------------------------------------------------------------------
router.post(
  "/inquiry/:inquiryId",
  authorize(UserRole.SALES),
  offerController.createOfferFromInquiry.bind(offerController),
);
router.post(
  "/from-item/:itemId",
  authorize(UserRole.SALES),
  offerController.createOfferFromItem.bind(offerController),
);

// ---------------------------------------------------------------------------
// Offer CRUD operations - Restricted to Admin and Sales
// ---------------------------------------------------------------------------
router.get(
  "",
  authorize(UserRole.SALES),
  offerController.getAllOffers.bind(offerController),
);
router.get(
  "/:id",
  authorize(UserRole.SALES),
  offerController.getOfferById.bind(offerController),
);
router.put(
  "/:id",
  authorize(UserRole.SALES),
  offerController.updateOffer.bind(offerController),
);
router.delete(
  "/:id",
  authorize(UserRole.SALES),
  offerController.deleteOffer.bind(offerController),
);

// Offer revisions
router.post(
  "/:id/revisions",
  offerController.createRevision.bind(offerController),
);

// Offer PDF generation
router.post(
  "/:id/generate-pdf",
  offerController.generatePdf.bind(offerController),
);
router.get(
  "/:id/download-pdf",
  offerController.generateAndDownloadPdf.bind(offerController),
);

// ---------------------------------------------------------------------------
// Line item operations
// ---------------------------------------------------------------------------
router.post(
  "/:offerId/line-items",
  offerController.createLineItem.bind(offerController),
);
router.put(
  "/:offerId/line-items/:lineItemId",
  offerController.updateLineItem.bind(offerController),
);
router.delete(
  "/:offerId/line-items/:lineItemId",
  offerController.deleteLineItem.bind(offerController),
);
router.put(
  "/:offerId/line-items/bulk",
  offerController.bulkUpdateLineItems.bind(offerController),
);

// ---------------------------------------------------------------------------
// Matrix pricing operations
// ---------------------------------------------------------------------------
// Add a single tier to one line item's price matrix
router.post(
  "/line-items/:lineItemId/price-matrix",
  offerController.addPriceMatrixEntry.bind(offerController),
);

// Set which tier is active for a line item (no priceType segment anymore —
// matrix is the only mode with tiers)
router.put(
  "/line-items/:lineItemId/active-price/:priceIndex",
  offerController.setActivePrice.bind(offerController),
);

// Switch an offer between Classic and Matrix pricing
router.post(
  "/:offerId/pricing-mode",
  offerController.togglePricingMode.bind(offerController),
);

// Re-apply the offer's tier template across all its line items
router.post(
  "/:offerId/sync-price-matrix",
  offerController.syncPriceMatrixAcrossOffer.bind(offerController),
);

// Delete one tier (quantity column) from every line item on the offer
router.delete(
  "/:offerId/price-column",
  offerController.deletePriceColumn.bind(offerController),
);

// Paste-in matrix import — the client's primary entry point
router.post(
  "/:offerId/paste-matrix",
  offerController.pasteMatrixPrices.bind(offerController),
);

// ---------------------------------------------------------------------------
// Inquiry-specific offers
// ---------------------------------------------------------------------------
router.get(
  "/inquiry/:inquiryId",
  offerController.getOffersByInquiry.bind(offerController),
);

// ---------------------------------------------------------------------------
// Statistics and metadata
// ---------------------------------------------------------------------------
router.get(
  "/statistics",
  offerController.getOfferStatistics.bind(offerController),
);
router.get("/statuses", offerController.getOfferStatuses.bind(offerController));
router.get(
  "/currencies",
  offerController.getAvailableCurrencies.bind(offerController),
);

export default router;
