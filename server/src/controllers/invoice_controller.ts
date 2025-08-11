import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { Invoice, InvoiceItem } from "../models/invoice";

export class InvoiceController {
  static createInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const customerRepository = AppDataSource.getRepository(Customer);
    const itemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { customerId, ...invoiceData } = req.body;

      const customer = await customerRepository.findOne({
        where: { id: customerId },
      });
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Create invoice
      const invoice = invoiceRepository.create({
        ...invoiceData,
        customer,
      });

      // Save invoice to get the ID
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

      // Generate PDF
      const pdfUrl = await InvoiceController.generateInvoicePDF(
        completeInvoice
      );

      // Update invoice with PDF URL
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
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Create PDF filename
        const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
        const filePath = path.join(uploadsDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: "A4",
          margin: 50,
        });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Page constants
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 50;

        const leftAlignX = margin; // 50 - All left elements
        const rightAlignX = 350; // 350 - All right elements
        const centerColumnX = 200; // 200 - Footer center column
        const rightColumnX = 420; // 420 - Footer right column

        // Company Information
        const companyInfo = {
          name: "GTech Industries GmbH",
          address: "Reichshofstr. 137",
          city: "58239 Schwerte",
          country: "Deutschland",
          phone: "+49 2304 3389510",
          email: "info@gtech-industries.de",
          website: "www.gtech-shop.de",
          registrationNumber: "Amtsgericht Hagen HRB 12496",
          ceo: "Geschäftsführer Joschua Grenzheuser",
          vatId: "DE291514916",
          taxNumber: "316/5733/1295",
          weeeNumber: "DE 66370256",
          iban: "DE16 4404 0037 0210 9288 00",
          bic: "COBADEFFXXX",
          bank: "Commerzbank Dortmund",
        };

        // === HEADER SECTION ===
        let yPos = 50;

        // Logo (left side - perfectly aligned)
        const logoPath = path.join(process.cwd(), "assets", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, leftAlignX, yPos, { width: 100, height: 50 });
        }

        // Company details (right side - perfectly aligned)
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

        // === CUSTOMER & INVOICE SECTION ===
        yPos = 180;

        // Return address line (left aligned)
        doc.fontSize(8).font("Helvetica");
        doc.fillColor("#666666");
        doc.text(
          `${companyInfo.name} - ${companyInfo.address} - ${companyInfo.city}`,
          leftAlignX,
          yPos
        );

        // Customer information (left aligned)
        yPos += 20;
        doc.fontSize(12).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text(invoice.customer.companyName || "", leftAlignX, yPos);

        yPos += 15;
        doc.fontSize(10).font("Helvetica");
        doc.text(invoice.customer.addressLine1 || "", leftAlignX, yPos);
        yPos += 12;
        doc.text(
          `${invoice.customer.postalCode || ""} ${
            invoice.customer.city || ""
          }`.trim(),
          leftAlignX,
          yPos
        );
        const boxY = 180;
        const boxWidth = 180;
        const boxHeight = 120;

        doc.lineWidth(0.3);
        doc.rect(rightAlignX, boxY, boxWidth, boxHeight).stroke("#CCCCCC");

        // Gray header
        doc
          .rect(rightAlignX, boxY, boxWidth, 30)
          .fillAndStroke("#CCCCCC", "#CCCCCC");

        doc.fontSize(15).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text("Rechnung", rightAlignX + 5, boxY + 8);

        // Invoice details with German labels
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
          ["Kundennr.", invoice.customer.id?.substring(0, 8) || "N/A"],
        ];

        invoiceDetails.forEach((detail, index) => {
          const detailY = detailsStartY + index * 15;
          doc.text(detail[0], rightAlignX + 10, detailY);
          doc.font("Helvetica-Bold");
          doc.text(detail[1], rightAlignX + 90, detailY);
          doc.font("Helvetica");
        });

        // === TABLE SECTION ===
        yPos = 320;
        doc.fontSize(10).font("Helvetica");
        doc.text("Lieferdatum", leftAlignX, yPos);
        doc.text(
          `Auftrags Nr: ${invoice.orderNumber || ""}`,
          leftAlignX + 250,
          yPos
        );

        // Clean Professional Table (perfectly aligned with left margin)
        yPos += 20;
        const tableY = yPos;

        // Column configuration
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

        // Header background (aligned with left margin)
        doc.lineWidth(0.3);
        doc
          .rect(leftAlignX, tableY, tableWidth, headerHeight)
          .fillAndStroke("#E8E8E8", "#333333");

        // Header text
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

        // Top border line after header
        doc.lineWidth(0.3);
        doc
          .moveTo(leftAlignX, tableY + headerHeight)
          .lineTo(leftAlignX + tableWidth, tableY + headerHeight)
          .stroke("#333333");

        // Data rows
        doc.fontSize(9).font("Helvetica");
        invoice.items.forEach((item: any, rowIndex: number) => {
          const rowY = tableY + headerHeight + rowIndex * rowHeight;

          // Subtle alternating background
          if (rowIndex % 2 === 1) {
            doc.rect(leftAlignX, rowY, tableWidth, rowHeight).fill("#FAFAFA");
          }

          // Row data
          const rowData = [
            item.quantity?.toString() || "1",
            item.articleNumber || "",
            item.description || "",
            Number(item.netPrice || 0).toFixed(2),
            `${item.taxRate || 19}%`,
            Number(item.unitPrice || 0).toFixed(2),
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

          // Light bottom border for each row
          if (rowIndex < invoice.items.length - 1) {
            doc.lineWidth(0.5);
            doc
              .moveTo(leftAlignX, rowY + rowHeight)
              .lineTo(leftAlignX + tableWidth, rowY + rowHeight)
              .stroke("#E0E0E0");
          }
        });

        // Bottom border of table
        const tableBottomY =
          tableY + headerHeight + invoice.items.length * rowHeight;
        doc.lineWidth(0.3);
        doc
          .moveTo(leftAlignX, tableBottomY)
          .lineTo(leftAlignX + tableWidth, tableBottomY)
          .stroke("#333333");

        // === TOTALS SECTION (right aligned to match invoice box) ===
        yPos = tableBottomY + 30;

        // Net Total
        doc.fontSize(10).font("Helvetica");
        doc.text("Gesamtpreis Netto", rightAlignX, yPos);
        doc.text(
          `${Number(invoice.netTotal || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos,
          { align: "right" }
        );

        // VAT
        yPos += 18;
        doc.text("MwSt. 19,00%", rightAlignX, yPos);
        doc.text(
          `${Number(invoice.taxAmount || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos,
          { align: "right" }
        );

        // Gross Total with subtle styling (right aligned)
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
          { align: "right" }
        );

        // Payment info if applicable (right aligned)
        if (invoice.paidAmount > 0) {
          yPos += 35;
          doc.fontSize(10).font("Helvetica");
          doc.text(
            `Zahlung (Vorkasse Überweisung) vom ${new Date().toLocaleDateString(
              "de-DE"
            )}`,
            rightAlignX,
            yPos
          );
          doc.text(
            `${Number(invoice.paidAmount).toFixed(2)} €`,
            rightAlignX + 120,
            yPos,
            { align: "right" }
          );

          yPos += 15;
          doc.font("Helvetica-Bold");
          doc.text("offener Betrag", rightAlignX, yPos);
          doc.text(
            `${Number(invoice.outstandingAmount || 0).toFixed(2)} €`,
            rightAlignX + 120,
            yPos,
            { align: "right" }
          );
        }

        // === ADDITIONAL INFO (left aligned) ===
        yPos += 40;
        doc.fontSize(10).font("Helvetica");

        if (invoice.customer.taxNumber) {
          doc.text(
            `Ihre USt-IdNr: ${invoice.customer.taxNumber}`,
            leftAlignX,
            yPos
          );
          yPos += 15;
        }

        doc.text(
          `Zahlungsart: ${
            invoice.paymentMethod?.replace("_", " ") || "Kauf-auf-Rechnung"
          }`,
          leftAlignX,
          yPos
        );
        yPos += 15;
        doc.text(
          `Versandart: ${
            invoice.shippingMethod?.replace("_", " ") || "Standard-Versand"
          }`,
          leftAlignX,
          yPos
        );

        if (invoice.notes) {
          yPos += 15;
          doc.text(`Hinweise: ${invoice.notes}`, leftAlignX, yPos);
        }

        // Thank you message (left aligned)
        yPos += 25;
        doc.text(
          "Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit. Wir freuen uns über Ihre Weiterempfehlung.",
          leftAlignX,
          yPos
        );

        const footerY = pageHeight - 120;

        doc.lineWidth(0.5);
        doc
          .moveTo(leftAlignX, footerY - 15)
          .lineTo(pageWidth - margin, footerY - 15)
          .stroke("#CCCCCC");

        doc.fontSize(8).font("Helvetica");

        // Left column - Company & Banking (left aligned)
        doc.font("Helvetica-Bold");
        doc.text(companyInfo.name, leftAlignX, footerY);
        doc.font("Helvetica");
        doc.text(`IBAN: ${companyInfo.iban}`, leftAlignX, footerY + 12);
        doc.text(`BIC: ${companyInfo.bic}`, leftAlignX, footerY + 24);
        doc.text(companyInfo.bank, leftAlignX, footerY + 36);

        // Center column - Registration & Tax Info (center aligned)
        doc.text(companyInfo.registrationNumber, centerColumnX, footerY);
        doc.text(companyInfo.ceo, centerColumnX, footerY + 12);
        doc.text(`Ust.-ID: ${companyInfo.vatId}`, centerColumnX, footerY + 24);
        doc.text(
          `SteuerNR: ${companyInfo.taxNumber}`,
          centerColumnX,
          footerY + 36
        );
        doc.text(
          `WEEE-Reg.-Nr. ${companyInfo.weeeNumber}`,
          centerColumnX,
          footerY + 48
        );

        // Right column - Order Info & Page (right aligned)
        doc.text(`Auftrags Nr:`, rightColumnX, footerY);
        doc.font("Helvetica-Bold");
        doc.text(`${invoice.orderNumber || "N/A"}`, rightColumnX + 60, footerY);
        doc.font("Helvetica");
        doc.text("1/1", rightColumnX + 60, footerY + 48);

        // Finalize PDF
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
  // Method to serve PDF files
  static downloadInvoicePDF = async (
    req: Request,
    res: Response,
    next: NextFunction
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
        // Generate PDF if it doesn't exist
        const pdfUrl = await InvoiceController.generateInvoicePDF(invoice);
        await invoiceRepository.update(invoiceId, { pdfUrl });
        invoice.pdfUrl = pdfUrl;
      }

      const filePath = path.join(process.cwd(), invoice.pdfUrl);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "PDF file not found" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`
      );

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Update an existing invoice
  static updateInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const itemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { id } = req.params;
      const { items, ...invoiceData } = req.body;

      // Find the invoice
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["items"],
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Update invoice fields
      invoiceRepository.merge(invoice, invoiceData);
      const updatedInvoice = await invoiceRepository.save(invoice);

      // Handle items update (delete existing and create new)
      if (items) {
        // Remove existing items
        await itemRepository.delete({ invoice: invoice });

        // Create new items
        const newItems = items.map((item: any) => {
          return itemRepository.create({
            ...item,
            invoice: updatedInvoice,
          });
        });
        await itemRepository.save(newItems);
      }

      // Fetch the complete updated invoice
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

  // Delete an invoice
  static deleteInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const invoiceItemRepository = AppDataSource.getRepository(InvoiceItem);

    try {
      const { id } = req.params;

      // First delete all related invoice items
      await invoiceItemRepository.delete({ invoice: { id } });

      // Then delete the invoice
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

  // Get all invoices
  static getAllInvoices = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);

    try {
      const invoices = await invoiceRepository.find({
        relations: ["customer", "items"],
        order: { invoiceDate: "DESC" },
      });
      return res.status(200).json({ success: true, data: invoices });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

  // Get a single invoice by ID
  static getInvoiceById = async (
    req: Request,
    res: Response,
    next: NextFunction
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
    next: NextFunction
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
}
