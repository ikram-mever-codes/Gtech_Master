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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceController = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const customers_1 = require("../models/customers");
const invoice_1 = require("../models/invoice");
const cargos_1 = require("../models/cargos");
const orders_1 = require("../models/orders");
const order_items_1 = require("../models/order_items");
class InvoiceController {
}
exports.InvoiceController = InvoiceController;
_a = InvoiceController;
InvoiceController.createInvoice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    const customerRepository = database_1.AppDataSource.getRepository(customers_1.Customer);
    const itemRepository = database_1.AppDataSource.getRepository(invoice_1.InvoiceItem);
    try {
        const _b = req.body, { customerId } = _b, invoiceData = __rest(_b, ["customerId"]);
        const customer = yield customerRepository.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        const invoice = invoiceRepository.create(Object.assign(Object.assign({}, invoiceData), { customer }));
        const savedInvoice = yield invoiceRepository.save(invoice);
        if (req.body.items && req.body.items.length > 0) {
            const items = req.body.items.map((item) => {
                return itemRepository.create(Object.assign(Object.assign({}, item), { invoice: savedInvoice }));
            });
            yield itemRepository.save(items);
        }
        const completeInvoice = yield invoiceRepository.findOne({
            where: { id: savedInvoice.id },
            relations: ["customer", "items"],
        });
        const pdfUrl = yield _a.generateInvoicePDF(completeInvoice);
        yield invoiceRepository.update(savedInvoice.id, { pdfUrl });
        return res.status(201).json({
            success: true,
            data: Object.assign(Object.assign({}, completeInvoice), { pdfUrl }),
            message: "Invoice created successfully!",
        });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.generateInvoicePDF = (invoice) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k;
        try {
            const uploadsDir = path_1.default.join(process.cwd(), "uploads");
            if (!fs_1.default.existsSync(uploadsDir)) {
                fs_1.default.mkdirSync(uploadsDir, { recursive: true });
            }
            const fileName = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
            const filePath = path_1.default.join(uploadsDir, fileName);
            const doc = new pdfkit_1.default({
                size: "A4",
                margin: 50,
            });
            const stream = fs_1.default.createWriteStream(filePath);
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
            const logoPath = path_1.default.join(process.cwd(), "assets", "logo.png");
            if (fs_1.default.existsSync(logoPath)) {
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
            doc.text(`${companyInfo.name} - ${companyInfo.address} - ${companyInfo.city}`, leftAlignX, yPos);
            yPos += 20;
            doc.fontSize(12).font("Helvetica-Bold");
            doc.fillColor("#000000");
            doc.text(((_b = invoice.customer) === null || _b === void 0 ? void 0 : _b.companyName) || "Internal / ETL Order", leftAlignX, yPos);
            yPos += 15;
            doc.fontSize(10).font("Helvetica");
            doc.text(((_c = invoice.customer) === null || _c === void 0 ? void 0 : _c.addressLine1) || "", leftAlignX, yPos);
            yPos += 12;
            doc.text(`${((_d = invoice.customer) === null || _d === void 0 ? void 0 : _d.postalCode) || ""} ${((_e = invoice.customer) === null || _e === void 0 ? void 0 : _e.city) || ""}`.trim(), leftAlignX, yPos);
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
                ["Kundennr.", ((_g = (_f = invoice.customer) === null || _f === void 0 ? void 0 : _f.id) === null || _g === void 0 ? void 0 : _g.substring(0, 8)) || "N/A"],
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
            doc.text(`Auftrags Nr: ${invoice.orderNumber || ""}`, leftAlignX + 250, yPos);
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
                    align: col.align,
                });
                currentX += col.width;
            });
            doc.lineWidth(0.3);
            doc
                .moveTo(leftAlignX, tableY + headerHeight)
                .lineTo(leftAlignX + tableWidth, tableY + headerHeight)
                .stroke("#333333");
            doc.fontSize(9).font("Helvetica");
            invoice.items.forEach((item, rowIndex) => {
                var _b;
                const rowY = tableY + headerHeight + rowIndex * rowHeight;
                if (rowIndex % 2 === 1) {
                    doc.rect(leftAlignX, rowY, tableWidth, rowHeight).fill("#FAFAFA");
                }
                const rowData = [
                    ((_b = item.quantity) === null || _b === void 0 ? void 0 : _b.toString()) || "1",
                    item.articleNumber || "",
                    item.description || "",
                    Number(item.netPrice || 0).toFixed(2),
                    `${item.taxRate || 19}%`,
                    Number(item.unitPrice || 0).toFixed(2),
                    Number(item.grossPrice || 0).toFixed(2),
                ];
                currentX = leftAlignX;
                rowData.forEach((data, colIndex) => {
                    const align = columns[colIndex].align;
                    let textX = currentX + 3;
                    if (align === "right") {
                        textX = currentX + columns[colIndex].width - 3;
                    }
                    else if (align === "center") {
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
            const tableBottomY = tableY + headerHeight + invoice.items.length * rowHeight;
            doc.lineWidth(0.3);
            doc
                .moveTo(leftAlignX, tableBottomY)
                .lineTo(leftAlignX + tableWidth, tableBottomY)
                .stroke("#333333");
            yPos = tableBottomY + 30;
            doc.fontSize(10).font("Helvetica");
            doc.text("Gesamtpreis Netto", rightAlignX, yPos);
            doc.text(`${Number(invoice.netTotal || 0).toFixed(2)} €`, rightAlignX + 120, yPos, { align: "right" });
            yPos += 18;
            doc.text("MwSt. 19,00%", rightAlignX, yPos);
            doc.text(`${Number(invoice.taxAmount || 0).toFixed(2)} €`, rightAlignX + 120, yPos, { align: "right" });
            yPos += 20;
            doc.lineWidth(0.3);
            doc
                .rect(rightAlignX - 5, yPos - 3, 200, 22)
                .fillAndStroke("#F5F5F5", "#CCCCCC");
            doc.fontSize(11).font("Helvetica-Bold");
            doc.fillColor("#000000");
            doc.text("Gesamtpreis Brutto", rightAlignX, yPos + 5);
            doc.text(`${Number(invoice.grossTotal || 0).toFixed(2)} €`, rightAlignX + 120, yPos + 5, { align: "right" });
            if (invoice.paidAmount > 0) {
                yPos += 35;
                doc.fontSize(10).font("Helvetica");
                doc.text(`Zahlung (Vorkasse Überweisung) vom ${new Date().toLocaleDateString("de-DE")}`, rightAlignX, yPos);
                doc.text(`${Number(invoice.paidAmount).toFixed(2)} €`, rightAlignX + 120, yPos, { align: "right" });
                yPos += 15;
                doc.font("Helvetica-Bold");
                doc.text("offener Betrag", rightAlignX, yPos);
                doc.text(`${Number(invoice.outstandingAmount || 0).toFixed(2)} €`, rightAlignX + 120, yPos, { align: "right" });
            }
            yPos += 40;
            doc.fontSize(10).font("Helvetica");
            if ((_h = invoice.customer) === null || _h === void 0 ? void 0 : _h.taxNumber) {
                doc.text(`Ihre USt-IdNr: ${invoice.customer.taxNumber}`, leftAlignX, yPos);
                yPos += 15;
            }
            doc.text(`Zahlungsart: ${((_j = invoice.paymentMethod) === null || _j === void 0 ? void 0 : _j.replace("_", " ")) || "Kauf-auf-Rechnung"}`, leftAlignX, yPos);
            yPos += 15;
            doc.text(`Versandart: ${((_k = invoice.shippingMethod) === null || _k === void 0 ? void 0 : _k.replace("_", " ")) || "Standard-Versand"}`, leftAlignX, yPos);
            if (invoice.notes) {
                yPos += 15;
                doc.text(`Hinweise: ${invoice.notes}`, leftAlignX, yPos);
            }
            yPos += 25;
            doc.text("Wir danken Ihnen für Ihr Vertrauen und die gute Zusammenarbeit. Wir freuen uns über Ihre Weiterempfehlung.", leftAlignX, yPos);
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
            doc.text(`SteuerNR: ${companyInfo.taxNumber}`, centerColumnX, footerY + 36);
            doc.text(`WEEE-Reg.-Nr. ${companyInfo.weeeNumber}`, centerColumnX, footerY + 48);
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
        }
        catch (error) {
            reject(error);
        }
    });
});
InvoiceController.downloadInvoicePDF = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { invoiceId } = req.params;
        const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
        const invoice = yield invoiceRepository.findOne({
            where: { id: invoiceId },
            relations: ["customer", "items"],
        });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        if (!invoice.pdfUrl) {
            const pdfUrl = yield _a.generateInvoicePDF(invoice);
            yield invoiceRepository.update(invoiceId, { pdfUrl });
            invoice.pdfUrl = pdfUrl;
        }
        const filePath = path_1.default.join(process.cwd(), invoice.pdfUrl);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ message: "PDF file not found" });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice_${invoice.invoiceNumber}.pdf`);
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.updateInvoice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    const itemRepository = database_1.AppDataSource.getRepository(invoice_1.InvoiceItem);
    try {
        const { id } = req.params;
        const _b = req.body, { items } = _b, invoiceData = __rest(_b, ["items"]);
        const invoice = yield invoiceRepository.findOne({
            where: { id },
            relations: ["items"],
        });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        invoiceRepository.merge(invoice, invoiceData);
        const updatedInvoice = yield invoiceRepository.save(invoice);
        if (items) {
            yield itemRepository.delete({ invoice: invoice });
            const newItems = items.map((item) => {
                return itemRepository.create(Object.assign(Object.assign({}, item), { invoice: updatedInvoice }));
            });
            yield itemRepository.save(newItems);
        }
        const completeInvoice = yield invoiceRepository.findOne({
            where: { id: updatedInvoice.id },
            relations: ["customer", "items"],
        });
        return res.json(completeInvoice);
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.deleteInvoice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    const invoiceItemRepository = database_1.AppDataSource.getRepository(invoice_1.InvoiceItem);
    try {
        const { id } = req.params;
        yield invoiceItemRepository.delete({ invoice: { id } });
        const result = yield invoiceRepository.delete(id);
        if (result.affected === 0) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        return res
            .status(204)
            .json({ success: true, message: "Invoice Deleted Successfully" });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.getAllInvoices = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const invoices = yield invoiceRepository.find({
            relations: ["customer", "items"],
            order: { invoiceDate: "DESC" },
        });
        return res.status(200).json({ success: true, data: invoices });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.getInvoiceById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const { id } = req.params;
        const invoice = yield invoiceRepository.findOne({
            where: { id },
            relations: ["customer", "items"],
        });
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        return res.json({ success: true, data: invoice });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.getInvoicesByCustomer = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const { customerId } = req.params;
        const invoices = yield invoiceRepository.find({
            where: { customer: { id: customerId } },
            relations: ["items"],
            order: { invoiceDate: "DESC" },
        });
        return res.json(invoices);
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.getInvoiceExpandedDetails = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    const cargoRepository = database_1.AppDataSource.getRepository(cargos_1.Cargo);
    const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
    const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
    try {
        const { id } = req.params;
        const invoice = yield invoiceRepository.findOne({
            where: { id },
            relations: ["customer", "items"],
        });
        if (!invoice) {
            return res.status(404).json({ success: false, message: "Invoice not found" });
        }
        const orderNumber = invoice.orderNumber;
        let orderItems = [];
        const cargo = yield cargoRepository.findOne({
            where: { cargo_no: orderNumber },
        });
        if (cargo) {
            orderItems = yield orderItemRepository.find({
                where: { cargo_id: cargo.id },
                relations: ["item", "item.taric", "order"],
            });
        }
        else {
            const order = yield orderRepository.findOne({
                where: { order_no: orderNumber },
            });
            if (order) {
                orderItems = yield orderItemRepository.find({
                    where: { order_id: order.id },
                    relations: ["item", "item.taric", "order"],
                });
            }
        }
        const taricGroupsMap = new Map();
        orderItems.forEach((oi) => {
            const item = oi.item;
            const taric = item === null || item === void 0 ? void 0 : item.taric;
            const taricId = (taric === null || taric === void 0 ? void 0 : taric.id) || "unknown";
            if (!taricGroupsMap.has(taricId)) {
                taricGroupsMap.set(taricId, {
                    taricId,
                    taricNameEn: (taric === null || taric === void 0 ? void 0 : taric.name_en) || "Unknown",
                    taricCode: (taric === null || taric === void 0 ? void 0 : taric.code) || "-",
                    dutyRate: (taric === null || taric === void 0 ? void 0 : taric.duty_rate) || 0,
                    totalQty: 0,
                    totalPrice: 0,
                    unitPrice: (item === null || item === void 0 ? void 0 : item.RMB_Price) || 0,
                });
            }
            const group = taricGroupsMap.get(taricId);
            group.totalQty += oi.qty || 0;
            group.totalPrice += (oi.qty || 0) * ((item === null || item === void 0 ? void 0 : item.RMB_Price) || 0);
        });
        const taricGroups = Array.from(taricGroupsMap.values());
        return res.json({
            success: true,
            data: {
                invoice,
                detailedItems: orderItems.map((oi) => {
                    var _b, _c, _d, _e;
                    return (Object.assign(Object.assign({}, oi), { v: (((_b = oi.item) === null || _b === void 0 ? void 0 : _b.length) * ((_c = oi.item) === null || _c === void 0 ? void 0 : _c.width) * ((_d = oi.item) === null || _d === void 0 ? void 0 : _d.height)) / 1000 || 0, w: ((_e = oi.item) === null || _e === void 0 ? void 0 : _e.weight) || 0 }));
                }),
                taricGroups,
            },
        });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.markAsPaid = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const { id } = req.params;
        const invoice = yield invoiceRepository.findOne({ where: { id } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        invoice.status = "paid";
        invoice.paidAmount = invoice.grossTotal;
        invoice.outstandingAmount = 0;
        invoice.closedAt = new Date();
        yield invoiceRepository.save(invoice);
        return res.json({ success: true, message: "Invoice marked as paid" });
    }
    catch (error) {
        return next(error);
    }
});
InvoiceController.cancelInvoice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const { id } = req.params;
        const invoice = yield invoiceRepository.findOne({ where: { id } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        invoice.status = "cancelled";
        invoice.closedAt = new Date();
        yield invoiceRepository.save(invoice);
        return res.json({ success: true, message: "Invoice cancelled" });
    }
    catch (error) {
        return next(error);
    }
});
