// orderApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import type { ResponseInterface } from "@/utils/interfaces";

// -------------------- Types (frontend) --------------------

export type OrderItemLine = {
  id?: number;
  order_id?: number;
  item_id: number;
  qty: number;
  remark_de?: string | null;
};

export type Order = {
  id: number;
  order_no: string;
  category_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  status?: number | null;
  comment?: string | null;

  created_at?: string | Date;
  updated_at?: string | Date;
  items?: OrderItemLine[];
};

export type OrderSearchFilters = {
  search?: string;
  status?: number | string;
  page?: number;
  limit?: number;
};

export type CreateOrderItemLine = {
  item_id: number;
  qty: number;
  remark_de?: string | null;
};

export type CreateOrderPayload = {
  customer_id?: string;
  category_id?: string;
  supplier_id?: string;
  comment: string;
  items: CreateOrderItemLine[];
  status?: number;
};

export type UpdateOrderPayload = {
  order_no?: string;
  customer_id?: string;
  category_id?: string;
  supplier_id?: string;
  status?: number;
  comment?: string;
  items?: CreateOrderItemLine[];
};

const toQueryString = (filters?: OrderSearchFilters) => {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status !== undefined && filters.status !== "") params.set("status", String(filters.status));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};


export const createOrder = async (orderData: CreateOrderPayload) => {
  try {
    toast.loading("Creating order...", loadingStyles);
    const response = await api.post("/orders", orderData);
    toast.dismiss();
    toast.success("Order created successfully !", successStyles);

    const payload = response.data;
    if (payload && typeof payload === "object" && "success" in payload) return payload;
    return { success: true, data: payload };
  } catch (error) {
    toast.dismiss();
    handleApiError(error, "Order creation failed !!!");
    throw error;
  }
};

export const getOrderById = async (orderId: string | number) => {
  try {
    const res = await api.get(`/orders/${orderId}`);
    const payload = res as any;
    if (payload && typeof payload === "object" && "success" in payload) return payload;
    return { success: true, data: payload };
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const getAllOrders = async (filters?: OrderSearchFilters) => {
  try {
    const qs = toQueryString(filters);
    const res = await api.get(`/orders${qs}`);
    const payload = res as any;
    if (payload && typeof payload === "object" && "success" in payload) return payload;
    return { success: true, data: payload };
  } catch (error) {
    handleApiError(error);
    return { success: false, data: [] };
  }
};

export const updateOrder = async (orderId: string | number, orderData: UpdateOrderPayload) => {
  try {
    toast.loading("Updating order...", loadingStyles);
    const response = await api.put(`/orders/${orderId}`, orderData);
    toast.dismiss();
    toast.success("Order updated successfully", successStyles);
    return response.data;
  } catch (error) {
    toast.dismiss();
    handleApiError(error, "Order update failed");
    throw error;
  }
};

export const deleteOrder = async (orderId: string | number) => {
  try {
    toast.loading("Deleting order...", loadingStyles);
    const response = await api.delete(`/orders/${orderId}`);
    toast.dismiss();

    const payload = response.data as ResponseInterface | any;
    toast.success(payload?.message || "Order deleted", successStyles);

    if (payload && typeof payload === "object" && "success" in payload) return payload;
    return { success: true, message: payload?.message || "Order deleted" };
  } catch (error) {
    toast.dismiss();
    handleApiError(error, "Order delete failed");
    throw error;
  }
};

export const getOrderStatusColor = (status: string | number) => {
  const statusObj = getOrderStatuses().find((s) => String(s.value) === String(status));
  return statusObj?.color || "bg-gray-100 text-gray-800";
};

export const getOrderStatuses = () => [
  { value: 1, label: "New", color: "bg-yellow-100 text-yellow-800" },
  { value: 2, label: "Expired", color: "bg-orange-100 text-orange-800" },
  { value: 3, label: "Cancelled", color: "bg-gray-300 text-gray-800" },
  { value: 4, label: "Converted", color: "bg-green-300 text-green-800" },
];
