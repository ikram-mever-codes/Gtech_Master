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
