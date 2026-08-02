import { api, handleApiError } from "@/utils/api";

// Create Transfer Order from Auftrag
export const createBestellungFromAuftrag = async (
  auftragId: number | string,
  selectedItems: any,
) => {
  try {
    const response: any = await api.post(
      `/transfer-orders/from-auftrag/${auftragId}`,
      { selectedItems },
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

export const updateTransferOrder = async (
  id: number | string,
  data: {
    title?: string;
    status?: "draft" | "to be processed" | "partially delivered" | "delivered";
    currency?: string;
    notes?: string;
    dateDelivery?: string;
    highlightColor?: string;
    receiver?: "Gtech Hong Kong" | "Supplier";
    supplierId?: number | null;
  },
) => {
  try {
    const response: any = await api.put(`/transfer-orders/${id}`, data);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update transfer order");
    throw error;
  }
};

// NEW: Update only the status of a transfer order
export const updateTransferOrderStatus = async (
  id: number | string,
  status: "draft" | "to be processed" | "partially delivered" | "delivered",
) => {
  try {
    const response: any = await api.patch(`/transfer-orders/${id}/status`, {
      status,
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

// Line Items
export const createTransferOrderLineItem = async (
  orderId: number | string,
  data: {
    itemName: string;
    itemNo?: string;
    material?: string;
    specification?: string;
    description?: string;
    weight?: number;
    qty?: number;
    transferPrice?: number;
    purchasePrice?: number;
    remark_order_item?: string;
    sourceItemId?: string;
    notes?: string;
  },
) => {
  try {
    const response: any = await api.post(
      `/transfer-orders/${orderId}/line-items`,
      data,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create line item");
    throw error;
  }
};

export const updateTransferOrderLineItem = async (
  orderId: number | string,
  lineItemId: string,
  data: {
    itemName?: string;
    itemNo?: string;
    material?: string;
    specification?: string;
    description?: string;
    qty?: number;
    extraWeight?: number;
    transferPrice?: number;
    purchasePrice?: number;
    remark_order_item?: string;
    notes?: string;
  },
) => {
  try {
    const response: any = await api.put(
      `/transfer-orders/${orderId}/line-items/${lineItemId}`,
      data,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update line item");
    throw error;
  }
};

export const deleteTransferOrderLineItem = async (
  orderId: number | string,
  lineItemId: string,
) => {
  try {
    const response: any = await api.delete(
      `/transfer-orders/${orderId}/line-items/${lineItemId}`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete line item");
    throw error;
  }
};

export const createTransferOrder = async (data: {
  title: string;
  status?: "draft" | "to be processed" | "partially delivered" | "delivered";
  currency?: string;
  notes?: string;
  highlightColor?: string;
  dateDelivery?: string;
  receiver?: "Gtech Hong Kong" | "Supplier";
  supplierId?: number | null;
  customerId: string;
}) => {
  try {
    const response: any = await api.post("/transfer-orders", data);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Bestellung");
    throw error;
  }
};
