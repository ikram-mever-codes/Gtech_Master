import { NextFunction, Request, Response, Router } from "express";
import {
  createList,
  addListItem,
  updateListItem,
  deleteListItem,
  getListWithItems,
  updateDeliveryInfo,
  searchItems,
  getCustomerList,
  getCustomerLists,
  getAllLists,
  duplicateList,
  updateList,
  deleteList,
  getCustomerDeliveries,
  searchListsByNumber,
  getListsByCompanyName,
  acknowledgeListItemChanges,
  bulkAcknowledgeChanges,
  fetchAllListsAndItems,
  refreshItemsFromMIS,
  getListItemWithRefresh,
  updateListItemComment,
  getPendingChangesForAdmin,
  acknowledgeItemFieldChanges,
  updateListContactPerson,
} from "../controllers/list_controllers";
import { authenticateUser, AuthorizedRequest } from "../middlewares/authorized";
import { authenticateCustomer } from "../middlewares/authenticateCustomer";

const router: any = Router();

// Authentication middleware for mixed routes
const authenticateMixed = (
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.cookies?.token) {
    try {
      authenticateUser(req, res, (err?: any) => {
        if (err || !req.user) {
          authenticateCustomer(req, res, next);
        } else {
          next();
        }
      });
    } catch {
      authenticateCustomer(req, res, next);
    }
  } else {
    return res.status(401).json({ error: "Authentication required" });
  }
};

// Admin-only middleware
const adminOnly = (
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
) => {
  authenticateUser(req, res, (err?: any) => {
    if (err || !req.user) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
};

// Public routes
router.get("/search/:listNumber", searchListsByNumber);

// Customer-specific routes
router.get("/customer/:companyName", getListsByCompanyName);

// Mixed authentication routes (both admin and customer)
router.get("/items/search", authenticateMixed, searchItems);
router.post("/", authenticateMixed, createList);
router.post("/:listId/items", authenticateMixed, addListItem);
router.put("/items/:itemId", authenticateMixed, updateListItem);
router.put("/items/:itemId/comment", authenticateMixed, updateListItemComment);
router.delete("/items/:itemId", authenticateMixed, deleteListItem);
router.delete("/list/:listId", authenticateMixed, deleteList);
router.put("/items/:itemId/delivery", authenticateMixed, updateDeliveryInfo);
router.get("/:listId", authenticateMixed, getListWithItems);
router.get("/customer/all/:customerId", authenticateMixed, getCustomerLists);
router.get(
  "/customers/:customerId/lists/:listId",
  authenticateMixed,
  getCustomerList
);
router.post("/:listId/duplicate", authenticateMixed, duplicateList);
router.put("/:listId", authenticateMixed, updateList);
router.get("/:customerId/deliveries", authenticateMixed, getCustomerDeliveries);

// Acknowledgment routes (Admin only)
router.put(
  "/:listId/items/:itemId/acknowledge",
  adminOnly,
  acknowledgeListItemChanges
);

router.put(
  "/:listId/items/:itemId/acknowledge-fields",
  adminOnly,
  acknowledgeItemFieldChanges
);

// Bulk acknowledge routes (Admin only)
router.put("/bulk-acknowledge", adminOnly, bulkAcknowledgeChanges);

// Admin dashboard routes
router.get("/admin/pending-changes", adminOnly, getPendingChangesForAdmin);
router.get("/admin/all-with-items", adminOnly, fetchAllListsAndItems);
router.post("/admin/items/refresh-from-mis", adminOnly, refreshItemsFromMIS);

// Item refresh routes (Mixed - both admin and customer can refresh their own items)
router.get(
  "/items/:itemId/with-refresh",
  authenticateMixed,
  getListItemWithRefresh
);

router.patch("/:listId/contact-person", updateListContactPerson);

// Admin-only list management
router.get("/admin/all-lists", adminOnly, getAllLists);

// Legacy routes for backward compatibility (to be deprecated)
router.put(
  "/items/:itemId/acknowledge",
  authenticateMixed,
  (req: Request, res: Response, next: NextFunction) => {
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
    acknowledgeListItemChanges(req, res, next);
  }
);

// Health check route
router.get("/health", (req: Request, res: Response) => {
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

export default router;
