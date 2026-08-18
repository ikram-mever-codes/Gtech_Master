import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles } from "@/utils/constants";
import { downloadBlob, getFilenameFromResponse } from "@/utils/blobUtils";

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

export const downloadRechnungKPdf = async (
  id: string | number,
  rkNo?: string,
) => {
  try {
    toast.loading("Preparing download...", loadingStyles);
    const response: any = await api.get(`/rechnungen-k/${id}/download-pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    if (blob.size === 0) throw new Error("The downloaded PDF is empty.");
    const filename = getFilenameFromResponse(
      response,
      `Rechnungskorrektur_${String(rkNo || id).replace(/[\s_]+/g, "_")}_GTech.pdf`,
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