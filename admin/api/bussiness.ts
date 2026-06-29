// services/businessApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

export interface Business {
  id: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  source: any;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  stage: string;
  phoneNumber?: string;
  email?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  googlePlaceId?: string;
  googleMapsUrl?: string;
  reviewCount?: number;
  averageRating?: number;
  category?: string;
  additionalCategories?: string[];
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  status: "active" | "inactive" | "no_website";
  hasWebsite: boolean;
  lastVerifiedAt?: string;
  isStarCustomer: boolean;
  createdAt: string;
  updatedAt: string;
  debtor_no?: string;
  default_tax_profile_id?: string;
  vat_id_status?: "unchecked" | "vies_valid" | "vies_invalid" | "bzst_qualified_valid" | "bzst_qualified_invalid";
  vat_id_checked_at?: string;
  vat_id_check_source?: string;
  vat_id_check_response_json?: string;
}

export interface BusinessCreatePayload {
  name: string;
  address: string;
  website?: string;
  description?: string;
  displayName?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  isStarCustomer: boolean;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  email?: string;
  googlePlaceId?: string;
  starCustomerEmail: any;
  googleMapsUrl?: string;
  reviewCount?: number;
  averageRating?: number;
  category?: string;
  starBusinessDetails: any;
  additionalCategories?: string[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  debtor_no?: string;
  default_tax_profile_id?: string;
  vat_id_status?: string;
}

export interface BusinessUpdatePayload extends Partial<BusinessCreatePayload> {
  status?: "active" | "inactive" | "no_website";
}

export interface BulkImportPayload {
  businesses: BusinessCreatePayload[];
}

export interface BulkOperationPayload {
  ids: string[];
}

export interface BulkStatusUpdatePayload extends BulkOperationPayload {
  status: "active" | "inactive" | "no_website";
}

export interface SearchFilters {
  page?: number;
  sortBy?: string;
  stage?: any;
  sortOrder?: string;
  limit?: number;
  search?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  category?: string;
  source?: any;
  hasWebsite?: boolean;
  status?: string;
  minRating?: number;
  maxRating?: number;
  verified?: boolean;
  tags?: string;
}

export interface LocationSearchPayload {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}

export interface BusinessStatistics {
  total: number;
  withWebsite: number;
  withoutWebsite: number;
  byStatus: Array<{ status: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
}

export const createBusiness = async (businessData: BusinessCreatePayload) => {
  try {
    toast.loading("Creating business...", loadingStyles);
    const response = await api.post("/businesses", businessData);
    toast.dismiss();
    toast.success("Business created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Business creation failed");
    throw error;
  }
};

export const getAllBusinesses = async (filters: SearchFilters = {}) => {
  try {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/businesses?${params.toString()}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch businesses");
    throw error;
  }
};

export const getBusinessById = async (id: string) => {
  try {
    const response = await api.get(`/businesses/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch business");
    throw error;
  }
};

export const updateBusiness = async (
  id: string,
  updateData: BusinessUpdatePayload
) => {
  try {
    toast.loading("Updating business...", loadingStyles);
    const response = await api.put(`/businesses/${id}`, updateData);
    toast.dismiss();
    toast.success("Business updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update business");
    throw error;
  }
};

export const deleteBusiness = async (id: string) => {
  try {
    toast.loading("Deleting business...", loadingStyles);
    const response = await api.delete(`/businesses/${id}`);
    toast.dismiss();
    toast.success("Business deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete business");
    throw error;
  }
};

export const bulkImportBusinesses = async (payload: BulkImportPayload) => {
  try {
    toast.loading(
      `Importing ${payload.businesses.length} businesses...`,
      loadingStyles
    );
    const response: ResponseInterface = await api.post(
      "/businesses/bulk-import",
      payload
    );
    toast.dismiss();

    const { imported, skippedNoWebsite, duplicates, errors } = response.data;
    let message = `Imported ${imported} businesses`;
    if (skippedNoWebsite > 0)
      message += `, skipped ${skippedNoWebsite} without website`;
    if (duplicates > 0) message += `, ${duplicates} duplicates`;
    if (errors > 0) message += `, ${errors} errors`;

    toast.success(message, successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk import failed");
    throw error;
  }
};

export const bulkDeleteBusinesses = async (payload: BulkOperationPayload) => {
  try {
    toast.loading(
      `Deleting ${payload.ids.length} businesses...`,
      loadingStyles
    );
    const response = await api.post("/businesses/bulk-delete", payload);
    toast.dismiss();
    toast.success(
      `Deleted ${response.data.data.deletedCount} businesses`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk delete failed");
    throw error;
  }
};

export const bulkUpdateBusinessStatus = async (
  payload: BulkStatusUpdatePayload
) => {
  try {
    toast.loading(
      `Updating status for ${payload.ids.length} businesses...`,
      loadingStyles
    );
    const response = await api.post("/businesses/bulk-update-status", payload);
    toast.dismiss();
    toast.success(
      `Updated status for ${response.data.data.updatedCount} businesses`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk status update failed");
    throw error;
  }
};

export const searchBusinessesByLocation = async (
  payload: LocationSearchPayload
) => {
  try {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(
      `/businesses/location-search?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Location search failed");
    throw error;
  }
};

export const getBusinessStatistics = async (): Promise<{
  data: BusinessStatistics;
}> => {
  try {
    const response = await api.get("/businesses/statistics");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics");
    throw error;
  }
};

export const shouldImportBusiness = (
  business: BusinessCreatePayload
): boolean => {
  return !!(business.website && business.website.trim() !== "");
};

export const formatBusinessAddress = (business: Business): string => {
  return business.address
    ? business.address
    : [
      business.address,
      business.city,
      business.state,
      business.postalCode,
      business.country,
    ]
      .filter((part) => part && part.trim() !== "")
      .join(", ");
};

export const needsVerification = (business: Business): boolean => {
  if (!business.lastVerifiedAt) return true;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(business.lastVerifiedAt) < thirtyDaysAgo;
};

export const filterImportableBusinesses = (
  businesses: BusinessCreatePayload[]
): BusinessCreatePayload[] => {
  return businesses.filter(shouldImportBusiness);
};

export const validateBusinessData = (
  business: BusinessCreatePayload
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!business.name || business.name.trim() === "") {
    errors.push("Business name is required");
  }

  if (!business.address || business.address.trim() === "") {
    errors.push("Address is required");
  }

  if (business.email && !isValidEmail(business.email)) {
    errors.push("Invalid email format");
  }

  if (business.website && !isValidUrl(business.website)) {
    errors.push("Invalid website URL");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const exportBusinessesToCSV = async (filters: SearchFilters = {}) => {
  try {
    toast.loading("Exporting businesses...", loadingStyles);
    const response = await api.get("/businesses/export", {
      params: filters,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `businesses-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.dismiss();
    toast.success("Businesses exported successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Export failed");
    throw error;
  }
};

export const checkBusinessServiceHealth = async () => {
  try {
    const response = await api.get("/businesses/health");
    return response.data;
  } catch (error) {
    handleApiError(error, "Service health check failed");
    throw error;
  }
};

export const getAllTaxProfiles = async () => {
  try {
    const response = await api.get("/tax-profiles");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch tax profiles");
    throw error;
  }
};
