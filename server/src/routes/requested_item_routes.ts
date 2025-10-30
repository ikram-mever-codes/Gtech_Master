import { Router } from "express";
import { RequestedItemController } from "../controllers/requested_items_controllers";

const router: any = Router();
const requestedItemController = new RequestedItemController();

// Specific routes first
router.get(
  "/statistics",
  (req: any, res: any) => res.send("f") // Add this method to your controller
);

router.get("/business/:businessId/requested-items", (req: any, res: any) =>
  requestedItemController.getRequestedItemsByBusiness(req, res)
);

// Then general routes
router.get("/", (req: any, res: any) =>
  requestedItemController.getAllRequestedItems(req, res)
);

router.get("/:id", (req: any, res: any) =>
  requestedItemController.getRequestedItemById(req, res)
);

router.post("/", (req: any, res: any) =>
  requestedItemController.createRequestedItem(req, res)
);

router.put("/:id", (req: any, res: any) =>
  requestedItemController.updateRequestedItem(req, res)
);

router.delete("/:id", (req: any, res: any) =>
  requestedItemController.deleteRequestedItem(req, res)
);

export default router;
