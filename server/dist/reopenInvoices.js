"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./config/database");
const invoice_1 = require("./models/invoice");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        yield database_1.AppDataSource.initialize();
        console.log("Database initialized successfully.");
        const invoiceRepo = database_1.AppDataSource.getRepository(invoice_1.Invoice);
        const targets = ["C2026-T6", "C2026-T7"];
        for (const target of targets) {
            console.log(`Searching for invoices matching Order/Cargo No: ${target}...`);
            const invoices = yield invoiceRepo.find({
                where: [
                    { orderNumber: target },
                    { invoiceNumber: target }
                ]
            });
            if (invoices.length === 0) {
                console.log(`No invoices found for: ${target}`);
                continue;
            }
            for (const inv of invoices) {
                console.log(`Found Invoice:`);
                console.log(`  ID: ${inv.id}`);
                console.log(`  Invoice Number: ${inv.invoiceNumber}`);
                console.log(`  Order Number: ${inv.orderNumber}`);
                console.log(`  Current Status: ${inv.status}`);
                console.log(`  Current ClosedAt: ${inv.closedAt}`);
                // Reopen the invoice
                inv.status = "sent"; // move from "paid"/"cancelled" to "sent" (open status)
                inv.closedAt = undefined; // clear closed date
                inv.paidAmount = 0;
                inv.outstandingAmount = inv.grossTotal;
                yield invoiceRepo.save(inv);
                console.log(`  Successfully updated to OPEN (status: 'sent')!`);
            }
        }
        console.log("All done.");
        process.exit(0);
    });
}
run().catch(err => {
    console.error("Error running script:", err);
    process.exit(1);
});
