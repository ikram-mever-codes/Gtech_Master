"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = require("../middlewares/multer");
const authenticateCustomer_1 = require("../middlewares/authenticateCustomer");
const customer_controllers_1 = require("../controllers/customer_controllers");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
// Customer Account Lifecycle
router.post("/request-account", customer_controllers_1.requestCustomerAccount);
router.get("/verify-email/:code", customer_controllers_1.verifyEmail);
// Authentication Routes
router.post("/login", customer_controllers_1.login);
router.post("/logout", authenticateCustomer_1.authenticateCustomer, customer_controllers_1.logout);
router.get("/refresh", authenticateCustomer_1.authenticateCustomer, customer_controllers_1.refresh);
// Password Management
router.post("/forgot-password", customer_controllers_1.forgotPassword);
router.put("/reset-password/:token", customer_controllers_1.resetPassword);
router.put("/change-password", authenticateCustomer_1.authenticateCustomer, customer_controllers_1.changePassword);
// Profile Management
router.put("/me", authenticateCustomer_1.authenticateCustomer, multer_1.uploadSingleFile, customer_controllers_1.editCustomerProfile);
// For admins
router.get("/all", authorized_1.authenticateUser, customer_controllers_1.getAllCustomers);
router.get("/single/:customerId", (req, res, next) => {
    var _a;
    if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token) {
        try {
            (0, authorized_1.authenticateUser)(req, res, (err) => {
                if (err || !req.user) {
                    (0, authenticateCustomer_1.authenticateCustomer)(req, res, next);
                }
                else {
                    next();
                }
            });
        }
        catch (_b) {
            (0, authenticateCustomer_1.authenticateCustomer)(req, res, next);
        }
    }
    else {
        return res.status(401).json({ error: "Authentication required" });
    }
}, customer_controllers_1.getSingleUser);
router.put("/:customerId/status", authorized_1.authenticateUser, customer_controllers_1.updateCustomerStatus);
exports.default = router;
