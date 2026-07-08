import { api, handleApiError } from "../utils/api";

export interface ShippingMethod {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAllShippingMethods = async (all?: boolean) => {
  try {
    const params = all ? { all: "true" } : {};
    const response = await api.get("/shipping-methods", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch shipping methods");
    throw error;
  }
};

export const getShippingMethodById = async (id: string) => {
  try {
    const response = await api.get(`/shipping-methods/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch shipping method details");
    throw error;
  }
};

export const createShippingMethod = async (payload: {
  name: string;
}) => {
  try {
    const response = await api.post("/shipping-methods", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create shipping method");
    throw error;
  }
};

export const updateShippingMethod = async (
  id: string,
  payload: {
    name?: string;
    is_active?: boolean;
  }
) => {
  try {
    const response = await api.put(`/shipping-methods/${id}`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update shipping method");
    throw error;
  }
};

export const deleteShippingMethod = async (id: string) => {
  try {
    const response = await api.delete(`/shipping-methods/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete shipping method");
    throw error;
  }
};