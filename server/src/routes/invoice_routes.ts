import { Router } from "express";
import { InvoiceController } from "../controllers/invoice_controller";
import { authenticateUser, authorize } from "../middlewares/authorized";
import { UserRole } from "../models/users";

const router: any = Router();

router.use(authenticateUser);

// Invoice Routes - Restricted to Admin and Sales
router.post("/", authorize(UserRole.SALES), InvoiceController.createInvoice);
router.put("/:id", authorize(UserRole.SALES), InvoiceController.updateInvoice);
router.delete("/:id", authorize(UserRole.SALES), InvoiceController.deleteInvoice);
router.get("/", authorize(UserRole.SALES), InvoiceController.getAllInvoices);
router.get("/:id", authorize(UserRole.SALES), InvoiceController.getInvoiceById);
router.get(
    "/customer/:customerId",
    authorize(UserRole.SALES),
    InvoiceController.getInvoicesByCustomer
);

export default router;
