import { api, handleApiError } from "../utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export type CargoType = {
    id: number;
    customer_id?: string;
    cargo_type_id?: number;
    cargo_no?: string;
    pickup_date?: string | Date;
    dep_date?: string | Date;
    eta?: string | Date;
    note?: string;
    online_track?: string;
    remark?: string;
    cargo_status?: string;
    shipped_at?: string | Date;
    created_at?: Date;
    updated_at?: Date;
    orders?: any[];
    orderItems?: any[];

    customer_type?: string;

    bill_to_company_name?: string;
    bill_to_display_name?: string;
    bill_to_phone_no?: string;
    bill_to_tax_no?: string;
    bill_to_email?: string;
    bill_to_website?: string;
    bill_to_contact_person?: string;
    bill_to_contact_phone?: string;
    bill_to_contact_mobile?: string;
    bill_to_contact_email?: string;
    bill_to_country?: string;
    bill_to_city?: string;
    bill_to_postal_code?: string;
    bill_to_full_address?: string;

    ship_to_company_name?: string;
    ship_to_display_name?: string;
    ship_to_contact_person?: string;
    ship_to_contact_phone?: string;
    ship_to_country?: string;
    ship_to_city?: string;
    ship_to_postal_code?: string;
    ship_to_full_address?: string;
    ship_to_remarks?: string;
};

export const getAllCargos = async (params?: {
    page?: number;
    limit?: number;
    search?: string;
}) => {
    try {
        const res = await api.get("/cargos", { params });
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
    }
};

export const getCargoById = async (id: number) => {
    try {
        const res = await api.get(`/cargos/${id}`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: null };
    }
};

export const createCargo = async (cargoData: Partial<CargoType> & { orders?: number[] }) => {
    try {
        toast.loading("Creating cargo...", loadingStyles);
        const res = await api.post("/cargos", cargoData);
        toast.dismiss();
        toast.success("Cargo created successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo creation failed");
        throw error;
    }
};

export const updateCargo = async (id: number, cargoData: Partial<CargoType> & { orders?: number[] }) => {
    try {
        toast.loading("Updating cargo...", loadingStyles);
        const res = await api.put(`/cargos/${id}`, cargoData);
        toast.dismiss();
        toast.success("Cargo updated successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo update failed");
        throw error;
    }
};

export const deleteCargo = async (id: number) => {
    try {
        toast.loading("Deleting cargo...", loadingStyles);
        const res = await api.delete(`/cargos/${id}`);
        toast.dismiss();
        toast.success("Cargo deleted successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo deletion failed");
        throw error;
    }
};

export const assignOrdersToCargo = async (cargoId: number, orderIds: number[]) => {
    try {
        const res = await api.post(`/cargos/${cargoId}/orders`, { orderIds });
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error, "Failed to assign orders");
        throw error;
    }
};

export const removeOrderFromCargo = async (cargoId: number, orderId: number) => {
    try {
        const res = await api.delete(`/cargos/${cargoId}/orders/${orderId}`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error, "Failed to remove order from cargo");
        throw error;
    }
};

export const getCargoOrders = async (cargoId: number) => {
    try {
        const res = await api.get(`/cargos/${cargoId}/orders`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: { orders: [], orderItems: [] } };
    }
};

export const CARGO_STATUSES = [
    { value: "Open", label: "Open", color: "bg-blue-100 text-blue-800" },
    { value: "Shipped", label: "Shipped", color: "bg-green-100 text-green-800" },
    { value: "Delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-800" },
    { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
    { value: "Pending", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
];

export const getCargoStatusColor = (status?: string) => {
    const s = CARGO_STATUSES.find((cs) => cs.value === status);
    return s?.color || "bg-gray-100 text-gray-800";
};
