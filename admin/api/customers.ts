import { CustomerVerificationStatus } from "@/app/customers/page";
import { api, handleApiError } from "@/utils/api";

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
    const res = await api.put(`/customers/${customerId}/status`, {
      status: customerStatus,
    });
    return res;
  } catch (error) {
    handleApiError(error);
  }
};

export const getSingleCustomer = async (customerId: string) => {
  try {
    const res = await api.get(`/customers/${customerId}`);
    return res;
  } catch (error) {
    handleApiError(error);
  }
};
