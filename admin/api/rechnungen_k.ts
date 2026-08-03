import { api, handleApiError } from "@/utils/api";

export const createRechnungKFromRechnung = async (
  rechnungId: string | number,
  corrections?: Array<{ itemId: string; quantity: number; price: number }>,
) => {
  try {
    const response: any = await api.post(
      `/rechnungen-k/from-rechnung/${rechnungId}`,
      { corrections },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to create correction invoice");
    throw error;
  }
};
export const getAllRechnungenK = async () => {
  try {
    const response: any = await api.get("/rechnungen-k");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch correction invoices");
    throw error;
  }
};

export const getRechnungKById = async (id: string | number) => {
  try {
    const response: any = await api.get(`/rechnungen-k/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch correction invoice details");
    throw error;
  }
};

export const updateRechnungKItem = async (
  rechnungKId: string | number,
  itemId: string | number,
  updates: { quantity?: number; price?: number },
) => {
  try {
    const response: any = await api.patch(
      `/rechnungen-k/${rechnungKId}/items/${itemId}`,
      updates,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update line item");
    throw error;
  }
};

export const deleteRechnungK = async (id: string | number) => {
  try {
    const response: any = await api.delete(`/rechnungen-k/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete correction invoice");
    throw error;
  }
};

export const getRechnungOpenQuantities = async (
  rechnungId: string | number,
) => {
  try {
    const response: any = await api.get(
      `/rechnungen-k/${rechnungId}/open-quantities`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch open quantities");
    throw error;
  }
};
