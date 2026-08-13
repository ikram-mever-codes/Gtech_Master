import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles } from "@/utils/constants";
import { downloadBlob, getFilenameFromResponse } from "@/utils/blobUtils";

export const getAllLieferscheine = async () => {
  try {
    const response: any = await api.get("/lieferscheine");
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch delivery notes");
    throw error;
  }
};

export const getLieferscheinById = async (id: string | number) => {
  try {
    const response: any = await api.get(`/lieferscheine/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to fetch delivery note details");
    throw error;
  }
};

export const updateLieferscheinStatus = async (
  id: string | number,
  status: string,
) => {
  try {
    const response: any = await api.patch(`/lieferscheine/${id}/status`, {
      status,
    });
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update delivery note status");
    throw error;
  }
};

export const updateLieferscheinDeliveryDate = async (
  id: string | number,
  deliveryDate: string,
) => {
  try {
    const response: any = await api.patch(
      `/lieferscheine/${id}/delivery-date`,
      {
        deliveryDate,
      },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to update delivery date");
    throw error;
  }
};

export const deleteLieferschein = async (id: string | number) => {
  try {
    const response: any = await api.delete(`/lieferscheine/${id}`);
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to delete delivery note");
    throw error;
  }
};

export const downloadLieferscheinPdf = async (
  id: string | number,
  deliveryNoteNo?: string,
) => {
  try {
    toast.loading("Preparing download...", loadingStyles);
    const response: any = await api.get(`/lieferscheine/${id}/download-pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    if (blob.size === 0) throw new Error("The downloaded PDF is empty.");
    const filename = getFilenameFromResponse(
      response,
      `Lieferschein ${deliveryNoteNo || id}.pdf`,
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
