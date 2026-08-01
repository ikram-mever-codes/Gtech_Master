import { api, handleApiError } from "@/utils/api";

export const createAuftragFromOffer = async (
  offerId: string,
  selectedItems: Array<{ lineItemId: string; quantity: number; price: number; itemName?: string }>,
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
  payload?: { title?: string; paymentMethod?: string; shippingMethod?: string; notes?: string },
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
  selectedItems: Array<{ itemId: string | number; qty: number; price?: number; itemName?: string; notes?: string }>;
  title?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  notes?: string;
}) => {
  try {
    const response: any = await api.post("/customer-orders/from-items", payload);
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
