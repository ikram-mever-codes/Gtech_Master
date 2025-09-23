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
  interval?: any;
}

interface CreateListPayload {
  name: string;
  description?: string;
  deliveryDate?: string;
  customerId: string;
}

interface AcknowledgePayload {
  logIds?: string[];
  fields?: string[];
}

interface BulkAcknowledgePayload {
  listIds: string[];
  itemIds?: string[];
  fields?: string[];
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

export const updateListItemComment = async (itemId: string, itemData: any) => {
  try {
    toast.loading("Updating item...", loadingStyles);
    const response = await api.put(`/lists/items/${itemId}/comment`, itemData);
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

// ======================== Acknowledgment System ========================
export const acknowledgeListItemChanges = async (
  listId: string,
  itemId: string,
  payload?: AcknowledgePayload
) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(
      `/lists/${listId}/items/${itemId}/acknowledge`,
      payload
    );
    toast.dismiss();
    toast.success("Changes acknowledged successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to acknowledge changes");
    throw error;
  }
};

export const acknowledgeItemFieldChanges = async (
  listId: string,
  itemId: string,
  fields: string[]
) => {
  try {
    toast.loading("Acknowledging field changes...", loadingStyles);
    const response = await api.put(
      `/lists/${listId}/items/${itemId}/acknowledge-fields`,
      { fields }
    );
    toast.dismiss();
    toast.success("Field changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to acknowledge field changes");
    throw error;
  }
};

export const bulkAcknowledgeChanges = async (
  payload: BulkAcknowledgePayload
) => {
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    const response = await api.put(`/lists/bulk-acknowledge`, payload);
    toast.dismiss();
    toast.success("Changes acknowledged successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk acknowledgment failed");
    throw error;
  }
};

export const getPendingChangesForAdmin = async () => {
  try {
    const response = await api.get("/lists/admin/pending-changes");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch pending changes");
    throw error;
  }
};

// ======================== Admin List Management ========================
export const getAllLists = async () => {
  try {
    const response = await api.get("/lists/admin/all-lists");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch lists");
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
    const response = await api.post("/lists/admin/items/refresh-from-mis", {
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

// ======================== Legacy Functions (Deprecated) ========================
/**
 * @deprecated Use acknowledgeListItemChanges instead
 */
export const approveListItem = async (itemId: string) => {
  console.warn(
    "approveListItem is deprecated. Use acknowledgeListItemChanges instead."
  );
  try {
    toast.loading("Acknowledging changes...", loadingStyles);
    // This is a legacy function - redirect to new acknowledgment system
    const response = await api.put(`/lists/items/${itemId}/acknowledge`, {});
    toast.dismiss();
    toast.success("Changes acknowledged", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Acknowledgment failed");
    throw error;
  }
};

/**
 * @deprecated Changes are now automatically applied and only need acknowledgment
 */
export const rejectListItem = async (itemId: string, reason?: string) => {
  console.warn(
    "rejectListItem is deprecated. Changes are now automatically applied and only need acknowledgment."
  );
  try {
    toast.loading("Processing...", loadingStyles);
    // In the new system, we don't reject changes - we just don't acknowledge them
    const response = await api.put(`/lists/items/${itemId}/acknowledge`, {
      note: reason ? `Rejection noted: ${reason}` : "Change not acknowledged",
    });
    toast.dismiss();
    toast.success("Change status updated", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Operation failed");
    throw error;
  }
};

/**
 * @deprecated Use acknowledgeListItemChanges instead
 */
export const approveActivityLog = async (logId: string) => {
  console.warn(
    "approveActivityLog is deprecated. Use acknowledgeListItemChanges instead."
  );
  return approveListItem(logId);
};

/**
 * @deprecated Changes are now automatically applied and only need acknowledgment
 */
export const rejectActivityLog = async (logId: string, payload: any) => {
  console.warn(
    "rejectActivityLog is deprecated. Changes are now automatically applied and only need acknowledgment."
  );
  return rejectListItem(logId, payload.reason);
};

/**
 * @deprecated Use the new acknowledgeListItemChanges with listId parameter
 */
export const acknowledgeItemChanges = async (
  listId: string,
  itemId: string,
  acknowledgeComments?: boolean
) => {
  console.warn(
    "acknowledgeItemChanges is deprecated. Use acknowledgeListItemChanges instead."
  );
  const payload: AcknowledgePayload = {};
  if (acknowledgeComments) {
    payload.fields = ["comment"];
  }
  return acknowledgeListItemChanges(listId, itemId, payload);
};

// ======================== Utility Functions ========================
export const checkServiceHealth = async () => {
  try {
    const response = await api.get("/lists/health");
    return response.data;
  } catch (error) {
    handleApiError(error, "Service health check failed");
    throw error;
  }
};

// Helper function to get highlighted fields from item data
export const getHighlightedFieldsFromItem = (item: any): string[] => {
  return item.highlightedFields || item.unacknowledgedFields || [];
};

// Helper function to check if item has pending changes
export const hasPendingChanges = (item: any): boolean => {
  return item.hasPendingChanges || item.hasUnacknowledgedChanges || false;
};

// Helper function to get pending changes count from list data
export const getPendingChangesCount = (list: any): number => {
  return list.pendingChangesCount || list.unacknowledgedChangesCount || 0;
};
