// customerApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import {
  customerLogin,
  customerLogout,
  setCustomerLoading,
  updateCustomer,
} from "@/app/Redux/features/customerSlice";
import { AppDispatch } from "@/app/Redux/store";
import { loadingStyles, successStyles } from "@/utils/constants";
import { CustomerState } from "@/app/Redux/features/customerSlice";

interface CustomerLoginResponse {
  data: CustomerState;
  message: string;
}

// Customer Authentication Functions
export const loginCustomer = async (
  email: string,
  password: string,
  dispatch: AppDispatch
) => {
  try {
    toast.loading("Authenticating...", loadingStyles);
    const response = await api.post<CustomerLoginResponse>("/customers/login", {
      email,
      password,
    });

    dispatch(customerLogin(response.data.data));
    toast.dismiss();
    toast.success(`Welcome ${response.data.data.companyName}!`, successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Login failed");
    throw error;
  }
};

export const logoutCustomer = async (dispatch: AppDispatch) => {
  try {
    dispatch(setCustomerLoading(true));
    await api.post("/customers/logout");
    dispatch(customerLogout());
    toast.success("Logged out successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Logout failed");
  } finally {
    dispatch(setCustomerLoading(false));
  }
};

export const refreshCustomerToken = async (dispatch: AppDispatch) => {
  try {
    dispatch(setCustomerLoading(true));
    const response = await api.post<CustomerLoginResponse>(
      "/customers/refresh"
    );
    dispatch(customerLogin(response.data.data));
    return response.data;
  } catch (error) {
    handleApiError(error, "Session expired");
  } finally {
    dispatch(setCustomerLoading(false));
  }
};

// Customer Account Management
interface CustomerSignupPayload {
  companyName: string;
  email: string;
  contactEmail: string;
  contactPhoneNumber: string;
  taxNumber: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
  city: string;
  country: string;
  deliveryAddressLine1: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  password: string;
  legalName: string;
}

export const requestCustomerAccount = async (
  signupData: CustomerSignupPayload
) => {
  try {
    toast.loading("Creating account...", loadingStyles);
    const response = await api.post("/customers/request-account", signupData);
    toast.dismiss();
    toast.success(
      "Account request submitted! Check your email for verification",
      successStyles
    );
    return response;
  } catch (error) {
    handleApiError(error, "Account creation failed");
    throw error;
  }
};

export const verifyCustomerEmail = async (verificationCode: string) => {
  try {
    toast.loading("Verifying email...", loadingStyles);
    const response = await api.get(
      `/customers/verify-email/${verificationCode}`
    );
    toast.dismiss();
    toast.success(
      "Email verified successfully! Account pending approval",
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Email verification failed");
    throw error;
  }
};

// Customer Password Management
export const changeCustomerPassword = async (
  currentPassword: string,
  newPassword: string
) => {
  try {
    toast.loading("Updating password...", loadingStyles);
    const response = await api.put("/customers/change-password", {
      currentPassword,
      newPassword,
    });
    toast.dismiss();
    toast.success("Password updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Password update failed");
    throw error;
  }
};

export const forgotCustomerPassword = async (email: string) => {
  try {
    toast.loading("Sending reset instructions...", loadingStyles);
    const response = await api.post("/customers/forgot-password", { email });
    toast.dismiss();
    toast.success(
      "Password reset instructions sent to your email",
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Password reset failed");
    throw error;
  }
};

export const resetCustomerPassword = async (
  token: string,
  newPassword: string
) => {
  try {
    toast.loading("Resetting password...", loadingStyles);
    const response = await api.put(`/customers/reset-password/${token}`, {
      password: newPassword,
    });
    toast.dismiss();
    toast.success("Password reset successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Password reset failed");
    throw error;
  }
};

// Customer Profile Management
interface UpdateCustomerProfilePayload {
  companyName?: string;
  contactEmail?: string;
  contactPhoneNumber?: string;
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
  avatar?: File;
}

export const updateCustomerProfile = async (
  formData: FormData,
  dispatch: AppDispatch
) => {
  try {
    toast.loading("Updating profile...", loadingStyles);
    const response = await api.put("/customers/me", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    dispatch(updateCustomer(response.data.data));
    toast.dismiss();
    toast.success("Profile updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Profile update failed");
    throw error;
  }
};

export const prepareCustomerProfileFormData = (
  data: UpdateCustomerProfilePayload
): FormData => {
  const formData = new FormData();

  if (data.companyName) formData.append("companyName", data.companyName);
  if (data.contactEmail) formData.append("contactEmail", data.contactEmail);
  if (data.contactPhoneNumber)
    formData.append("contactPhoneNumber", data.contactPhoneNumber);
  if (data.taxNumber) formData.append("taxNumber", data.taxNumber);
  if (data.addressLine1) formData.append("addressLine1", data.addressLine1);
  if (data.addressLine2) formData.append("addressLine2", data.addressLine2);
  if (data.postalCode) formData.append("postalCode", data.postalCode);
  if (data.city) formData.append("city", data.city);
  if (data.country) formData.append("country", data.country);
  if (data.deliveryAddressLine1)
    formData.append("deliveryAddressLine1", data.deliveryAddressLine1);
  if (data.deliveryAddressLine2)
    formData.append("deliveryAddressLine2", data.deliveryAddressLine2);
  if (data.deliveryPostalCode)
    formData.append("deliveryPostalCode", data.deliveryPostalCode);
  if (data.deliveryCity) formData.append("deliveryCity", data.deliveryCity);
  if (data.deliveryCountry)
    formData.append("deliveryCountry", data.deliveryCountry);
  if (data.avatar) formData.append("avatar", data.avatar);

  return formData;
};
