"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offer_controller_1 = require("../controllers/offer_controller");
const router = (0, express_1.Router)();
const offerController = new offer_controller_1.OfferController();
// Offer CRUD operations
router.post("/inquiry/:inquiryId/offers", offerController.createOfferFromInquiry.bind(offerController));
router.get("/offers", offerController.getAllOffers.bind(offerController));
router.get("/offers/:id", offerController.getOfferById.bind(offerController));
router.put("/offers/:id", offerController.updateOffer.bind(offerController));
router.delete("/offers/:id", offerController.deleteOffer.bind(offerController));
// Offer revisions
router.post("/offers/:id/revisions", offerController.createRevision.bind(offerController));
// Offer PDF generation
router.post("/offers/:id/generate-pdf", offerController.generatePdf.bind(offerController));
router.get("/offers/:id/download-pdf", offerController.downloadPdf.bind(offerController));
// Line item operations
router.put("/offers/:offerId/line-items/:lineItemId", offerController.updateLineItem.bind(offerController));
router.put("/offers/:offerId/line-items/bulk", offerController.bulkUpdateLineItems.bind(offerController));
router.post("/line-items/:lineItemId/quantity-prices", offerController.addQuantityPrice.bind(offerController));
router.put("/line-items/:lineItemId/active-price/:priceIndex", offerController.setActivePrice.bind(offerController));
// Copy/paste operations
router.post("/offers/:offerId/copy-paste-prices", offerController.copyPastePrices.bind(offerController));
// Inquiry-specific offers
router.get("/inquiry/:inquiryId/offers", offerController.getOffersByInquiry.bind(offerController));
exports.default = router;
