import { Request, Response, NextFunction } from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { AppDataSource } from "../config/database";
import { Customer } from "../models/customers";
import { Invoice, InvoiceItem } from "../models/invoice";
import { Cargo } from "../models/cargos";
import { Order } from "../models/orders";
import { OrderItem } from "../models/order_items";
import { Item } from "../models/items";
import { Taric } from "../models/tarics";
import { CargoOrder } from "../models/cargo_orders";
import { In } from "typeorm";

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

      const invoice = invoiceRepository.create({
        ...invoiceData,
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

      const pdfUrl = await InvoiceController.generateInvoicePDF(
        completeInvoice
      );
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

        let yPos = 50;

        const logoPath = path.join(process.cwd(), "assets", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, leftAlignX, yPos, { width: 100, height: 50 });
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
          yPos
        );

        yPos += 20;
        doc.fontSize(12).font("Helvetica-Bold");
        doc.fillColor("#000000");
        doc.text(invoice.customer?.companyName || "Internal / ETL Order", leftAlignX, yPos);

        yPos += 15;
        doc.fontSize(10).font("Helvetica");
        doc.text(invoice.customer?.addressLine1 || "", leftAlignX, yPos);
        yPos += 12;
        doc.text(
          `${invoice.customer?.postalCode || ""} ${invoice.customer?.city || ""
            }`.trim(),
          leftAlignX,
          yPos
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
          yPos
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
          { align: "right" }
        );

        yPos += 18;
        doc.text("MwSt. 19,00%", rightAlignX, yPos);
        doc.text(
          `${Number(invoice.taxAmount || 0).toFixed(2)} €`,
          rightAlignX + 120,
          yPos,
          { align: "right" }
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
          { align: "right" }
        );

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

        yPos += 40;
        doc.fontSize(10).font("Helvetica");

        if (invoice.customer?.taxNumber) {
          doc.text(
            `Ihre USt-IdNr: ${invoice.customer.taxNumber}`,
            leftAlignX,
            yPos
          );
          yPos += 15;
        }

        doc.text(
          `Zahlungsart: ${invoice.paymentMethod?.replace("_", " ") || "Kauf-auf-Rechnung"
          }`,
          leftAlignX,
          yPos
        );
        yPos += 15;
        doc.text(
          `Versandart: ${invoice.shippingMethod?.replace("_", " ") || "Standard-Versand"
          }`,
          leftAlignX,
          yPos
        );

        if (invoice.notes) {
          yPos += 15;
          doc.text(`Hinweise: ${invoice.notes}`, leftAlignX, yPos);
        }

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
          footerY + 36
        );
        doc.text(
          `WEEE-Reg.-Nr. ${companyInfo.weeeNumber}`,
          centerColumnX,
          footerY + 48
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

      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["items"],
      });
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
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
    next: NextFunction
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
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);

    try {
      const invoices = await invoiceRepository.find({
        relations: ["customer", "customer.businessDetails", "customer.starCustomerDetails", "items"],
        order: { invoiceDate: "DESC" },
      });

      const orderNumbers = invoices.map((i) => i.orderNumber).filter(Boolean);
      const orders = await AppDataSource.getRepository(Order).find({
        where: { order_no: In(orderNumbers) },
        relations: ["cargo", "cargo.customer"]
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

      // Also ensure cargos map to themselves in the orderToCargoMap
      const allCargos = await AppDataSource.getRepository(Cargo).find();
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

      const orderItemsRaw = await AppDataSource.manager.query(`
        SELECT order_id, cargo_id, SUM(qty) as total_qty, COUNT(id) as count_items
        FROM order_item
        GROUP BY order_id, cargo_id
      `);

      const orderItemSummaryByOrderId = new Map();
      const orderItemSummaryByCargoId = new Map();
      orderItemsRaw.forEach((row: any) => {
        if (row.order_id) {
          const current = orderItemSummaryByOrderId.get(row.order_id) || { total_qty: 0, count_items: 0 };
          orderItemSummaryByOrderId.set(row.order_id, {
            total_qty: current.total_qty + Number(row.total_qty),
            count_items: current.count_items + Number(row.count_items)
          });
        }
        if (row.cargo_id) {
          const current = orderItemSummaryByCargoId.get(row.cargo_id) || { total_qty: 0, count_items: 0 };
          orderItemSummaryByCargoId.set(row.cargo_id, {
            total_qty: current.total_qty + Number(row.total_qty),
            count_items: current.count_items + Number(row.count_items)
          });
        }
      });

      const orderIdMap = new Map();
      orders.forEach(o => orderIdMap.set(o.order_no, o.id));

      const data = invoices.map((inv) => {
        const cargo = orderToCargoMap.get(inv.orderNumber);

        let customItemCount = 0;
        let customTotalQty = 0;

        if (cargo && orderItemSummaryByCargoId.has(cargo.id)) {
          const stats = orderItemSummaryByCargoId.get(cargo.id);
          customItemCount = stats.count_items;
          customTotalQty = stats.total_qty;
        } else if (inv.orderNumber && orderIdMap.has(inv.orderNumber)) {
          const orderId = orderIdMap.get(inv.orderNumber);
          if (orderItemSummaryByOrderId.has(orderId)) {
            const stats = orderItemSummaryByOrderId.get(orderId);
            customItemCount = stats.count_items;
            customTotalQty = stats.total_qty;
          }
        }

        const cargoNo = cargo?.cargo_no || (inv.orderNumber && !orderIdMap.has(inv.orderNumber) ? inv.orderNumber : undefined);

        return {
          ...inv,
          bill_to: "GTech-Warehouse",
          ship_to:
            cargo?.ship_to_company_name ||
            cargo?.ship_to_display_name ||
            inv.customer?.companyName ||
            "-",
          customItemCount,
          customTotalQty,
          cargoNo: cargoNo || inv.orderNumber,
        };
      });

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };

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

  static getInvoiceExpandedDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    const cargoRepository = AppDataSource.getRepository(Cargo);
    const orderRepository = AppDataSource.getRepository(Order);
    const orderItemRepository = AppDataSource.getRepository(OrderItem);

    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({
        where: { id },
        relations: ["customer", "items"],
      });

      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" });
      }

      const orderNumber = invoice.orderNumber;
      let orderItems: any[] = [];
      let cargo: any = null;

      cargo = await cargoRepository.findOne({
        where: { cargo_no: orderNumber },
      });

      if (cargo) {
        orderItems = await orderItemRepository.find({
          where: { cargo_id: cargo.id },
          relations: ["item", "item.taric", "order"],
        });
      } else {
        const order = await orderRepository.findOne({
          where: { order_no: orderNumber },
        });
        if (order) {
          orderItems = await orderItemRepository.find({
            where: { order_id: order.id },
            relations: ["item", "item.taric", "order"],
          });
        }
      }

      const getEffectiveTaricCode = (oi: any): string => {
        const itemTaricCode = oi.item?.taric?.code || "";
        const isProjectItem = !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";
        if (isProjectItem && oi.set_taric_code) {
          return oi.set_taric_code.toString();
        }
        return itemTaricCode || "unknown";
      };

      const getGroupKey = (oi: any): string => {
        if (oi.set_taric_code) {
          return `set_${oi.set_taric_code}`;
        }
        const taricId = oi.item?.taric?.id;
        return taricId ? `taric_${taricId}` : "unknown";
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
      const manualTarics = uniqueManualCodes.length > 0
        ? await AppDataSource.getRepository(Taric).find({ where: { code: In(uniqueManualCodes) } })
        : [];
      const manualTaricMap = new Map(manualTarics.map(t => [t.code, t]));

      const taricGroupsMap = new Map<string, any>();
      orderItems.forEach((oi: any) => {
        const item = oi.item;
        const taric = item?.taric;
        const itemTaricCode = taric?.code || "";
        const isProjectItem = !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";
        const groupKey = getGroupKey(oi);

        if (!taricGroupsMap.has(groupKey)) {
          let displayCode = oi.item?.taric?.code || "-";
          let displayName = taric?.name_en || (isProjectItem ? "Project Item" : "Unknown");
          let displayRate = taric?.duty_rate || 0;

          if (oi.set_taric_code) {
            displayCode = `${oi.set_taric_code}`;
            const codes = displayCode.split("/");
            const targetCode = codes.length > 1 ? codes[1].trim() : codes[0].trim();

            const mTaric = manualTaricMap.get(targetCode);
            if (mTaric) {
              displayName = mTaric.name_en || displayName;
              displayRate = mTaric.duty_rate !== undefined ? mTaric.duty_rate : displayRate;
            }
          }

          taricGroupsMap.set(groupKey, {
            taricId: groupKey,
            taricNameEn: displayName,
            taricCode: displayCode,
            dutyRate: displayRate,
            totalQty: 0,
            totalPrice: 0,
            unitPrice: oi?.eur_special_price || oi?.price || item?.price || 0,
            isProjectItem,
          });
        }

        const group = taricGroupsMap.get(groupKey)!;
        group.totalQty += oi.qty || 0;
        const currentPrice = oi?.eur_special_price || oi?.price || item?.price || 0;
        group.totalPrice += (oi.qty || 0) * (Number(currentPrice) || 0);
      });

      const taricGroups = Array.from(taricGroupsMap.values());

      const sortedItems = [...orderItems]
        .map((oi: any) => ({
          ...oi,
          v: (oi.item?.length * oi.item?.width * oi.item?.height) / 1000 || 0,
          w: oi.item?.weight || 0,
          _effectiveTaricCode: getEffectiveTaricCode(oi),
        }))
        .sort((a, b) => {
          const codeCompare = a._effectiveTaricCode.localeCompare(b._effectiveTaricCode);
          if (codeCompare !== 0) return codeCompare;
          return (a.item?.item_name || "").localeCompare(b.item?.item_name || "");
        });

      const orderNosInCargo = [...new Set(orderItems.map((oi: any) => oi.order?.order_no).filter(Boolean))];

      return res.json({
        success: true,
        data: {
          invoice,
          cargo: cargo ? {
            id: cargo.id,
            cargo_no: cargo.cargo_no,
            ship_to: cargo.ship_to_company_name || cargo.ship_to_display_name || null,
            bill_to: cargo.bill_to_company_name || cargo.bill_to_display_name || null,
          } : null,
          orderNosInCargo,
          detailedItems: sortedItems,
          taricGroups,
        },
      });
    } catch (error) {
      console.error(error);
      return next(error);
    }
  };


  static markAsPaid = async (req: Request, res: Response, next: NextFunction) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({ where: { id } });
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      (invoice as any).status = "paid";
      invoice.paidAmount = invoice.grossTotal;
      invoice.outstandingAmount = 0;
      (invoice as any).closedAt = new Date();
      await invoiceRepository.save(invoice);
      return res.json({ success: true, message: "Invoice marked as paid" });
    } catch (error) {
      return next(error);
    }
  };

  static cancelInvoice = async (req: Request, res: Response, next: NextFunction) => {
    const invoiceRepository = AppDataSource.getRepository(Invoice);
    try {
      const { id } = req.params;
      const invoice = await invoiceRepository.findOne({ where: { id } });
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      (invoice as any).status = "cancelled";
      (invoice as any).closedAt = new Date();
      await invoiceRepository.save(invoice);
      return res.json({ success: true, message: "Invoice cancelled" });
    } catch (error) {
      return next(error);
    }
  };
}
