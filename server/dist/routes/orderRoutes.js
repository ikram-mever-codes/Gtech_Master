"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order_controller");
const authorized_1 = require("../middlewares/authorized");
const users_1 = require("../models/users");
const router = express_1.default.Router();
// Apply authentication to all order routes
router.use(authorized_1.authenticateUser);
// Order Routes - Restricted to Admin and Sales
router.post("/", (0, authorized_1.authorize)(users_1.UserRole.SALES), order_controller_1.createOrder);
router.get("/", (0, authorized_1.authorize)(users_1.UserRole.SALES), order_controller_1.getAllOrders);
router.get("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES), order_controller_1.getOrderById);
router.put("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES), order_controller_1.updateOrder);
router.delete("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES), order_controller_1.deleteOrder);
exports.default = router;
