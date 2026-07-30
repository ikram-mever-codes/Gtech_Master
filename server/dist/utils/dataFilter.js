"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterDataByRole = void 0;
const users_1 = require("../models/users");
/**
 * Utility to filter sensitive data based on user roles.
 */
const filterDataByRole = (data, role) => {
    if (role === users_1.UserRole.ADMIN)
        return data;
    if (Array.isArray(data)) {
        return data.map((item) => filterObjectByRole(item, role));
    }
    return filterObjectByRole(data, role);
};
exports.filterDataByRole = filterDataByRole;
const filterObjectByRole = (obj, role) => {
    if (!obj || typeof obj !== "object" || obj instanceof Date)
        return obj;
    const filtered = Object.assign({}, obj);
    if (role === users_1.UserRole.SALES) {
        const supplierFields = [
            "supplier", "supplierName", "supplier_name",
            "supplierContact", "supplier_contact",
            "supplierContract", "supplier_contract",
            "supplier_id", "supplierItem", "supplier_items"
        ];
        supplierFields.forEach(field => delete filtered[field]);
    }
    if (role === users_1.UserRole.PURCHASING) {
        const customerFields = [
            "customer", "customerName", "customer_name",
            "customerAddress", "customer_address",
            "customerVatId", "customer_vat_id", "vat_id",
            "business", "business_id", "starBusinessDetails",
            "customerSnapshot", "deliveryAddress", "contactPerson",
            "contact_person", "contactPersonId"
        ];
        customerFields.forEach(field => delete filtered[field]);
        const priceFields = [
            "salesPrice", "sales_price", "sale_price",
            "selling_price", "salesPrices", "sales_prices",
            "discountPercentage", "discountAmount", "taxAmount",
            "totalAmount", "subtotal"
        ];
        priceFields.forEach(field => delete filtered[field]);
        const docFields = [
            "offers", "offer", "orders", "order", "invoices", "invoice"
        ];
        docFields.forEach(field => delete filtered[field]);
    }
    for (const key in filtered) {
        if (filtered[key] && typeof filtered[key] === "object") {
            filtered[key] = (0, exports.filterDataByRole)(filtered[key], role);
        }
    }
    return filtered;
};
