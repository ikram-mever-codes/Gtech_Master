// services/requestedItemsApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

// Types
export interface RequestedItem {
  id: string;
  businessId: string;
  contactPersonId?: string;
  itemName: string;
  material?: string;
  specification?: string;
  extraItems: "YES" | "NO";
  extraNote?: string;
  asanaLink?: string;
  extraItemsDescriptions?: string;
  qty: string;
  interval:
    | "Monatlich"
    | "2 monatlich"
    | "Quartal"
    | "halbjährlich"
    | "jährlich";
  sampleQty?: string;
  expectedDelivery?: string;
  priority: "High" | "Normal";
  requestStatus: "open" | "supplier search" | "stopped" | "successful";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  business?: any;
  contactPerson?: any;
}

export interface RequestedItemCreatePayload {
  businessId: string;
  contactPersonId?: string;
  itemName: string;
  extraNote?: string;
  material?: string;
  asanaLink?: string;
  specification?: string;
  extraItems?: "YES" | "NO";
  extraItemsDescriptions?: string;
  qty: string;
  interval?:
    | "Monatlich"
    | "2 monatlich"
    | "Quartal"
    | "halbjährlich"
    | "jährlich";
  sampleQty?: string;
  expectedDelivery?: string;
  priority?: "High" | "Normal";
  requestStatus?: "open" | "supplier search" | "stopped" | "successful";
  comment?: string;
}

export interface RequestedItemUpdatePayload
  extends Partial<RequestedItemCreatePayload> {
  requestStatus?: "open" | "supplier search" | "stopped" | "successful";
  priority?: "High" | "Normal";
}

export interface BulkRequestedItemsOperationPayload {
  ids: string[];
}

export interface BulkStatusUpdatePayload
  extends BulkRequestedItemsOperationPayload {
  requestStatus: "open" | "supplier search" | "stopped" | "successful";
}

export interface BulkPriorityUpdatePayload
  extends BulkRequestedItemsOperationPayload {
  priority: "High" | "Normal";
}

export interface RequestedItemsSearchFilters {
  page?: number;
  limit?: number;
  search?: string;
  businessId?: string;
  contactPersonId?: string;
  requestStatus?: string;
  priority?: string;
  interval?: string;
  extraItems?: "YES" | "NO";
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface RequestedItemsStatistics {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byInterval: Array<{ interval: string; count: number }>;
  recentItems: number;
}

// ======================== CRUD Operations ========================

// Create requested item
export const createRequestedItem = async (
  itemData: RequestedItemCreatePayload
) => {
  try {
    toast.loading("Creating requested item...", loadingStyles);
    const response = await api.post("/requested-items", itemData);
    toast.dismiss();
    toast.success("Requested item created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Requested item creation failed");
    throw error;
  }
};

// Get all requested items with pagination and filtering
export const getAllRequestedItems = async (
  filters: RequestedItemsSearchFilters = {}
) => {
  try {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/requested-items?${params.toString()}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch requested items");
    throw error;
  }
};

// Get requested item by ID
export const getRequestedItemById = async (id: string) => {
  try {
    const response = await api.get(`/requested-items/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch requested item");
    throw error;
  }
};

// Update requested item
export const updateRequestedItem = async (
  id: string,
  updateData: RequestedItemUpdatePayload
) => {
  try {
    toast.loading("Updating requested item...", loadingStyles);
    const response = await api.put(`/requested-items/${id}`, updateData);
    toast.dismiss();
    toast.success("Requested item updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update requested item");
    throw error;
  }
};

// Delete requested item
export const deleteRequestedItem = async (id: string) => {
  try {
    const cfs = window.confirm(
      "Are you sure you want to delete this requested item?"
    );
    if (!cfs) return;
    toast.loading("Deleting requested item...", loadingStyles);
    const response = await api.delete(`/requested-items/${id}`);
    toast.dismiss();
    toast.success("Requested item deleted successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to delete requested item");
    throw error;
  }
};

// ======================== Business-specific Operations ========================

// Get requested items by business
export const getRequestedItemsByBusiness = async (
  businessId: string,
  filters: Omit<RequestedItemsSearchFilters, "businessId"> = {}
) => {
  try {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(
      `/business/${businessId}/requested-items?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch business requested items");
    throw error;
  }
};

// ======================== Bulk Operations ========================

// Bulk delete requested items
export const bulkDeleteRequestedItems = async (
  payload: BulkRequestedItemsOperationPayload
) => {
  try {
    toast.loading(
      `Deleting ${payload.ids.length} requested items...`,
      loadingStyles
    );
    const response = await api.post("/requested-items/bulk-delete", payload);
    toast.dismiss();
    toast.success(
      `Deleted ${payload.ids.length} requested items`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk delete failed");
    throw error;
  }
};

// Bulk update requested items status
export const bulkUpdateRequestedItemsStatus = async (
  payload: BulkStatusUpdatePayload
) => {
  try {
    toast.loading(
      `Updating status for ${payload.ids.length} items...`,
      loadingStyles
    );
    const response = await api.post(
      "/requested-items/bulk-update-status",
      payload
    );
    toast.dismiss();
    toast.success(
      `Updated status for ${payload.ids.length} items`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk status update failed");
    throw error;
  }
};

// Bulk update requested items priority
export const bulkUpdateRequestedItemsPriority = async (
  payload: BulkPriorityUpdatePayload
) => {
  try {
    toast.loading(
      `Updating priority for ${payload.ids.length} items...`,
      loadingStyles
    );
    const response = await api.post(
      "/requested-items/bulk-update-priority",
      payload
    );
    toast.dismiss();
    toast.success(
      `Updated priority for ${payload.ids.length} items`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk priority update failed");
    throw error;
  }
};

// ======================== Statistics and Analytics ========================

// Get requested items statistics
export const getRequestedItemsStatistics = async (): Promise<{
  data: RequestedItemsStatistics;
}> => {
  try {
    const response = await api.get("/requested-items/statistics");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics");
    throw error;
  }
};

// Get business requested items statistics
export const getBusinessRequestedItemsStatistics = async (
  businessId: string
) => {
  try {
    const response = await api.get(
      `/business/${businessId}/requested-items/statistics`
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch business statistics");
    throw error;
  }
};

// ======================== Utility Functions ========================

// Validate requested item data
export const validateRequestedItemData = (
  item: RequestedItemCreatePayload
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!item.businessId || item.businessId.trim() === "") {
    errors.push("Business ID is required");
  }

  if (!item.itemName || item.itemName.trim() === "") {
    errors.push("Item name is required");
  }

  if (!item.qty || item.qty.trim() === "") {
    errors.push("Quantity is required");
  }

  if (
    item.extraItems === "YES" &&
    (!item.extraItemsDescriptions || item.extraItemsDescriptions.trim() === "")
  ) {
    errors.push("Extra items description is required when extra items is YES");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Format quantity display
export const formatQuantityDisplay = (qty: string): string => {
  return qty || "0 Stk";
};

// Format priority badge
export const getPriorityBadgeVariant = (
  priority: "High" | "Normal"
): string => {
  return priority === "High" ? "danger" : "secondary";
};

// Format status badge
export const getStatusBadgeVariant = (status: string): string => {
  switch (status) {
    case "successful":
      return "success";
    case "stopped":
      return "danger";
    case "supplier search":
      return "warning";
    case "open":
    default:
      return "primary";
  }
};

// Check if item needs attention (high priority and open status)
export const needsAttention = (item: RequestedItem): boolean => {
  return item.priority === "High" && item.requestStatus === "open";
};

// Check if item is overdue (created more than 30 days ago and still open)
export const isOverdue = (item: RequestedItem): boolean => {
  if (item.requestStatus !== "open") return false;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(item.createdAt) < thirtyDaysAgo;
};

// Filter items by status
export const filterItemsByStatus = (
  items: RequestedItem[],
  status: string
): RequestedItem[] => {
  return items.filter((item) => item.requestStatus === status);
};

// Filter items by priority
export const filterItemsByPriority = (
  items: RequestedItem[],
  priority: string
): RequestedItem[] => {
  return items.filter((item) => item.priority === priority);
};

// Sort items by priority and creation date
export const sortItemsByPriorityAndDate = (
  items: RequestedItem[]
): RequestedItem[] => {
  return items.sort((a, b) => {
    // First sort by priority (High first)
    if (a.priority !== b.priority) {
      return a.priority === "High" ? -1 : 1;
    }
    // Then by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// Export requested items to CSV
export const exportRequestedItemsToCSV = async (
  filters: RequestedItemsSearchFilters = {}
) => {
  try {
    toast.loading("Exporting requested items...", loadingStyles);
    const response = await api.get("/requested-items/export", {
      params: filters,
      responseType: "blob",
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `requested-items-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.dismiss();
    toast.success("Requested items exported successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Export failed");
    throw error;
  }
};

// Check service health
export const checkRequestedItemsServiceHealth = async () => {
  try {
    const response = await api.get("/requested-items/health");
    return response.data;
  } catch (error) {
    handleApiError(error, "Service health check failed");
    throw error;
  }
};

// Get available intervals
export const getAvailableIntervals = (): Array<{
  value: string;
  label: string;
}> => {
  return [
    { value: "Monatlich", label: "Monatlich" },
    { value: "2 monatlich", label: "2 monatlich" },
    { value: "Quartal", label: "Quartal" },
    { value: "halbjährlich", label: "Halbjährlich" },
    { value: "jährlich", label: "Jährlich" },
  ];
};

// Get available priorities
export const getAvailablePriorities = (): Array<{
  value: string;
  label: string;
}> => {
  return [
    { value: "High", label: "High" },
    { value: "Normal", label: "Normal" },
  ];
};

// Get available statuses grouped by phase
export const getAvailableStatuses = (): Array<{
  value: string;
  label: string;
  group?: string;
}> => {
  return [
    { value: "open", label: "Open", group: "Initial" },
    { value: "supplier search", label: "Supplier Search", group: "Initial" },
    { value: "stopped", label: "Stopped", group: "Initial" },
    { value: "successful", label: "Successful", group: "Final" },

    {
      value: "Anfrage gestoppt",
      label: "Anfrage gestoppt",
      group: "Request Phase",
    },
    {
      value: "Anfrage verschoben",
      label: "Anfrage verschoben",
      group: "Request Phase",
    },
    { value: "Anfrage Phase", label: "Anfrage Phase", group: "Request Phase" },

    { value: "Musterplanung", label: "Musterplanung", group: "Sample Phase" },
    { value: "WAS besprechen", label: "WAS besprechen", group: "Sample Phase" },
    {
      value: "Musterbeschaffung",
      label: "Musterbeschaffung",
      group: "Sample Phase",
    },
    {
      value: "Muster Empfänger klären",
      label: "Muster Empfänger klären",
      group: "Sample Phase",
    },
    {
      value: "Muster vom Kunden in DE",
      label: "Muster vom Kunden in DE",
      group: "Sample Phase",
    },
    {
      value: "Muster unterwegs",
      label: "Muster unterwegs",
      group: "Sample Phase",
    },
    {
      value: "Muster bestellen",
      label: "Muster bestellen",
      group: "Sample Phase",
    },
    {
      value: "Muster fertiggestellt",
      label: "Muster fertiggestellt",
      group: "Sample Phase",
    },
    {
      value: "Muster Versand vorbereiten",
      label: "Muster Versand vorbereiten",
      group: "Sample Phase",
    },
    {
      value: "Muster versendet",
      label: "Muster versendet",
      group: "Sample Phase",
    },
    {
      value: "Rückmeldung Liefertermin Muster",
      label: "Rückmeldung Liefertermin Muster",
      group: "Sample Phase",
    },
    {
      value: "Muster auf dem Weg",
      label: "Muster auf dem Weg",
      group: "Sample Phase",
    },
    {
      value: "Muster ist in DE",
      label: "Muster ist in DE",
      group: "Sample Phase",
    },
    {
      value: "Muster Versand an Kunden",
      label: "Muster Versand an Kunden",
      group: "Sample Phase",
    },
    {
      value: "Muster Eingang beim Kunden",
      label: "Muster Eingang beim Kunden",
      group: "Sample Phase",
    },
    {
      value: "Kontakt mit Kunden Muster",
      label: "Kontakt mit Kunden Muster",
      group: "Sample Phase",
    },

    {
      value: "Lieferanten Findung",
      label: "Lieferanten Findung",
      group: "Quotation",
    },
    {
      value: "Rückfragen an Kunden",
      label: "Rückfragen an Kunden",
      group: "Quotation",
    },
    {
      value: "Angebot erstellen",
      label: "Angebot erstellen",
      group: "Quotation",
    },
    {
      value: "Angebot besprechen",
      label: "Angebot besprechen",
      group: "Quotation",
    },
    {
      value: "Artikel erstellen",
      label: "Artikel erstellen",
      group: "Quotation",
    },
    {
      value: "AB an Kunden Muster",
      label: "AB an Kunden Muster",
      group: "Quotation",
    },
    {
      value: "Artikel in MIS korrigieren",
      label: "Artikel in MIS korrigieren",
      group: "Quotation",
    },

    {
      value: "Trial order besprechen",
      label: "Trial order besprechen",
      group: "Trial Order",
    },
    {
      value: "AB an Kunden gesendet",
      label: "AB an Kunden gesendet",
      group: "Trial Order",
    },
    {
      value: "Trial order bestellt",
      label: "Trial order bestellt",
      group: "Trial Order",
    },
    {
      value: "Trial order fertiggestellt",
      label: "Trial order fertiggestellt",
      group: "Trial Order",
    },
    {
      value: "Trial order vorbereiten",
      label: "Trial order vorbereiten",
      group: "Trial Order",
    },
    {
      value: "Rückmeldung Liefertermin Trial Order",
      label: "Rückmeldung Liefertermin Trial Order",
      group: "Trial Order",
    },
    {
      value: "Trial order Verfolgung",
      label: "Trial order Verfolgung",
      group: "Trial Order",
    },
    {
      value: "Trial order Wareneingang DE",
      label: "Trial order Wareneingang DE",
      group: "Trial Order",
    },
    {
      value: "Trial order Eingang beim Kunde",
      label: "Trial order Eingang beim Kunde",
      group: "Trial Order",
    },
    {
      value: "Trial order besprechen nach Erhalt",
      label: "Trial order besprechen nach Erhalt",
      group: "Trial Order",
    },

    {
      value: "Übergabe an COO",
      label: "Übergabe an COO",
      group: "Series Production",
    },
    {
      value: "Anruf Serienteil Planung",
      label: "Anruf Serienteil Planung",
      group: "Series Production",
    },
    {
      value: "Bestellung Serienteil erstellen",
      label: "Bestellung Serienteil erstellen",
      group: "Series Production",
    },
    {
      value: "Serienteil fertiggestellt",
      label: "Serienteil fertiggestellt",
      group: "Series Production",
    },
    {
      value: "Fracht vorbereiten MIS",
      label: "Fracht vorbereiten MIS",
      group: "Series Production",
    },
    {
      value: "Versanddetails erhalten",
      label: "Versanddetails erhalten",
      group: "Series Production",
    },
    {
      value: "Rückmeldung Liefertermin Serienteil",
      label: "Rückmeldung Liefertermin Serienteil",
      group: "Series Production",
    },
    {
      value: "Serienteil Verfolgung",
      label: "Serienteil Verfolgung",
      group: "Series Production",
    },
    {
      value: "Serienteil Wareneingang DE",
      label: "Serienteil Wareneingang DE",
      group: "Series Production",
    },
    {
      value: "Serienteil Eingang beim Kunde",
      label: "Serienteil Eingang beim Kunde",
      group: "Series Production",
    },
  ];
};
