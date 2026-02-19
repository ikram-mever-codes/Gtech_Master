
import { api, handleApiError } from "../utils/api";

export type SupplierType = {
    id: number;
    order_type_id?: number;
    name?: string;
    name_cn?: string;
    company_name?: string;
    extra_note?: string;
    min_order_value?: number;
    is_fully_prepared?: string;
    is_tax_included?: string;
    is_freight_included?: string;
    province?: string;
    city?: string;
    street?: string;
    full_address?: string;
    contact_person?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    website?: string;
    bank_name?: string;
    account_number?: string;
    beneficiary?: string;
    deposit?: number;
    bbgd?: number;
    bagd?: number;
    percentage?: number;
    percentage2?: number;
    percentage3?: number;
    created_at?: Date;
    updated_at?: Date;
};

export const getAllSuppliers = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
}) => {
    try {
        const res = await api.get("/suppliers", { params });
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
    }
};

export const getSupplierById = async (id: number) => {
    try {
        const res = await api.get(`/suppliers/${id}`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: null };
    }
};

export const createSupplier = async (supplierData: Partial<SupplierType>) => {
    try {
        const res = await api.post("/suppliers", supplierData);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const updateSupplier = async (id: number, supplierData: Partial<SupplierType>) => {
    try {
        const res = await api.put(`/suppliers/${id}`, supplierData);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const deleteSupplier = async (id: number) => {
    try {
        const res = await api.delete(`/suppliers/${id}`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        throw error;
    }
};

export const getSupplierItems = async (supplierId: string | number) => {
    try {
        const res = await api.get(`/suppliers/${supplierId}/items`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
    }
};
