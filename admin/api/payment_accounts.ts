import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";

export interface PaymentAccountData {
  id?: string;
  name: string;
  currency_code: string;
  external_account_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const getAllPaymentAccounts = async (all: boolean = true) => {
  try {
    const response: any = await api.get(`/payment-accounts${all ? "?all=true" : ""}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment accounts");
    throw error;
  }
};

export const getPaymentAccountById = async (id: string) => {
  try {
    const response: any = await api.get(`/payment-accounts/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment account details");
    throw error;
  }
};

export const createPaymentAccount = async (data: {
  name: string;
  currency_code?: string;
  external_account_id?: string;
  is_active?: boolean;
}) => {
  try {
    const response: any = await api.post("/payment-accounts", data);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create payment account");
    throw error;
  }
};

export const updatePaymentAccount = async (
  id: string,
  data: {
    name?: string;
    currency_code?: string;
    external_account_id?: string;
    is_active?: boolean;
  }
) => {
  try {
    const response: any = await api.put(`/payment-accounts/${id}`, data);
    toast.success("Payment account updated successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update payment account");
    throw error;
  }
};

export const deletePaymentAccount = async (id: string) => {
  try {
    const response: any = await api.delete(`/payment-accounts/${id}`);
    toast.success("Payment account deleted successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete payment account");
    throw error;
  }
};
