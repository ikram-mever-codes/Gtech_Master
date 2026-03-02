"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supplier_order_controller_1 = require("../controllers/supplier_order_controller");
const authorized_1 = require("../middlewares/authorized");
const users_1 = require("../models/users");
const router = express_1.default.Router();
router.use(authorized_1.authenticateUser);
router.post("/", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), supplier_order_controller_1.createSupplierOrder);
router.get("/", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), supplier_order_controller_1.getAllSupplierOrders);
router.get("/:id", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), supplier_order_controller_1.getSupplierOrderById);
router.put("/:id", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), supplier_order_controller_1.updateSupplierOrder);
router.delete("/:id", (0, authorized_1.authorize)(users_1.UserRole.ADMIN), supplier_order_controller_1.deleteSupplierOrder);
exports.default = router;
