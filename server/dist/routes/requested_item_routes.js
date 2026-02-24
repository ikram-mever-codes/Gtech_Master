"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requested_items_controllers_1 = require("../controllers/requested_items_controllers");
const authorized_1 = require("../middlewares/authorized");
const users_1 = require("../models/users");
const router = (0, express_1.Router)();
const requestedItemController = new requested_items_controllers_1.RequestedItemController();
// Apply authentication to all requested item routes
router.use(authorized_1.authenticateUser);
// Specific routes first - Restricted to Admin, Sales, and Purchasing
router.get("/business/:businessId/requested-items", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.getRequestedItemsByBusiness(req, res));
// Then general routes
router.get("/", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.getAllRequestedItems(req, res));
router.get("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.getRequestedItemById(req, res));
router.post("/", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.createRequestedItem(req, res));
router.put("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.updateRequestedItem(req, res));
router.delete("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), (req, res) => requestedItemController.deleteRequestedItem(req, res));
exports.default = router;
