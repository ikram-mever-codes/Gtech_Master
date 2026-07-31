import { api, handleApiError } from "@/utils/api";

export interface SalesPriceTier {
  id: number;
  minQuantity: number;
  unitPriceEur: number;
}

export interface CustomerSalesPrices {
  customerId: number;
  customerName: string;
  customerNumber?: string;
  tiers: SalesPriceTier[];
}

export interface SalesPricesForItem {
  global: SalesPriceTier[];
  customers: CustomerSalesPrices[];
}

export const getSalesPricesForItem = async (itemId: number | string) => {
  try {
    const response: any = await api.get(`/sales-prices/item/${itemId}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch sales prices");
    throw error;
  }
};

export const createSalesPrice = async (payload: {
  itemId: number | string;
  customerId?: number | string | null;
  minQuantity: number | string;
  unitPriceEur: number | string;
}) => {
  try {
    const response: any = await api.post("/sales-prices", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to save the price tier");
    throw error;
  }
};

export const updateSalesPrice = async (
  id: number,
  payload: { minQuantity?: number | string; unitPriceEur?: number | string },
) => {
  try {
    const response: any = await api.put(`/sales-prices/${id}`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update the price tier");
    throw error;
  }
};

export const deleteSalesPrice = async (id: number) => {
  try {
    const response: any = await api.delete(`/sales-prices/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete the price tier");
    throw error;
  }
};

export const resolveSalesPrice = async (params: {
  itemId: number | string;
  customerId?: number | string;
  quantity?: number;
}) => {
  try {
    const response: any = await api.get("/sales-prices/resolve", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to resolve suggested price");
    throw error;
  }
};
