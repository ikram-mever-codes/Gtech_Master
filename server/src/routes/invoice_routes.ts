import { Router } from "express";
import { InvoiceController } from "../controllers/invoice_controller";
import { authenticateUser } from "../middlewares/authorized";

const router: any = Router();

router.use(authenticateUser);

router.post("/", InvoiceController.createInvoice);

router.put("/:id", InvoiceController.updateInvoice);

router.delete("/:id", InvoiceController.deleteInvoice);

router.get("/", InvoiceController.getAllInvoices);

router.get("/:id", InvoiceController.getInvoiceById);

router.get("/customer/:customerId", InvoiceController.getInvoicesByCustomer);

export default router;
