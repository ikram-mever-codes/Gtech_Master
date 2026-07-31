import { api, handleApiError } from "@/utils/api";

export const createBestellungFromAuftrag = async (
  auftragId: number | string,
  selectedItems: Array<{
    sourceLineItemId?: string;
    qty: number;
    max_qty?: number;
    price?: number;
    itemName?: string;
    itemNo?: string;
    material?: string;
    specification?: string;
    description?: string;
  }>,
  notes?: string,
) => {
  try {
    const response: any = await api.post(
      `/transfer-orders/from-auftrag/${auftragId}`,
      { selectedItems, notes },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Bestellung from Auftrag");
    throw error;
  }
};

export const getAllTransferOrders = async () => {
  try {
    const response: any = await api.get("/transfer-orders");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch transfer orders");
    throw error;
  }
};

export const getTransferOrderById = async (id: number | string) => {
  try {
    const response: any = await api.get(`/transfer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch transfer order");
    throw error;
  }
};

export const updateTransferOrderStatus = async (
  id: number | string,
  status: "draft" | "to be processed" | "partially delivered" | "delivered",
  notes?: string,
) => {
  try {
    const response: any = await api.put(`/transfer-orders/${id}/status`, {
      status,
      notes,
    });
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update transfer order status");
    throw error;
  }
};

export const deleteTransferOrder = async (id: number | string) => {
  try {
    const response: any = await api.delete(`/transfer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete transfer order");
    throw error;
  }
};
