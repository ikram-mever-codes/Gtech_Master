import { api, handleApiError } from "../utils/api";

export interface WeiterversandServiceProvider {
  id: number;
  pos: number;
  name: string;
  website?: string;
  remark?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWeiterversandServiceProviderPayload {
  pos?: number;
  name: string;
  website?: string;
  remark?: string;
}

export interface UpdateWeiterversandServiceProviderPayload {
  pos?: number;
  name?: string;
  website?: string;
  remark?: string;
}

export const getWeiterversandServiceProviders = async (): Promise<WeiterversandServiceProvider[]> => {
  try {
    const res: any = await api.get("/weiterversand-service-providers");
    return res?.data || [];
  } catch (error) {
    handleApiError(error, "Failed to fetch service providers");
    throw error;
  }
};

export const createWeiterversandServiceProvider = async (
  payload: CreateWeiterversandServiceProviderPayload,
): Promise<WeiterversandServiceProvider> => {
  try {
    const res: any = await api.post("/weiterversand-service-providers", payload);
    return res?.data;
  } catch (error) {
    handleApiError(error, "Failed to create service provider");
    throw error;
  }
};

export const updateWeiterversandServiceProvider = async (
  id: number,
  payload: UpdateWeiterversandServiceProviderPayload,
): Promise<WeiterversandServiceProvider> => {
  try {
    const res: any = await api.put(`/weiterversand-service-providers/${id}`, payload);
    return res?.data;
  } catch (error) {
    handleApiError(error, "Failed to update service provider");
    throw error;
  }
};

export const deleteWeiterversandServiceProvider = async (
  id: number,
): Promise<void> => {
  try {
    await api.delete(`/weiterversand-service-providers/${id}`);
  } catch (error) {
    handleApiError(error, "Failed to delete service provider");
    throw error;
  }
};
