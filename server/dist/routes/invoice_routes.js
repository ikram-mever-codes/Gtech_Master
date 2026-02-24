"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const invoice_controller_1 = require("../controllers/invoice_controller");
const authorized_1 = require("../middlewares/authorized");
const users_1 = require("../models/users");
const router = (0, express_1.Router)();
router.use(authorized_1.authenticateUser);
// Invoice Routes - Restricted to Admin and Sales
router.post("/", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.createInvoice);
router.put("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.updateInvoice);
router.delete("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.deleteInvoice);
router.get("/", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.getAllInvoices);
router.get("/:id", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.getInvoiceById);
router.get("/customer/:customerId", (0, authorized_1.authorize)(users_1.UserRole.SALES), invoice_controller_1.InvoiceController.getInvoicesByCustomer);
exports.default = router;
