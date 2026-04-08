import { UserRole } from "../models/users";

/**
 * Utility to filter sensitive data based on user roles.
 */
export const filterDataByRole = (data: any, role: UserRole): any => {
    if (role === UserRole.ADMIN) return data;

    if (Array.isArray(data)) {
        return data.map((item) => filterObjectByRole(item, role));
    }

    return filterObjectByRole(data, role);
};

const filterObjectByRole = (obj: any, role: UserRole): any => {
    if (!obj || typeof obj !== "object" || obj instanceof Date) return obj;

    const filtered = { ...obj };

    if (role === UserRole.SALES) {
        const supplierFields = [
            "supplier", "supplierName", "supplier_name",
            "supplierContact", "supplier_contact",
            "supplierContract", "supplier_contract",
            "supplier_id", "supplierItem", "supplier_items"
        ];
        supplierFields.forEach(field => delete filtered[field]);
    }

    if (role === UserRole.PURCHASING) {
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
            filtered[key] = filterDataByRole(filtered[key], role);
        }
    }

    return filtered;
};
