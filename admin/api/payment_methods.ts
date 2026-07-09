import { api, handleApiError } from "../utils/api";

export interface PaymentMethod {
  id: string;
  name: string;
  is_prepayment: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAllPaymentMethods = async (all?: boolean) => {
  try {
    const params = all ? { all: "true" } : {};
    const response = await api.get("/payment-methods", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch payment methods");
    throw error;
  }
};

export const getPaymentMethodById = async (id: string) => {
  try {
    const response = await api.get(`/payment-methods/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch payment method details");
    throw error;
  }
};

export const createPaymentMethod = async (payload: {
  name: string;
  is_prepayment: boolean;
}) => {
  try {
    const response = await api.post("/payment-methods", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create payment method");
    throw error;
  }
};

export const updatePaymentMethod = async (
  id: string,
  payload: {
    name?: string;
    is_prepayment?: boolean;
    is_active?: boolean;
  }
) => {
  try {
    const response = await api.put(`/payment-methods/${id}`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update payment method");
    throw error;
  }
};

export const deletePaymentMethod = async (id: string) => {
  try {
    const response = await api.delete(`/payment-methods/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete payment method");
    throw error;
  }
};
