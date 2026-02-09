import { Router } from "express";
import { RequestedItemController } from "../controllers/requested_items_controllers";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();
const requestedItemController = new RequestedItemController();

// Apply authentication to all requested item routes
router.use(authenticateUser);

// Specific routes first - Restricted to Admin, Sales, and Purchasing
router.get(
  "/business/:businessId/requested-items",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) =>
    requestedItemController.getRequestedItemsByBusiness(req, res)
);

// Then general routes
router.get(
  "/",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) => requestedItemController.getAllRequestedItems(req, res)
);

router.get(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) => requestedItemController.getRequestedItemById(req, res)
);

router.post(
  "/",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) => requestedItemController.createRequestedItem(req, res)
);

router.put(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) => requestedItemController.updateRequestedItem(req, res)
);

router.delete(
  "/:id",
  authorize(UserRole.SALES, UserRole.PURCHASING),
  (req: any, res: any) => requestedItemController.deleteRequestedItem(req, res)
);

export default router;
