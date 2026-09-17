import "reflect-metadata";
import { AppDataSource } from "../server/src/config/database";
import { Invoice } from "../server/src/models/invoice";
import { CCIInvoice } from "../server/src/models/cci_invoice";
import { Cargo } from "../server/src/models/cargos";
import { InvoiceController } from "../server/src/controllers/invoice_controller";

async function checkInvoiceCargo() {
  await AppDataSource.initialize();

  const invoiceRepo = AppDataSource.getRepository(Invoice);
  const cciRepo = AppDataSource.getRepository(CCIInvoice);
  const cargoRepo = AppDataSource.getRepository(Cargo);

  const invList = await invoiceRepo.find({
    where: [
      { invoiceNumber: "CI2609-9" },
      { invoiceNumber: "CI26099" },
      { id: "7299E" }
    ]
  });

  console.log("INVOICES matched:", invList.length);
  for (const inv of invList) {
    console.log(`Invoice ID: ${inv.id}, Number: ${inv.invoiceNumber}, orderNumber: ${inv.orderNumber}`);
    const exp = await InvoiceController.fetchExpandedDetailsData(inv.id);
    console.log("  expandedData.invoice.orderNumber:", exp?.invoice?.orderNumber);
    console.log("  expandedData.cargo:", exp?.cargo);
  }

  const cciList = await cciRepo.find({
    where: [
      { invoice_number: "CI2609-9" },
      { invoice_number: "CI26099" }
    ]
  });
  console.log("\nCCI INVOICES matched:", cciList.length);
  for (const cci of cciList) {
    console.log(`CCI ID: ${cci.id}, Number: ${cci.invoice_number}, cargo_no: ${cci.cargo_no}, order_number: ${cci.order_number}`);
  }

  // Also let's find all invoices with cargo C2609-24 or C2608-13
  const cargos = await cargoRepo.find({
    where: [
      { cargo_no: "C2609-24" },
      { cargo_no: "C2608-13" }
    ]
  });
  console.log("\nCARGOS matched:");
  for (const c of cargos) {
    console.log(`Cargo ID: ${c.id}, cargo_no: ${c.cargo_no}, status: ${c.cargo_status}`);
  }

  await AppDataSource.destroy();
  process.exit(0);
}

checkInvoiceCargo().catch(console.error);
