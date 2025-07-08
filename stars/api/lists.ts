// listApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

// List Management Functions
interface CreateListPayload {
  name: string;
  description?: string;
  deliveryDate?: string;

  customerId: string;
}

export const createNewList = async (listData: CreateListPayload) => {
  try {
    toast.loading("Creating list...", loadingStyles);
    const response = await api.post("/lists", listData);
    toast.dismiss();
    toast.success("List created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "List creation failed");
    throw error;
  }
};

export const getAllListForACustomer = async (customerId: string) => {
  try {
    const response = await api.get(`/lists/customer/${customerId}`);
    toast.dismiss();
    return response.data;
  } catch (error) {
    handleApiError(error, "List creation failed");
    throw error;
  }
};

interface ListItemPayload {
  productId: string;
  quantity: number;
  notes?: string;
  listId: string;
  itemId: string;
}

export const addItemToList = async (
  listId: string,
  itemData: ListItemPayload
) => {
  try {
    toast.loading("Adding item...", loadingStyles);
    const response = await api.post(`/lists/${listId}/items`, itemData);
    toast.dismiss();
    toast.success("Item added to list", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add item");
    throw error;
  }
};

interface UpdateListItemPayload {
  quantity?: number;
  notes?: string;
}

export const updateListItem = async (
  itemId: string,
  itemData: UpdateListItemPayload
) => {
  try {
    toast.loading("Updating item...", loadingStyles);
    const response = await api.put(`/lists/items/${itemId}`, itemData);
    toast.dismiss();
    toast.success("Item updated", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update item");
    throw error;
  }
};

export const deleteListItem = async (itemId: string) => {
  try {
    toast.loading("Removing item...", loadingStyles);
    const response: ResponseInterface = await api.delete(
      `/lists/item/${itemId}`
    );
    toast.dismiss();
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to remove item");
    throw error;
  }
};

export const deleteList = async (itemId: string) => {
  try {
    toast.loading("Removing item...", loadingStyles);
    const response: ResponseInterface = await api.delete(
      `/lists/list/${itemId}`
    );
    toast.dismiss();
    return response;
  } catch (error) {
    handleApiError(error, "Failed to remove item");
    throw error;
  }
};
// Delivery Information Update
interface DeliveryInfoPayload {
  deliveryDate?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  deliveryNotes?: string;
}

export const updateListItemDeliveryInfo = async (
  itemId: string,
  deliveryData: DeliveryInfoPayload
) => {
  try {
    toast.loading("Updating delivery info...", loadingStyles);
    const response = await api.put(
      `/lists/items/${itemId}/delivery`,
      deliveryData
    );
    toast.dismiss();
    toast.success("Delivery info updated", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update delivery info");
    throw error;
  }
};

// List Retrieval
export const getListDetails = async (listId: string) => {
  try {
    const response = await api.get(`/lists/${listId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load list details");
    throw error;
  }
};

// Admin Approval Functions
export const approveListItem = async (itemId: string) => {
  try {
    toast.loading("Approving item...", loadingStyles);
    const response = await api.put(`/lists/admin/items/${itemId}/approve`);
    toast.dismiss();
    toast.success("Item approved", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Approval failed");
    throw error;
  }
};

export const rejectListItem = async (itemId: string, reason?: string) => {
  try {
    toast.loading("Rejecting item...", loadingStyles);
    const response = await api.put(`/lists/admin/items/${itemId}/reject`, {
      reason,
    });
    toast.dismiss();
    toast.success("Item rejected", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Rejection failed");
    throw error;
  }
};

export const searchItems = async (query: string) => {
  try {
    const response = await api.get(
      `/lists/items/search?q=${encodeURIComponent(query)}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Search failed");
    throw error;
  }
};

//  Types based on the database schema
export interface Item {
  id: number;
  ItemID_DE?: number;
  parent_no_de?: string;
  model?: string;
  supp_cat?: string;
  ean?: number;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  item_name?: string;
  item_name_cn?: string;
  FOQ?: number;
  FSQ?: number;
  cat_id?: number;
  remark?: string;
  RMB_Price?: number;
  photo?: string;
  pix_path?: string;
  pix_path_eBay?: string;
  isActive?: string;
  note?: string;
}

interface ListItem {
  id: string;
  productId: string;
  quantity: number;
  notes: string;
  status: string;
  deliveryInfo: {
    deliveryDate: string;
    deliveryAddressLine1: string;
    deliveryAddressLine2: string;
    deliveryPostalCode: string;
    deliveryCity: string;
    deliveryCountry: string;
    deliveryNotes: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const handleDuplicateList = async (list: any) => {
  try {
    const response: ResponseInterface = await api.post(
      `/lists/${list.id}/duplicate`
    );

    toast.success("List duplicated successfully", successStyles);
    return response;
  } catch (error) {
    console.error("Failed to duplicate list:", error);
    handleApiError(error, "Failed to duplicate list");
  }
};

export const updateList = async (
  listId: string,
  updateData: {
    name?: string;
    description?: string;
    status?: string;
  }
) => {
  try {
    const response = await api.put(`/lists/${listId}`, updateData);
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

export const getCustomerDeliveries = async (customerId: string) => {
  try {
    const response = await api.get(`/lists/${customerId}/deliveries`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch deliveries");
    throw error;
  }
};
