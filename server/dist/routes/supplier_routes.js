"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supplier_controller_1 = require("../controllers/supplier_controller");
const authorized_1 = require("../middlewares/authorized");
const router = express_1.default.Router();
router.use(authorized_1.authenticateUser);
router.route("/").get(supplier_controller_1.getAllSuppliers);
router.route("/").post(supplier_controller_1.createSupplier);
router.route("/:id").get(supplier_controller_1.getSupplierById);
router.route("/:id").put(supplier_controller_1.updateSupplier);
router.route("/:id").delete(supplier_controller_1.deleteSupplier);
router.route("/:id/items").get(supplier_controller_1.getSupplierItems);
exports.default = router;
