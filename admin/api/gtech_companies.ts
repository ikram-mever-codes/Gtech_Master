import { api, handleApiError } from "../utils/api";

export interface GtechCompany {
  id: string;
  legal_name: string;
  display_name?: string | null;
  additional_address?: string | null;
  street?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  shipping_additional_address?: string | null;
  shipping_street?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;
  registry_no?: string | null;
  vat_id?: string | null;
  tax_no?: string | null;
  official_no1?: string | null;
  official_no2?: string | null;
  date_of_incorporation?: string | null;
  contact_person_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  created_at: string;
  updated_at: string;
}

export type GtechCompanyPayload = Omit<GtechCompany, "id" | "created_at" | "updated_at">;

export const getAllGtechCompanies = async () => {
  try {
    const response = await api.get("/gtech-companies");
    return response;
  } catch (error: any) {
    const status = error?.response?.status || error?.status;
    if (status !== 404) {
      handleApiError(error, "Failed to fetch GTech companies");
    }
    throw error;
  }
};

export const getGtechCompanyById = async (id: string) => {
  try {
    const response = await api.get(`/gtech-companies/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch GTech company details");
    throw error;
  }
};

export const createGtechCompany = async (payload: GtechCompanyPayload) => {
  try {
    const response = await api.post("/gtech-companies", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create GTech company");
    throw error;
  }
};

export const updateGtechCompany = async (
  id: string,
  payload: Partial<GtechCompanyPayload>
) => {
  try {
    const response = await api.put(`/gtech-companies/${id}`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update GTech company");
    throw error;
  }
};

export const deleteGtechCompany = async (id: string) => {
  try {
    const response = await api.delete(`/gtech-companies/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete GTech company");
    throw error;
  }
};