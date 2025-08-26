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
} from "../controllers/user_controllers";
import { authenticateUser } from "../middlewares/authorized";

const router: any = express.Router();

// Authentication Routes
router.post("/login", login);
router.post("/logout", authenticateUser, logout);
router.get("/refresh", authenticateUser, refresh);

// Password Management
router.put("/change-password", authenticateUser, changePassword);

// User Management Routes
router.post("/users", authenticateUser, createUser);
router.get("/users", authenticateUser, getAllUsers);
router.get("/users/:userId", authenticateUser, getUserById);
router.put("/users/:userId", authenticateUser, updateUser);

router.put("/users/me", authenticateUser, uploadSingleFile, editProfile);

// Add these to your existing routes
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetPassword);

// Customer Routes

router.post("/customers/create", authenticateUser, createCompany);
router.put(
  "/customers/edit",
  authenticateUser,
  uploadSingleFile,
  updateCustomer
);

export default router;
