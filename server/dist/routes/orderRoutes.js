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
router.use(authorized_1.authenticateUser);
router.get("/:invoiceId/commercial-invoice", 
// authorize(UserRole.SALES, UserRole.PURCHASING),
order_controller_1.generateCommercialInvoicePDF);
router.post("/", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.createOrder);
router.get("/", 
/* authorize(UserRole.SALES, UserRole.PURCHASING), */ order_controller_1.getAllOrders);
router.get("/item/:itemId/label", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.generateLabelPDF);
router.get("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.getOrderById);
router.put("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.updateOrder);
router.delete("/:orderId", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.deleteOrder);
router.put("/items/:id/status", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.updateOrderItemStatus);
router.put("/items/:id/price", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.updateOrderItemPrice);
router.post("/items/:id/split", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.splitOrderItem);
router.put("/items/:id/label", (0, authorized_1.authorize)(users_1.UserRole.SALES, users_1.UserRole.PURCHASING), order_controller_1.updateOrderItemLabel);
exports.default = router;
