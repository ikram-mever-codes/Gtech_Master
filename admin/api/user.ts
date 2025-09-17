// authApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import {
  login,
  logout,
  setLoading,
  updateUser,
} from "../app/Redux/features/userSlice";
import { AppDispatch } from "@/app/Redux/store";
import { loadingStyles, successStyles } from "@/utils/constants";
import { UserState } from "@/app/Redux/features/userSlice";
import { ResponseInterface } from "@/utils/interfaces";

interface LoginResponse {
  data: UserState;
  message: string;
}

// Authentication Functions
export const loginUser = async (
  email: string,
  password: string,
  dispatch: AppDispatch
) => {
  try {
    toast.loading("Authenticating...", loadingStyles);
    const response = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });

    dispatch(login(response.data.data));
    toast.dismiss();
    toast.success(`Welcome ${response.data.data.name}!`, successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Login failed");
    throw error;
  }
};

export const logoutUser = async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    await api.post("/auth/logout");
    dispatch(logout());
    toast.success("Logged out successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Logout failed");
  } finally {
    dispatch(setLoading(false));
  }
};

export const refreshToken = async (dispatch: AppDispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await api.post<LoginResponse>("/auth/refresh");
    dispatch(login(response.data.data));
    return response.data;
  } catch (error) {
    handleApiError(error, "Session expired");
  } finally {
    dispatch(setLoading(false));
  }
};

// Password Management
export const changePassword = async (
  currentPassword: string,
  newPassword: string
) => {
  try {
    toast.loading("Updating password...", loadingStyles);
    const response = await api.put("/auth/change-password", {
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

// User Management
interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  permissions?: Array<{ resource: string; actions: string[] }>;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  country: string;
}

export const createNewUser = async (userData: CreateUserPayload) => {
  try {
    toast.loading("Creating user...", loadingStyles);
    const response = await api.post("/auth/users", userData);
    toast.dismiss();
    toast.success("User created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "User creation failed");
    throw error;
  }
};

interface UpdateProfilePayload {
  name?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  avatar?: File;
}

export const updateUserProfile = async (
  formData: FormData,
  dispatch: AppDispatch
) => {
  try {
    toast.loading("Updating profile...", loadingStyles);
    const response = await api.put("/users/me", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    dispatch(updateUser(response.data.data));
    toast.dismiss();
    toast.success("Profile updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Profile update failed");
    throw error;
  }
};

export const getUserById = async (userId: string) => {
  try {
    const response = await api.get(`/auth/users/${userId}`);
    return response;
  } catch (error) {
    handleApiError(error);
  }
};

export const prepareProfileFormData = (
  data: UpdateProfilePayload
): FormData => {
  const formData = new FormData();

  if (data.name) formData.append("name", data.name);
  if (data.phoneNumber) formData.append("phoneNumber", data.phoneNumber);
  if (data.gender) formData.append("gender", data.gender);
  if (data.dateOfBirth)
    formData.append("dateOfBirth", data.dateOfBirth.toISOString());
  if (data.address) formData.append("address", data.address);
  if (data.avatar) formData.append("avatar", data.avatar);

  return formData;
};

export const getAllUsers = async () => {
  try {
    const res = await api.get("/auth/users");

    return res;
  } catch (error) {
    handleApiError(error);
  }
};

// Password Reset Functions
export const requestPasswordReset = async (email: string) => {
  try {
    toast.loading("Sending reset link...", loadingStyles);
    const response = await api.post("/auth/forgot-password", { email });
    toast.dismiss();
    toast.success(
      "If the email exists, a reset link has been sent",
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to send reset link");
    throw error;
  }
};

export const submitPasswordReset = async (
  token: string,
  newPassword: string
) => {
  try {
    toast.loading("Updating password...", loadingStyles);
    const response = await api.post("/auth/reset-password", {
      token,
      newPassword,
    });
    toast.dismiss();
    toast.success("Password updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Password reset failed");
    throw error;
  }
};

export const updateUserFunction = async (userId: string, userData: any) => {
  try {
    toast.loading("Updating user...", loadingStyles);
    const response = await api.put(`/auth/users/${userId}`, userData);
    toast.dismiss();
    toast.success("User updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "User update failed");
    throw error;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    toast.loading("Deleting User...", loadingStyles);

    const response: ResponseInterface = await api.delete(
      `/auth/users/${userId}`
    );
    toast.dismiss();
    toast.success(response.message, successStyles);
    return response;
  } catch (error) {
    handleApiError(error);
  }
};

export const resetPassword = async () => {
  try {
  } catch (error) {}
};
