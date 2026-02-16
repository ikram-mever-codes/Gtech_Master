import express, { NextFunction, Response } from "express";
import { uploadSingleFile } from "../middlewares/multer";
import { authenticateCustomer } from "../middlewares/authenticateCustomer";
import {
  requestCustomerAccount,
  verifyEmail,
  login,
  logout,
  editCustomerProfile,
  refresh,
  changePassword,
  forgotPassword,
  resetPassword,
  getAllCustomers,
  getSingleUser,
  updateCustomerStatus,
} from "../controllers/customer_controllers";
import {
  authenticateUser,
  AuthorizedRequest,
  authorize,
} from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = express.Router();

// Customer Account Lifecycle
router.post("/request-account", requestCustomerAccount);
router.get("/verify-email/:code", verifyEmail);

// Authentication Routes
router.post("/login", login);
router.post("/logout", authenticateCustomer, logout);
router.get("/refresh", authenticateCustomer, refresh);

// Password Management
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);
router.put("/change-password", authenticateCustomer, changePassword);

// Profile Management
router.put("/me", authenticateCustomer, uploadSingleFile, editCustomerProfile);

// For admins and Sales team
router.get(
  "/all",
  authenticateUser,
  authorize(UserRole.SALES),
  getAllCustomers
);

router.get(
  "/single/:customerId",
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
      authenticateCustomer(req, res, next);
    }
  },
  getSingleUser
);

router.put(
  "/:customerId/status",
  authenticateUser,
  authorize(UserRole.SALES),
  updateCustomerStatus
);

export default router;
