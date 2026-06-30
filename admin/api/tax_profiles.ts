import { api, handleApiError } from "../utils/api";
import { Country } from "./countries";

export interface TaxProfile {
  id: string;
  name: string;
  country?: Country | null;
  tax_case?: string | null;
  tax_rate: number;
  tax_code?: string | null;
  revenue_account_no?: string | null;
  requires_vat_id: boolean;
  requires_confirmed_vat_id: boolean;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const getAllTaxProfiles = async (all?: boolean) => {
  try {
    const params = all ? { all: "true" } : {};
    const response = await api.get("/tax-profiles", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch tax profiles");
    throw error;
  }
};

export const createTaxProfile = async (payload: {
  name: string;
  country_id?: string | null;
  tax_case?: string | null;
  tax_rate: number;
  tax_code?: string | null;
  revenue_account_no?: string | null;
  requires_vat_id: boolean;
  requires_confirmed_vat_id: boolean;
  description?: string;
}) => {
  try {
    const response = await api.post("/tax-profiles", payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create tax profile");
    throw error;
  }
};

export const updateTaxProfile = async (
  id: string,
  payload: {
    name?: string;
    country_id?: string | null;
    tax_case?: string | null;
    tax_rate?: number;
    tax_code?: string | null;
    revenue_account_no?: string | null;
    requires_vat_id?: boolean;
    requires_confirmed_vat_id?: boolean;
    is_active?: boolean;
    description?: string;
  }
) => {
  try {
    const response = await api.put(`/tax-profiles/${id}`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update tax profile");
    throw error;
  }
};

export const deactivateTaxProfile = async (id: string) => {
  try {
    const response = await api.patch(`/tax-profiles/${id}/deactivate`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to deactivate tax profile");
    throw error;
  }
};

export const deleteTaxProfile = async (id: string) => {
  try {
    const response = await api.delete(`/tax-profiles/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete tax profile");
    throw error;
  }
};
