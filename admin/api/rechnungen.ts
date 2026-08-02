import { api, handleApiError } from "@/utils/api";

export const createRechnungFromAuftrag = async (
  auftragId: string | number,
  selectedItems: Array<{
    lineItemId: string;
    qty: number;
    price: number;
    itemName?: string;
  }>,
  notes?: string,
  extra?: { deliveryDate?: string; warehouse?: "CN" | "EU" },
) => {
  try {
    const response: any = await api.post(
      `/rechnungen/from-auftrag/${auftragId}`,
      { selectedItems, notes, ...(extra || {}) },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create Rechnung from Auftrag");
    throw error;
  }
};

export const getAllRechnungen = async () => {
  try {
    const response: any = await api.get("/rechnungen");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch Rechnungen");
    throw error;
  }
};

export const getLieferscheine = async () => {
  try {
    const response: any = await api.get("/rechnungen/lieferscheine");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch Lieferscheine");
    throw error;
  }
};

export const getRechnungById = async (id: string | number) => {
  try {
    const response: any = await api.get(`/rechnungen/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch Rechnung details");
    throw error;
  }
};

export const deleteRechnung = async (id: string | number) => {
  try {
    const response: any = await api.delete(`/rechnungen/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete Rechnung");
    throw error;
  }
};

export const updateRechnung = async (
  id: string | number,
  updates: {
    notes?: string;
    internalNotes?: string;
    paymentMethod?: string;
    paymentTerms?: string;
    shippingMethod?: string;
    deliveryTerms?: string;
    termsConditions?: string;
    customerSnapshot?: any;
    deliveryAddress?: any;
  },
) => {
  try {
    const response: any = await api.patch(`/rechnungen/${id}`, updates);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update Rechnung");
    throw error;
  }
};
