import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Rechnung } from "../models/rechnung";
import { RechnungCustomer } from "../models/rechnung_customer";
import { RechnungItem } from "../models/rechnung_items";
import { CustomerOrder } from "../models/customer_orders";
import { CustomerOrderItem } from "../models/customer_order_items";
import { Customer } from "../models/customers";
import { CCIInvoice } from "../models/cci_invoice";
import { CCICustomer } from "../models/cci_customer";
import { CCIItem } from "../models/cci_items";
import { NumberSequenceService } from "../services/number_sequence_service";

export const createRechnungFromAuftrag = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { auftragId } = req.params;
    const { selectedItems, notes, deliveryDate, warehouse } = req.body;

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

    let invoiceNo = "";
    try {
      invoiceNo = await NumberSequenceService.getNextNumber("invoice");
    } catch (err) {
      console.warn("Could not generate sequence number for invoice:", err);
      invoiceNo = `R${yy}${mm}-${Date.now().toString().slice(-4)}`;
    }

    let deliveryNoteNo = "";
    try {
      deliveryNoteNo = await NumberSequenceService.getNextNumber("delivery_note");
    } catch (err) {
      console.warn("Could not generate sequence number for delivery note:", err);
      deliveryNoteNo = `L${yy}${mm}-${Date.now().toString().slice(-4)}`;
    }

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
    const customerOrderItemRepo = AppDataSource.getRepository(CustomerOrderItem);

    for (const selItem of selectedItems) {
      const sourceLine = (auftrag.orderItems || []).find(
        (li) => String(li.id) === String(selItem.sourceLineItemId || selItem.lineItemId),
      );

      const qty = Number(selItem.qty || selItem.quantity || sourceLine?.quantity) || 1;
      const price = Number(selItem.price || sourceLine?.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      const itemName = selItem.itemName || sourceLine?.itemName || "Item";

      itemsToCreate.push({
        itemName: itemName,
        itemNo: selItem.itemNo || sourceLine?.material || undefined,
        qty: qty,
        price: price,
        lineTotal: lineTotal,
        notes: selItem.notes || sourceLine?.description || undefined,
      });
      if (sourceLine) {
        const currentQty = Number(sourceLine.quantity) || 0;
        const newRemainingQty = Math.max(0, currentQty - qty);
        sourceLine.quantity = newRemainingQty;
        sourceLine.lineTotal = newRemainingQty * Number(sourceLine.price || 0);
        await customerOrderItemRepo.save(sourceLine);
      }
    }

    const totalRemainingQty = (auftrag.orderItems || []).reduce(
      (sum, li) => sum + Number(li.quantity || 0),
      0,
    );
    if (totalRemainingQty <= 0) {
      auftrag.status = "Completed";
    } else {
      auftrag.status = "In Progress";
    }
    await customerOrderRepo.save(auftrag);

    const taxRate = Number(auftrag.tax_rate ?? 19);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const rechnungRepo = AppDataSource.getRepository(Rechnung);
    const rechnung = rechnungRepo.create({
      invoice_number: invoiceNo,
      auftrag_id: auftrag.id,
      auftrag_no: auftrag.order_no,
      invoice_date: now,
      delivery_date: deliveryDate ? new Date(deliveryDate) : undefined,
      warehouse: warehouse || "CN",
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

    const savedRechnung: Rechnung = await rechnungRepo.save(rechnung);

    const rechnungItemRepo = AppDataSource.getRepository(RechnungItem);
    const itemEntities = itemsToCreate.map((item) =>
      rechnungItemRepo.create({
        ...item,
        rechnung: savedRechnung,
        rechnungId: savedRechnung.id,
      }),
    );
    await rechnungItemRepo.save(itemEntities);

    try {
      const cciCustRepo = AppDataSource.getRepository(CCICustomer);
      const cciCust = cciCustRepo.create({
        original_customer_id: auftrag.customer_id ? String(auftrag.customer_id) : undefined,
        company_name: savedCustomerSnapshot.company_name,
        email: savedCustomerSnapshot.email,
        tax_number: savedCustomerSnapshot.tax_number,
        bill_to_address: savedCustomerSnapshot.bill_to_address,
        ship_to_address: savedCustomerSnapshot.ship_to_address,
        city: savedCustomerSnapshot.city,
        country: savedCustomerSnapshot.country,
        phone: savedCustomerSnapshot.phone,
      });
      const savedCciCust = await cciCustRepo.save(cciCust);

      const cciInvRepo = AppDataSource.getRepository(CCIInvoice);
      const cciInv = cciInvRepo.create({
        invoice_number: invoiceNo,
        order_number: auftrag.order_no,
        cargo_no: deliveryNoteNo || auftrag.order_no,
        invoice_date: now,
        delivery_date: deliveryDate ? new Date(deliveryDate) : now,
        due_date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        net_total: subtotal,
        tax_amount: taxAmount,
        gross_total: totalAmount,
        freight_cost: 0,
        description: notes || auftrag.notes || "",
        status: "open",
        customer: savedCciCust,
        cci_customer_id: savedCciCust.id,
      });
      const savedCciInv = await cciInvRepo.save(cciInv);

      const cciItemRepo = AppDataSource.getRepository(CCIItem);
      const cciItems = itemsToCreate.map((it) =>
        cciItemRepo.create({
          cci_invoice: savedCciInv,
          cci_invoice_id: savedCciInv.id,
          item_name: it.itemName || "Item",
          item_no_de: it.itemNo,
          quantity: it.qty || 1,
          unit_price: it.price || 0,
          total_price: it.lineTotal || 0,
          order_no: auftrag.order_no,
          remark: it.notes,
        }),
      );
      await cciItemRepo.save(cciItems);
    } catch (cciErr) {
      console.warn("Could not mirror to CCI tables:", cciErr);
    }

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
        itemName: it.itemName || "—",
        itemNo: it.itemNo || "—",
        quantity: it.qty || 0,
        remark: it.notes || "—",
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