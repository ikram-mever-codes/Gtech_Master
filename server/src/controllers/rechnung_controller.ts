import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Rechnung } from "../models/rechnung";
import { RechnungCustomer } from "../models/rechnung_customer";
import { RechnungItem } from "../models/rechnung_items";
import { CustomerOrder } from "../models/customer_orders";
import { Customer } from "../models/customers";
import { NumberSequenceService } from "../services/number_sequence_service";

export const createRechnungFromAuftrag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { auftragId } = req.params;
    const { selectedItems, notes } = req.body;

    if (!Array.isArray(selectedItems) || selectedItems.length === 0) {
      res.status(400).json({
        success: false,
        message: "Minimum 1 line item must be selected to generate a Rechnung",
      });
      return;
    }

    const customerOrderRepo = AppDataSource.getRepository(CustomerOrder);
    const auftrag = await customerOrderRepo.findOne({
      where: { id: Number(auftragId) },
      relations: ["orderItems", "customer"],
    });

    if (!auftrag) {
      res.status(404).json({ success: false, message: "Auftrag not found" });
      return;
    }

    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const defaultPrefix = `R${yy}${mm}-`;

    let invoiceNo = "";
    try {
      invoiceNo = await NumberSequenceService.getNextNumber("invoice");
    } catch (err) {
      console.warn("Could not generate sequence number for invoice:", err);
      invoiceNo = `${defaultPrefix}${Date.now().toString().slice(-4)}`;
    }

    // Prepare customer snapshot
    const custRepo = AppDataSource.getRepository(Customer);
    let originalCust: Customer | null = null;
    if (auftrag.customer_id) {
      originalCust = await custRepo.findOne({
        where: { id: auftrag.customer_id },
        relations: ["businessDetails"],
      });
    }

    const rechnungCustomerRepo = AppDataSource.getRepository(RechnungCustomer);
    const rechnungCustomer = rechnungCustomerRepo.create({
      original_customer_id: auftrag.customer_id || undefined,
      company_name:
        auftrag.customerSnapshot?.companyName ||
        originalCust?.companyName ||
        originalCust?.legalName ||
        "Customer",
      email: auftrag.customerSnapshot?.email || originalCust?.email || undefined,
      tax_number: auftrag.customerSnapshot?.vatId || originalCust?.vatTaxId || originalCust?.taxNumber || undefined,
      bill_to_address:
        auftrag.customerSnapshot?.address ||
        originalCust?.businessDetails?.address ||
        undefined,
      ship_to_address:
        auftrag.customerSnapshot?.street ||
        originalCust?.businessDetails?.address ||
        undefined,
      city: auftrag.customerSnapshot?.city || originalCust?.businessDetails?.city || undefined,
      country: auftrag.customerSnapshot?.country || originalCust?.country || undefined,
      phone: auftrag.customerSnapshot?.contactPhoneNumber || originalCust?.contactPhoneNumber || undefined,
    });
    const savedCustomerSnapshot = await rechnungCustomerRepo.save(rechnungCustomer);

    let subtotal = 0;
    const itemsToCreate: Partial<RechnungItem>[] = [];

    selectedItems.forEach((selItem: any) => {
      const sourceLine = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.sourceLineItemId || selItem.lineItemId),
      );

      const qty = Number(selItem.qty || selItem.quantity || sourceLine?.quantity) || 1;
      const price = Number(selItem.price || sourceLine?.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      const itemName = selItem.itemName || sourceLine?.itemName || "Item";

      itemsToCreate.push({
        item_name: itemName,
        item_no_de: selItem.itemNo || sourceLine?.material || undefined,
        quantity: qty,
        unit_price: price,
        total_price: lineTotal,
        order_no: auftrag.order_no,
        remark: selItem.notes || sourceLine?.description || undefined,
      });
    });

    const taxRate = Number(auftrag.tax_rate ?? 19);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = rechnungRepo.create({
      invoice_number: invoiceNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      invoice_date: now,
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      currency: auftrag.currency || "EUR",
      notes: notes || auftrag.notes || "",
      status: "open",
      customer: savedCustomerSnapshot,
      rechnung_customer_id: savedCustomerSnapshot.id,
    });

    const savedRechnung = await rechnungRepo.save(rechnung);

    const rechnungItemRepo = AppDataSource.getRepository(RechnungItem);
    const itemEntities = itemsToCreate.map((item) =>
      rechnungItemRepo.create({
        ...item,
        rechnung: savedRechnung,
        rechnung_id: savedRechnung.id,
      }),
    );
    await rechnungItemRepo.save(itemEntities);

    const fullRechnung = await rechnungRepo.findOne({
      where: { id: savedRechnung.id },
      relations: ["items", "customer"],
    });

    res.status(201).json({
      success: true,
      message: `Rechnung ${invoiceNo} created successfully`,
      data: fullRechnung,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRechnungen = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnungen = await rechnungRepo.find({
      order: { created_at: "DESC" },
      relations: ["items", "customer"],
    });

    res.json({
      success: true,
      data: rechnungen,
    });
  } catch (error) {
    next(error);
  }
};

export const getLieferscheine = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnungen = await rechnungRepo.find({
      order: { created_at: "DESC" },
      relations: ["items", "customer"],
    });

    // Map into Delivery Note items (omitting prices & tax)
    const lieferscheine = rechnungen.map((rec) => ({
      id: rec.id,
      deliveryNoteNo: rec.invoice_number.replace(/^R/, "LS"),
      invoiceNumber: rec.invoice_number,
      orderNumber: rec.auftrag_no,
      date: rec.invoice_date,
      customerName: rec.customer?.company_name || "—",
      city: rec.customer?.city || "—",
      country: rec.customer?.country || "—",
      itemCount: rec.items?.length || 0,
      items: (rec.items || []).map((it) => ({
        id: it.id,
        itemName: it.item_name,
        itemNo: it.item_no_de || "—",
        quantity: it.quantity,
        remark: it.remark,
      })),
    }));

    res.json({
      success: true,
      data: lieferscheine,
    });
  } catch (error) {
    next(error);
  }
};

export const getRechnungById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({
      where: { id },
      relations: ["items", "customer"],
    });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    res.json({
      success: true,
      data: rechnung,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRechnung = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = await rechnungRepo.findOne({ where: { id } });

    if (!rechnung) {
      res.status(404).json({ success: false, message: "Rechnung not found" });
      return;
    }

    await rechnungRepo.remove(rechnung);
    res.json({
      success: true,
      message: "Rechnung deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
