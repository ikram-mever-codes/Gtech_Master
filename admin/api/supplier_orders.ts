import { api, handleApiError } from "../utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export type SupplierOrder = {
    id: number;
    supplier_id?: number | null;
    order_type_id?: number | null;
    send2cargo?: string;
    ref_no?: string;
    paid: string;
    remark?: string;
    is_po_created: number;
    created_at: string;
    updated_at: string;
    supplier?: any;
    order_type?: any;
    items?: any[];
};

export const createSupplierOrder = async (data: {
    supplier_id?: number;
    order_type_id?: number;
    item_ids: number[];
    remark?: string;
    ref_no?: string;
}) => {
    try {
        toast.loading("Creating supplier order...", loadingStyles);
        const res = await api.post("/supplier-orders", data);
        toast.dismiss();
        toast.success("Supplier order created!", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error);
        throw error;
    }
};

export const getAllSupplierOrders = async (params?: { search?: string }) => {
    try {
        const res = await api.get("/supplier-orders", { params });
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
    }
};

export const deleteSupplierOrder = async (id: number) => {
    try {
        toast.loading("Deleting supplier order...", loadingStyles);
        const res = await api.delete(`/supplier-orders/${id}`);
        toast.dismiss();
        toast.success("Supplier order deleted", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error);
        throw error;
    }
};

export const updateSupplierOrder = async (id: number, data: Partial<SupplierOrder>) => {
    try {
        toast.loading("Updating supplier order...", loadingStyles);
        const res = await api.put(`/supplier-orders/${id}`, data);
        toast.dismiss();
        toast.success("Supplier order updated", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error);
        throw error;
    }
};
