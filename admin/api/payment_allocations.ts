import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";

export type PaymentAllocationTargetType = "auftrag" | "rechnung";

export interface PaymentAllocation {
  id: string;
  payment_inbound_id: string;
  target_type: PaymentAllocationTargetType;
  auftrag_id?: number;
  rechnung_id?: string;
  target_label?: string;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface CreatePaymentAllocationPayload {
  paymentInboundId: string;
  targetType: PaymentAllocationTargetType;
  targetId: string | number;
  amount: number;
  notes?: string;
}

/** Assign part (or all) of a Payment Inbound to an Auftrag or Rechnung. */
export const createPaymentAllocation = async (data: any) => {
  try {
    const response: any = await api.post("/payment-allocations", data);
    toast.success("Payment assigned successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to assign payment");
    throw error;
  }
};

/** All allocations for one Payment Inbound, plus its allocated/open summary. */
export const getPaymentInboundAllocations = async (
  paymentInboundId: string,
) => {
  try {
    const response: any = await api.get(
      `/payment-allocations/inbound/${paymentInboundId}`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment allocations");
    throw error;
  }
};

/** Undo an assignment — the amount becomes open on the Payment Inbound again. */
export const deletePaymentAllocation = async (allocationId: string) => {
  try {
    const response: any = await api.delete(
      `/payment-allocations/${allocationId}`,
    );
    toast.success("Assignment removed successfully");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to remove payment assignment");
    throw error;
  }
};

/** All allocations covering one Auftrag or Rechnung ("paid via: ..."). */
export const getAllocationsForTarget = async (
  targetType: PaymentAllocationTargetType,
  targetId: string | number,
) => {
  try {
    const response: any = await api.get(
      `/payment-allocations/target/${targetType}/${targetId}`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch payment allocations for document");
    throw error;
  }
};
