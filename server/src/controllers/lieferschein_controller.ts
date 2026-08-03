// src/controllers/lieferschein_controller.ts
import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Lieferschein } from "../models/lieferscheine";
import { Rechnung } from "../models/rechnung";
import path from "path";
import fs from "fs";
import { generateGtechDocumentPdf } from "../services/gtechPdfGenerator";
import { NumberSequenceService } from "../services/number_sequence_service";

/**
 * Create Lieferschein from Rechnung (called after Rechnung is created)
 */
export const createLieferscheinFromRechnung = async (
  rechnung: Rechnung,
  deliveryNoteNo: string,
): Promise<Lieferschein> => {
  const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);

  const now = new Date();
  const dateCreatedStr = `${now.getDate().toString().padStart(2, "0")}.${(
    now.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}.${now.getFullYear()}`;

  // Create Lieferschein
  const lieferschein = lieferscheinRepo.create({
    delivery_note_number: deliveryNoteNo,
    invoice_number: rechnung.invoice_number,
    auftrag_id: rechnung.auftrag_id,
    auftrag_no: rechnung.auftrag_no,
    order_number: rechnung.order_number,
    delivery_date: rechnung.delivery_date || now,
    date_created: dateCreatedStr,
    rechnung_id: rechnung.id,
    status: "open",
    notes: rechnung.notes,
    highlight_color: rechnung.highlight_color,
  });

  return await lieferscheinRepo.save(lieferschein);
};

/**
 * Get all Lieferscheine with Rechnung data
 * Fetches from Lieferschein table and joins Rechnung for items and customer data
 */
export const getAllLieferscheine = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferscheine = await lieferscheinRepo.find({
      order: { created_at: "DESC" },
      relations: ["rechnung", "rechnung.items", "rechnung.customer"],
    });

    // Transform to frontend-friendly format
    const formattedLieferscheine = lieferscheine.map((ls) => {
      const rechnung = ls.rechnung;
      const customer = rechnung?.customer;
      const items = rechnung?.items || [];

      return {
        id: ls.id,
        deliveryNoteNo: ls.delivery_note_number,
        invoiceNumber: ls.invoice_number,
        orderNumber: ls.auftrag_no || ls.order_number,
        date: ls.delivery_date,
        status: ls.status,
        customerName: customer?.company_name || "—",
        city: customer?.city || "",
        country: customer?.country || "",
        itemCount: items.length,
        items: items.map((item: any) => ({
          id: item.id,
          itemName: item.item_name || "—",
          itemNo: item.itemNo || "—",
          quantity: item.quantity,
          remark: item.remark || item.notes,
          weight: item.weight,
          photo: item.photo,
        })),
        highlightColor: ls.highlight_color,
        createdAt: ls.created_at,
        rechnungId: rechnung?.id,
      };
    });

    res.json({
      success: true,
      data: formattedLieferscheine,
    });
  } catch (error) {
    console.error("Error fetching Lieferscheine:", error);
    next(error);
  }
};

/**
 * Get Lieferschein by ID with Rechnung data
 */
export const getLieferscheinById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferschein = await lieferscheinRepo.findOne({
      where: { id },
      relations: ["rechnung", "rechnung.items", "rechnung.customer"],
    });

    if (!lieferschein) {
      res.status(404).json({
        success: false,
        message: "Lieferschein not found",
      });
      return;
    }

    // Build response with Rechnung data
    const rechnung = lieferschein.rechnung;
    const customer = rechnung?.customer;
    const items = rechnung?.items || [];

    const response = {
      id: lieferschein.id,
      deliveryNoteNo: lieferschein.delivery_note_number,
      invoiceNumber: lieferschein.invoice_number,
      orderNumber: lieferschein.auftrag_no || lieferschein.order_number,
      date: lieferschein.delivery_date,
      status: lieferschein.status,
      notes: lieferschein.notes,
      highlightColor: lieferschein.highlight_color,
      rechnungId: rechnung?.id,
      customer: {
        companyName: customer?.company_name || "—",
        email: customer?.email || "",
        taxNumber: customer?.tax_number || "",
        billToAddress: customer?.bill_to_address || "",
        shipToAddress: customer?.ship_to_address || "",
        city: customer?.city || "",
        country: customer?.country || "",
        phone: customer?.phone || "",
      },
      items: items.map((item) => ({
        id: item.id,
        itemName: item.item_name || "—",
        itemNo: item.itemNo || "—",
        material: item.material || "",
        photo: item.photo || "",
        specification: item.specification || "",
        description: item.description || "",
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.total_price,
        weight: item.weight,
        extraWeight: item.extraWeight,
        position: item.position,
        remark: item.remark || item.notes,
        sourceLineItemId: item.sourceLineItemId,
        sourceItemId: item.sourceItemId,
        orderNo: item.order_no,
      })),
      createdAt: lieferschein.created_at,
      updatedAt: lieferschein.updated_at,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Lieferschein status
 */
export const updateLieferscheinStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: "Status is required",
      });
      return;
    }

    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferschein = await lieferscheinRepo.findOne({
      where: { id },
    });

    if (!lieferschein) {
      res.status(404).json({
        success: false,
        message: "Lieferschein not found",
      });
      return;
    }

    lieferschein.status = status;
    await lieferscheinRepo.save(lieferschein);

    res.json({
      success: true,
      message: "Lieferschein status updated successfully",
      data: lieferschein,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Lieferschein delivery date
 */
export const updateLieferscheinDeliveryDate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const { deliveryDate } = req.body;

    if (!deliveryDate) {
      res.status(400).json({
        success: false,
        message: "Delivery date is required",
      });
      return;
    }

    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferschein = await lieferscheinRepo.findOne({
      where: { id },
    });

    if (!lieferschein) {
      res.status(404).json({
        success: false,
        message: "Lieferschein not found",
      });
      return;
    }

    lieferschein.delivery_date = new Date(deliveryDate);
    await lieferscheinRepo.save(lieferschein);

    res.json({
      success: true,
      message: "Delivery date updated successfully",
      data: lieferschein,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Lieferschein
 */
export const deleteLieferschein = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferschein = await lieferscheinRepo.findOne({
      where: { id },
    });

    if (!lieferschein) {
      res.status(404).json({
        success: false,
        message: "Lieferschein not found",
      });
      return;
    }

    await lieferscheinRepo.remove(lieferschein);

    res.json({
      success: true,
      message: "Lieferschein deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const downloadLieferscheinPdf = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const lieferscheinRepo = AppDataSource.getRepository(Lieferschein);
    const lieferschein = await lieferscheinRepo.findOne({
      where: [{ id: String(id) }, { delivery_note_number: String(id) }],
      relations: ["rechnung", "rechnung.items", "rechnung.customer"],
    });

    if (!lieferschein) {
      res.status(404).json({ success: false, message: "Lieferschein not found" });
      return;
    }

    const rechnung = lieferschein.rechnung;
    const customerSnap = rechnung?.customerSnapshot || rechnung?.customer || {};
    const contactName = (req as any).user?.name || (req as any).user?.username || "Admin";
    const customerCompName = (customerSnap.company_name || customerSnap.companyName || customerSnap.legalName || "").trim();
    const customerNum = (customerSnap.customerNumber || "").trim();
    let kundeCombined = "—";
    if (customerCompName && customerNum) kundeCombined = `${customerCompName} · ${customerNum}`;
    else if (customerCompName) kundeCombined = customerCompName;
    else if (customerNum) kundeCombined = customerNum;

    const uploadsDir = path.join(__dirname, "../../uploads/lieferscheine");
    const filePath = path.join(uploadsDir, `ls_${lieferschein.delivery_note_number || lieferschein.id}.pdf`);

    const items = (rechnung?.items || []).map((it: any, idx: number) => ({
      position: it.position || idx + 1,
      artNr: it.itemNo || it.material || "—",
      bezeichnung: it.item_name || it.description || "Item",
      remarks: it.remark || it.notes || "-",
      quantity: Number(it.quantity || 1),
    }));

    await generateGtechDocumentPdf({
      documentType: "Lieferschein",
      documentNumber: lieferschein.delivery_note_number,
      customerSnapshot: customerSnap,
      customerEntity: rechnung?.customer,
      deliveryAddress: rechnung?.deliveryAddress,
      metadataItems: [
        ["Ansprechpartner", contactName],
        ["Kunde", kundeCombined],
        ["Datum", lieferschein.date_created || lieferschein.created_at || lieferschein.delivery_date],
      ],
      lineItems: items,
      showPrices: false,
      shippingMethod: rechnung?.shipping_method,
      notes: lieferschein.notes || rechnung?.notes,
      deliveryTime: rechnung?.date_delivery,
      deliveryTerms: rechnung?.delivery_terms,
      outputFilePath: filePath,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=lieferschein_${lieferschein.delivery_note_number}.pdf`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};
