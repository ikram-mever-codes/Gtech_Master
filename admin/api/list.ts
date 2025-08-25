import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

// Types
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

interface DeliveryInfoPayload {
  deliveryDate?: string;
  deliveryAddressLine1?: string;
  deliveryAddressLine2?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  deliveryNotes?: string;
}

interface ListItemPayload {
  productId: string;
  quantity: number;
  notes?: string;
}

interface UpdateListItemPayload {
  quantity?: number;
  notes?: string;
}

interface CreateListPayload {
  name: string;
  description?: string;
  deliveryDate?: string;
  customerId: string;
}

// ======================== List Management ========================
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

export const getCustomerLists = async (customerId: string) => {
  try {
    const response = await api.get(`/lists/customer/all/${customerId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch customer lists");
    throw error;
  }
};

export const getSingleListForCustomer = async (
  customerId: string,
  listId: string
) => {
  try {
    const response = await api.get(
      `/lists/customers/${customerId}/lists/${listId}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch list details");
    throw error;
  }
};

// ======================== List Item Management ========================
export const addItemToList = async (
  listId: string,
  itemData: ListItemPayload
) => {
  try {
    console.log(itemData);
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
    const response = await api.delete(`/lists/items/${itemId}`);
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

// ======================== Delivery Management ========================
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

// ======================== List Operations ========================
export const getListDetails = async (listId: string) => {
  try {
    const response = await api.get(`/lists/${listId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to load list details");
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

// ======================== Admin Approval ========================
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

export const getAllLists = async () => {
  try {
    const response = await api.get("/lists/admin/all-lists");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch lists");
    throw error;
  }
};

// ======================== Activity Log Approval ========================
export interface RejectionReason {
  reason: string;
}

export const approveActivityLog = async (logId: string) => {
  try {
    toast.loading("Approving changes...", loadingStyles);
    const response = await api.put(`/lists/admin/items/${logId}/approve`);
    toast.dismiss();
    return response.data;
  } catch (error) {
    handleApiError(error, "Approval failed");
    throw error;
  }
};

export const rejectActivityLog = async (
  logId: string,
  payload: RejectionReason
) => {
  try {
    toast.loading("Rejecting changes...", loadingStyles);
    const response = await api.put(
      `/lists/admin/items/${logId}/reject`,
      payload
    );
    toast.dismiss();
    return response.data;
  } catch (error) {
    handleApiError(error, "Rejection failed");
    throw error;
  }
};

export const bulkAcknowledgeChanges = async (listIds?: string[]) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(`/lists/all/bulk-acknowledge`, {
      listIds,
    });
    toast.dismiss();
    toast.success("Changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk acknowledgment failed");
    throw error;
  }
};

export const fetchAllListsWithMISRefresh = async (
  refreshFromMIS: boolean = true
) => {
  try {
    toast.loading("Fetching all lists...", loadingStyles);
    const response = await api.get(
      `/lists/admin/all-with-items?refreshFromMIS=${refreshFromMIS}`
    );
    toast.dismiss();
    if (refreshFromMIS) {
      toast.success("Lists fetched and refreshed from MIS", successStyles);
    } else {
      toast.success("Lists fetched successfully", successStyles);
    }
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch lists");
    throw error;
  }
};

export const refreshItemsFromMIS = async (itemIds: string[]) => {
  try {
    toast.loading("Refreshing items from MIS...", loadingStyles);
    const response = await api.post("/lists/items/refresh-from-mis", {
      itemIds,
    });
    toast.dismiss();
    toast.success("Items refreshed from MIS", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to refresh items from MIS");
    throw error;
  }
};

export const getListItemWithMISRefresh = async (
  itemId: string,
  refresh: boolean = true
) => {
  try {
    if (refresh) {
      toast.loading("Refreshing item data...", loadingStyles);
    }
    const response = await api.get(
      `/lists/items/${itemId}/with-refresh?refresh=${refresh}`
    );
    toast.dismiss();
    if (refresh) {
      toast.success("Item data refreshed", successStyles);
    }
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch item");
    throw error;
  }
};

export const acknowledgeItemChanges = async (
  listId: string,
  itemId: string,
  acknowledgeComments?: boolean
) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(
      `/lists/${listId}/items/${itemId}/acknowledge`,
      {
        acknowledgeComments,
      }
    );
    toast.dismiss();
    toast.success("Changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to acknowledge changes");
    throw error;
  }
};
