
import { api, handleApiError } from "../utils/api";

export type Supplier = {
    id: number;
    company_name?: string;
    name?: string;
    name_cn?: string;
};

export const getAllSuppliers = async () => {
    try {
        const res = await api.get("/suppliers");
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
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
