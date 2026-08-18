import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles } from "@/utils/constants";
import { downloadBlob, getFilenameFromResponse } from "@/utils/blobUtils";

export const createAuftragFromOffer = async (
  offerId: string,
  selectedItems: Array<{
    lineItemId: string;
    quantity: number;
    price: number;
    itemName?: string;
  }>,
) => {
  try {
    const response: any = await api.post(
      `/customer-orders/from-offer/${offerId}`,
      { selectedItems },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Auftrag from Offer");
    throw error;
  }
};

export const createAuftragFromInquiry = async (
  inquiryId: string,
  payload?: {
    title?: string;
    paymentMethod?: string;
    shippingMethod?: string;
    notes?: string;
  },
) => {
  try {
    const response: any = await api.post(
      `/customer-orders/from-inquiry/${inquiryId}`,
      payload || {},
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Auftrag from Inquiry");
    throw error;
  }
};

export const createAuftragFromItems = async (payload: {
  customerId: string;
  selectedItems: Array<{
    itemId: string | number;
    qty: number;
    price?: number;
    itemName?: string;
    notes?: string;
  }>;
  title?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  notes?: string;
}) => {
  try {
    const response: any = await api.post(
      "/customer-orders/from-items",
      payload,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Auftrag from Items");
    throw error;
  }
};

export const getAllCustomerOrders = async () => {
  try {
    const response: any = await api.get("/customer-orders");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch customer orders");
    throw error;
  }
};

export const getCustomerOrderById = async (id: number | string) => {
  try {
    const response: any = await api.get(`/customer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch customer order");
    throw error;
  }
};

export const deleteCustomerOrder = async (id: number | string) => {
  try {
    const response: any = await api.delete(`/customer-orders/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete customer order");
    throw error;
  }
};

export const updateCustomerOrder = async (
  id: number | string,
  payload: any,
) => {
  try {
    const response: any = await api.put(`/customer-orders/${id}`, payload);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update customer order");
    throw error;
  }
};

export const createOrderLineItem = async (
  orderId: number | string,
  payload: any,
) => {
  try {
    const response: any = await api.post(
      `/customer-orders/${orderId}/line-items`,
      payload,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to add line item");
    throw error;
  }
};

export const updateOrderLineItem = async (
  orderId: number | string,
  lineItemId: string,
  payload: any,
) => {
  try {
    const response: any = await api.put(
      `/customer-orders/${orderId}/line-items/${lineItemId}`,
      payload,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update line item");
    throw error;
  }
};

export const deleteOrderLineItem = async (
  orderId: number | string,
  lineItemId: string,
) => {
  try {
    const response: any = await api.delete(
      `/customer-orders/${orderId}/line-items/${lineItemId}`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete line item");
    throw error;
  }
};

export const previewOrderLineItemPrice = async (
  orderId: number | string,
  lineItemId: string,
  quantity: string | number,
) => {
  try {
    const response: any = await api.get(
      `/customer-orders/${orderId}/line-items/${lineItemId}/price-preview?quantity=${encodeURIComponent(String(quantity))}`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to preview price");
    throw error;
  }
};

export const formatCurrency = (
  amount: number,
  currency?: string | null,
): string => {
  const safeCurrency =
    currency && typeof currency === "string" && currency.trim()
      ? currency.trim().toUpperCase()
      : "EUR";
  try {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: safeCurrency,
    }).format(Number(amount) || 0);
  } catch (e) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(Number(amount) || 0);
  }
};

export const downloadCustomerOrderPdf = async (
  id: string | number,
  orderNo?: string,
) => {
  try {
    toast.loading("Preparing download...", loadingStyles);
    const response: any = await api.get(`/customer-orders/${id}/download-pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    if (blob.size === 0) throw new Error("The downloaded PDF is empty.");
    const filename = getFilenameFromResponse(
      response,
      `Auftrag_${String(orderNo || id).replace(/[\s_]+/g, "_")}_GTech.pdf`,
    );
    downloadBlob(blob, filename);
    toast.dismiss();
    return true;
  } catch (error) {
    toast.dismiss();
    console.error("Error downloading PDF:", error);
    toast.error("Failed to download PDF");
    throw error;
  }
};

export const closeCustomerOrder = async (
  id: number | string,
  real_delivery_date?: string,
) => {
  try {
    const payload = real_delivery_date ? { real_delivery_date } : {};
    const response: any = await api.put(
      `/customer-orders/${id}/close`,
      payload,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to close customer order");
    throw error;
  }
};

export const duplicateCustomerOrder = async (id: number | string) => {
  try {
    const response: any = await api.post(`/customer-orders/${id}/duplicate`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to duplicate Auftrag");
    throw error;
  }
};
