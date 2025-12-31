"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requested_items_controllers_1 = require("../controllers/requested_items_controllers");
const router = (0, express_1.Router)();
const requestedItemController = new requested_items_controllers_1.RequestedItemController();
// Specific routes first
router.get("/statistics", (req, res) => res.send("f") // Add this method to your controller
);
router.get("/business/:businessId/requested-items", (req, res) => requestedItemController.getRequestedItemsByBusiness(req, res));
// Then general routes
router.get("/", (req, res) => requestedItemController.getAllRequestedItems(req, res));
router.get("/:id", (req, res) => requestedItemController.getRequestedItemById(req, res));
router.post("/", (req, res) => requestedItemController.createRequestedItem(req, res));
router.put("/:id", (req, res) => requestedItemController.updateRequestedItem(req, res));
router.delete("/:id", (req, res) => requestedItemController.deleteRequestedItem(req, res));
exports.default = router;
