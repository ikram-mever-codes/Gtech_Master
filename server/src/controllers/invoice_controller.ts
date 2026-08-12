import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { Invoice, InvoiceItem } from "../models/invoice";
import { CCICustomer } from "../models/cci_customer";
import { CCIInvoice } from "../models/cci_invoice";
import { CCIItem } from "../models/cci_items";
import { Cargo } from "../models/cargos";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Taric } from "../models/tarics";
import { CargoOrder } from "../models/cargo_orders";
import { In, Like } from "typeorm";
import { getRMBPriceFromSupplier } from "./items_controller";
import { _cachedCjkFontPath, _cachedCjkFontBuffer } from "./order_controller";
import { NumberSequenceService } from "../services/number_sequence_service";
import { generateInvoicesForOrders } from "./cargo_controller";

const calculateDueDate = (
  deliveryDate: Date | string,
  dueDays: number,
): Date => {
  const base =
    typeof deliveryDate === "string" ? new Date(deliveryDate) : deliveryDate;
  const due = new Date(base);
  due.setDate(due.getDate() + dueDays);
  return due;
};

const isStreetAddress = (str?: string | null): boolean => {
  if (!str) return false;
  const s = str.trim().toLowerCase();
  return (
    /\b(stra[ßs]e|str\.|street|st\.|weg|platz|road|rd\.|avenue|ave|gasse|hof|allee|damm|ring|pfad)\b/i.test(
      s,
    ) ||
    (/\d+/.test(s) &&
      /\b(stra[ßs]e|str|weg|platz|road|avenue|gasse|hof|allee|damm|ring)\b/i.test(
        s,
      ))
  );
};

export class InvoiceController {
  static createInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const customerRepository = AppDataSource.getRepository(Customer);
    const itemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { customerId, ...invoiceData } = req.body;

      const orderNumber = invoiceData.orderNumber;
      if (!orderNumber) {
        return res
          .status(400)
          .json({ message: "Order Number/Cargo Number is required" });
      }

      const cargoRepo = AppDataSource.getRepository(Cargo);
      const orderRepo = AppDataSource.getRepository(Order);

      let associatedCargo = await cargoRepo.findOne({
        where: { cargo_no: orderNumber },
      });

      if (!associatedCargo) {
        const order = await orderRepo.findOne({
          where: { order_no: orderNumber },
          relations: ["cargo"],
        });
        if (order && order.cargo) {
          associatedCargo = order.cargo;
        }
      }

      if (!associatedCargo) {
        return res.status(400).json({
          message:
            "Invoice cannot be created because the provided Order Number/Cargo Number is not assigned to any Cargo.",
        });
      }

      const customer = await customerRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      const dueDays =
        customer.defaultPaymentDueDays !== undefined &&
          customer.defaultPaymentDueDays !== null
          ? customer.defaultPaymentDueDays
          : 7;

      const dueDate = invoiceData.deliveryDate
        ? calculateDueDate(invoiceData.deliveryDate, dueDays)
        : undefined;

      const invoice = invoiceRepository.create({
        ...invoiceData,
        dueDate,
        customer,
      });
      const savedInvoice: any = await invoiceRepository.save(invoice);

      if (req.body.items && req.body.items.length > 0) {
        const items = req.body.items.map((item: any) => {
          return itemRepository.create({
            ...item,
            invoice: savedInvoice,
          });
        });
        await itemRepository.save(items);
      }

      const completeInvoice = await invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ["customer", "items"],
      });

      const pdfUrl =
        await InvoiceController.generateInvoicePDF(completeInvoice);
      await invoiceRepository.update(savedInvoice.id, { pdfUrl });

      return res.status(201).json({
        success: true,
        data: { ...completeInvoice, pdfUrl },
        message: "Invoice created successfully!",
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static generateInvoicePDF = async (invoice: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);

        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
        });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 50;

        const leftAlignX = margin;
        const rightAlignX = 350;
        const centerColumnX = 200;
        const rightColumnX = 420;

        const companyInfo = {
          name: "GTech Industries GmbH",
          address: "Antonio-Segni-Str. 4",
          city: "44263 Dortmund",
          country: "Deutschland",
          phone: "+4923158697565",
          email: "info@gtech-industries.de",
          website: "www.gtech-shop.de",
          registrationNumber: "Amtsgericht Dortmund HRB38470",
          ceo: "Geschäftsführer Joschua Grenzheuser",
          vatId: "DE291514916",
          taxNumber: "316/5733/1295",
          weeeNumber: "DE 66370256",
          iban: "DE16 4404 0037 0210 9288 00",
          bic: "COBADEFFXXX",
          bank: "Commerzbank Dortmund",
        };

        let yPos = 50;

        const logoPath = path.join(process.cwd(), "assets", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, leftAlignX, yPos, { fit: [100, 50] });
        }

        const fontSource = _cachedCjkFontBuffer || _cachedCjkFontPath;
        if (fontSource) {
          try {
            const chineseAddress =
              "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
            doc
              .font(fontSource, 0)
              .fontSize(8)
              .text(chineseAddress, leftAlignX + 220, yPos, {
                lineBreak: false,
              });
            doc.font("Helvetica");
          } catch (e: any) {
            console.error(`[CJK-DEBUG] Render failed:`, e.message);
            if (process.platform === "win32") {
              try {
                doc
                  .font("C:\\Windows\\Fonts\\msyh.ttc", 0)
                  .fontSize(8)
                  .text("中国安徽...", leftAlignX + 220, yPos);
              } catch (e) { }
            }
            doc.font("Helvetica");
          }
        } else {
          console.warn(
            "[CJK-DEBUG] No CJK font path cached — Chinese will show as boxes!",
          );
        }
        doc.fontSize(12).font("Helvetica-Bold");
        doc.text(companyInfo.name, rightAlignX, yPos);

        yPos += 15;
        doc.fontSize(10).font("Helvetica");
        doc.text(companyInfo.address, rightAlignX, yPos);
        yPos += 12;
        doc.text(companyInfo.city, rightAlignX, yPos);
        yPos += 12;
        doc.text(companyInfo.country, rightAlignX, yPos);

        yPos += 15;
        doc.text("Telefon:", rightAlignX, yPos);
        doc.text(companyInfo.phone, rightAlignX + 50, yPos);
        yPos += 12;
        doc.text("Email:", rightAlignX, yPos);
        doc.text(companyInfo.email, rightAlignX + 50, yPos);
        yPos += 12;
        doc.text("Shop:", rightAlignX, yPos);
        doc.text(companyInfo.website, rightAlignX + 50, yPos);
        yPos = 180;
        doc.fontSize(8).font("Helvetica");
        doc.fillColor("#666666");
        doc.text(
          `${companyInfo.name} - ${companyInfo.address} - ${companyInfo.city}`,
          leftAlignX,
          yPos,
        );

        if (fontSource) {
          try {
            const chineseAddress =
              "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
            doc
              .font(fontSource, 0)
              .fontSize(8)
              .text(chineseAddress, leftAlignX + 220, yPos, {
                lineBreak: false,
              });
            doc.font("Helvetica");
          } catch (e: any) {
            console.error("[CJK-DEBUG] Render failed:", e.message);
            doc.font("Helvetica");
          }
        }

        yPos += 20;
        doc.fontSize(12).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text(
          invoice.customer?.companyName || "Internal / ETL Order",
          leftAlignX,
          yPos,
        );

        yPos += 15;
        doc.fontSize(10).font("Helvetica");
        doc.text(invoice.customer?.addressLine1 || "", leftAlignX, yPos);
        yPos += 12;
        doc.text(
          `${invoice.customer?.postalCode || ""} ${invoice.customer?.city || ""
            }`.trim(),
          leftAlignX,
          yPos,
        );
        const boxY = 180;
        const boxWidth = 180;
        const boxHeight = 120;

        doc.lineWidth(0.3);
        doc.rect(rightAlignX, boxY, boxWidth, boxHeight).stroke("#CCCCCC");
        doc
          .rect(rightAlignX, boxY, boxWidth, 30)
          .fillAndStroke("#CCCCCC", "#CCCCCC");
        doc.fontSize(15).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text("Rechnung", rightAlignX + 5, boxY + 8);

        const detailsStartY = boxY + 40;
        doc.fontSize(10).font("Helvetica");

        const invoiceDetails = [
          ["Rechnungsnr.", invoice.invoiceNumber || ""],
          ["Auftragsnr.", invoice.orderNumber || ""],
          ["Datum", new Date(invoice.invoiceDate).toLocaleDateString("de-DE")],
          [
            "Lieferdatum",
            new Date(invoice.deliveryDate).toLocaleDateString("de-DE"),
          ],
          [
            "Fälligkeitsdatum",
            invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString("de-DE")
              : "-",
          ],
          ["Kundennr.", invoice.customer?.id?.substring(0, 8) || "N/A"],
        ];

        invoiceDetails.forEach((detail, index) => {
          const detailY = detailsStartY + index * 15;
          doc.text(detail[0], rightAlignX + 10, detailY);
          doc.font("Helvetica-Bold");
          doc.text(detail[1], rightAlignX + 90, detailY);
          doc.font("Helvetica");
        });

        yPos = 320;
        doc.fontSize(10).font("Helvetica");
        doc.text("Lieferdatum", leftAlignX, yPos);
        doc.text(
          `Auftrags Nr: ${invoice.orderNumber || ""}`,
          leftAlignX + 250,
          yPos,
        );

        yPos += 20;
        const tableY = yPos;

        const columns = [
          { header: "Menge", width: 45, align: "left" },
          { header: "Art. Nr.", width: 50, align: "left" },
          { header: "Bezeichnung", width: 180, align: "left" },
          { header: "Gesamt\n(Netto)", width: 55, align: "left" },
          { header: "MwSt", width: 55, align: "left" },
          { header: "E-Preis", width: 55, align: "left" },
          { header: "Gesamt\n(Brutto)", width: 55, align: "left" },
        ];

        const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
        const rowHeight = 20;
        const headerHeight = 35;

        doc.lineWidth(0.3);
        doc
          .rect(leftAlignX, tableY, tableWidth, headerHeight)
          .fillAndStroke("#E8E8E8", "#333333");
        doc.fontSize(9).font("Helvetica-Bold");
        doc.fillColor("#000000");
        let currentX = leftAlignX;
        columns.forEach((col) => {
          doc.text(col.header, currentX + 3, tableY + 8, {
            width: col.width - 6,
            align: col.align as "center" | "left" | "right" | "justify",
          });
          currentX += col.width;
        });

        doc.lineWidth(0.3);
        doc
          .moveTo(leftAlignX, tableY + headerHeight)
          .lineTo(leftAlignX + tableWidth, tableY + headerHeight)
          .stroke("#333333");

        doc.fontSize(9).font("Helvetica");
        invoice.items.forEach((item: any, rowIndex: number) => {
          const rowY = tableY + headerHeight + rowIndex * rowHeight;
          if (rowIndex % 2 === 1) {
            doc.rect(leftAlignX, rowY, tableWidth, rowHeight).fill("#FAFAFA");
          }

          const rowData = [
            Number(item.quantity || 1).toString(),
            item.articleNumber || "",
            `${item.taxRate || 19}%`,
            (() => {
              let up = 0;
              if (
                item.unitPrice !== undefined &&
                item.unitPrice !== null &&
                Number(item.unitPrice) !== 0
              )
                up = Number(item.unitPrice);
              else if (
                item.item?.transfer_price_EUR !== undefined &&
                item.item?.transfer_price_EUR !== null
              )
                up = Number(item.item.transfer_price_EUR);
              else up = Number(item.unitPrice || 0);
              return up.toFixed(2);
            })(),
            Number(item.grossPrice || 0).toFixed(2),
          ];

          currentX = leftAlignX;
          rowData.forEach((data, colIndex) => {
            const align: any = columns[colIndex].align;
            let textX = currentX + 3;

            if (align === "right") {
              textX = currentX + columns[colIndex].width - 3;
            } else if (align === "center") {
              textX = currentX + columns[colIndex].width / 2;
            }

            doc.fillColor("#000000");
            doc.text(data, textX, rowY + 6, {
              width: columns[colIndex].width - 6,
              align: align,
            });
            currentX += columns[colIndex].width;
          });

          if (rowIndex < invoice.items.length - 1) {
            doc.lineWidth(0.5);
            doc
              .moveTo(leftAlignX, rowY + rowHeight)
              .lineTo(leftAlignX + tableWidth, rowY + rowHeight)
              .stroke("#E0E0E0");
          }
        });

        const tableBottomY =
          tableY + headerHeight + invoice.items.length * rowHeight;
        doc.lineWidth(0.3);
        doc
          .moveTo(leftAlignX, tableBottomY)
          .lineTo(leftAlignX + tableWidth, tableBottomY)
          .stroke("#333333");

        yPos = tableBottomY + 30;

        doc.fontSize(10).font("Helvetica");
        doc.text("Gesamtpreis Netto", rightAlignX, yPos);
        doc.text(
          `${Number(invoice.netTotal || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos,
          { align: "right" },
        );

        yPos += 18;
        doc.text("MwSt. 19,00%", rightAlignX, yPos);
        doc.text(
          `${Number(invoice.taxAmount || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos,
          { align: "right" },
        );

        yPos += 20;
        doc.lineWidth(0.3);
        doc
          .rect(rightAlignX - 5, yPos - 3, 200, 22)
          .fillAndStroke("#F5F5F5", "#CCCCCC");
        doc.fontSize(11).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text("Gesamtpreis Brutto", rightAlignX, yPos + 5);
        doc.text(
          `${Number(invoice.grossTotal || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos + 5,
          { align: "right" },
        );

        if (invoice.paidAmount > 0) {
          yPos += 35;
          doc.fontSize(10).font("Helvetica");
          doc.text(
            `Zahlung (Vorkasse Überweisung) vom ${new Date().toLocaleDateString(
              "de-DE",
            )}`,
            rightAlignX,
            yPos,
          );
          doc.text(
            `${Number(invoice.paidAmount).toFixed(2)} €`,
            rightAlignX + 120,
            yPos,
            { align: "right" },
          );

          yPos += 15;
          doc.font("Helvetica-Bold");
          doc.text("offener Betrag", rightAlignX, yPos);
          doc.text(
            `${Number(invoice.outstandingAmount || 0).toFixed(2)} €`,
            rightAlignX + 120,
            yPos,
            { align: "right" },
          );
        }

        yPos += 40;
        doc.fontSize(10).font("Helvetica");

        if (invoice.customer?.taxNumber) {
          doc.text(
            `Ihre USt-IdNr: ${invoice.customer.taxNumber}`,
            leftAlignX,
            yPos,
          );
          yPos += 15;
        }

        doc.text(
          `Zahlungsart: ${invoice.paymentMethod?.replace("_", " ") || "Kauf-auf-Rechnung"
          }`,
          leftAlignX,
          yPos,
        );
        yPos += 15;
        doc.text(
          `Versandart: ${invoice.shippingMethod?.replace("_", " ") || "Standard-Versand"
          }`,
          leftAlignX,
          yPos,
        );
        yPos += 15;
        const dueDays =
          invoice.customer?.defaultPaymentDueDays !== undefined &&
            invoice.customer?.defaultPaymentDueDays !== null
            ? invoice.customer.defaultPaymentDueDays
            : 7;
        const dueDateLabel = invoice.dueDate
          ? new Date(invoice.dueDate).toLocaleDateString("de-DE")
          : "";
        doc.text(
          dueDateLabel
            ? `Zahlungsziel: ${dueDays} Tage (fällig bis ${dueDateLabel})`
            : `Zahlungsziel: ${dueDays} Tage`,
          leftAlignX,
          yPos,
        );
        if (invoice.notes) {
          yPos += 15;
          doc.text(`Hinweise: ${invoice.notes}`, leftAlignX, yPos);
        }

        yPos += 25;
        doc.text(
          "Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit. Wir freuen uns über Ihre Weiterempfehlung.",
          leftAlignX,
          yPos,
        );

        const footerY = pageHeight - 120;

        doc.lineWidth(0.5);
        doc
          .moveTo(leftAlignX, footerY - 15)
          .lineTo(pageWidth - margin, footerY - 15)
          .stroke("#CCCCCC");

        doc.fontSize(8).font("Helvetica");

        doc.font("Helvetica-Bold");
        doc.text(companyInfo.name, leftAlignX, footerY);
        doc.font("Helvetica");
        doc.text(`IBAN: ${companyInfo.iban}`, leftAlignX, footerY + 12);
        doc.text(`BIC: ${companyInfo.bic}`, leftAlignX, footerY + 24);
        doc.text(companyInfo.bank, leftAlignX, footerY + 36);

        doc.text(companyInfo.registrationNumber, centerColumnX, footerY);
        doc.text(companyInfo.ceo, centerColumnX, footerY + 12);
        doc.text(`Ust.-ID: ${companyInfo.vatId}`, centerColumnX, footerY + 24);
        doc.text(
          `SteuerNR: ${companyInfo.taxNumber}`,
          centerColumnX,
          footerY + 36,
        );
        doc.text(
          `WEEE-Reg.-Nr. ${companyInfo.weeeNumber}`,
          centerColumnX,
          footerY + 48,
        );

        doc.text(`Auftrags Nr:`, rightColumnX, footerY);
        doc.font("Helvetica-Bold");
        doc.text(`${invoice.orderNumber || "N/A"}`, rightColumnX + 60, footerY);
        doc.font("Helvetica");
        doc.text("1/1", rightColumnX + 60, footerY + 48);

        doc.end();

        stream.on("finish", () => {
          resolve(`/uploads/${fileName}`);
        });

        stream.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  };
  static downloadInvoicePDF = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { invoiceId } = req.params;
      const invoiceRepository = AppDataSource.getRepository(Invoice);

      const invoice = await invoiceRepository.findOne({
        where: { id: invoiceId },
        relations: ["customer", "items"],
      });

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!invoice.pdfUrl) {
        const pdfUrl = await InvoiceController.generateInvoicePDF(invoice);
        await invoiceRepository.update(invoiceId, { pdfUrl });
        invoice.pdfUrl = pdfUrl;
      }

      let filePath = path.join(process.cwd(), invoice.pdfUrl);

      if (!fs.existsSync(filePath)) {
        console.warn(
          `[Invoice] PDF file missing for invoice ${invoice.invoiceNumber}, regenerating...`,
        );
        try {
          const newPdfUrl = await InvoiceController.generateInvoicePDF(invoice);
          await invoiceRepository.update(invoiceId, { pdfUrl: newPdfUrl });
          invoice.pdfUrl = newPdfUrl;
          filePath = path.join(process.cwd(), newPdfUrl);
        } catch (genError) {
          console.error(
            `[Invoice] PDF regeneration failed for ${invoice.invoiceNumber}:`,
            genError,
          );
          return res.status(500).json({
            message:
              "PDF file could not be found or regenerated. Please contact support.",
          });
        }
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`,
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static updateInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const itemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { id } = req.params;
      const { items, ...invoiceData } = req.body;

      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["items", "customer"],
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoiceData.deliveryDate) {
        const dueDays =
          invoice.customer?.defaultPaymentDueDays !== undefined &&
            invoice.customer?.defaultPaymentDueDays !== null
            ? invoice.customer.defaultPaymentDueDays
            : 7;
        invoiceData.dueDate = calculateDueDate(
          invoiceData.deliveryDate,
          dueDays,
        );
      }

      if (
        invoiceData.description !== undefined &&
        !invoiceData.description.trim()
      ) {
        return res.status(400).json({ message: "Description is required" });
      }
      if (
        invoiceData.freightCost !== undefined &&
        (invoiceData.freightCost === null ||
          Number(invoiceData.freightCost) <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Freight Cost must be greater than 0" });
      }
      invoiceRepository.merge(invoice, invoiceData);
      const updatedInvoice = await invoiceRepository.save(invoice);

      if (items) {
        await itemRepository.delete({ invoice: invoice });

        const newItems = items.map((item: any) => {
          return itemRepository.create({
            ...item,
            invoice: updatedInvoice,
          });
        });
        await itemRepository.save(newItems);
      }

      const completeInvoice = await invoiceRepository.findOne({
        where: { id: updatedInvoice.id },
        relations: ["customer", "items"],
      });

      return res.json(completeInvoice);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static deleteInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const invoiceItemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { id } = req.params;

      await invoiceItemRepository.delete({ invoice: { id } });

      const result = await invoiceRepository.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res
        .status(204)
        .json({ success: true, message: "Invoice Deleted Successfully" });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static getAllInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);

    try {
      try {
        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);
        const orderItemRepo = AppDataSource.getRepository(OrderItem);

        const [cargoOrders, itemsWithCargo] = await Promise.all([
          cargoOrderRepo.find({ select: ["cargo_id", "order_id"] }),
          orderItemRepo
            .createQueryBuilder("oi")
            .select(["oi.cargo_id", "oi.order_id"])
            .where("oi.cargo_id IS NOT NULL")
            .getMany(),
        ]);

        const cIds = [
          ...new Set([
            ...cargoOrders.map((co) => co.cargo_id),
            ...itemsWithCargo.map((oi) => oi.cargo_id!),
          ]),
        ].filter(Boolean);

        const oIds = [
          ...new Set([
            ...cargoOrders.map((co) => co.order_id),
            ...itemsWithCargo.map((oi) => oi.order_id!),
          ]),
        ].filter(Boolean);

        if (cIds.length > 0 || oIds.length > 0) {
          console.log(
            `[InvoiceSync] Triggering auto-sync for ${cIds.length} cargos (${cIds.join(", ")}) and ${oIds.length} orders...`,
          );
          await generateInvoicesForOrders(oIds, cIds);
        }
      } catch (syncErr) {
        console.warn(
          "[InvoiceSync] Auto-syncing cargo invoices on getAllInvoices encountered warning:",
          syncErr,
        );
      }

      const invoices = await invoiceRepository.find({
        relations: [
          "customer",
          "customer.businessDetails",
          "customer.starCustomerDetails",
          "items",
        ],
        order: { invoiceDate: "DESC" },
      });

      console.log(
        `[InvoiceController.getAllInvoices] Fetched ${invoices.length} total invoice records from DB.`,
      );

      const orderNumbers = invoices.map((i) => i.orderNumber).filter(Boolean);
      const orders = await AppDataSource.getRepository(Order).find({
        where: { order_no: In(orderNumbers) },
        relations: ["cargo", "cargo.customer"],
      });

      const orderIds = orders.map((o) => o.id);
      const orderToCargoMap = new Map();

      if (orderIds.length > 0) {
        const cargoOrders = await AppDataSource.getRepository(CargoOrder).find({
          where: { order_id: In(orderIds) },
          relations: ["cargo", "order", "cargo.customer"],
        });
        cargoOrders.forEach((co) => {
          if (co.cargo && co.order) {
            orderToCargoMap.set(co.order.order_no, co.cargo);
          }
        });
      }

      const allCargos = await AppDataSource.getRepository(Cargo).find({
        relations: ["customer"],
      });
      allCargos.forEach((c) => {
        if (c.cargo_no) {
          orderToCargoMap.set(c.cargo_no, c);
        }
      });

      orders.forEach((o) => {
        if (o.cargo && !orderToCargoMap.has(o.order_no)) {
          orderToCargoMap.set(o.order_no, o.cargo);
        }
      });

      const allCargoIds = allCargos.map((c) => c.id).filter(Boolean);
      const cargoCommentMap = new Map<string, string>();
      if (allCargoIds.length > 0) {
        const allCargoOrders = await AppDataSource.getRepository(
          CargoOrder,
        ).find({
          where: { cargo_id: In(allCargoIds) },
          relations: ["cargo", "order"],
        });
        allCargoOrders.forEach((co) => {
          if (
            co.cargo?.cargo_no &&
            co.order?.comment &&
            !cargoCommentMap.has(co.cargo.cargo_no)
          ) {
            cargoCommentMap.set(co.cargo.cargo_no, co.order.comment);
          }
        });
      }

      const orderItemsRaw = await AppDataSource.manager.query(`
        SELECT 
          oi.order_id, 
          oi.cargo_id, 
          SUM(oi.qty) as total_qty, 
          COUNT(oi.id) as count_items,
          SUM(oi.qty * COALESCE(
            NULLIF(oi.eur_special_price, 0), 
            NULLIF(oi.price, 0), 
            NULLIF(i."transfer_price (EUR)", 0),
            NULLIF(i.price, 0), 
            CASE WHEN oi.rmb_special_price > 0 THEN oi.rmb_special_price * 0.13 ELSE 0 END,
            0
          )) as total_price
        FROM order_item oi
        LEFT JOIN item i ON i.id = oi.item_id
        GROUP BY oi.order_id, oi.cargo_id
      `);

      const orderItemSummaryByOrderId = new Map();
      const orderItemSummaryByCargoId = new Map();
      orderItemsRaw.forEach((row: any) => {
        if (row.order_id) {
          const current = orderItemSummaryByOrderId.get(row.order_id) || {
            total_qty: 0,
            count_items: 0,
            total_price: 0,
          };
          orderItemSummaryByOrderId.set(row.order_id, {
            total_qty: current.total_qty + Number(row.total_qty),
            count_items: current.count_items + Number(row.count_items),
            total_price: current.total_price + Number(row.total_price),
          });
        }
        if (row.cargo_id) {
          const current = orderItemSummaryByCargoId.get(row.cargo_id) || {
            total_qty: 0,
            count_items: 0,
            total_price: 0,
          };
          orderItemSummaryByCargoId.set(row.cargo_id, {
            total_qty: current.total_qty + Number(row.total_qty),
            count_items: current.count_items + Number(row.count_items),
            total_price: current.total_price + Number(row.total_price),
          });
        }
      });

      const orderIdMap = new Map();
      orders.forEach((o) => orderIdMap.set(o.order_no, o.id));

      const data = invoices
        .map((inv) => {
          const cargo = orderToCargoMap.get(inv.orderNumber);

          let customItemCount = 0;
          let customTotalQty = 0;
          let itemsTotalPrice = 0;

          if (cargo && orderItemSummaryByCargoId.has(cargo.id)) {
            const stats = orderItemSummaryByCargoId.get(cargo.id);
            customItemCount = stats.count_items;
            customTotalQty = stats.total_qty;
            itemsTotalPrice = Number(stats.total_price || 0);
          } else if (inv.orderNumber && orderIdMap.has(inv.orderNumber)) {
            const orderId = orderIdMap.get(inv.orderNumber);
            if (orderItemSummaryByOrderId.has(orderId)) {
              const stats = orderItemSummaryByOrderId.get(orderId);
              customItemCount = stats.count_items;
              customTotalQty = stats.total_qty;
              itemsTotalPrice = Number(stats.total_price || 0);
            }
          }
          if (customItemCount === 0 && inv.items) {
            customItemCount = inv.items.length;
            customTotalQty = inv.items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0,
            );
          }
          if (itemsTotalPrice === 0 && inv.items && inv.items.length > 0) {
            itemsTotalPrice = inv.items.reduce(
              (sum, item) =>
                sum +
                Number(item.quantity || 0) *
                Number(item.unitPrice || item.netPrice || (item as any).price || 0),
              0,
            );
          }

          const freight = Number(inv.freightCost || 0);
          let calculatedGrossTotal = 0;
          if (itemsTotalPrice > 0) {
            calculatedGrossTotal = itemsTotalPrice + freight;
          } else {
            const dbGross = Number(inv.grossTotal || 0);
            if (dbGross > freight) {
              calculatedGrossTotal = dbGross;
            } else if (dbGross > 0 && freight > 0) {
              calculatedGrossTotal = dbGross + freight;
            } else {
              calculatedGrossTotal = Math.max(dbGross, freight);
            }
          }

          const cargoNo =
            cargo?.cargo_no ||
            (inv.orderNumber && !orderIdMap.has(inv.orderNumber)
              ? inv.orderNumber
              : undefined);

          const order = orders.find((o) => o.order_no === inv.orderNumber);
          const orderComment =
            order?.comment ||
            cargoCommentMap.get(cargo?.cargo_no || "") ||
            cargoCommentMap.get(inv.orderNumber || "") ||
            "";

          const rawBillTo = "GTech Industries GmbH";

          const shipCompanyCandidate =
            typeof cargo?.ship_to_company_name === "string" &&
              cargo.ship_to_company_name.trim().length > 1 &&
              !isStreetAddress(cargo.ship_to_company_name)
              ? cargo.ship_to_company_name.trim()
              : typeof cargo?.ship_to_display_name === "string" &&
                cargo.ship_to_display_name.trim().length > 1 &&
                !isStreetAddress(cargo.ship_to_display_name)
                ? cargo.ship_to_display_name.trim()
                : undefined;

          const rawShipTo =
            shipCompanyCandidate ||
            inv.customer?.companyName ||
            cargo?.customer?.companyName ||
            inv.customer?.legalName ||
            "-";

          return {
            ...inv,
            grossTotal: calculatedGrossTotal,
            bill_to: rawBillTo,
            ship_to: rawShipTo,
            customItemCount,
            customTotalQty,
            cargoNo: cargoNo || inv.orderNumber,
            cargoId: cargo?.id || null,
            cargo_id: cargo?.id || null,
            cargo: cargo ? { id: cargo.id, cargo_no: cargo.cargo_no } : null,
            orderComment,
          };
        })
        .filter((inv): inv is any => inv !== null);

      const finalDataMap = new Map();
      data.forEach((inv) => {
        finalDataMap.set(inv.id, inv);
      });

      const cciInvoiceRepo = AppDataSource.getRepository(CCIInvoice);
      const cciInvoices = await cciInvoiceRepo.find({
        relations: ["customer", "items"],
        order: { invoice_date: "DESC" },
      });

      const zeroItemIds = new Set<number>();
      cciInvoices.forEach((cci) => {
        (cci.items || []).forEach((it) => {
          if (Number(it.unit_price || 0) === 0 && it.item_id) {
            zeroItemIds.add(Number(it.item_id));
          }
        });
      });
      const masterItemPriceMap = new Map<number, number>();
      if (zeroItemIds.size > 0) {
        try {
          const masterItems = await AppDataSource.getRepository(Item).find({
            where: { id: In([...zeroItemIds]) },
            select: ["id", "transfer_price_EUR", "price", "sales_price"],
          });
          masterItems.forEach((m) => {
            const p =
              Number(m.transfer_price_EUR || 0) ||
              Number(m.price || 0) ||
              Number(m.sales_price || 0);
            masterItemPriceMap.set(m.id, p);
          });
        } catch (e) {
          console.warn("Could not batch-fetch item master prices for CCI display:", e);
        }
      }

      cciInvoices.forEach((cci) => {
        const customItemCount = cci.items?.length || 0;
        const customTotalQty =
          cci.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0;
        const cargoNo = cci.cargo_no || cci.order_number || "";

        const itemsSum = (cci.items || []).reduce(
          (s, it) => {
            const qty = Number(it.quantity || 0);
            let unitPrice =
              Number(it.unit_price || 0) ||
              Number((it as any).price || 0) ||
              Number((it as any).unitPrice || 0) ||
              Number((it as any).net_price || 0) ||
              Number((it as any).total_price || 0);
            // For old invoices where price was saved as 0, use Item Master transfer price
            if (unitPrice === 0 && it.item_id && masterItemPriceMap.has(Number(it.item_id))) {
              unitPrice = masterItemPriceMap.get(Number(it.item_id))!;
            }
            return s + qty * unitPrice;
          },
          0,
        );
        const freight = Number(cci.freight_cost || 0);
        let cciGrossTotal = 0;
        if (itemsSum > 0) {
          cciGrossTotal = itemsSum + freight;
        } else {
          const dbGross = Number(cci.gross_total || 0);
          if (dbGross > freight) {
            cciGrossTotal = dbGross;
          } else if (dbGross > 0 && freight > 0) {
            cciGrossTotal = dbGross + freight;
          } else {
            cciGrossTotal = Math.max(dbGross, freight);
          }
        }

        finalDataMap.set(cci.id, {
          id: cci.id,
          invoiceNumber: cci.invoice_number,
          orderNumber: cci.order_number,
          invoiceDate: cci.invoice_date,
          deliveryDate: cci.delivery_date,
          dueDate: cci.due_date,
          netTotal: Number(cci.net_total || 0),
          taxAmount: Number(cci.tax_amount || 0),
          grossTotal: cciGrossTotal,
          freightCost: Number(cci.freight_cost || 0),
          description: cci.description || "",
          remark: cci.remark || "",
          status: cci.status || "closed",
          bill_to: "GTech Industries GmbH",
          ship_to:
            cci.customer?.company_name ||
            (cci.customer?.ship_to_address &&
              !isStreetAddress(cci.customer.ship_to_address)
              ? cci.customer.ship_to_address
              : "-"),
          customItemCount,
          customTotalQty,
          cargoNo: cargoNo,
          cargoId: cargoNo || null,
          cargo_id: cargoNo || null,
          cargo: cargoNo ? { id: cargoNo, cargo_no: cargoNo } : null,
          customer: cci.customer
            ? {
              id: cci.customer.original_customer_id || cci.customer.id,
              companyName: cci.customer.company_name,
              email: cci.customer.email,
            }
            : null,
          items: cci.items,
        });
      });

      return res
        .status(200)
        .json({ success: true, data: Array.from(finalDataMap.values()) });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static getInvoiceById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);

    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["customer", "items"],
      });

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      return res.json({ success: true, data: invoice });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static getInvoicesByCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);

    try {
      const { customerId } = req.params;
      const invoices = await invoiceRepository.find({
        where: { customer: { id: customerId } },
        relations: ["items"],
        order: { invoiceDate: "DESC" },
      });

      return res.json(invoices);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static fetchExpandedDetailsData = async (invoiceId: string) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const cargoRepository = AppDataSource.getRepository(Cargo);
    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);
    const cciInvoiceRepo = AppDataSource.getRepository(CCIInvoice);

    const cciInvoice = await cciInvoiceRepo.findOne({
      where: [{ id: invoiceId }, { invoice_number: invoiceId }],
      relations: ["customer", "items"],
    });

    if (cciInvoice) {
      const detailedItems = await Promise.all(
        (cciInvoice.items || []).map(async (ci) => {
          let itemPrice =
            Number(ci.unit_price || 0) ||
            Number((ci as any).price || 0) ||
            Number((ci as any).unitPrice || 0) ||
            Number((ci as any).net_price || 0) ||
            Number((ci as any).netPrice || 0);

          let masterItem: any = null;
          if (ci.item_id) {
            try {
              masterItem = await AppDataSource.getRepository(Item).findOne({
                where: { id: Number(ci.item_id) },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }
          if (!masterItem && ci.item_name) {
            try {
              masterItem = await AppDataSource.getRepository(Item).findOne({
                where: { item_name: ci.item_name.trim() },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }
          if (!masterItem && ci.ean && ci.ean !== "-" && ci.ean !== "Unknown") {
            try {
              masterItem = await AppDataSource.getRepository(Item).findOne({
                where: { ean: ci.ean.trim() },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }

          if (itemPrice === 0 && masterItem) {
            let rmbPrice = 0;
            if (masterItem.purchasePrices && masterItem.purchasePrices.length > 0) {
              const pp = masterItem.purchasePrices.find(
                (p: any) => Number(p.unit_price_cny) > 0,
              );
              if (pp) rmbPrice = Number(pp.unit_price_cny);
            }
            itemPrice =
              Number(masterItem.transfer_price_EUR || 0) ||
              Number(masterItem["transfer_price (EUR)"] || 0) ||
              Number(masterItem.price || 0) ||
              Number(masterItem.sales_price || 0) ||
              (rmbPrice > 0 ? rmbPrice * 0.13 : 0);
          }

          const finalEan =
            ci.ean && ci.ean !== "-" && ci.ean !== "Unknown"
              ? ci.ean
              : masterItem?.ean || "-";

          return {
            id: ci.id,
            qty: Number(ci.quantity || 0),
            quantity: Number(ci.quantity || 0),
            eur_special_price: itemPrice,
            price: itemPrice,
            unit_price: itemPrice,
            unitPrice: itemPrice,
            _fallbackEan: finalEan,
            _fallbackEk: itemPrice,
            set_taric_code: ci.taric_code || masterItem?.taric?.code || null,
            remark_de: ci.remark || "",
            item: {
              id: masterItem?.id || ci.item_id,
              item_name: masterItem?.item_name || ci.item_name,
              ean: finalEan,
              taric: ci.taric_code || masterItem?.taric?.code
                ? {
                  code: ci.taric_code || masterItem?.taric?.code,
                  name_en:
                    ci.taric_name_en ||
                    masterItem?.taric?.name_en ||
                    masterItem?.item_name ||
                    ci.item_name,
                  duty_rate: Number(
                    ci.duty_rate || masterItem?.taric?.duty_rate || 0,
                  ),
                }
                : null,
            },
            order: { order_no: ci.order_no || cciInvoice.order_number },
          };
        }),
      );

      const taricGroupsMap = new Map();
      detailedItems.forEach((oi: any) => {
        const code = oi.set_taric_code || oi.item?.taric?.code || "-";
        const groupKey = `hs_${code}`;
        if (!taricGroupsMap.has(groupKey)) {
          taricGroupsMap.set(groupKey, {
            taricId: groupKey,
            taricNameEn:
              oi.item?.taric?.name_en || oi.item?.item_name || "Project Item",
            taricCode: code,
            dutyRate: Number(oi.item?.taric?.duty_rate ?? 0),
            totalQty: 0,
            totalPrice: 0,
            unitPrice: 0,
            isProjectItem: !code || code === "-" || code === "0",
          });
        }
        const group = taricGroupsMap.get(groupKey);
        group.totalQty += Number(oi.qty || 0);
        group.totalPrice +=
          Number(oi.qty || 0) * Number(oi._fallbackEk || oi.eur_special_price || 0);
      });

      const linkedInv = await invoiceRepository.findOne({ where: { id: cciInvoice.id } });
      let cciTotalGross = Number(
        cciInvoice.gross_total ||
          cciInvoice.net_total ||
          linkedInv?.grossTotal ||
          linkedInv?.netTotal ||
          0,
      );
      if (cciTotalGross === 0 && detailedItems.length > 0) {
        cciTotalGross = detailedItems.reduce(
          (s, it) => s + Number(it.qty || 0) * Number(it.eur_special_price || 0),
          0,
        ) + Number(cciInvoice.freight_cost || 0);
      }

      let taricGroups = Array.from(taricGroupsMap.values());
      const sumTaricPrice = taricGroups.reduce((s, g) => s + (g.totalPrice || 0), 0);
      const sumTaricQty = taricGroups.reduce((s, g) => s + (g.totalQty || 0), 0);

      if (sumTaricPrice === 0 && cciTotalGross > 0 && sumTaricQty > 0) {
        const freight = Number(cciInvoice.freight_cost || 0);
        const netForTaric = Math.max(0, cciTotalGross - freight);
        const targetAmount = netForTaric;
        taricGroups.forEach((g) => {
          g.totalPrice = (g.totalQty / sumTaricQty) * targetAmount;
        });

        const totalDetailedQty = detailedItems.reduce((s, it) => s + Number(it.qty || 0), 0);
        if (totalDetailedQty > 0) {
          detailedItems.forEach((it) => {
            const itemNet = (Number(it.qty || 0) / totalDetailedQty) * netForTaric;
            it.eur_special_price = Number(it.qty || 0) > 0 ? itemNet / Number(it.qty || 0) : 0;
            it.price = itemNet;
            it.unit_price = it.eur_special_price;
            it.unitPrice = it.eur_special_price;
            it._fallbackEk = it.eur_special_price;
          });
        }
      }

      taricGroups = taricGroups.map((g: any) => {
        g.unitPrice = g.totalQty > 0 ? (g.totalPrice / g.totalQty).toFixed(2) : "0.00";
        return g;
      });

      const effectiveFreight = Number(cciInvoice.freight_cost || 0);
      const effectiveGross = cciTotalGross > 0 ? cciTotalGross : (sumTaricPrice + effectiveFreight);

      return {
        invoice: {
          id: cciInvoice.id,
          invoiceNumber: cciInvoice.invoice_number,
          orderNumber: cciInvoice.order_number,
          invoiceDate: cciInvoice.invoice_date,
          deliveryDate: cciInvoice.delivery_date,
          dueDate: cciInvoice.due_date,
          netTotal: cciInvoice.net_total || Math.max(0, effectiveGross - effectiveFreight),
          taxAmount: cciInvoice.tax_amount,
          grossTotal: effectiveGross,
          freightCost: effectiveFreight,
          description: cciInvoice.description,
          remark: cciInvoice.remark,
          status: cciInvoice.status,
          customer: cciInvoice.customer
            ? {
              id:
                cciInvoice.customer.original_customer_id ||
                cciInvoice.customer.id,
              companyName: cciInvoice.customer.company_name,
              email: cciInvoice.customer.email,
            }
            : null,
        },
        cargo: cciInvoice.cargo_no
          ? {
            id: cciInvoice.cargo_no,
            cargo_no: cciInvoice.cargo_no,
            ship_to:
              cciInvoice.customer?.company_name ||
              cciInvoice.customer?.ship_to_address ||
              null,
            bill_to: "GTech Industries GmbH",
          }
          : null,
        orderNosInCargo: [cciInvoice.order_number].filter(Boolean),
        detailedItems,
        taricGroups,
      };
    }

    const invoice = await invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ["customer", "items", "items.item", "items.item.taric"],
    });

    if (!invoice) return null;

    const orderNumber = invoice.orderNumber || "";
    let orderItems: any[] = [];
    let cargo: any = null;

    if (orderNumber) {
      cargo = await cargoRepository.findOne({
        where: { cargo_no: orderNumber },
      });

      if (!cargo) {
        cargo = await cargoRepository.findOne({
          where: { cargo_no: Like(`%${orderNumber}%`) },
        });
      }

      if (!cargo) {
        const tokens = orderNumber
          .split(/[\s\-\/]+/)
          .filter((t: string) => t.length > 2);
        for (const token of tokens) {
          cargo = await cargoRepository.findOne({
            where: [{ cargo_no: token }, { cargo_no: Like(`%${token}%`) }],
          });
          if (cargo) break;
        }
      }
    }

    if (cargo) {
      const cargoOrders = await AppDataSource.getRepository(CargoOrder).find({
        where: { cargo_id: cargo.id },
      });
      const orderIdsFromCargoOrders = cargoOrders
        .map((co) => co.order_id)
        .filter(Boolean);

      const ordersInCargo = await orderRepository.find({
        where: [{ cargo_id: cargo.id }],
      });
      const orderIdsFromOrders = ordersInCargo.map((o) => o.id).filter(Boolean);

      const allOrderIds = [
        ...new Set([...orderIdsFromCargoOrders, ...orderIdsFromOrders]),
      ];

      const whereConditions: any[] = [{ cargo_id: cargo.id }];
      if (allOrderIds.length > 0) {
        whereConditions.push({ order_id: In(allOrderIds) });
      }

      orderItems = await orderItemRepository.find({
        where: whereConditions,
        relations: ["item", "item.taric", "item.purchasePrices", "order"],
      });
    }

    if (orderItems.length === 0 && orderNumber) {
      const tokens = [
        orderNumber,
        ...orderNumber.split(/[\s\-\/]+/).filter((t: string) => t.length > 2),
      ];
      const uniqueTokens = [...new Set(tokens)];

      const matchingOrders = await orderRepository.find({
        where: uniqueTokens.map((t) => ({ order_no: Like(`%${t}%`) })),
      });

      if (matchingOrders.length > 0) {
        const matchingOrderIds = matchingOrders.map((o) => o.id);
        const foundCargoOrder = await AppDataSource.getRepository(
          CargoOrder,
        ).findOne({
          where: { order_id: In(matchingOrderIds) },
          relations: ["cargo"],
        });
        if (foundCargoOrder?.cargo) {
          cargo = foundCargoOrder.cargo;
        }

        orderItems = await orderItemRepository.find({
          where: { order_id: In(matchingOrderIds) },
          relations: ["item", "item.taric", "item.purchasePrices", "order"],
        });
      }
    }

    if (orderItems.length > 0) {
      const itemMap = new Map();
      orderItems.forEach((oi) => itemMap.set(oi.id, oi));
      orderItems = Array.from(itemMap.values());
    }

    if (orderItems.length === 0 && invoice.items && invoice.items.length > 0) {
      orderItems = invoice.items.map((invItem: any) => {
        const p = Number(
          invItem.unitPrice ||
          invItem.netPrice ||
          invItem.unit_price ||
          invItem.price ||
          0,
        );
        return {
          id: invItem.id,
          qty: Number(invItem.quantity || 0),
          price: p,
          eur_special_price: p,
          unit_price: p,
          unitPrice: p,
          item: invItem.item || {
            id:
              invItem.item_id && !isNaN(Number(invItem.item_id))
                ? Number(invItem.item_id)
                : null,
            item_name: invItem.description || "Invoice Item",
            ean: invItem.articleNumber || "-",
            taric: null,
          },
          set_taric_code: null,
        };
      });
    }

    const getEffectiveTaricCode = (oi: any): string => {
      const itemTaricCode = oi.item?.taric?.code || "";
      const rawCode = oi.set_taric_code
        ? oi.set_taric_code.toString()
        : itemTaricCode;
      if (rawCode) {
        const codes = rawCode.split("/");
        return codes.length > 1 ? codes[1].trim() : codes[0].trim();
      }
      return "unknown";
    };

    const getGroupKey = (oi: any): string => {
      const itemTaricCode = oi.item?.taric?.code || "";
      const isProjectItem =
        !itemTaricCode ||
        itemTaricCode === "0" ||
        itemTaricCode === "0000000000";

      if (oi.set_taric_code) {
        const codes = oi.set_taric_code.split("/");
        const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
        return `hs_${target}`;
      }
      const taricId = oi.item?.taric?.id;
      if (taricId && !isProjectItem) {
        return `hs_${itemTaricCode}`;
      }
      return `item_${oi.item?.id || Math.random()}`;
    };

    const manualTaricCodes: string[] = [];
    orderItems.forEach((oi: any) => {
      if (oi.set_taric_code) {
        const codes = oi.set_taric_code.split("/");
        codes.forEach((c: string) => {
          if (c && c.trim()) manualTaricCodes.push(c.trim());
        });
      }
    });

    const uniqueManualCodes = [...new Set(manualTaricCodes)];
    const manualTarics =
      uniqueManualCodes.length > 0
        ? await AppDataSource.getRepository(Taric).find({
          where: { code: In(uniqueManualCodes) },
        })
        : [];
    const manualTaricMap = new Map(manualTarics.map((t) => [t.code, t]));

    const itemsWithFallbacks = await Promise.all(
      [...orderItems].map(async (oi: any) => {
        let item = oi.item;
        const itemId = item?.id || oi.item_id;

        if (!item) {
          if (itemId) {
            try {
              item = await AppDataSource.getRepository(Item).findOne({
                where: { id: Number(itemId) },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }
          if (!item && oi.item_name) {
            try {
              item = await AppDataSource.getRepository(Item).findOne({
                where: { item_name: oi.item_name.trim() },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }
          if (!item && oi.ean && oi.ean !== "-" && oi.ean !== "Unknown") {
            try {
              item = await AppDataSource.getRepository(Item).findOne({
                where: { ean: oi.ean.trim() },
                relations: ["taric", "purchasePrices"],
              });
            } catch (e) { }
          }
        }

        const ean = item?.ean || oi._fallbackEan || "-";

        let rmbPrice = oi.rmb_special_price || 0;
        if (!rmbPrice && itemId) {
          rmbPrice =
            (await getRMBPriceFromSupplier(
              Number(itemId),
              oi.supplier_id || item?.supplier_id,
            )) || 0;
        }
        if (!rmbPrice && item?.purchasePrices && item.purchasePrices.length > 0) {
          const pp = item.purchasePrices.find(
            (p: any) => Number(p.unit_price_cny) > 0,
          );
          if (pp) rmbPrice = Number(pp.unit_price_cny);
        }

        let eurPrice =
          Number(oi.eur_special_price || 0) ||
          Number(oi.price || 0) ||
          Number(oi.unit_price || 0) ||
          Number(oi.unitPrice || 0) ||
          Number(oi.netPrice || 0) ||
          Number(item?.transfer_price_EUR || 0) ||
          Number((item as any)?.["transfer_price (EUR)"] || 0) ||
          Number(item?.price || 0) ||
          Number(item?.sales_price || 0) ||
          0;
        if (!eurPrice && rmbPrice) {
          eurPrice = Number(rmbPrice) * 0.13;
        }

        return {
          ...oi,
          item: item || oi.item,
          v:
            ((item?.length || 0) * (item?.width || 0) * (item?.height || 0)) /
            1000 || 0,
          w: item?.weight || 0,
          _effectiveTaricCode: getEffectiveTaricCode(oi),
          _fallbackEan: ean,
          _fallbackRmb: rmbPrice,
          _fallbackEk: eurPrice,
        };
      }),
    );

    const taricGroupsMap = new Map<string, any>();
    itemsWithFallbacks.forEach((oi: any) => {
      const item = oi.item;
      const taric = item?.taric;
      const itemTaricCode = taric?.code || "";
      const isProjectItem =
        !itemTaricCode ||
        itemTaricCode === "0" ||
        itemTaricCode === "0000000000";
      const groupKey = getGroupKey(oi);

      if (!taricGroupsMap.has(groupKey)) {
        let displayCode = oi.item?.taric?.code || "-";
        let displayName =
          taric?.name_en || (isProjectItem ? "Project Item" : "Unknown");
        let displayRate = Number(taric?.duty_rate || 0);

        if (oi.set_taric_code) {
          const codes = oi.set_taric_code.split("/");
          const targetCode =
            codes.length > 1 ? codes[1].trim() : codes[0].trim();
          displayCode = targetCode;

          const mTaric = manualTaricMap.get(targetCode);
          if (mTaric) {
            displayName = mTaric.name_en || displayName;
            displayRate =
              mTaric.duty_rate !== undefined
                ? Number(mTaric.duty_rate)
                : displayRate;
          }
        }

        taricGroupsMap.set(groupKey, {
          taricId: groupKey,
          taricNameEn: displayName,
          taricCode: displayCode,
          dutyRate: displayRate,
          totalQty: 0,
          totalPrice: 0,
          unitPrice: 0,
          isProjectItem,
        });
      }

      const group = taricGroupsMap.get(groupKey)!;
      group.totalQty += Number(oi.qty) || 0;
      const currentPrice = Number(oi._fallbackEk) || 0;
      group.totalPrice += (Number(oi.qty) || 0) * currentPrice;
    });

    let invoiceGross = Number(invoice.grossTotal || invoice.netTotal || 0);
    if (invoiceGross === 0 && itemsWithFallbacks.length > 0) {
      invoiceGross = itemsWithFallbacks.reduce(
        (s, it) => s + Number(it.qty || 0) * Number(it._fallbackEk || 0),
        0,
      ) + Number(invoice.freightCost || 0);
    }

    let taricGroups = Array.from(taricGroupsMap.values());
    const sumTaricPrice = taricGroups.reduce((s, g) => s + (g.totalPrice || 0), 0);
    const sumTaricQty = taricGroups.reduce((s, g) => s + (g.totalQty || 0), 0);

    if (sumTaricPrice === 0 && invoiceGross > 0 && sumTaricQty > 0) {
      const freight = Number(invoice.freightCost || 0);
      const netForTaric = Math.max(0, invoiceGross - freight);
      const targetAmount = netForTaric;
      taricGroups.forEach((g) => {
        g.totalPrice = (g.totalQty / sumTaricQty) * targetAmount;
      });
    }

    taricGroups = taricGroups.map((g: any) => {
      g.unitPrice = g.totalQty > 0 ? (g.totalPrice / g.totalQty).toFixed(2) : "0.00";
      return g;
    });

    return {
      invoice,
      cargo,
      orderNosInCargo: [orderNumber].filter(Boolean),
      detailedItems: itemsWithFallbacks,
      taricGroups,
    };
  };
  static getInvoiceExpandedDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const data = await InvoiceController.fetchExpandedDetailsData(id);

      if (!data) {
        return res
          .status(404)
          .json({ success: false, message: "Invoice not found" });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static updatePackingListData = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    try {
      const { id } = req.params;
      const { packingListData } = req.body;
      const invoice = await invoiceRepository.findOne({ where: { id } });
      if (!invoice)
        return res.status(404).json({ message: "Invoice not found" });

      invoice.packingListData = packingListData;
      await invoiceRepository.save(invoice);

      return res.json({
        success: true,
        message: "Packing list data updated successfully",
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static downloadPackingListPDF = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const orderRepository = AppDataSource.getRepository(Order);
    const cargoRepository = AppDataSource.getRepository(Cargo);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);
    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["customer", "items", "items.item"],
      });

      if (!invoice)
        return res.status(404).json({ message: "Invoice not found" });

      const doc = new PDFDocument({ margin: 30, size: "A4" });
      const filename = `Packing_List_${invoice.invoiceNumber}.pdf`;

      res.setHeader(
        "Content-disposition",
        `attachment; filename="${filename}"`,
      );
      res.setHeader("Content-type", "application/pdf");
      doc.pipe(res);

      let items: any[] = [];
      let orderComment = "";

      if (
        invoice.packingListData &&
        Array.isArray(invoice.packingListData) &&
        invoice.packingListData.length > 0
      ) {
        items = invoice.packingListData;
      } else {
        const orderNumber = invoice.orderNumber;
        let orderItems: any[] = [];

        let cargo = await cargoRepository.findOne({
          where: { cargo_no: orderNumber },
        });
        if (!cargo && orderNumber) {
          cargo = await cargoRepository.findOne({
            where: { cargo_no: Like(`%${orderNumber}%`) },
          });
        }

        if (cargo) {
          const cargoOrders = await AppDataSource.getRepository(
            CargoOrder,
          ).find({
            where: { cargo_id: cargo.id },
          });
          const orderIdsFromCargo = cargoOrders
            .map((co) => co.order_id)
            .filter(Boolean);

          const whereConditions: any[] = [{ cargo_id: cargo.id }];
          if (orderIdsFromCargo.length > 0) {
            whereConditions.push({ order_id: In(orderIdsFromCargo) });
          }

          orderItems = await orderItemRepository.find({
            where: whereConditions,
            relations: ["item", "item.taric", "order"],
          });

          const itemMap = new Map();
          orderItems.forEach((oi) => itemMap.set(oi.id, oi));
          orderItems = Array.from(itemMap.values());
        } else {
          const order = await orderRepository.findOne({
            where: { order_no: orderNumber },
          });
          if (order) {
            orderComment = order.comment || "";
            orderItems = await orderItemRepository.find({
              where: { order_id: order.id },
              relations: ["item", "item.taric", "order"],
            });
          }
        }

        if (!orderComment && orderItems.length > 0) {
          orderComment =
            orderItems.find((oi: any) => oi.order?.comment)?.order?.comment ||
            "";
          if (!orderComment) {
            const distinctOrderIds = [
              ...new Set(
                orderItems.map((oi: any) => oi.order_id).filter(Boolean),
              ),
            ];
            if (distinctOrderIds.length > 0) {
              const relatedOrders = await orderRepository.find({
                where: { id: In(distinctOrderIds as number[]) },
              });
              orderComment =
                relatedOrders.find((o: any) => o.comment)?.comment || "";
            }
          }
        }

        items = orderItems.map((oi: any, idx: number) => {
          const item = oi.item;
          const taric = item?.taric;
          const desc =
            taric?.description_en || taric?.name_en || item?.item_name || "";
          return {
            id: oi.id || idx,
            description: desc,
            qty: Number(oi.qty || 0),
            client: "",
            package: `P${idx + 1}`,
            pType: "Tray",
            weight: Number(item?.weight || 0),
            length: Number(item?.length || 0),
            width: Number(item?.width || 0),
            height: Number(item?.height || 0),
          };
        });
      }

      const extractClients = (comment: string): string => {
        if (!comment) return "";
        const tokens: string[] = [];
        const gtechMatch = comment.match(/\b(GTECH-[A-Z0-9]+)\b/i);
        if (gtechMatch) tokens.push(gtechMatch[1].toUpperCase());
        const kMatch = comment.match(/\b(K0\d{2,})\b/i);
        if (kMatch) tokens.push(kMatch[1].toUpperCase());
        return tokens.join(" / ");
      };

      const derivedClient = extractClients(orderComment);
      if (derivedClient) {
        items = items.map((it: any) => ({
          ...it,
          client: it.client || derivedClient,
        }));
      }

      const formatGermanDate = (dateVal: any): string => {
        if (!dateVal) return "";
        const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
        if (!(d instanceof Date) || isNaN(d.getTime())) return String(dateVal);
        return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
      };

      const cargoNo = invoice.orderNumber || "N/A";
      const dateStr = formatGermanDate(invoice.invoiceDate);

      doc.rect(30, 30, 535, 20).stroke();
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("GTech Industries Limited", 30, 37, {
          align: "center",
          width: 535,
        });

      doc.rect(30, 50, 535, 15).stroke();
      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Yongxin Road, Bowang Town, Bowang, Maanshan, Anhui, China",
          30,
          54,
          { align: "center", width: 535 },
        );
      doc.rect(30, 65, 535, 15).fillAndStroke("#f0f0f0", "#000000");
      doc
        .fillColor("#000000")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("Packing List", 30, 69, { align: "center", width: 535 });
      doc.fillColor("#000000");

      const RX = 430;
      const RL = 60;
      const RV = 75;
      const RW = RL + RV;
      const LW = 535 - RW;
      doc.rect(30, 80, LW, 15).stroke();
      doc.fontSize(8).font("Helvetica-Bold").text("Buyer:", 35, 84);
      doc.moveTo(75, 80).lineTo(75, 95).stroke();
      doc.rect(RX, 80, RW, 15).stroke();
      doc.text("Invoice No.:", RX + 3, 84, { width: RL - 3 });
      doc
        .moveTo(RX + RL, 80)
        .lineTo(RX + RL, 95)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .text(invoice.invoiceNumber, RX + RL + 3, 84, { width: RV - 5 });

      doc.rect(30, 95, LW, 20).stroke();
      doc
        .fillColor("#000000")
        .fontSize(8)
        .font("Helvetica")
        .text("GTech Industries GmbH", 35, 101);

      doc.rect(RX, 95, RW, 20).stroke();
      doc
        .fillColor("#000000")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("Cargo No.", RX + 3, 101, { width: RL - 3 });
      doc
        .moveTo(RX + RL, 95)
        .lineTo(RX + RL, 115)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .text(cargoNo, RX + RL + 3, 101, { width: RV - 5 });

      doc.rect(30, 115, LW, 15).stroke();
      doc
        .fontSize(8)
        .text(
          "Antonio-Segni-Str. 4 44263 Dortmund Germany, Tel: +4923158697565",
          35,
          119,
        );

      doc.rect(RX, 115, RW, 15).stroke();
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .text("Date:", RX + 3, 119, { width: RL - 3 });
      doc
        .moveTo(RX + RL, 115)
        .lineTo(RX + RL, 130)
        .stroke();
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(dateStr, RX + RL + 3, 119, { width: RV - 5 });

      doc.rect(30, 130, LW, 15).stroke();
      doc.text("Mr. Markus Entner", 35, 134);
      doc.rect(RX, 130, RW, 15).stroke();

      let itemY = 155;
      const colWidths = {
        desc: 215,
        qty: 35,
        client: 45,
        pack: 55,
        weight: 60,
        measure: 65,
        volume: 55,
      };
      const colX = {
        desc: 30,
        qty: 30 + colWidths.desc,
        client: 30 + colWidths.desc + colWidths.qty,
        pack: 30 + colWidths.desc + colWidths.qty + colWidths.client,
        weight:
          30 +
          colWidths.desc +
          colWidths.qty +
          colWidths.client +
          colWidths.pack,
        measure:
          30 +
          colWidths.desc +
          colWidths.qty +
          colWidths.client +
          colWidths.pack +
          colWidths.weight,
        volume:
          30 +
          colWidths.desc +
          colWidths.qty +
          colWidths.client +
          colWidths.pack +
          colWidths.weight +
          colWidths.measure,
      };

      doc.rect(30, itemY, 535, 30).stroke();
      doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
      doc.text("Description of goods", colX.desc, itemY + 10, {
        width: colWidths.desc,
        align: "center",
      });
      doc.text("QTY", colX.qty, itemY + 10, {
        width: colWidths.qty,
        align: "center",
      });
      doc.text("Clients", colX.client, itemY + 10, {
        width: colWidths.client,
        align: "center",
      });
      doc.text("Packages", colX.pack, itemY + 10, {
        width: colWidths.pack,
        align: "center",
      });
      doc.text("Weight (kg)", colX.weight, itemY + 10, {
        width: colWidths.weight,
        align: "center",
      });
      doc.text("Measure (cm)", colX.measure, itemY + 4, {
        width: colWidths.measure,
        align: "center",
      });
      doc.rect(colX.measure, itemY + 15, colWidths.measure, 15).stroke();
      doc.text("L", colX.measure, itemY + 19, {
        width: colWidths.measure / 3,
        align: "center",
      });
      doc.text("B", colX.measure + colWidths.measure / 3, itemY + 19, {
        width: colWidths.measure / 3,
        align: "center",
      });
      doc.text("H", colX.measure + (colWidths.measure / 3) * 2, itemY + 19, {
        width: colWidths.measure / 3,
        align: "center",
      });
      doc.text("Total Volume (cbm)", colX.volume, itemY + 4, {
        width: colWidths.volume,
        align: "center",
      });

      doc
        .moveTo(colX.qty, itemY)
        .lineTo(colX.qty, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.client, itemY)
        .lineTo(colX.client, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.pack, itemY)
        .lineTo(colX.pack, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.weight, itemY)
        .lineTo(colX.weight, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.measure, itemY)
        .lineTo(colX.measure, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.measure + colWidths.measure / 3, itemY + 15)
        .lineTo(colX.measure + colWidths.measure / 3, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY + 15)
        .lineTo(colX.measure + (colWidths.measure / 3) * 2, itemY + 30)
        .stroke();
      doc
        .moveTo(colX.volume, itemY)
        .lineTo(colX.volume, itemY + 30)
        .stroke();

      itemY += 30;
      doc.font("Helvetica");

      let totalQty = 0;
      let grandTotalWeight = 0;
      let grandTotalVolume = 0;
      const clientTotals: Record<
        string,
        { weight: number; volume: number; label: string }
      > = {};

      for (const item of items) {
        const rowHeight = 25;
        if (itemY + rowHeight > 750) {
          doc.addPage();
          itemY = 50;
        }

        const qty = Number(item.qty || 0);
        const wt = Number(item.weight || 0);
        const len = Number(item.length || 0);
        const wid = Number(item.width || 0);
        const ht = Number(item.height || 0);
        const volume = (qty * len * wid * ht) / 1_000_000;
        totalQty += qty;
        grandTotalWeight += wt;
        grandTotalVolume += volume;

        const client =
          item.client && item.client.trim() ? item.client.trim() : "";
        const clientKey = client || "__unknown__";
        if (!clientTotals[clientKey])
          clientTotals[clientKey] = { weight: 0, volume: 0, label: client };
        clientTotals[clientKey].weight += wt;
        clientTotals[clientKey].volume += volume;

        doc.rect(30, itemY, 535, rowHeight).stroke();
        doc
          .moveTo(colX.qty, itemY)
          .lineTo(colX.qty, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.client, itemY)
          .lineTo(colX.client, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.pack, itemY)
          .lineTo(colX.pack, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.weight, itemY)
          .lineTo(colX.weight, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.measure, itemY)
          .lineTo(colX.measure, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.measure + colWidths.measure / 3, itemY)
          .lineTo(colX.measure + colWidths.measure / 3, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY)
          .lineTo(colX.measure + (colWidths.measure / 3) * 2, itemY + rowHeight)
          .stroke();
        doc
          .moveTo(colX.volume, itemY)
          .lineTo(colX.volume, itemY + rowHeight)
          .stroke();

        const textY = itemY + 8;
        doc.fillColor("#000000").fontSize(7);
        doc.text(item.description || "", colX.desc + 4, itemY + 5, {
          width: colWidths.desc - 8,
          lineBreak: true,
        });
        doc.fontSize(8);
        const fmt2 = (n: number) =>
          n > 0 ? parseFloat(n.toFixed(2)).toString() : "";
        doc.text(qty > 0 ? qty.toString() : "", colX.qty, textY, {
          width: colWidths.qty,
          align: "center",
        });
        doc.text(client, colX.client, textY, {
          width: colWidths.client,
          align: "center",
        });
        doc.text(item.package || "", colX.pack, textY, {
          width: colWidths.pack,
          align: "center",
        });
        doc.text(
          wt > 0 ? parseFloat(wt.toFixed(2)).toString() : "",
          colX.weight,
          textY,
          { width: colWidths.weight, align: "center" },
        );
        doc.text(fmt2(len), colX.measure, textY, {
          width: colWidths.measure / 3,
          align: "center",
        });
        doc.text(fmt2(wid), colX.measure + colWidths.measure / 3, textY, {
          width: colWidths.measure / 3,
          align: "center",
        });
        doc.text(fmt2(ht), colX.measure + (colWidths.measure / 3) * 2, textY, {
          width: colWidths.measure / 3,
          align: "center",
        });
        doc.text(volume > 0 ? volume.toFixed(3) : "", colX.volume, textY, {
          width: colWidths.volume,
          align: "center",
        });

        itemY += rowHeight;
      }

      const clientKeys = Object.keys(clientTotals).filter(
        (k) => k !== "__unknown__",
      );
      const namedClients = clientKeys.map((k) => ({
        key: k,
        ...clientTotals[k],
      }));

      const totalsRowHeight =
        (namedClients.length > 0 ? namedClients.length : 1) * 15;
      doc.rect(30, itemY, 535, totalsRowHeight + 15).stroke();
      doc
        .moveTo(colX.qty, itemY)
        .lineTo(colX.qty, itemY + totalsRowHeight + 15)
        .stroke();
      doc
        .moveTo(colX.client, itemY)
        .lineTo(colX.client, itemY + totalsRowHeight + 15)
        .stroke();
      doc
        .moveTo(colX.pack, itemY)
        .lineTo(colX.pack, itemY + totalsRowHeight + 15)
        .stroke();
      doc
        .moveTo(colX.weight, itemY)
        .lineTo(colX.weight, itemY + totalsRowHeight + 15)
        .stroke();
      doc
        .moveTo(colX.measure, itemY)
        .lineTo(colX.measure, itemY + totalsRowHeight + 15)
        .stroke();
      doc
        .moveTo(colX.measure + colWidths.measure / 3, itemY)
        .lineTo(
          colX.measure + colWidths.measure / 3,
          itemY + totalsRowHeight + 15,
        )
        .stroke();
      doc
        .moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY)
        .lineTo(
          colX.measure + (colWidths.measure / 3) * 2,
          itemY + totalsRowHeight + 15,
        )
        .stroke();
      doc
        .moveTo(colX.volume, itemY)
        .lineTo(colX.volume, itemY + totalsRowHeight + 15)
        .stroke();

      doc.font("Helvetica-Bold").fontSize(8);
      doc.text("Total", colX.desc, itemY + 5, {
        width: colWidths.desc,
        align: "center",
      });
      doc.text(totalQty.toString(), colX.qty, itemY + 5, {
        width: colWidths.qty,
        align: "center",
      });

      let currentY = itemY;
      namedClients.forEach((c) => {
        doc.fontSize(8).font("Helvetica-Bold");
        doc.text(c.label, colX.client, currentY + 5, {
          width: colWidths.client,
          align: "center",
        });
        doc.font("Helvetica");
        doc.text(`${c.weight.toFixed(2)} kg`, colX.weight, currentY + 5, {
          width: colWidths.weight,
          align: "center",
        });
        doc.text(`${c.volume.toFixed(2)} m³`, colX.volume, currentY + 5, {
          width: colWidths.volume,
          align: "center",
        });
        doc.moveTo(colX.client, currentY).lineTo(565, currentY).stroke();
        currentY += 15;
      });

      doc
        .rect(colX.client, currentY, 565 - colX.client, 15)
        .fillAndStroke("#f0f0f0", "#000000");
      doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8);
      doc.text("Total", colX.client, currentY + 4, {
        width: colWidths.client,
        align: "center",
      });
      doc.font("Helvetica");
      doc.text(`${grandTotalWeight.toFixed(2)} kg`, colX.weight, currentY + 4, {
        width: colWidths.weight,
        align: "center",
      });
      doc.text(`${grandTotalVolume.toFixed(2)} m³`, colX.volume, currentY + 4, {
        width: colWidths.volume,
        align: "center",
      });

      itemY = currentY + 15;
      doc.rect(30, itemY, 535, 15).stroke();
      doc.fontSize(8).font("Helvetica-Bold");
      const uniquePackages = [
        ...new Set(items.map((i: any) => i.package).filter(Boolean)),
      ];
      const pTypeCount = items.reduce((acc: Record<string, number>, i: any) => {
        if (i.pType) acc[i.pType] = (acc[i.pType] || 0) + 1;
        return acc;
      }, {});
      const pTypeSummary = Object.entries(pTypeCount)
        .map(([t, n]) => `${n} ${t}`)
        .join(" + ");
      const pkgText = pTypeSummary
        ? `${uniquePackages.length} (${pTypeSummary})`
        : `${uniquePackages.length}`;
      doc.text(`No. of packages: ${pkgText}`, 35, itemY + 4);

      itemY += 15;
      doc.rect(30, itemY, 535, 15).stroke();
      const uniqueClientLabels = [
        ...new Set(namedClients.map((c) => c.label).filter(Boolean)),
      ];
      const shippingMarks = uniqueClientLabels.join(", ");
      doc.text(`Shipping Marks: ${shippingMarks}`, 35, itemY + 4);

      itemY += 15;
      doc.rect(30, itemY, 535, 15).stroke();
      doc.text("Country of origin: CHINA", 35, itemY + 4);

      doc.end();
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  static markAsPaid = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["customer", "items", "items.item"],
      });
      if (!invoice)
        return res.status(404).json({ message: "Invoice not found" });

      if (
        invoice.freightCost === null ||
        invoice.freightCost === undefined ||
        Number(invoice.freightCost) <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Freight cost must be provided and greater than 0 before verifying the invoice.",
        });
      }

      if (!invoice.description || !invoice.description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Description must be provided before verifying the invoice.",
        });
      }

      if (!invoice.invoiceNumber || !invoice.invoiceNumber.startsWith("CI")) {
        let generatedNo = "";
        try {
          generatedNo = await NumberSequenceService.getNextNumber("closed_ci");
        } catch (err) {
          console.warn(
            "Could not generate closed CI number using sequence service, falling back to manual generation:",
            err,
          );
          const allCisInvoices = await invoiceRepository.find({
            where: {
              invoiceNumber: Like("CI%"),
            },
          });

          let maxSeq = 0;
          for (const inv of allCisInvoices) {
            const numStr = inv.invoiceNumber;
            if (numStr && numStr.length > 6) {
              const seqStr = numStr.substring(6);
              const seqVal = parseInt(seqStr, 10);
              if (!isNaN(seqVal) && seqVal > maxSeq) {
                maxSeq = seqVal;
              }
            }
          }

          const nextSeq = maxSeq + 1;
          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = (now.getMonth() + 1).toString().padStart(2, "0");
          const prefix = `CI${yy}${mm}`;
          generatedNo = `${prefix}${nextSeq.toString().padStart(3, "0")}`;
        }

        invoice.invoiceNumber = generatedNo;
        invoice.invoiceDate = new Date();

        const pdfUrl = await InvoiceController.generateInvoicePDF(invoice);
        invoice.pdfUrl = pdfUrl;
      }

      invoice.status = "paid";
      invoice.paidAmount = invoice.grossTotal;
      invoice.outstandingAmount = 0;
      invoice.closedAt = new Date();

      await invoiceRepository.save(invoice);

      try {
        const cciInvoiceRepo = AppDataSource.getRepository(CCIInvoice);
        const cciCustomerRepo = AppDataSource.getRepository(CCICustomer);
        const cciItemRepo = AppDataSource.getRepository(CCIItem);

        const customer = invoice.customer;
        let cciCustomer: CCICustomer | null = null;
        if (customer) {
          cciCustomer = cciCustomerRepo.create({
            original_customer_id: customer.id,
            company_name: customer.companyName || "N/A",
            email: customer.email || customer.contactEmail || "",
            tax_number: customer.taxNumber || "",
            bill_to_address: customer.addressLine1 || "",
            ship_to_address: customer.companyName || "",
            city: customer.city || "",
            country: customer.country || "",
            phone: customer.contactPhoneNumber || "",
          });
          await cciCustomerRepo.save(cciCustomer);
        }

        const orderRepo = AppDataSource.getRepository(Order);
        const cargoRepo = AppDataSource.getRepository(Cargo);
        const cargoOrderRepo = AppDataSource.getRepository(CargoOrder);

        const targetCargoNo =
          (invoice as any).cargoNo || invoice.orderNumber || "";
        let finalCargoNo = targetCargoNo;
        let linkedCargos: Cargo[] = [];

        try {
          if (targetCargoNo) {
            const directCargos = await cargoRepo.find({
              where: [
                { cargo_no: targetCargoNo },
                { cargo_no: targetCargoNo.trim() },
              ],
            });
            linkedCargos.push(...directCargos);
          }

          if (linkedCargos.length === 0 && targetCargoNo) {
            const matchingOrder = await orderRepo.findOne({
              where: [
                { order_no: targetCargoNo },
                {
                  id: isNaN(Number(targetCargoNo)) ? -1 : Number(targetCargoNo),
                },
              ],
            });

            if (matchingOrder) {
              const cargoOrders = await cargoOrderRepo.find({
                where: { order_id: matchingOrder.id },
                relations: ["cargo"],
              });
              linkedCargos.push(
                ...cargoOrders.map((co) => co.cargo).filter(Boolean),
              );
            }
          }

          const cargoMap = new Map<number, Cargo>();
          linkedCargos.forEach((c) => cargoMap.set(c.id, c));
          linkedCargos = Array.from(cargoMap.values());

          for (const cargo of linkedCargos) {
            const isOfficialSeq = /^C\d{4,6}-\d+$/i.test(cargo.cargo_no || "");
            if (!isOfficialSeq && cargo.cargo_no && cargo.cargo_no.trim()) {
              const customCargoNo = cargo.cargo_no.trim();

              const existingRemark = (cargo.remark || cargo.note || "").trim();
              if (existingRemark) {
                if (!existingRemark.includes(customCargoNo)) {
                  cargo.remark = `${existingRemark} - ${customCargoNo}`;
                }
              } else {
                cargo.remark = customCargoNo;
              }
              cargo.note = cargo.remark;

              try {
                const officialCargoNo =
                  await NumberSequenceService.getNextNumber("cargo");
                cargo.cargo_no = officialCargoNo;
                finalCargoNo = officialCargoNo;
              } catch (err) {
                console.warn(
                  "Could not generate sequence cargo_no on invoice close:",
                  err,
                );
              }

              await cargoRepo.save(cargo);
            } else if (cargo.cargo_no) {
              finalCargoNo = cargo.cargo_no;
            }
          }
        } catch (err) {
          console.warn(
            "Error processing cargo transition on invoice closure:",
            err,
          );
        }

        const cciInvoice = cciInvoiceRepo.create({
          id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          order_number: invoice.orderNumber,
          cargo_no: finalCargoNo,
          invoice_date: invoice.invoiceDate || new Date(),
          delivery_date: invoice.deliveryDate || new Date(),
          due_date: invoice.dueDate,
          net_total: Number(invoice.netTotal || 0),
          tax_amount: Number(invoice.taxAmount || 0),
          gross_total: Number(invoice.grossTotal || 0),
          freight_cost: Number(invoice.freightCost || 0),
          description: invoice.description || "",
          remark: invoice.remark || "",
          status: "paid",
          closed_at: new Date(),
          customer: cciCustomer,
        });

        // ── Fetch expanded data FIRST so we can compute the correct gross_total ──
        const itemsToSave: any[] = [];
        let expandedData: any = null;
        try {
          expandedData = await InvoiceController.fetchExpandedDetailsData(
            invoice.id,
          );
        } catch (e) {
          console.warn("Could not fetch expanded data for dynamic freeze:", e);
        }

        const detailedItems = expandedData?.detailedItems || [];

        // Compute the correct gross_total: sum of actual item prices + freight
        const freezeFreight = Number(invoice.freightCost || 0);
        let correctGrossTotal: number;
        if (detailedItems.length > 0) {
          const freezeItemsSum = detailedItems.reduce((s: number, it: any) => {
            const qty = Number(it.qty || it.quantity || 0);
            const unitPrice = Number(
              it.eur_special_price || it._fallbackEk || it.unitPrice || 0,
            );
            return s + qty * unitPrice;
          }, 0);
          correctGrossTotal = freezeItemsSum + freezeFreight;
        } else {
          // No expanded items available — keep invoice's own grossTotal as fallback
          correctGrossTotal = Number(invoice.grossTotal || 0);
        }

        // Update the already-saved CCI record with the correct gross_total
        cciInvoice.gross_total = correctGrossTotal;
        await cciInvoiceRepo.save(cciInvoice);

        if (detailedItems.length > 0) {
          detailedItems.forEach((it: any) => {
            const item = it.item;
            const ean = it._fallbackEan || item?.ean || "-";
            const itemName =
              item?.item_name || item?.name || it.description || "Invoice Item";
            const taricCode = it.set_taric_code || item?.taric?.code || "";
            const taricName =
              item?.taric?.name_en || item?.taric?.description_en || "";
            const dutyRate = Number(item?.taric?.duty_rate ?? 0);
            const qty = Number(it.qty || it.quantity || 1);
            const unitPrice = Number(
              it.eur_special_price || it._fallbackEk || it.unitPrice || 0,
            );
            const totalPrice = qty * unitPrice;
            const validItemId =
              item?.id &&
                !isNaN(Number(item.id)) &&
                Number.isInteger(Number(item.id))
                ? Number(item.id)
                : null;

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
                order_no: it.order?.order_no || invoice.orderNumber || "",
                remark: it.remark_de || it.remarks_cn || "",
              }),
            );
          });
        } else if (invoice.items && invoice.items.length > 0) {
          invoice.items.forEach((invItem: any) => {
            const validItemId =
              invItem.item_id &&
                !isNaN(Number(invItem.item_id)) &&
                Number.isInteger(Number(invItem.item_id))
                ? Number(invItem.item_id)
                : null;
            itemsToSave.push(
              cciItemRepo.create({
                cci_invoice: cciInvoice,
                item_id: validItemId,
                ean: invItem.articleNumber || "-",
                item_name: invItem.description || "Invoice Item",
                quantity: Number(invItem.quantity || 1),
                unit_price: Number(invItem.unitPrice || 0),
                total_price: Number(invItem.grossPrice || 0),
                order_no: invoice.orderNumber || "",
              }),
            );
          });
        }

        if (itemsToSave.length > 0) {
          await cciItemRepo.save(itemsToSave);
        }
        console.log(
          `🔒 [CCI_VERIFY_LOG] Invoice "${invoice.invoiceNumber}" frozen into CCI snapshot tables with ${itemsToSave.length} items!`,
        );
      } catch (cciErr) {
        console.error("⚠️ Failed to freeze CCI snapshot:", cciErr);
      }
      return res.json({
        success: true,
        message: "Invoice marked as paid",
        data: invoice,
      });
    } catch (error) {
      return next(error);
    }
  };

  static cancelInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({ where: { id } });
      if (!invoice)
        return res.status(404).json({ message: "Invoice not found" });
      (invoice as any).status = "cancelled";
      (invoice as any).closedAt = new Date();
      await invoiceRepository.save(invoice);
      return res.json({ success: true, message: "Invoice cancelled" });
    } catch (error) {
      return next(error);
    }
  };
}
