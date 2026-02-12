import express from "express";
import { uploadSingleFile } from "../middlewares/multer";
import {
  createUser,
  login,
  logout,
  refresh,
  changePassword,
  editProfile,
  getAllUsers,
  forgetPassword,
  resetPassword,
  createCompany,
  getUserById,
  updateUser,
  updateCustomer,
  deleteCustomer,
  deleteUser,
  verifyEmail,
  resendVerificationEmail,
  getMe,
} from "../controllers/user_controllers";
import { authenticateUser, isAdmin } from "../middlewares/authorized";

const router: any = express.Router();

// Public / Authentication Routes
router.post("/login", login);
router.post("/verify", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Authenticated Routes
router.post("/logout", authenticateUser, logout);
router.get("/refresh", authenticateUser, refresh);
router.get("/users/me", authenticateUser, getMe);
router.put("/change-password", authenticateUser, changePassword);
router.put("/users/me", authenticateUser, uploadSingleFile, editProfile);

// Admin Only Routes
router.post("/users", authenticateUser, isAdmin, createUser);
router.get("/users", authenticateUser, isAdmin, getAllUsers);
router.get("/users/:userId", authenticateUser, isAdmin, getUserById);
router.put("/users/:userId", authenticateUser, isAdmin, updateUser);
router.delete("/users/:userId", authenticateUser, isAdmin, deleteUser);

// Customer Management (might be Admin and Sales, but usually users.ts is for internal users)
router.post("/customers/create", authenticateUser, isAdmin, createCompany);
router.put(
  "/customers/edit",
  authenticateUser,
  isAdmin,
  uploadSingleFile,
  updateCustomer
);
router.delete("/customers/:customerId", authenticateUser, isAdmin, deleteCustomer);

export default router;
