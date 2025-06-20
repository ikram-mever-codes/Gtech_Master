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
} from "../controllers/list_controllers";
import { authenticateUser, AuthorizedRequest } from "../middlewares/authorized";
import { authenticateCustomer } from "../middlewares/authenticateCustomer";

const router: any = Router();

router.get(
  "/items/search",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  searchItems
);

// Combined routes for both admins and customers ==============================
router.post(
  "/",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  createList
);

router.post(
  "/:listId/items",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  addListItem
);

router.put(
  "/items/:itemId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  updateListItem
);

// Admin-only approval routes ================================================
router.put(
  "/admin/items/:itemId/approve",
  authenticateUser,
  approveListItemChanges
);
router.put(
  "/admin/items/:itemId/reject",
  authenticateUser,
  rejectListItemChanges
);

// Shared routes ============================================================
router.delete(
  "/items/:itemId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  deleteListItem
);

router.put(
  "/items/:itemId/delivery",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  updateDeliveryInfo
);

router.get(
  "/:listId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  getListWithItems
);

router.get(
  "/customer/:customerId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  getCustomerLists
);

// Get single list for a customer
router.get(
  "/customers/:customerId/lists/:listId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  getCustomerList
);

router.post(
  "/:listId/duplicate",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  duplicateList
);

router.put(
  "/:listId",
  (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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
  },
  updateList
);

router.get("/admin/all-lists", authenticateUser, getAllLists);

export default router;
