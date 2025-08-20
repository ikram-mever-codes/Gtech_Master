import { NextFunction, Request, Response, Router } from "express";
import {
  createList,
  addListItem,
  updateListItem,
  deleteListItem,
  getListWithItems,
  approveListItemChanges,
  rejectListItemChanges,
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

// Public routes
router.get("/search/:listNumber", searchListsByNumber);

// Customer-specific routes
router.get("/customer/:companyName", getListsByCompanyName);

// Mixed authentication routes (both admin and customer)
router.get("/items/search", authenticateMixed, searchItems);
router.post("/", authenticateMixed, createList);
router.post("/:listId/items", authenticateMixed, addListItem);
router.put("/items/:itemId", authenticateMixed, updateListItem);
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
router.put(
  "/items/:itemId/acknowledge",
  authenticateMixed,
  // acknowledgeListItemChanges
  bulkAcknowledgeChanges
);

router.put(
  "/:listId/bulk-acknowledge",
  authenticateMixed,
  bulkAcknowledgeChanges
);

// Admin-only routes
router.put(
  "/admin/items/:logId/approve",
  authenticateUser,
  approveListItemChanges
);
router.put(
  "/admin/items/:logId/reject",
  authenticateUser,
  rejectListItemChanges
);
router.get("/admin/all-lists", authenticateUser, getAllLists);

export default router;
