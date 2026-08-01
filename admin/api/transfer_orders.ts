import { api, handleApiError } from "@/utils/api";

export const createTransferOrderFromAuftrag = async (
  auftragId: string | number,
  selectedItems: Array<{
    lineItemId: string;
    qty: number;
    price: number;
    itemName?: string;
  }>,
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
    handleApiError(error, "Failed to fetch Bestellungen");
    throw error;
  }
};

export const getTransferOrderById = async (id: number | string) => {
  try {
    const response: any = await api.get(`/transfer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch Bestellung");
    throw error;
  }
};

export const deleteTransferOrder = async (id: number | string) => {
  try {
    const response: any = await api.delete(`/transfer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete Bestellung");
    throw error;
  }
};

export const updateTransferOrder = async (
  id: number | string,
  payload: any,
) => {
  try {
    const response: any = await api.put(`/transfer-orders/${id}`, payload);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update Bestellung");
    throw error;
  }
};

export const createTransferOrderLineItem = async (
  orderId: number | string,
  payload: any,
) => {
  try {
    const response: any = await api.post(
      `/transfer-orders/${orderId}/line-items`,
      payload,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to add line item");
    throw error;
  }
};

export const updateTransferOrderLineItem = async (
  orderId: number | string,
  lineItemId: string,
  payload: any,
) => {
  try {
    const response: any = await api.put(
      `/transfer-orders/${orderId}/line-items/${lineItemId}`,
      payload,
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

export const formatCurrency = (
  amount: number,
  currency: string = "EUR",
): string =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(
    Number(amount) || 0,
  );

export const createBestellungFromAuftrag = async (
  auftragId: number | string,
  selectedItems: Array<{
    sourceLineItemId?: string;
    qty: number;
    max_qty?: number;
    price?: number;
    transferPrice?: number; // NEW
    purchasePrice?: number; // NEW
    extraWeight?: number; // NEW
    itemName?: string;
    itemNo?: string;
    material?: string;
    specification?: string;
    description?: string;
    weight?: number;
    notes?: string;
  }>,
  options?: {
    notes?: string;
    receiver?: string; // NEW
  },
) => {
  try {
    const response: any = await api.post(
      `/transfer-orders/from-auftrag/${auftragId}`,
      {
        selectedItems,
        notes: options?.notes || "",
        receiver: options?.receiver || "Gtech Hong Kong",
      },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Bestellung from Auftrag");
    throw error;
  }
};

export const updateTransferOrderStatus = async (
  id: number | string,
  status: string,
) => {
  try {
    const response: any = await api.put(`/transfer-orders/${id}/status`, {
      status,
    });
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update Bestellung status");
    throw error;
  }
};
