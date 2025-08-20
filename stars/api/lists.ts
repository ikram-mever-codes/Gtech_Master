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
  templateType?: string;
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
    const response = await api.get(`/lists/customer/all/${customerId}`);
    toast.dismiss();
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch customer lists");
    throw error;
  }
};

export const getAllLists = async () => {
  try {
    const response = await api.get("/lists/admin/all-lists");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch all lists");
    throw error;
  }
};

interface ListItemPayload {
  listId: string;
  itemId: number;
  quantity?: number;
  interval?: string;
  comment?: string;
  marked?: boolean;
}

export const addItemToList = async (
  listId: string,
  itemData: Omit<ListItemPayload, "listId">
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
  interval?: string;
  comment?: string;
  marked?: boolean;
  deliveries?: Record<string, any>;
  articleName?: string;
  articleNumber?: string;
  imageUrl?: string;
  item_no_de?: string;
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
      `/lists/items/${itemId}`
    );
    toast.dismiss();
    toast.success("Item removed successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to remove item");
    throw error;
  }
};

export const deleteList = async (listId: string) => {
  try {
    toast.loading("Deleting list...", loadingStyles);
    const response: ResponseInterface = await api.delete(
      `/lists/list/${listId}`
    );
    toast.dismiss();
    toast.success("List deleted successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete list");
    throw error;
  }
};

// Delivery Information Update
interface DeliveryInfoPayload {
  period: string;
  quantity?: number;
  status?: string;
  remark?: string;
  cargoStatus?: string;
  shippedAt?: string;
  eta?: string;
  cargoType?: string;
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

export const getCustomerList = async (customerId: string, listId: string) => {
  try {
    const response = await api.get(
      `/lists/customers/${customerId}/lists/${listId}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load customer list");
    throw error;
  }
};

// Admin Approval Functions
export const approveListItemChanges = async (logId: string) => {
  try {
    toast.loading("Approving changes...", loadingStyles);
    const response = await api.put(`/lists/admin/items/${logId}/approve`);
    toast.dismiss();
    toast.success("Changes approved", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Approval failed");
    throw error;
  }
};

export const rejectListItemChanges = async (logId: string, reason?: string) => {
  try {
    toast.loading("Rejecting changes...", loadingStyles);
    const response = await api.put(`/lists/admin/items/${logId}/reject`, {
      reason,
    });
    toast.dismiss();
    toast.success("Changes rejected", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Rejection failed");
    throw error;
  }
};

export const acknowledgeListItemChanges = async (
  itemId: string,
  acknowledgeComments?: boolean
) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(`/lists/items/${itemId}/acknowledge`, {
      acknowledgeComments,
    });
    toast.dismiss();
    toast.success("Changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Acknowledgment failed");
    throw error;
  }
};

export const bulkAcknowledgeChanges = async (
  listId: string,
  itemIds?: string[],
  acknowledgeComments?: boolean
) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(`/lists/${listId}/bulk-acknowledge`, {
      itemIds,
      acknowledgeComments,
    });
    toast.dismiss();
    toast.success("Changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk acknowledgment failed");
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

export const refreshListItemsDeliveryData = async (listId: string) => {
  try {
    toast.loading("Refreshing delivery data...", loadingStyles);
    const response = await api.post(`/lists/${listId}/refresh-items`);
    toast.dismiss();
    toast.success("Delivery data refreshed", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to refresh delivery data");
    throw error;
  }
};

export const handleDuplicateList = async (listId: string) => {
  try {
    toast.loading("Duplicating list...", loadingStyles);
    const response: ResponseInterface = await api.post(
      `/lists/${listId}/duplicate`
    );
    toast.dismiss();
    toast.success("List duplicated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to duplicate list");
    throw error;
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
    toast.loading("Updating list...", loadingStyles);
    const response = await api.put(`/lists/${listId}`, updateData);
    toast.dismiss();
    toast.success("List updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update list");
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

export const searchListsByNumber = async (listNumber: string) => {
  try {
    const response = await api.get(`/lists/search/${listNumber}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "List search failed");
    throw error;
  }
};

export const getListsByCompanyName = async (companyName: string) => {
  try {
    const response = await api.get(`/lists/customer/${companyName}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch lists by company name");
    throw error;
  }
};

// Types based on the database schema
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

export const searchListsByCustomerNamee = async (customerName: string) => {
  try {
    const response = await api.get(`/lists/customer/${customerName}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
