import { api, handleApiError } from "../utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export type CargoTypeObj = {
    id: number;
    type: string;
    duration?: number;
    created_at?: Date;
    updated_at?: Date;
};

export const getAllCargoTypes = async () => {
    try {
        const res = await api.get("/cargo-types");
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload.data || payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: [] };
    }
};

export const getCargoTypeById = async (id: number) => {
    try {
        const res = await api.get(`/cargo-types/${id}`);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        handleApiError(error);
        return { success: false, data: null };
    }
};

export const createCargoType = async (cargoTypeData: Partial<CargoTypeObj>) => {
    try {
        toast.loading("Creating cargo type...", loadingStyles);
        const res = await api.post("/cargo-types", cargoTypeData);
        toast.dismiss();
        toast.success("Cargo type created successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo type creation failed");
        throw error;
    }
};

export const updateCargoType = async (id: number, cargoTypeData: Partial<CargoTypeObj>) => {
    try {
        toast.loading("Updating cargo type...", loadingStyles);
        const res = await api.put(`/cargo-types/${id}`, cargoTypeData);
        toast.dismiss();
        toast.success("Cargo type updated successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo type update failed");
        throw error;
    }
};

export const deleteCargoType = async (id: number) => {
    try {
        toast.loading("Deleting cargo type...", loadingStyles);
        const res = await api.delete(`/cargo-types/${id}`);
        toast.dismiss();
        toast.success("Cargo type deleted successfully", successStyles);
        const payload = res as any;
        if (payload && typeof payload === "object" && "success" in payload) return payload;
        return { success: true, data: payload };
    } catch (error) {
        toast.dismiss();
        handleApiError(error, "Cargo type deletion failed");
        throw error;
    }
};
