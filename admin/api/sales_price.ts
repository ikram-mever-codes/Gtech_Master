import { api, handleApiError } from "@/utils/api";

export interface SalesPriceTier {
  id: number;
  minQuantity: number;
  unitPriceEur: number;
}

export interface CustomerSalesPriceRow {
  customerId: number | null; // null = global
  customerName: string;
  customerNumber?: string;
  individual: SalesPriceTier | null;
  tiers: SalesPriceTier[];
}

export interface SalesPricesForItem {
  itemCustomerId: number | null;
  rows: CustomerSalesPriceRow[];
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
  isIndividual: boolean;
  minQuantity?: number | string;
  unitPriceEur: number | string;
}) => {
  try {
    const response: any = await api.post("/sales-prices", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to save the sales price");
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
    handleApiError(error, "Failed to update the sales price");
    throw error;
  }
};

export const deleteSalesPrice = async (id: number) => {
  try {
    const response: any = await api.delete(`/sales-prices/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete the sales price");
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
