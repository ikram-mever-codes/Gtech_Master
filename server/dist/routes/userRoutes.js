"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../middlewares/multer");
const user_controllers_1 = require("../controllers/user_controllers");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
// Public / Authentication Routes
router.post("/login", user_controllers_1.login);
router.post("/verify", user_controllers_1.verifyEmail);
router.post("/resend-verification", user_controllers_1.resendVerificationEmail);
router.post("/forgot-password", user_controllers_1.forgetPassword);
router.post("/reset-password", user_controllers_1.resetPassword);
// Authenticated Routes
router.post("/logout", authorized_1.authenticateUser, user_controllers_1.logout);
router.get("/refresh", authorized_1.authenticateUser, user_controllers_1.refresh);
router.get("/users/me", authorized_1.authenticateUser, user_controllers_1.getMe);
router.put("/change-password", authorized_1.authenticateUser, user_controllers_1.changePassword);
router.put("/users/me", authorized_1.authenticateUser, multer_1.uploadSingleFile, user_controllers_1.editProfile);
// Admin Only Routes
router.post("/users", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.createUser);
router.get("/users", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.getAllUsers);
router.get("/users/:userId", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.getUserById);
router.put("/users/:userId", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.updateUser);
router.delete("/users/:userId", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.deleteUser);
// Customer Management (might be Admin and Sales, but usually users.ts is for internal users)
router.post("/customers/create", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.createCompany);
router.put("/customers/edit", authorized_1.authenticateUser, authorized_1.isAdmin, multer_1.uploadSingleFile, user_controllers_1.updateCustomer);
router.delete("/customers/:customerId", authorized_1.authenticateUser, authorized_1.isAdmin, user_controllers_1.deleteCustomer);
exports.default = router;
