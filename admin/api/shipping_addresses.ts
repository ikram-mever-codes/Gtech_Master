import { api, handleApiError } from "../utils/api";
import { Country } from "./countries";

export interface CompanyShippingAddress {
  id: string;
  name: string;
  address_additional_line?: string | null;
  street: string;
  postal_code: string;
  city: string;
  country?: Country | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const getShippingAddresses = async (companyId: string) => {
  try {
    const response = await api.get(`/customers/${companyId}/shipping-addresses`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch shipping addresses");
    throw error;
  }
};

export const createShippingAddress = async (
  companyId: string,
  payload: {
    name: string;
    address_additional_line?: string | null;
    street: string;
    postal_code: string;
    city: string;
    country_id?: string | null;
    is_default?: boolean;
  }
) => {
  try {
    const response = await api.post(`/customers/${companyId}/shipping-addresses`, payload);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create shipping address");
    throw error;
  }
};

export const updateShippingAddress = async (
  companyId: string,
  addressId: string,
  payload: {
    name?: string;
    address_additional_line?: string | null;
    street?: string;
    postal_code?: string;
    city?: string;
    country_id?: string | null;
    is_default?: boolean;
  }
) => {
  try {
    const response = await api.put(
      `/customers/${companyId}/shipping-addresses/${addressId}`,
      payload
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update shipping address");
    throw error;
  }
};

export const deleteShippingAddress = async (companyId: string, addressId: string) => {
  try {
    const response = await api.delete(
      `/customers/${companyId}/shipping-addresses/${addressId}`
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete shipping address");
    throw error;
  }
};

export const setDefaultShippingAddress = async (companyId: string, addressId: string) => {
  try {
    const response = await api.patch(
      `/customers/${companyId}/shipping-addresses/${addressId}/default`
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to set default shipping address");
    throw error;
  }
};
