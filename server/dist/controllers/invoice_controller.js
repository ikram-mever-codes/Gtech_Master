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
const tarics_1 = require("../models/tarics");
const cargo_orders_1 = require("../models/cargo_orders");
const typeorm_1 = require("typeorm");
const items_controller_1 = require("./items_controller");
const warehouse_items_1 = require("../models/warehouse_items");
const order_controller_1 = require("./order_controller");
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
        const orderNumber = invoiceData.orderNumber;
        if (!orderNumber) {
            return res.status(400).json({ message: "Order Number/Cargo Number is required" });
        }
        const cargoRepo = database_1.AppDataSource.getRepository(cargos_1.Cargo);
        const orderRepo = database_1.AppDataSource.getRepository(orders_1.Order);
        let associatedCargo = yield cargoRepo.findOne({
            where: { cargo_no: orderNumber }
        });
        if (!associatedCargo) {
            const order = yield orderRepo.findOne({
                where: { order_no: orderNumber },
                relations: ["cargo"]
            });
            if (order && order.cargo) {
                associatedCargo = order.cargo;
            }
        }
        if (!associatedCargo) {
            return res.status(400).json({
                message: "Invoice cannot be created because the provided Order Number/Cargo Number is not assigned to any Cargo."
            });
        }
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
            const logoPath = path_1.default.join(process.cwd(), "assets", "logo.png");
            if (fs_1.default.existsSync(logoPath)) {
                doc.image(logoPath, leftAlignX, yPos, { fit: [100, 50] });
            }
            const fontSource = order_controller_1._cachedCjkFontBuffer || order_controller_1._cachedCjkFontPath;
            if (fontSource) {
                try {
                    const chineseAddress = "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
                    doc.font(fontSource, 0).fontSize(8).text(chineseAddress, leftAlignX + 220, yPos, { lineBreak: false });
                    doc.font("Helvetica");
                }
                catch (e) {
                    console.error(`[CJK-DEBUG] Render failed:`, e.message);
                    if (process.platform === "win32") {
                        try {
                            doc.font("C:\\Windows\\Fonts\\msyh.ttc", 0).fontSize(8).text("中国安徽...", leftAlignX + 220, yPos);
                        }
                        catch (e) { }
                    }
                    doc.font("Helvetica");
                }
            }
            else {
                console.warn("[CJK-DEBUG] No CJK font path cached — Chinese will show as boxes!");
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
            if (fontSource) {
                try {
                    const chineseAddress = "中国安徽省马鞍山市博望区博望汇盛广场西大丰冶金厂区";
                    doc.font(fontSource, 0).fontSize(8).text(chineseAddress, leftAlignX + 220, yPos, { lineBreak: false });
                    doc.font("Helvetica");
                }
                catch (e) {
                    console.error("[CJK-DEBUG] Render failed:", e.message);
                    doc.font("Helvetica");
                }
            }
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
                const rowY = tableY + headerHeight + rowIndex * rowHeight;
                if (rowIndex % 2 === 1) {
                    doc.rect(leftAlignX, rowY, tableWidth, rowHeight).fill("#FAFAFA");
                }
                const rowData = [
                    Number(item.quantity || 1).toString(),
                    item.articleNumber || "",
                    `${item.taxRate || 19}%`,
                    (() => {
                        var _b, _c;
                        let up = 0;
                        if (item.unitPrice !== undefined && item.unitPrice !== null && Number(item.unitPrice) !== 0)
                            up = Number(item.unitPrice);
                        else if (((_b = item.item) === null || _b === void 0 ? void 0 : _b.transfer_price_EUR) !== undefined && ((_c = item.item) === null || _c === void 0 ? void 0 : _c.transfer_price_EUR) !== null)
                            up = Number(item.item.transfer_price_EUR);
                        else
                            up = Number(item.unitPrice || 0);
                        return up.toFixed(2);
                    })(),
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
        let filePath = path_1.default.join(process.cwd(), invoice.pdfUrl);
        if (!fs_1.default.existsSync(filePath)) {
            console.warn(`[Invoice] PDF file missing for invoice ${invoice.invoiceNumber}, regenerating...`);
            try {
                const newPdfUrl = yield _a.generateInvoicePDF(invoice);
                yield invoiceRepository.update(invoiceId, { pdfUrl: newPdfUrl });
                invoice.pdfUrl = newPdfUrl;
                filePath = path_1.default.join(process.cwd(), newPdfUrl);
            }
            catch (genError) {
                console.error(`[Invoice] PDF regeneration failed for ${invoice.invoiceNumber}:`, genError);
                return res.status(500).json({ message: "PDF file could not be found or regenerated. Please contact support." });
            }
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
        if (invoiceData.description !== undefined && !invoiceData.description.trim()) {
            return res.status(400).json({ message: "Description is required" });
        }
        if (invoiceData.freightCost !== undefined && (invoiceData.freightCost === null || Number(invoiceData.freightCost) <= 0)) {
            return res.status(400).json({ message: "Freight Cost must be greater than 0" });
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
            relations: ["customer", "customer.businessDetails", "customer.starCustomerDetails", "items"],
            order: { invoiceDate: "DESC" },
        });
        const orderNumbers = invoices.map((i) => i.orderNumber).filter(Boolean);
        const orders = yield database_1.AppDataSource.getRepository(orders_1.Order).find({
            where: { order_no: (0, typeorm_1.In)(orderNumbers) },
            relations: ["cargo", "cargo.customer"]
        });
        const orderIds = orders.map((o) => o.id);
        const orderToCargoMap = new Map();
        if (orderIds.length > 0) {
            const cargoOrders = yield database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder).find({
                where: { order_id: (0, typeorm_1.In)(orderIds) },
                relations: ["cargo", "order", "cargo.customer"],
            });
            cargoOrders.forEach((co) => {
                if (co.cargo && co.order) {
                    orderToCargoMap.set(co.order.order_no, co.cargo);
                }
            });
        }
        const allCargos = yield database_1.AppDataSource.getRepository(cargos_1.Cargo).find();
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
        const allCargoIds = allCargos.map(c => c.id).filter(Boolean);
        const cargoCommentMap = new Map();
        if (allCargoIds.length > 0) {
            const allCargoOrders = yield database_1.AppDataSource.getRepository(cargo_orders_1.CargoOrder).find({
                where: { cargo_id: (0, typeorm_1.In)(allCargoIds) },
                relations: ["cargo", "order"],
            });
            allCargoOrders.forEach((co) => {
                var _b, _c;
                if (((_b = co.cargo) === null || _b === void 0 ? void 0 : _b.cargo_no) && ((_c = co.order) === null || _c === void 0 ? void 0 : _c.comment) && !cargoCommentMap.has(co.cargo.cargo_no)) {
                    cargoCommentMap.set(co.cargo.cargo_no, co.order.comment);
                }
            });
        }
        const orderItemsRaw = yield database_1.AppDataSource.manager.query(`
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
        orderItemsRaw.forEach((row) => {
            if (row.order_id) {
                const current = orderItemSummaryByOrderId.get(row.order_id) || { total_qty: 0, count_items: 0, total_price: 0 };
                orderItemSummaryByOrderId.set(row.order_id, {
                    total_qty: current.total_qty + Number(row.total_qty),
                    count_items: current.count_items + Number(row.count_items),
                    total_price: current.total_price + Number(row.total_price)
                });
            }
            if (row.cargo_id) {
                const current = orderItemSummaryByCargoId.get(row.cargo_id) || { total_qty: 0, count_items: 0, total_price: 0 };
                orderItemSummaryByCargoId.set(row.cargo_id, {
                    total_qty: current.total_qty + Number(row.total_qty),
                    count_items: current.count_items + Number(row.count_items),
                    total_price: current.total_price + Number(row.total_price)
                });
            }
        });
        const orderIdMap = new Map();
        orders.forEach(o => orderIdMap.set(o.order_no, o.id));
        const data = invoices.map((inv) => {
            var _b;
            const cargo = orderToCargoMap.get(inv.orderNumber);
            let customItemCount = 0;
            let customTotalQty = 0;
            let calculatedGrossTotal = Number(inv.grossTotal) || 0;
            if (cargo && orderItemSummaryByCargoId.has(cargo.id)) {
                const stats = orderItemSummaryByCargoId.get(cargo.id);
                customItemCount = stats.count_items;
                customTotalQty = stats.total_qty;
                if (calculatedGrossTotal === 0)
                    calculatedGrossTotal = stats.total_price;
            }
            else if (inv.orderNumber && orderIdMap.has(inv.orderNumber)) {
                const orderId = orderIdMap.get(inv.orderNumber);
                if (orderItemSummaryByOrderId.has(orderId)) {
                    const stats = orderItemSummaryByOrderId.get(orderId);
                    customItemCount = stats.count_items;
                    customTotalQty = stats.total_qty;
                    if (calculatedGrossTotal === 0)
                        calculatedGrossTotal = stats.total_price;
                }
            }
            if (customItemCount === 0 && inv.items) {
                customItemCount = inv.items.length;
                customTotalQty = inv.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            }
            const cargoNo = (cargo === null || cargo === void 0 ? void 0 : cargo.cargo_no) || (inv.orderNumber && !orderIdMap.has(inv.orderNumber) ? inv.orderNumber : undefined);
            const order = orders.find(o => o.order_no === inv.orderNumber);
            const orderComment = (order === null || order === void 0 ? void 0 : order.comment) ||
                cargoCommentMap.get((cargo === null || cargo === void 0 ? void 0 : cargo.cargo_no) || "") ||
                cargoCommentMap.get(inv.orderNumber || "") ||
                "";
            const rawBillTo = typeof (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_company_name) === "string" && cargo.bill_to_company_name.trim()
                ? cargo.bill_to_company_name.trim()
                : typeof (cargo === null || cargo === void 0 ? void 0 : cargo.bill_to_display_name) === "string" && cargo.bill_to_display_name.trim()
                    ? cargo.bill_to_display_name.trim()
                    : "GTech-Warehouse";
            const rawShipTo = typeof (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_company_name) === "string" && cargo.ship_to_company_name.trim().length > 1
                ? cargo.ship_to_company_name.trim()
                : typeof (cargo === null || cargo === void 0 ? void 0 : cargo.ship_to_display_name) === "string" && cargo.ship_to_display_name.trim().length > 1
                    ? cargo.ship_to_display_name.trim()
                    : typeof ((_b = inv.customer) === null || _b === void 0 ? void 0 : _b.companyName) === "string" && inv.customer.companyName.trim()
                        ? inv.customer.companyName.trim()
                        : "-";
            return Object.assign(Object.assign({}, inv), { grossTotal: calculatedGrossTotal, bill_to: rawBillTo, ship_to: rawShipTo, customItemCount,
                customTotalQty, cargoNo: cargoNo || inv.orderNumber, cargoId: (cargo === null || cargo === void 0 ? void 0 : cargo.id) || null, cargo: cargo ? { id: cargo.id, cargo_no: cargo.cargo_no } : null, orderComment });
        })
            .filter((inv) => inv !== null);
        const finalDataMap = new Map();
        data.forEach(inv => {
            finalDataMap.set(inv.id, inv);
        });
        return res.status(200).json({ success: true, data: Array.from(finalDataMap.values()) });
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
        let cargo = null;
        cargo = yield cargoRepository.findOne({
            where: { cargo_no: orderNumber },
        });
        if (cargo) {
            orderItems = yield orderItemRepository.find({
                where: { cargo_id: cargo.id },
                relations: ["item", "item.taric", "item.purchasePrices", "order"],
            });
        }
        else {
            const order = yield orderRepository.findOne({
                where: { order_no: orderNumber },
            });
            if (order) {
                orderItems = yield orderItemRepository.find({
                    where: { order_id: order.id },
                    relations: ["item", "item.taric", "item.purchasePrices", "order"],
                });
            }
        }
        const getEffectiveTaricCode = (oi) => {
            var _b, _c;
            const itemTaricCode = ((_c = (_b = oi.item) === null || _b === void 0 ? void 0 : _b.taric) === null || _c === void 0 ? void 0 : _c.code) || "";
            const rawCode = oi.set_taric_code ? oi.set_taric_code.toString() : itemTaricCode;
            if (rawCode) {
                const codes = rawCode.split("/");
                return codes.length > 1 ? codes[1].trim() : codes[0].trim();
            }
            return "unknown";
        };
        const getGroupKey = (oi) => {
            var _b, _c, _d, _e, _f;
            const itemTaricCode = ((_c = (_b = oi.item) === null || _b === void 0 ? void 0 : _b.taric) === null || _c === void 0 ? void 0 : _c.code) || "";
            const isProjectItem = !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";
            if (oi.set_taric_code) {
                const codes = oi.set_taric_code.split("/");
                const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
                return `hs_${target}`;
            }
            const taricId = (_e = (_d = oi.item) === null || _d === void 0 ? void 0 : _d.taric) === null || _e === void 0 ? void 0 : _e.id;
            if (taricId && !isProjectItem) {
                return `hs_${itemTaricCode}`;
            }
            return `item_${((_f = oi.item) === null || _f === void 0 ? void 0 : _f.id) || Math.random()}`;
        };
        const manualTaricCodes = [];
        orderItems.forEach((oi) => {
            if (oi.set_taric_code) {
                const codes = oi.set_taric_code.split("/");
                codes.forEach((c) => {
                    if (c && c.trim())
                        manualTaricCodes.push(c.trim());
                });
            }
        });
        const uniqueManualCodes = [...new Set(manualTaricCodes)];
        const manualTarics = uniqueManualCodes.length > 0
            ? yield database_1.AppDataSource.getRepository(tarics_1.Taric).find({ where: { code: (0, typeorm_1.In)(uniqueManualCodes) } })
            : [];
        const manualTaricMap = new Map(manualTarics.map(t => [t.code, t]));
        const taricGroupsMap = new Map();
        orderItems.forEach((oi) => {
            var _b, _c;
            const item = oi.item;
            const taric = item === null || item === void 0 ? void 0 : item.taric;
            const itemTaricCode = (taric === null || taric === void 0 ? void 0 : taric.code) || "";
            const isProjectItem = !itemTaricCode || itemTaricCode === "0" || itemTaricCode === "0000000000";
            const groupKey = getGroupKey(oi);
            if (!taricGroupsMap.has(groupKey)) {
                let displayCode = ((_c = (_b = oi.item) === null || _b === void 0 ? void 0 : _b.taric) === null || _c === void 0 ? void 0 : _c.code) || "-";
                let displayName = (taric === null || taric === void 0 ? void 0 : taric.name_en) || (isProjectItem ? "Project Item" : "Unknown");
                let displayRate = (taric === null || taric === void 0 ? void 0 : taric.duty_rate) || 0;
                if (oi.set_taric_code) {
                    const codes = oi.set_taric_code.split("/");
                    const targetCode = codes.length > 1 ? codes[1].trim() : codes[0].trim();
                    displayCode = targetCode;
                    const mTaric = manualTaricMap.get(targetCode);
                    if (mTaric) {
                        displayName = mTaric.name_en || displayName;
                        displayRate = mTaric.duty_rate !== undefined ? mTaric.duty_rate : displayRate;
                    }
                }
                let unitPrice = (oi === null || oi === void 0 ? void 0 : oi.eur_special_price) || (oi === null || oi === void 0 ? void 0 : oi.price) || (item === null || item === void 0 ? void 0 : item.transfer_price_EUR) || (item === null || item === void 0 ? void 0 : item.price) || 0;
                if (!unitPrice && ((oi === null || oi === void 0 ? void 0 : oi.rmb_special_price) || 0) > 0) {
                    unitPrice = oi.rmb_special_price * 0.13;
                }
                taricGroupsMap.set(groupKey, {
                    taricId: groupKey,
                    taricNameEn: displayName,
                    taricCode: displayCode,
                    dutyRate: displayRate,
                    totalQty: 0,
                    totalPrice: 0,
                    unitPrice: unitPrice,
                    isProjectItem,
                });
            }
            const group = taricGroupsMap.get(groupKey);
            group.totalQty += oi.qty || 0;
            let currentPrice = (oi === null || oi === void 0 ? void 0 : oi.eur_special_price) || (oi === null || oi === void 0 ? void 0 : oi.price) || (item === null || item === void 0 ? void 0 : item.transfer_price_EUR) || (item === null || item === void 0 ? void 0 : item.price) || 0;
            if (!currentPrice && ((oi === null || oi === void 0 ? void 0 : oi.rmb_special_price) || 0) > 0) {
                currentPrice = oi.rmb_special_price * 0.13;
            }
            group.totalPrice += (oi.qty || 0) * (Number(currentPrice) || 0);
        });
        const taricGroups = Array.from(taricGroupsMap.values()).map((g) => {
            if (g.totalQty > 0) {
                g.unitPrice = g.totalPrice / g.totalQty;
            }
            else {
                g.unitPrice = 0;
            }
            return g;
        });
        const itemsWithFallbacks = yield Promise.all([...orderItems]
            .map((oi) => __awaiter(void 0, void 0, void 0, function* () {
            const item = oi.item;
            let ean = (item === null || item === void 0 ? void 0 : item.ean) || "-";
            if (ean === "-" && (item === null || item === void 0 ? void 0 : item.id)) {
                const wi = yield database_1.AppDataSource.getRepository(warehouse_items_1.WarehouseItem).findOne({
                    where: { item_id: item.id }
                });
                if (wi === null || wi === void 0 ? void 0 : wi.ean)
                    ean = wi.ean;
            }
            let rmbPrice = oi.rmb_special_price || 0;
            if (!rmbPrice && (item === null || item === void 0 ? void 0 : item.id)) {
                rmbPrice = (yield (0, items_controller_1.getRMBPriceFromSupplier)(item.id)) || 0;
            }
            let eurPrice = oi.eur_special_price || oi.price || (item === null || item === void 0 ? void 0 : item.transfer_price_EUR) || (item === null || item === void 0 ? void 0 : item.price) || 0;
            if (!eurPrice && rmbPrice) {
                eurPrice = rmbPrice * 0.13;
            }
            return Object.assign(Object.assign({}, oi), { v: ((item === null || item === void 0 ? void 0 : item.length) * (item === null || item === void 0 ? void 0 : item.width) * (item === null || item === void 0 ? void 0 : item.height)) / 1000 || 0, w: (item === null || item === void 0 ? void 0 : item.weight) || 0, _effectiveTaricCode: getEffectiveTaricCode(oi), _fallbackEan: ean, _fallbackRmb: rmbPrice, _fallbackEk: eurPrice });
        })));
        const sortedItems = itemsWithFallbacks.sort((a, b) => {
            var _b, _c;
            const codeCompare = (a._effectiveTaricCode || "").localeCompare(b._effectiveTaricCode || "");
            if (codeCompare !== 0)
                return codeCompare;
            return (((_b = a.item) === null || _b === void 0 ? void 0 : _b.item_name) || "").localeCompare(((_c = b.item) === null || _c === void 0 ? void 0 : _c.item_name) || "");
        });
        const orderNosInCargo = [...new Set(orderItems.map((oi) => { var _b; return (_b = oi.order) === null || _b === void 0 ? void 0 : _b.order_no; }).filter(Boolean))];
        return res.json({
            success: true,
            data: {
                invoice,
                cargo: cargo ? {
                    id: cargo.id,
                    cargo_no: cargo.cargo_no,
                    ship_to: (() => {
                        var _b, _c;
                        const v = (_c = (_b = cargo.ship_to_company_name) !== null && _b !== void 0 ? _b : cargo.ship_to_display_name) !== null && _c !== void 0 ? _c : null;
                        if (!v || typeof v !== "string")
                            return null;
                        const s = v.trim();
                        return s.length > 1 ? s : null;
                    })(),
                    bill_to: (() => {
                        var _b, _c;
                        const v = (_c = (_b = cargo.bill_to_company_name) !== null && _b !== void 0 ? _b : cargo.bill_to_display_name) !== null && _c !== void 0 ? _c : null;
                        if (!v || typeof v !== "string")
                            return "GTech-Warehouse";
                        const s = v.trim();
                        return s.length > 1 ? s : "GTech-Warehouse";
                    })(),
                } : null,
                orderNosInCargo,
                detailedItems: sortedItems,
                taricGroups,
            },
        });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.updatePackingListData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    try {
        const { id } = req.params;
        const { packingListData } = req.body;
        const invoice = yield invoiceRepository.findOne({ where: { id } });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        invoice.packingListData = packingListData;
        yield invoiceRepository.save(invoice);
        return res.json({ success: true, message: "Packing list data updated successfully" });
    }
    catch (error) {
        console.error(error);
        return next(error);
    }
});
InvoiceController.downloadPackingListPDF = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
    const invoiceRepository = database_1.AppDataSource.getRepository(invoice_1.Invoice);
    const orderRepository = database_1.AppDataSource.getRepository(orders_1.Order);
    const cargoRepository = database_1.AppDataSource.getRepository(cargos_1.Cargo);
    const orderItemRepository = database_1.AppDataSource.getRepository(order_items_1.OrderItem);
    try {
        const { id } = req.params;
        const invoice = yield invoiceRepository.findOne({
            where: { id },
            relations: ["customer", "items", "items.item"]
        });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        const doc = new pdfkit_1.default({ margin: 30, size: "A4" });
        const filename = `Packing_List_${invoice.invoiceNumber}.pdf`;
        res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-type", "application/pdf");
        doc.pipe(res);
        let items = [];
        let orderComment = "";
        if (invoice.packingListData && Array.isArray(invoice.packingListData) && invoice.packingListData.length > 0) {
            items = invoice.packingListData;
        }
        else {
            const orderNumber = invoice.orderNumber;
            let orderItems = [];
            const cargo = yield cargoRepository.findOne({ where: { cargo_no: orderNumber } });
            if (cargo) {
                orderItems = yield orderItemRepository.find({
                    where: { cargo_id: cargo.id },
                    relations: ["item", "item.taric", "order"],
                });
            }
            else {
                const order = yield orderRepository.findOne({ where: { order_no: orderNumber } });
                if (order) {
                    orderComment = order.comment || "";
                    orderItems = yield orderItemRepository.find({
                        where: { order_id: order.id },
                        relations: ["item", "item.taric", "order"],
                    });
                }
            }
            if (!orderComment && orderItems.length > 0) {
                orderComment = ((_c = (_b = orderItems.find((oi) => { var _b; return (_b = oi.order) === null || _b === void 0 ? void 0 : _b.comment; })) === null || _b === void 0 ? void 0 : _b.order) === null || _c === void 0 ? void 0 : _c.comment) || "";
                if (!orderComment) {
                    const distinctOrderIds = [...new Set(orderItems.map((oi) => oi.order_id).filter(Boolean))];
                    if (distinctOrderIds.length > 0) {
                        const relatedOrders = yield orderRepository.find({ where: { id: (0, typeorm_1.In)(distinctOrderIds) } });
                        orderComment = ((_d = relatedOrders.find((o) => o.comment)) === null || _d === void 0 ? void 0 : _d.comment) || "";
                    }
                }
            }
            items = orderItems.map((oi, idx) => {
                const item = oi.item;
                const taric = item === null || item === void 0 ? void 0 : item.taric;
                const desc = (taric === null || taric === void 0 ? void 0 : taric.description_en) || (taric === null || taric === void 0 ? void 0 : taric.name_en) || (item === null || item === void 0 ? void 0 : item.item_name) || "";
                return {
                    id: oi.id || idx,
                    description: desc,
                    qty: Number(oi.qty || 0),
                    client: "",
                    package: `P${idx + 1}`,
                    pType: "Tray",
                    weight: Number((item === null || item === void 0 ? void 0 : item.weight) || 0),
                    length: Number((item === null || item === void 0 ? void 0 : item.length) || 0),
                    width: Number((item === null || item === void 0 ? void 0 : item.width) || 0),
                    height: Number((item === null || item === void 0 ? void 0 : item.height) || 0),
                };
            });
        }
        const extractClients = (comment) => {
            if (!comment)
                return "";
            const tokens = [];
            const gtechMatch = comment.match(/\b(GTECH-[A-Z0-9]+)\b/i);
            if (gtechMatch)
                tokens.push(gtechMatch[1].toUpperCase());
            const kMatch = comment.match(/\b(K0\d{2,})\b/i);
            if (kMatch)
                tokens.push(kMatch[1].toUpperCase());
            return tokens.join(" / ");
        };
        const derivedClient = extractClients(orderComment);
        if (derivedClient) {
            items = items.map((it) => (Object.assign(Object.assign({}, it), { client: it.client || derivedClient })));
        }
        const cargoNo = invoice.orderNumber || "N/A";
        const dateStr = new Date(invoice.invoiceDate).toISOString().split("T")[0];
        doc.rect(30, 30, 535, 20).stroke();
        doc.fontSize(10).font("Helvetica-Bold").text("GTech Industries Limited", 30, 37, { align: "center", width: 535 });
        doc.rect(30, 50, 535, 15).stroke();
        doc.fontSize(8).font("Helvetica").text("Yongxin Road, Bowang Town, Bowang, Maanshan, Anhui, China", 30, 54, { align: "center", width: 535 });
        doc.rect(30, 65, 535, 15).fillAndStroke("#f0f0f0", "#000000");
        doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold").text("Packing List", 30, 69, { align: "center", width: 535 });
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
        doc.moveTo(RX + RL, 80).lineTo(RX + RL, 95).stroke();
        doc.font("Helvetica").fontSize(7.5).text(invoice.invoiceNumber, RX + RL + 3, 84, { width: RV - 5 });
        doc.rect(30, 95, LW, 20).stroke();
        doc.fillColor("#000000").fontSize(8).font("Helvetica").text("GTech Industries GmbH", 35, 101);
        doc.rect(RX, 95, RW, 20).stroke();
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8).text("Cargo No.", RX + 3, 101, { width: RL - 3 });
        doc.moveTo(RX + RL, 95).lineTo(RX + RL, 115).stroke();
        doc.font("Helvetica").fontSize(7.5).text(cargoNo, RX + RL + 3, 101, { width: RV - 5 });
        doc.rect(30, 115, LW, 15).stroke();
        doc.fontSize(8).text("Antonio-Segni-Str. 4 44263 Dortmund Germany, Tel: +4923158697565", 35, 119);
        doc.rect(RX, 115, RW, 15).stroke();
        doc.font("Helvetica-Bold").fontSize(8).text("Date:", RX + 3, 119, { width: RL - 3 });
        doc.moveTo(RX + RL, 115).lineTo(RX + RL, 130).stroke();
        doc.font("Helvetica").fontSize(8).text(dateStr, RX + RL + 3, 119, { width: RV - 5 });
        doc.rect(30, 130, LW, 15).stroke();
        doc.text("Mr. Markus Entner", 35, 134);
        doc.rect(RX, 130, RW, 15).stroke();
        let itemY = 155;
        const colWidths = { desc: 215, qty: 35, client: 45, pack: 55, weight: 60, measure: 65, volume: 55 };
        const colX = {
            desc: 30,
            qty: 30 + colWidths.desc,
            client: 30 + colWidths.desc + colWidths.qty,
            pack: 30 + colWidths.desc + colWidths.qty + colWidths.client,
            weight: 30 + colWidths.desc + colWidths.qty + colWidths.client + colWidths.pack,
            measure: 30 + colWidths.desc + colWidths.qty + colWidths.client + colWidths.pack + colWidths.weight,
            volume: 30 + colWidths.desc + colWidths.qty + colWidths.client + colWidths.pack + colWidths.weight + colWidths.measure,
        };
        doc.rect(30, itemY, 535, 30).stroke();
        doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");
        doc.text("Description of goods", colX.desc, itemY + 10, { width: colWidths.desc, align: "center" });
        doc.text("QTY", colX.qty, itemY + 10, { width: colWidths.qty, align: "center" });
        doc.text("Clients", colX.client, itemY + 10, { width: colWidths.client, align: "center" });
        doc.text("Packages", colX.pack, itemY + 10, { width: colWidths.pack, align: "center" });
        doc.text("Weight (kg)", colX.weight, itemY + 10, { width: colWidths.weight, align: "center" });
        doc.text("Measure (cm)", colX.measure, itemY + 4, { width: colWidths.measure, align: "center" });
        doc.rect(colX.measure, itemY + 15, colWidths.measure, 15).stroke();
        doc.text("L", colX.measure, itemY + 19, { width: colWidths.measure / 3, align: "center" });
        doc.text("B", colX.measure + colWidths.measure / 3, itemY + 19, { width: colWidths.measure / 3, align: "center" });
        doc.text("H", colX.measure + (colWidths.measure / 3) * 2, itemY + 19, { width: colWidths.measure / 3, align: "center" });
        doc.text("Total Volume (cbm)", colX.volume, itemY + 4, { width: colWidths.volume, align: "center" });
        doc.moveTo(colX.qty, itemY).lineTo(colX.qty, itemY + 30).stroke();
        doc.moveTo(colX.client, itemY).lineTo(colX.client, itemY + 30).stroke();
        doc.moveTo(colX.pack, itemY).lineTo(colX.pack, itemY + 30).stroke();
        doc.moveTo(colX.weight, itemY).lineTo(colX.weight, itemY + 30).stroke();
        doc.moveTo(colX.measure, itemY).lineTo(colX.measure, itemY + 30).stroke();
        doc.moveTo(colX.measure + colWidths.measure / 3, itemY + 15).lineTo(colX.measure + colWidths.measure / 3, itemY + 30).stroke();
        doc.moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY + 15).lineTo(colX.measure + (colWidths.measure / 3) * 2, itemY + 30).stroke();
        doc.moveTo(colX.volume, itemY).lineTo(colX.volume, itemY + 30).stroke();
        itemY += 30;
        doc.font("Helvetica");
        let totalQty = 0;
        let grandTotalWeight = 0;
        let grandTotalVolume = 0;
        const clientTotals = {};
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
            const volume = (qty * len * wid * ht) / 1000000;
            totalQty += qty;
            grandTotalWeight += wt;
            grandTotalVolume += volume;
            const client = (item.client && item.client.trim()) ? item.client.trim() : "";
            const clientKey = client || "__unknown__";
            if (!clientTotals[clientKey])
                clientTotals[clientKey] = { weight: 0, volume: 0, label: client };
            clientTotals[clientKey].weight += wt;
            clientTotals[clientKey].volume += volume;
            doc.rect(30, itemY, 535, rowHeight).stroke();
            doc.moveTo(colX.qty, itemY).lineTo(colX.qty, itemY + rowHeight).stroke();
            doc.moveTo(colX.client, itemY).lineTo(colX.client, itemY + rowHeight).stroke();
            doc.moveTo(colX.pack, itemY).lineTo(colX.pack, itemY + rowHeight).stroke();
            doc.moveTo(colX.weight, itemY).lineTo(colX.weight, itemY + rowHeight).stroke();
            doc.moveTo(colX.measure, itemY).lineTo(colX.measure, itemY + rowHeight).stroke();
            doc.moveTo(colX.measure + colWidths.measure / 3, itemY).lineTo(colX.measure + colWidths.measure / 3, itemY + rowHeight).stroke();
            doc.moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY).lineTo(colX.measure + (colWidths.measure / 3) * 2, itemY + rowHeight).stroke();
            doc.moveTo(colX.volume, itemY).lineTo(colX.volume, itemY + rowHeight).stroke();
            const textY = itemY + 8;
            doc.fillColor("#000000").fontSize(7);
            doc.text(item.description || "", colX.desc + 4, itemY + 5, { width: colWidths.desc - 8, lineBreak: true });
            doc.fontSize(8);
            const fmt2 = (n) => n > 0 ? parseFloat(n.toFixed(2)).toString() : "";
            doc.text(qty > 0 ? qty.toString() : "", colX.qty, textY, { width: colWidths.qty, align: "center" });
            doc.text(client, colX.client, textY, { width: colWidths.client, align: "center" });
            doc.text(item.package || "", colX.pack, textY, { width: colWidths.pack, align: "center" });
            doc.text(wt > 0 ? parseFloat(wt.toFixed(2)).toString() : "", colX.weight, textY, { width: colWidths.weight, align: "center" });
            doc.text(fmt2(len), colX.measure, textY, { width: colWidths.measure / 3, align: "center" });
            doc.text(fmt2(wid), colX.measure + colWidths.measure / 3, textY, { width: colWidths.measure / 3, align: "center" });
            doc.text(fmt2(ht), colX.measure + (colWidths.measure / 3) * 2, textY, { width: colWidths.measure / 3, align: "center" });
            doc.text(volume > 0 ? volume.toFixed(3) : "", colX.volume, textY, { width: colWidths.volume, align: "center" });
            itemY += rowHeight;
        }
        const clientKeys = Object.keys(clientTotals).filter(k => k !== "__unknown__");
        const namedClients = clientKeys.map(k => (Object.assign({ key: k }, clientTotals[k])));
        const totalsRowHeight = (namedClients.length > 0 ? namedClients.length : 1) * 15;
        doc.rect(30, itemY, 535, totalsRowHeight + 15).stroke();
        doc.moveTo(colX.qty, itemY).lineTo(colX.qty, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.client, itemY).lineTo(colX.client, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.pack, itemY).lineTo(colX.pack, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.weight, itemY).lineTo(colX.weight, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.measure, itemY).lineTo(colX.measure, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.measure + colWidths.measure / 3, itemY).lineTo(colX.measure + colWidths.measure / 3, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.measure + (colWidths.measure / 3) * 2, itemY).lineTo(colX.measure + (colWidths.measure / 3) * 2, itemY + totalsRowHeight + 15).stroke();
        doc.moveTo(colX.volume, itemY).lineTo(colX.volume, itemY + totalsRowHeight + 15).stroke();
        doc.font("Helvetica-Bold").fontSize(8);
        doc.text("Total", colX.desc, itemY + 5, { width: colWidths.desc, align: "center" });
        doc.text(totalQty.toString(), colX.qty, itemY + 5, { width: colWidths.qty, align: "center" });
        let currentY = itemY;
        namedClients.forEach((c) => {
            doc.fontSize(8).font("Helvetica-Bold");
            doc.text(c.label, colX.client, currentY + 5, { width: colWidths.client, align: "center" });
            doc.font("Helvetica");
            doc.text(`${c.weight.toFixed(2)} kg`, colX.weight, currentY + 5, { width: colWidths.weight, align: "center" });
            doc.text(`${c.volume.toFixed(2)} m³`, colX.volume, currentY + 5, { width: colWidths.volume, align: "center" });
            doc.moveTo(colX.client, currentY).lineTo(565, currentY).stroke();
            currentY += 15;
        });
        doc.rect(colX.client, currentY, 565 - colX.client, 15).fillAndStroke("#f0f0f0", "#000000");
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8);
        doc.text("Total", colX.client, currentY + 4, { width: colWidths.client, align: "center" });
        doc.font("Helvetica");
        doc.text(`${grandTotalWeight.toFixed(2)} kg`, colX.weight, currentY + 4, { width: colWidths.weight, align: "center" });
        doc.text(`${grandTotalVolume.toFixed(2)} m³`, colX.volume, currentY + 4, { width: colWidths.volume, align: "center" });
        itemY = currentY + 15;
        doc.rect(30, itemY, 535, 15).stroke();
        doc.fontSize(8).font("Helvetica-Bold");
        const uniquePackages = [...new Set(items.map((i) => i.package).filter(Boolean))];
        const pTypeCount = items.reduce((acc, i) => {
            if (i.pType)
                acc[i.pType] = (acc[i.pType] || 0) + 1;
            return acc;
        }, {});
        const pTypeSummary = Object.entries(pTypeCount).map(([t, n]) => `${n} ${t}`).join(" + ");
        const pkgText = pTypeSummary ? `${uniquePackages.length} (${pTypeSummary})` : `${uniquePackages.length}`;
        doc.text(`No. of packages: ${pkgText}`, 35, itemY + 4);
        itemY += 15;
        doc.rect(30, itemY, 535, 15).stroke();
        const uniqueClientLabels = [...new Set(namedClients.map(c => c.label).filter(Boolean))];
        const shippingMarks = uniqueClientLabels.join(", ");
        doc.text(`Shipping Marks: ${shippingMarks}`, 35, itemY + 4);
        itemY += 15;
        doc.rect(30, itemY, 535, 15).stroke();
        doc.text("Country of origin: CHINA", 35, itemY + 4);
        doc.end();
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
        const invoice = yield invoiceRepository.findOne({
            where: { id },
            relations: ["customer", "items", "items.item"]
        });
        if (!invoice)
            return res.status(404).json({ message: "Invoice not found" });
        if (invoice.freightCost === null || invoice.freightCost === undefined || Number(invoice.freightCost) <= 0) {
            return res.status(400).json({
                success: false,
                message: "Freight cost must be provided and greater than 0 before verifying the invoice."
            });
        }
        if (!invoice.description || !invoice.description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Description must be provided before verifying the invoice."
            });
        }
        if (!invoice.invoiceNumber || !invoice.invoiceNumber.startsWith("CI")) {
            const allCisInvoices = yield invoiceRepository.find({
                where: {
                    invoiceNumber: (0, typeorm_1.Like)("CI%")
                }
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
            invoice.invoiceNumber = `${prefix}${nextSeq.toString().padStart(3, "0")}`;
            invoice.invoiceDate = now;
            const pdfUrl = yield _a.generateInvoicePDF(invoice);
            invoice.pdfUrl = pdfUrl;
        }
        invoice.status = "paid";
        invoice.paidAmount = invoice.grossTotal;
        invoice.outstandingAmount = 0;
        invoice.closedAt = new Date();
        yield invoiceRepository.save(invoice);
        return res.json({ success: true, message: "Invoice marked as paid", data: invoice });
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
