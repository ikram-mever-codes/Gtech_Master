// src/api/lieferscheine.ts
import { api, handleApiError } from "@/utils/api";

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
