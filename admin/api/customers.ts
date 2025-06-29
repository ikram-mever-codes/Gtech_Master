import { api, handleApiError } from "@/utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import {
  CustomerVerificationStatus,
  ResponseInterface,
} from "@/utils/interfaces";
import toast from "react-hot-toast";

export type CustomerData = {
  id: string;
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber?: string;
  addressLine1: string;
  city: string;
  country: string;
  createdAt: string;
  accountVerificationStatus: CustomerVerificationStatus;
  avatar?: string;
};

export type CreateCustomerPayload = {
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
};

export const getAllCustomers = async () => {
  try {
    const res = await api.get("/customers/all");
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const updateCustomerStatus = async (
  customerId: string,
  customerStatus: any
) => {
  try {
    toast.loading("Updating customer status...", loadingStyles);
    const res: ResponseInterface = await api.put(
      `/customers/${customerId}/status`,
      {
        status: customerStatus,
      }
    );
    toast.dismiss();

    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const getSingleCustomer = async (customerId: string) => {
  try {
    const res = await api.get(`/customers/single/${customerId}`);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const createCompany = async (payload: CreateCustomerPayload) => {
  try {
    toast.loading("Creating company...", loadingStyles);
    const res: ResponseInterface = await api.post(
      "/auth/customers/create",
      payload
    );
    toast.dismiss();
    toast.success(res.message, successStyles);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};
