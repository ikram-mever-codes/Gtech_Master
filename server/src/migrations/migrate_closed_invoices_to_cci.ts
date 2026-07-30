import { AppDataSource } from "../config/database";
import { Invoice } from "../models/invoice";
import { CCICustomer } from "../models/cci_customer";
import { CCIInvoice } from "../models/cci_invoice";
import { CCIItem } from "../models/cci_items";
import { InvoiceController } from "../controllers/invoice_controller";

const migrateClosedInvoices = async () => {
  try {
    await AppDataSource.initialize();
    console.log("✅ Database connected for CCI Data Migration");

    const invoiceRepo = AppDataSource.getRepository(Invoice);
    const cciInvoiceRepo = AppDataSource.getRepository(CCIInvoice);
    const cciCustomerRepo = AppDataSource.getRepository(CCICustomer);
    const cciItemRepo = AppDataSource.getRepository(CCIItem);

    const closedInvoices = await invoiceRepo.find({
      where: [{ status: "paid" }, { status: "closed" }],
      relations: ["customer"],
    });

    console.log(`Found ${closedInvoices.length} closed/paid invoices to migrate...`);

    let migratedCount = 0;
    for (const inv of closedInvoices) {
      const existingCCI = await cciInvoiceRepo.findOne({
        where: [{ id: inv.id }, { invoice_number: inv.invoiceNumber }],
      });

      if (existingCCI) {
        console.log(`CCI Invoice ${inv.invoiceNumber} already exists -> Skipping`);
        continue;
      }

      let expandedData: any = null;
      try {
        const reqMock: any = { params: { id: inv.id } };
        const resMock: any = {
          json: (data: any) => data,
          status: () => resMock,
        };
        const nextMock: any = (err: any) => {
          console.error("Expanded details fetch error:", err);
        };
        const result: any = await InvoiceController.getInvoiceExpandedDetails(
          reqMock,
          resMock,
          nextMock,
        );
        if (result?.success) {
          expandedData = result.data;
        }
      } catch (err) {
        console.warn(`Could not fetch expanded details for invoice ${inv.id}:`, err);
      }

      const customer = inv.customer;
      let cciCustomer: CCICustomer | null = null;
      if (customer) {
        cciCustomer = cciCustomerRepo.create({
          original_customer_id: customer.id,
          company_name: customer.companyName || "N/A",
          email: customer.email || customer.contactEmail || "",
          tax_number: customer.taxNumber || "",
          bill_to_address: customer.addressLine1 || "",
          ship_to_address: expandedData?.cargo?.ship_to || customer.companyName || "",
          city: customer.city || "",
          country: customer.country || "",
          phone: customer.contactPhoneNumber || "",
        });
        await cciCustomerRepo.save(cciCustomer);
      }

      const cargoNo =
        expandedData?.cargo?.cargo_no ||
        (inv as any).cargoNo ||
        inv.orderNumber ||
        "";

      const cciInvoice = cciInvoiceRepo.create({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        order_number: inv.orderNumber,
        cargo_no: cargoNo,
        invoice_date: inv.invoiceDate || new Date(),
        delivery_date: inv.deliveryDate || new Date(),
        due_date: inv.dueDate,
        net_total: Number(inv.netTotal || 0),
        tax_amount: Number(inv.taxAmount || 0),
        gross_total: Number(inv.grossTotal || 0),
        freight_cost: Number(inv.freightCost || 0),
        description: inv.description || "",
        remark: inv.remark || "",
        status: inv.status || "closed",
        closed_at: inv.closedAt || new Date(),
        customer: cciCustomer,
      });

      await cciInvoiceRepo.save(cciInvoice);

      const itemsToSave: any[] = [];
      const detailedItems = expandedData?.detailedItems || [];

      if (detailedItems.length > 0) {
        detailedItems.forEach((it: any) => {
          const item = it.item;
          const ean = it._fallbackEan || item?.ean || "-";
          const itemName = item?.item_name || item?.name || it.description || "Invoice Item";
          const taricCode = it.set_taric_code || item?.taric?.code || "";
          const taricName = item?.taric?.name_en || item?.taric?.description_en || "";
          const dutyRate = Number(item?.taric?.duty_rate || 0);
          const qty = Number(it.qty || it.quantity || 1);
          const unitPrice = Number(it.eur_special_price || it._fallbackEk || it.unitPrice || 0);
          const totalPrice = qty * unitPrice;

          const validItemId = item?.id && !isNaN(Number(item.id)) && Number.isInteger(Number(item.id)) ? Number(item.id) : null;

          itemsToSave.push(
            cciItemRepo.create({
              cci_invoice: cciInvoice,
              item_id: validItemId,
              ean: String(ean),
              item_no_de: item?.item_no_de || "",
              item_name: String(itemName),
              taric_code: String(taricCode),
              taric_name_en: String(taricName),
              duty_rate: dutyRate,
              quantity: qty,
              unit_price: unitPrice,
              total_price: totalPrice,
              order_no: it.order?.order_no || inv.orderNumber || "",
              remark: it.remark_de || it.remarks_cn || "",
            }),
          );
        });
      } else if (inv.items && inv.items.length > 0) {
        inv.items.forEach((invItem: any) => {
          const validItemId = invItem.item_id && !isNaN(Number(invItem.item_id)) && Number.isInteger(Number(invItem.item_id)) ? Number(invItem.item_id) : null;
          itemsToSave.push(
            cciItemRepo.create({
              cci_invoice: cciInvoice,
              item_id: validItemId,
              ean: invItem.articleNumber || "-",
              item_name: invItem.description || "Invoice Item",
              quantity: Number(invItem.quantity || 1),
              unit_price: Number(invItem.unitPrice || 0),
              total_price: Number(invItem.grossPrice || 0),
              order_no: inv.orderNumber || "",
            }),
          );
        });
      }

      if (itemsToSave.length > 0) {
        await cciItemRepo.save(itemsToSave);
      }

      migratedCount++;
      console.log(`✅ Migrated closed invoice "${inv.invoiceNumber}" with ${itemsToSave.length} frozen items`);
    }

    console.log(`🎉 Successfully migrated ${migratedCount} closed invoices into CCI snapshot tables!`);
    await AppDataSource.destroy();
  } catch (error) {
    console.error("❌ CCI Data Migration failed:", error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
};

migrateClosedInvoices();