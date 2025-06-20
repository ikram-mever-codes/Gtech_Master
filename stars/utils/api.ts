import { Email } from "@mui/icons-material";
// import {
//   login,
//   logout,
//   setLoading,
//   updateUser,
//   UserState,
// } from "app/Redux/features/userSlice";

// import { AppDispatch } from "app/Redux/store";
import axios, { AxiosError, AxiosResponse } from "axios";
import {
  errorStyles,
  loadingStyles,
  BASE_URL,
  successStyles,
} from "./constants";

import { ResponseInterface } from "./interfaces";
import { toast } from "react-hot-toast";

export const handleApiError = (error: unknown, defaultMessage?: string) => {
  toast.dismiss();
  if (axios.isAxiosError(error)) {
    toast.error(error.response?.data?.message || error.message, errorStyles);
  } else if (error instanceof Error) {
    toast.error(error.message, errorStyles);
  } else {
    toast.error(defaultMessage || "Unexpected Error", errorStyles);
  }
  console.error(error);
};

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      console.error("Response error: ", error.response.data);

      if (error.response.status === 401) {
        window.location.href = "/login";
      }
    } else if (error.request) {
      console.error("No response received: ", error.request);
    } else {
      console.error("Error: ", error.message);
    }
    return Promise.reject(error);
  }
);
