"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const list_controllers_1 = require("../controllers/list_controllers");
const authorized_1 = require("../middlewares/authorized");
const authenticateCustomer_1 = require("../middlewares/authenticateCustomer");
const router = (0, express_1.Router)();
// Authentication middleware for mixed routes
const authenticateMixed = (req, res, next) => {
    var _a;
    if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) {
        try {
            (0, authorized_1.authenticateUser)(req, res, (err) => {
                if (err || !req.user) {
                    (0, authenticateCustomer_1.authenticateCustomer)(req, res, next);
                }
                else {
                    next();
                }
            });
        }
        catch (_b) {
            (0, authenticateCustomer_1.authenticateCustomer)(req, res, next);
        }
    }
    else {
        return res.status(401).json({ error: "Authentication required" });
    }
};
// Admin-only middleware
const adminOnly = (req, res, next) => {
    (0, authorized_1.authenticateUser)(req, res, (err) => {
        if (err || !req.user) {
            return res.status(403).json({ error: "Admin access required" });
        }
        next();
    });
};
// Public routes
router.get("/search/:listNumber", list_controllers_1.searchListsByNumber);
// Customer-specific routes
router.get("/customer/:companyName", list_controllers_1.getListsByCompanyName);
// Mixed authentication routes (both admin and customer)
router.get("/items/search", authenticateMixed, list_controllers_1.searchItems);
router.post("/", authenticateMixed, list_controllers_1.createList);
router.post("/:listId/items", authenticateMixed, list_controllers_1.addListItem);
router.put("/items/:itemId", authenticateMixed, list_controllers_1.updateListItem);
router.put("/items/:itemId/comment", authenticateMixed, list_controllers_1.updateListItemComment);
router.delete("/items/:itemId", authenticateMixed, list_controllers_1.deleteListItem);
router.delete("/list/:listId", authenticateMixed, list_controllers_1.deleteList);
router.put("/items/:itemId/delivery", authenticateMixed, list_controllers_1.updateDeliveryInfo);
router.get("/:listId", authenticateMixed, list_controllers_1.getListWithItems);
router.get("/customer/all/:customerId", authenticateMixed, list_controllers_1.getCustomerLists);
router.get("/customers/:customerId/lists/:listId", authenticateMixed, list_controllers_1.getCustomerList);
router.post("/:listId/duplicate", authenticateMixed, list_controllers_1.duplicateList);
router.put("/:listId", authenticateMixed, list_controllers_1.updateList);
router.get("/:customerId/deliveries", authenticateMixed, list_controllers_1.getCustomerDeliveries);
// Acknowledgment routes (Admin only)
router.put("/:listId/items/:itemId/acknowledge", adminOnly, list_controllers_1.acknowledgeListItemChanges);
router.put("/:listId/items/:itemId/acknowledge-fields", adminOnly, list_controllers_1.acknowledgeItemFieldChanges);
// Bulk acknowledge routes (Admin only)
router.put("/bulk-acknowledge", adminOnly, list_controllers_1.bulkAcknowledgeChanges);
// Admin dashboard routes
router.get("/admin/pending-changes", adminOnly, list_controllers_1.getPendingChangesForAdmin);
router.get("/admin/all-with-items", adminOnly, list_controllers_1.fetchAllListsAndItems);
router.post("/admin/items/refresh-from-mis", adminOnly, list_controllers_1.refreshItemsFromMIS);
// Item refresh routes (Mixed - both admin and customer can refresh their own items)
router.get("/items/:itemId/with-refresh", authenticateMixed, list_controllers_1.getListItemWithRefresh);
router.patch("/:listId/contact-person", list_controllers_1.updateListContactPerson);
// Admin-only list management
router.get("/admin/all-lists", adminOnly, list_controllers_1.getAllLists);
// Legacy routes for backward compatibility (to be deprecated)
router.put("/items/:itemId/acknowledge", authenticateMixed, (req, res, next) => {
    // Redirect to the new endpoint structure
    const { itemId } = req.params;
    const { listId } = req.body;
    if (!listId) {
        return res.status(400).json({
            error: "listId is now required in the request body for this endpoint",
        });
    }
    // Modify the request to match the new endpoint structure
    req.params.listId = listId;
    (0, list_controllers_1.acknowledgeListItemChanges)(req, res, next);
});
// Health check route
router.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "List service is running",
        features: {
            acknowledgmentSystem: true,
            pendingChangesTracking: true,
            adminDashboard: true,
        },
    });
});
exports.default = router;
