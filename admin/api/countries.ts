import { api, handleApiError } from "../utils/api";

export interface Country {
  id: string;
  iso2: string;
  name: string;
  is_eu: boolean;
  is_igl_country: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const getAllCountries = async (all?: boolean) => {
  try {
    const params = all ? { all: "true" } : {};
    const response = await api.get("/countries", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch countries");
    throw error;
  }
};

export const createCountry = async (countryData: {
  iso2: string;
  name: string;
  is_eu: boolean;
  is_igl_country: boolean;
}) => {
  try {
    const response = await api.post("/countries", countryData);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create country");
    throw error;
  }
};

export const updateCountry = async (
  id: string,
  countryData: {
    name?: string;
    is_eu?: boolean;
    is_igl_country?: boolean;
    is_active?: boolean;
  }
) => {
  try {
    const response = await api.put(`/countries/${id}`, countryData);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update country");
    throw error;
  }
};

export const deactivateCountry = async (id: string) => {
  try {
    const response = await api.patch(`/countries/${id}/deactivate`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to deactivate country");
    throw error;
  }
};

export const deleteCountry = async (id: string) => {
  try {
    const response = await api.delete(`/countries/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete country");
    throw error;
  }
};
