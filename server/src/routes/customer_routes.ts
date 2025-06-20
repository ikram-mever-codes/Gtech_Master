import express from "express";
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
import { authenticateUser } from "../middlewares/authorized";

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

// For admins

router.get("/all", authenticateUser, getAllCustomers);

router.get("/single/:customerId", authenticateCustomer, getSingleUser);

router.put("/:customerId/status", authenticateUser, updateCustomerStatus);

export default router;
