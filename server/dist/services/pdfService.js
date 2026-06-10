"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePurchaseOrderPDFBuffer = generatePurchaseOrderPDFBuffer;
const pdfkit_1 = __importDefault(require("pdfkit"));
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function resolveFontPaths() {
    const regularCandidates = [
        path_1.default.join(process.cwd(), "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
        path_1.default.join(process.cwd(), "server", "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
        path_1.default.resolve(__dirname, "..", "..", "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
        path_1.default.resolve(__dirname, "..", "..", "..", "assets", "noto-sans-sc", "NotoSansSC-Regular.otf"),
        "/home/ubuntu/Master/server/assets/noto-sans-sc/NotoSansSC-Regular.otf",
        "/var/www/Master/server/assets/noto-sans-sc/NotoSansSC-Regular.otf",
    ];
    const boldCandidates = [
        path_1.default.join(process.cwd(), "assets", "noto-sans-sc", "NotoSansSC-Bold.otf"),
        path_1.default.join(process.cwd(), "server", "assets", "noto-sans-sc", "NotoSansSC-Bold.otf"),
        path_1.default.resolve(__dirname, "..", "..", "assets", "noto-sans-sc", "NotoSansSC-Bold.otf"),
        path_1.default.resolve(__dirname, "..", "..", "..", "assets", "noto-sans-sc", "NotoSansSC-Bold.otf"),
        "/home/ubuntu/Master/server/assets/noto-sans-sc/NotoSansSC-Bold.otf",
        "/var/www/Master/server/assets/noto-sans-sc/NotoSansSC-Bold.otf",
    ];
    let regularPath = "";
    let boldPath = "";
    for (const p of regularCandidates) {
        if (fs_1.default.existsSync(p)) {
            regularPath = p;
            break;
        }
    }
    for (const p of boldCandidates) {
        if (fs_1.default.existsSync(p)) {
            boldPath = p;
            break;
        }
    }
    if (!regularPath) {
        if (process.platform === "win32") {
            const systemMsyh = "C:\\Windows\\Fonts\\msyh.ttc";
            if (fs_1.default.existsSync(systemMsyh)) {
                return { regular: systemMsyh, bold: systemMsyh };
            }
        }
        return { regular: "Helvetica", bold: "Helvetica-Bold" };
    }
    return { regular: regularPath, bold: boldPath || regularPath };
}
function generatePurchaseOrderPDFBuffer(so) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        console.log(`[PDF_SERVICE] Starting for SO: ${so === null || so === void 0 ? void 0 : so.id}`);
        if (!so)
            throw new Error("Supplier Order data is missing");
        const items = so.items || [];
        const doc = new pdfkit_1.default({ size: "A4", margin: 40, bufferPages: true });
        const fontPaths = resolveFontPaths();
        if (fontPaths.regular !== "Helvetica") {
            doc.registerFont("NotoSansSC", fontPaths.regular);
            doc.registerFont("NotoSansSC-Bold", fontPaths.bold);
        }
        const regularFont = fontPaths.regular === "Helvetica" ? "Helvetica" : "NotoSansSC";
        const boldFont = fontPaths.regular === "Helvetica" ? "Helvetica-Bold" : "NotoSansSC-Bold";
        const chunks = [];
        doc.on("data", (chunk) => chunks.push(chunk));
        const pdfFinished = new Promise((resolve, reject) => {
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));
        });
        const fetchImage = (url) => {
            return new Promise((resolve, reject) => {
                var _a;
                if (!url || typeof url !== 'string') {
                    return reject(new Error("Invalid or empty URL"));
                }
                let finalUrl = url;
                if (!url.startsWith("http")) {
                    const baseUrl = ((_a = process.env.API_URL) === null || _a === void 0 ? void 0 : _a.replace("/api/v1", "")) || "http://localhost:1000";
                    finalUrl = `${baseUrl}${url}`;
                }
                const agent = new https_1.default.Agent({ rejectUnauthorized: false });
                const client = finalUrl.startsWith("https") ? https_1.default : http_1.default;
                client.get(finalUrl, { agent: finalUrl.startsWith("https") ? agent : undefined }, (res) => {
                    if (res.statusCode !== 200) {
                        return reject(new Error(`Status ${res.statusCode}`));
                    }
                    const data = [];
                    res.on("data", (c) => data.push(c));
                    res.on("end", () => resolve(Buffer.concat(data)));
                    res.on("error", reject);
                }).on("error", reject);
            });
        };
        try {
            const { SupplierItem } = yield Promise.resolve().then(() => __importStar(require("../models/supplier_items")));
            const { AppDataSource } = yield Promise.resolve().then(() => __importStar(require("../config/database")));
            const { In } = yield Promise.resolve().then(() => __importStar(require("typeorm")));
            const itemIds = items.map(it => it.item_id).filter(id => id !== null && id !== undefined);
            const supplierItems = so.supplier_id && itemIds.length > 0
                ? yield AppDataSource.getRepository(SupplierItem).find({
                    where: {
                        supplier_id: so.supplier_id,
                        item_id: In(itemIds)
                    }
                })
                : [];
            const supplierPriceMap = new Map(supplierItems.map(si => [Number(si.item_id), si.price_rmb]));
            console.log(`[PDF_SERVICE] supplierPriceMap has ${supplierPriceMap.size} entries for supplier ${so.supplier_id}`);
            doc.fontSize(16).fillColor("#333333").font(boldFont).text("GTech Industries Limited", 40, 30, { align: "right" });
            doc.moveTo(40, 55).lineTo(555, 55).strokeColor("#333333").lineWidth(0.8).stroke();
            const tickClr = "#666666";
            const hdrY = 60;
            doc.fillColor(tickClr).font(regularFont).fontSize(8);
            doc.text("Engineering", 395, hdrY, { lineBreak: false });
            doc.save().translate(441, hdrY).scale(0.55).moveTo(0, 5).lineTo(3, 8).lineTo(8, 0).strokeColor(tickClr).lineWidth(2.5).stroke().restore();
            doc.text("Design", 453, hdrY, { lineBreak: false });
            doc.save().translate(479, hdrY).scale(0.55).moveTo(0, 5).lineTo(3, 8).lineTo(8, 0).strokeColor(tickClr).lineWidth(2.5).stroke().restore();
            doc.text("Manufacturing", 491, hdrY, { lineBreak: false });
            doc.save().translate(546, hdrY).scale(0.55).moveTo(0, 5).lineTo(3, 8).lineTo(8, 0).strokeColor(tickClr).lineWidth(2.5).stroke().restore();
            doc.fontSize(7).fillColor("#555555");
            doc.text("GTech Industries Limited: 3A, 12/F, Kaiser Centre, N. 18 Centre Street, Sai Ying Pun, Hong Kong", 40, 75);
            doc.text("GTech Establishment China: West Dafeng Metallurgical Plant, Bowang Huisheng Square, Bowang, Ma'anshan, Anhui", 40, 85);
            doc.text("中国安徽省马鞍山市博望区博望区博望汇盛广场内西大丰冶金厂区", 40, 95);
            doc.fillColor("#000000").font(boldFont).fontSize(20).text("Purchase Order", 0, 130, { align: "center" });
            const gridTop = 165;
            const col1 = 40;
            const col2 = 145;
            const col3 = 325;
            const col4 = 435;
            const rowH = 24;
            const drawGridRow = (y, label1, val1, label2, val2, height = rowH) => {
                doc.strokeColor("#000000").lineWidth(0.5);
                doc.rect(col1, y, col2 - col1, height).fillAndStroke("#f2f2f2", "#000000");
                doc.fillColor("#000000").font(boldFont).fontSize(10).text(label1, col1 + 8, y + (height / 2 - 4));
                const val1Width = label2 ? col3 - col2 : 555 - col2;
                doc.rect(col2, y, val1Width, height).fillAndStroke("white", "#000000");
                doc.fillColor("#000000").font(regularFont).fontSize(10).text(val1, col2 + 8, y + (height / 2 - 4), { width: val1Width - 12, height: height - 4 });
                if (label2) {
                    doc.rect(col3, y, col4 - col3, height).fillAndStroke("#f2f2f2", "#000000");
                    doc.fillColor("#000000").font(boldFont).fontSize(10).text(label2, col3 + 8, y + (height / 2 - 4));
                    doc.rect(col4, y, 555 - col4, height).fillAndStroke("white", "#000000");
                    doc.fillColor("#000000").font(regularFont).fontSize(10).text(val2 || "", col4 + 8, y + (height / 2 - 4), { width: 555 - col4 - 12, height: height - 4 });
                }
            };
            const supplierName = ((_a = so.supplier) === null || _a === void 0 ? void 0 : _a.company_name) || "";
            const supplierNameCn = ((_b = so.supplier) === null || _b === void 0 ? void 0 : _b.name_cn) ? ` ${so.supplier.name_cn}` : "";
            drawGridRow(gridTop, "To:", supplierName + supplierNameCn);
            drawGridRow(gridTop + rowH, "Contact person:", ((_c = so.supplier) === null || _c === void 0 ? void 0 : _c.contact_person) || "", "Address:", ((_d = so.supplier) === null || _d === void 0 ? void 0 : _d.full_address) || "", rowH * 1.8);
            drawGridRow(gridTop + rowH * 2.8, "Description:", so.po_description || so.remark || "");
            const poNo = so.ref_no || `GTO202600${so.id}`;
            const poDate = new Date(so.created_at).toLocaleDateString("en-GB");
            drawGridRow(gridTop + rowH * 3.8, "PO No.:", poNo, "Date:", poDate);
            const tableTop = gridTop + rowH * 5.5;
            const cols = [40, 100, 275, 340, 410, 485, 555];
            doc.lineWidth(0.8).strokeColor("#000000");
            doc.rect(cols[0], tableTop, cols[6] - cols[0], rowH).fillAndStroke("#f2f2f2", "#000000");
            doc.fillColor("#000000").font(boldFont).fontSize(9);
            doc.text("Image", cols[0] + 5, tableTop + 7);
            doc.text("Description", cols[1] + 5, tableTop + 7);
            doc.text("Model", cols[2] + 5, tableTop + 7);
            doc.text("QTY (pcs)", cols[3] + 5, tableTop + 7);
            doc.text("RMB/pc", cols[4] + 5, tableTop + 7);
            doc.text("Total (RMB)", cols[5] + 5, tableTop + 7);
            for (let i = 1; i < 6; i++) {
                doc.moveTo(cols[i], tableTop).lineTo(cols[i], tableTop + rowH).stroke();
            }
            let itemY = tableTop + rowH;
            let grandTotal = 0;
            let totalQty = 0;
            for (const item of items) {
                const rowHeight = 90;
                if (itemY + rowHeight > 730) {
                    doc.addPage();
                    itemY = 40;
                }
                doc.lineWidth(0.8).strokeColor("#000000");
                doc.rect(cols[0], itemY, cols[6] - cols[0], rowHeight).fillAndStroke("white", "#000000");
                for (let i = 1; i < 6; i++) {
                    doc.moveTo(cols[i], itemY).lineTo(cols[i], itemY + rowHeight).stroke();
                }
                try {
                    const img = yield fetchImage((_e = item.item) === null || _e === void 0 ? void 0 : _e.photo);
                    doc.image(img, cols[0] + 5, itemY + 15, { fit: [50, 60] });
                }
                catch (e) {
                    doc.fillColor("#999999").font("Helvetica-Oblique").fontSize(8).text("No Image", cols[0] + 5, itemY + 40, { width: 50, align: "center" });
                }
                doc.fillColor("#000000").font(regularFont).fontSize(8);
                const name = ((_f = item.item) === null || _f === void 0 ? void 0 : _f.item_name) || "Unknown";
                const nameCn = ((_g = item.item) === null || _g === void 0 ? void 0 : _g.item_name_cn) ? `\n${item.item.item_name_cn}` : "";
                doc.text(name + nameCn, cols[1] + 5, itemY + 10, { width: cols[2] - cols[1] - 10, height: rowHeight - 15 });
                doc.text(((_h = item.item) === null || _h === void 0 ? void 0 : _h.model) || "N/A", cols[2] + 5, itemY + 10, { width: cols[3] - cols[2] - 10, height: rowHeight - 15 });
                const qty = Number(item.qty || 0);
                let price = 0;
                const mappedRmbPrice = item.item_id ? supplierPriceMap.get(Number(item.item_id)) : null;
                console.log(`[PDF_SERVICE] item ${item.item_id}: mappedRmbPrice=${mappedRmbPrice}, rmb_special_price=${item.rmb_special_price}, price=${item.price}`);
                if (mappedRmbPrice !== undefined && mappedRmbPrice !== null && Number(mappedRmbPrice) > 0) {
                    price = Number(mappedRmbPrice);
                }
                else if (item.rmb_special_price !== undefined && item.rmb_special_price !== null && Number(item.rmb_special_price) > 0) {
                    price = Number(item.rmb_special_price);
                }
                else {
                    price = Number(item.price || 0);
                }
                const total = qty * price;
                doc.text(qty.toString(), cols[3] + 5, itemY + 10, { width: cols[4] - cols[3] - 10, align: 'center' });
                doc.text(price.toFixed(2), cols[4] + 5, itemY + 10, { width: cols[5] - cols[4] - 10, align: 'center' });
                doc.text(total.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[5] + 5, itemY + 10, { width: cols[6] - cols[5] - 10, align: 'right' });
                grandTotal += total;
                totalQty += qty;
                itemY += rowHeight;
            }
            doc.rect(cols[0], itemY, cols[6] - cols[0], rowH).fillAndStroke("#f2f2f2", "#000000");
            doc.fillColor("#000000").font(boldFont).fontSize(9);
            doc.text("Grand Total", cols[0] + 5, itemY + 7);
            doc.text(totalQty.toString(), cols[3] + 5, itemY + 7, { width: cols[4] - cols[3] - 10, align: 'center' });
            doc.text(grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), cols[5] + 5, itemY + 7, { width: cols[6] - cols[5] - 10, align: 'right' });
            for (let i = 3; i < 6; i++) {
                doc.moveTo(cols[i], itemY).lineTo(cols[i], itemY + rowH).stroke();
            }
            itemY += rowH + 25;
            const checkSpace = (needed) => {
                if (itemY + needed > 730) {
                    doc.addPage();
                    itemY = 40;
                }
            };
            for (const item of items) {
                const attachments = ((_j = item.item) === null || _j === void 0 ? void 0 : _j.attachments) || [];
                const qualityCriteria = ((_k = item.item) === null || _k === void 0 ? void 0 : _k.qualityCriteria) || [];
                if (attachments.length > 0 || qualityCriteria.length > 0) {
                    checkSpace(30);
                    doc.fillColor("#000000").font(boldFont).fontSize(11).text(`Additional Details for: ${(_l = item.item) === null || _l === void 0 ? void 0 : _l.item_name}`, cols[0], itemY);
                    itemY += 20;
                    for (const att of attachments) {
                        checkSpace(400);
                        try {
                            const img = yield fetchImage(att.url);
                            doc.image(img, cols[0], itemY, { fit: [515, 350], align: 'center' });
                            itemY += 365;
                        }
                        catch (e) {
                            doc.fillColor("#999999").font("Helvetica-Oblique").fontSize(9).text("[ Image Not Available ]", cols[0], itemY);
                            itemY += 20;
                        }
                        doc.fillColor("#333333").font(regularFont).fontSize(10).text(`Attachment: ${att.description || att.filename || "No description"}`, cols[0], itemY);
                        itemY += 30;
                    }
                    for (const qc of qualityCriteria) {
                        checkSpace(430);
                        try {
                            const img = yield fetchImage(qc.picture);
                            doc.image(img, cols[0], itemY, { fit: [515, 350], align: 'center' });
                            itemY += 365;
                        }
                        catch (e) {
                            doc.fillColor("#999999").font("Helvetica-Oblique").fontSize(9).text("[ Image Not Available ]", cols[0], itemY);
                            itemY += 20;
                        }
                        doc.fillColor("#333333").font(boldFont).fontSize(10).text(`Quality Criteria: ${qc.name || "N/A"}`, cols[0], itemY);
                        itemY += 15;
                        doc.font(regularFont).fontSize(10).text(qc.description || "No description", cols[0], itemY, { width: 515 });
                        itemY += doc.heightOfString(qc.description || "No description", { width: 515 }) + 25;
                    }
                    itemY += 10;
                }
            }
            checkSpace(100);
            doc.fontSize(10).font(boldFont).text("Payment Terms", cols[0], itemY);
            itemY += 18;
            doc.fontSize(9).font(regularFont);
            doc.text(`Total Payment: ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, cols[0], itemY);
            doc.text(`30% RMB = ${(grandTotal * 0.3).toLocaleString(undefined, { minimumFractionDigits: 2 })} - Deposit`, cols[0], itemY + 15);
            doc.text(`70% RMB = ${(grandTotal * 0.7).toLocaleString(undefined, { minimumFractionDigits: 2 })} - balance before goods delivery`, cols[0], itemY + 30);
            itemY += 60;
            checkSpace(80);
            doc.fontSize(10).font(boldFont).text("Bank Information", cols[0], itemY);
            itemY += 18;
            doc.fontSize(9).font(regularFont);
            doc.text(`Bank: ${((_m = so.supplier) === null || _m === void 0 ? void 0 : _m.bank_name) || "ABC 中国农业银行"}`, cols[0], itemY);
            doc.text(`Account: ${((_o = so.supplier) === null || _o === void 0 ? void 0 : _o.account_number) || "622848 3422945590217"}`, cols[0], itemY + 15);
            doc.text(`Name: ${((_p = so.supplier) === null || _p === void 0 ? void 0 : _p.beneficiary) || "王生根"}`, cols[0], itemY + 30);
            itemY += 60;
            checkSpace(120);
            const sigY = itemY + 40;
            doc.strokeColor("#cccccc").lineWidth(0.5);
            doc.fontSize(10).font(boldFont).text("Signatures of Representatives:", cols[0], sigY - 35);
            doc.fontSize(9).font(regularFont).text(((_q = so.supplier) === null || _q === void 0 ? void 0 : _q.company_name) || "", cols[0], sigY - 18);
            doc.moveTo(cols[0], sigY + 40).lineTo(cols[0] + 180, sigY + 40).stroke();
            doc.fontSize(9).font(regularFont).text("GTech Industries Limited", 350, sigY - 18);
            const stampPath = path_1.default.join(__dirname, "../../public/stamp.png");
            try {
                doc.image(stampPath, 390, sigY - 10, { width: 85 });
            }
            catch (e) { }
            doc.font("Helvetica-Oblique").fontSize(13).text("Joschua Grenzheuser", 350, sigY + 15);
            doc.moveTo(350, sigY + 40).lineTo(515, sigY + 40).stroke();
            doc.fontSize(9).font(regularFont).text("Joschua Grenzheuser", 350, sigY + 48, { align: "center", width: 165 });
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);
                const pNum = i + 1;
                doc.moveTo(40, 780).lineTo(555, 780).strokeColor("#cccccc").lineWidth(0.5).stroke();
                doc.fontSize(7).fillColor("#666666").font(regularFont);
                doc.text(new Date(so.created_at).toLocaleDateString("en-GB"), 40, 790);
                doc.text(so.po_description || so.remark || "", 0, 790, { align: "center" });
                doc.text(`Page ${pNum} / ${pages.count}`, 515, 790);
                doc.text("This is a GTech system-generated Purchase Order. Please contact us for any queries.", 0, 805, { align: "center" });
            }
            doc.end();
            return yield pdfFinished;
        }
        catch (err) {
            console.error("[PDF_SERVICE] CRITICAL ERROR:", err);
            throw err;
        }
    });
}
