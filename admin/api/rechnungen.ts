import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles } from "@/utils/constants";
import { downloadBlob, getFilenameFromResponse } from "@/utils/blobUtils";

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

export const downloadRechnungPdf = async (
  id: string | number,
  invoiceNo?: string,
) => {
  try {
    toast.loading("Preparing download...", loadingStyles);
    const response: any = await api.get(`/rechnungen/${id}/download-pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    if (blob.size === 0) throw new Error("The downloaded PDF is empty.");
    const filename = getFilenameFromResponse(
      response,
      `Rechnung ${invoiceNo || id}.pdf`,
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

export const uploadGelangenheitsbestaetigung = async (
  id: string | number,
  file: File,
) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response: any = await api.post(
      `/rechnungen/${id}/gelangenheitsbestaetigung`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to upload Gelangenheitsbestätigung");
    throw error;
  }
};

export const deleteGelangenheitsbestaetigung = async (id: string | number) => {
  try {
    const response: any = await api.delete(
      `/rechnungen/${id}/gelangenheitsbestaetigung`,
    );
    return response;
  } catch (error: any) {
    handleApiError(error, "Failed to remove Gelangenheitsbestätigung");
    throw error;
  }
};

export const downloadRechnungEml = async (
  id: string | number,
  invoiceNo?: string,
) => {
  try {
    toast.loading("Preparing Outlook email (.eml)...", loadingStyles);
    const response: any = await api.get(`/rechnungen/${id}/download-eml`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "message/rfc822" });
    if (blob.size === 0) throw new Error("The downloaded EML file is empty.");
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rechnung_Lieferschein_${invoiceNo || id}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      toast.dismiss();
    }, 1000);
    return true;
  } catch (error) {
    toast.dismiss();
    console.error("Error downloading EML:", error);
    toast.error("Failed to download EML for Outlook");
    throw error;
  }
};