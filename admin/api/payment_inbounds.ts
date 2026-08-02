import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";

export interface PaymentInboundData {
  id?: string;
  payment_account_id?: string;
  paymentAccount?: {
    id: string;
    name: string;
    currency_code?: string;
    external_account_id?: string;
  } | null;
  external_transaction_id?: string;
  received_date?: string;
  amount: number;
  currency_code: string;
  payer_name?: string;
  payer_account_reference?: string;
  reference?: string;
  created_at?: string;
  created_by_user_id?: string;
  source?: string;
}

export const getAllPaymentInbounds = async () => {
  try {
    const response: any = await api.get("/payment-inbounds");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment inbounds");
    throw error;
  }
};

export const getPaymentInboundById = async (id: string) => {
  try {
    const response: any = await api.get(`/payment-inbounds/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment inbound details");
    throw error;
  }
};

export const createPaymentInbound = async (data: {
  payment_account_id?: string;
  received_date?: string;
  amount: number;
  currency_code?: string;
  payer_name?: string;
  payer_account_reference?: string;
  reference?: string;
  external_transaction_id?: string;
  source?: string;
}) => {
  try {
    const response: any = await api.post("/payment-inbounds", data);
    toast.success("Payment inbound recorded successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to record payment inbound");
    throw error;
  }
};

export const updatePaymentInbound = async (
  id: string,
  data: Partial<PaymentInboundData>
) => {
  try {
    const response: any = await api.put(`/payment-inbounds/${id}`, data);
    toast.success("Payment inbound updated successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update payment inbound entry");
    throw error;
  }
};

export const deletePaymentInbound = async (id: string) => {
  try {
    const response: any = await api.delete(`/payment-inbounds/${id}`);
    toast.success("Payment inbound deleted successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete payment inbound entry");
    throw error;
  }
};
