// services/requestedItemsApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

export type Interval =
  | "Monatlich"
  | "2 monatlich"
  | "Quartal"
  | "halbjährlich"
  | "jährlich";

export type Priority = "High" | "Normal";

export type RequestStatus =
  | "1_Anfrage gestoppt"
  | "2_Anfrage verschoben"
  | "3_Anfrage Phase"
  | "4_Musterplanung"
  | "5_WAS besprechen"
  | "6_Musterbeschaffung"
  | "7_Muster Empfänger klären"
  | "8_Muster vom Kunden in DE"
  | "9_Muster unterwegs"
  | "10_Lieferanten Findung"
  | "11_Rückfragen an Kunden"
  | "11_Angebot erstellen"
  | "12_Angebot besprechen"
  | "13_Artikel erstellen"
  | "14_AB an Kunden Muster"
  | "15_Muster bestellen"
  | "16_Muster fertiggestellt"
  | "17_Muster Versand vorbereiten"
  | "18_Muster versendet"
  | "19_Rückmeldung Liefertermin Muster"
  | "20_Muster auf dem Weg"
  | "21_Muster ist in DE"
  | "22_Artikel in MIS korrigieren"
  | "23_Muster Versand an Kunden"
  | "24_Muster Eingang beim Kunden"
  | "25_Kontakt mit Kunden Muster"
  | "26_Trial order besprechen"
  | "27_AB an Kunden gesendet"
  | "28_Trial order bestellt"
  | "29_Trial order fertiggestellt"
  | "30_Trial order vorbereiten"
  | "31_Rückmeldung Liefertermin Trial Order"
  | "32_Trial order Verfolgung"
  | "33_Trial order Wareneingang DE"
  | "34_Trial order Eingang beim Kunde"
  | "35_Trial order besprechen nach Erhalt"
  | "36_Übergabe an COO"
  | "37_Anruf Serienteil Planung"
  | "38_Bestellung Serienteil erstellen"
  | "39_Serienteil fertiggestellt"
  | "40_Fracht vorbereiten MIS"
  | "41_Versanddetails erhalten"
  | "42_Rückmeldung Liefertermin Serienteil"
  | "43_Serienteil Verfolgung"
  | "44_Serienteil Wareneingang DE"
  | "45_Serienteil Eingang beim Kunde"
  | "Open";

export interface RequestedItem {
  id: string;
  businessId: string;
  contactPersonId?: string;
  itemName: string;
  itemNo?: string;
  material?: string;
  specification?: string;
  extraItems: "YES" | "NO";
  purchasePrice: any;
  weight?: number;
  length?: number;
  currency?: any;

  inquiry?: any;
  height?: number;
  width?: number;
  extraNote?: string;
  asanaLink?: string;
  urgency1?: string;
  urgency2?: string;
  painPoints?: string[];
  extraItemsDescriptions?: string;
  qty: string;
  interval: Interval;
  sampleQty?: string;
  expectedDelivery?: string;
  priority: Priority;
  requestStatus: RequestStatus;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  business?: any;
  contactPerson?: any;
  qualityCriteria?: any[];
  attachments?: any[];
  taric?: string;
}

export interface RequestedItemCreatePayload {
  businessId: string;
  contactPersonId?: string;
  itemName: string;
  itemNo?: string;
  qualityCriteria: any;
  attachments: any;
  taric: any;
  extraNote?: string;
  material?: string;
  asanaLink?: string;
  urgency1?: string;
  urgency2?: string;
  painPoints?: string[];
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  specification?: string;
  extraItems?: "YES" | "NO";
  extraItemsDescriptions?: string;
  qty: string;
  interval?: Interval;
  sampleQty?: string;
  purchasePrice: any;
  currency: any;
  inquiryId: any;
  expectedDelivery?: string;
  priority?: Priority;
  requestStatus?: RequestStatus;
  comment?: string;
}

export interface RequestedItemUpdatePayload extends Partial<RequestedItemCreatePayload> {
  requestStatus?: RequestStatus;
  priority?: Priority;
}

export interface BulkRequestedItemsOperationPayload {
  ids: string[];
}

export interface BulkStatusUpdatePayload extends BulkRequestedItemsOperationPayload {
  requestStatus: RequestStatus;
}

export interface BulkPriorityUpdatePayload extends BulkRequestedItemsOperationPayload {
  priority: Priority;
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
  minWeight?: any;
  maxWeight?: any;
  hasDimensions?: any;
}

export interface RequestedItemsStatistics {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byInterval: Array<{ interval: string; count: number }>;
  recentItems: number;
}

export const createRequestedItem = async (
  itemData: RequestedItemCreatePayload,
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

export const getAllRequestedItems = async (
  filters: RequestedItemsSearchFilters = {},
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

export const getRequestedItemById = async (id: string) => {
  try {
    const response = await api.get(`/requested-items/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch requested item");
    throw error;
  }
};

export const updateRequestedItem = async (
  id: string,
  updateData: RequestedItemUpdatePayload,
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

export const deleteRequestedItem = async (id: string) => {
  try {
    const cfs = window.confirm(
      "Are you sure you want to delete this requested item?",
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

export const getRequestedItemsByBusiness = async (
  businessId: string,
  filters: Omit<RequestedItemsSearchFilters, "businessId"> = {},
) => {
  try {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(
      `/business/${businessId}/requested-items?${params.toString()}`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch business requested items");
    throw error;
  }
};

export const bulkDeleteRequestedItems = async (
  payload: BulkRequestedItemsOperationPayload,
) => {
  try {
    toast.loading(
      `Deleting ${payload.ids.length} requested items...`,
      loadingStyles,
    );
    const response = await api.post("/requested-items/bulk-delete", payload);
    toast.dismiss();
    toast.success(
      `Deleted ${payload.ids.length} requested items`,
      successStyles,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk delete failed");
    throw error;
  }
};

export const bulkUpdateRequestedItemsStatus = async (
  payload: BulkStatusUpdatePayload,
) => {
  try {
    toast.loading(
      `Updating status for ${payload.ids.length} items...`,
      loadingStyles,
    );
    const response = await api.post(
      "/requested-items/bulk-update-status",
      payload,
    );
    toast.dismiss();
    toast.success(
      `Updated status for ${payload.ids.length} items`,
      successStyles,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk status update failed");
    throw error;
  }
};

export const bulkUpdateRequestedItemsPriority = async (
  payload: BulkPriorityUpdatePayload,
) => {
  try {
    toast.loading(
      `Updating priority for ${payload.ids.length} items...`,
      loadingStyles,
    );
    const response = await api.post(
      "/requested-items/bulk-update-priority",
      payload,
    );
    toast.dismiss();
    toast.success(
      `Updated priority for ${payload.ids.length} items`,
      successStyles,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Bulk priority update failed");
    throw error;
  }
};

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

export const getBusinessRequestedItemsStatistics = async (
  businessId: string,
) => {
  try {
    const response = await api.get(
      `/business/${businessId}/requested-items/statistics`,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch business statistics");
    throw error;
  }
};

export const validateRequestedItemData = (
  item: RequestedItemCreatePayload,
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

export const formatQuantityDisplay = (qty: string): string => {
  return qty || "0 Stk";
};

export const getPriorityBadgeVariant = (priority: Priority): string => {
  return priority === "High" ? "danger" : "secondary";
};

export const getStatusBadgeVariant = (status: RequestStatus): string => {
  if (status.includes("gestoppt") || status.includes("stopped")) {
    return "danger";
  }
  if (status.includes("successful") || status.includes("Eingang")) {
    return "success";
  }
  if (status.includes("besprechen") || status.includes("planung")) {
    return "warning";
  }
  return "primary";
};

export const needsAttention = (item: RequestedItem): boolean => {
  return (
    item.priority === "High" &&
    (item.requestStatus === "1_Anfrage gestoppt" ||
      item.requestStatus === "2_Anfrage verschoben" ||
      item.requestStatus === "3_Anfrage Phase")
  );
};

export const isOverdue = (item: RequestedItem): boolean => {
  const earlyStatuses = [
    "1_Anfrage gestoppt",
    "2_Anfrage verschoben",
    "3_Anfrage Phase",
    "4_Musterplanung",
    "5_WAS besprechen",
  ];

  if (!earlyStatuses.includes(item.requestStatus)) return false;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return new Date(item.createdAt) < thirtyDaysAgo;
};

export const filterItemsByStatus = (
  items: RequestedItem[],
  status: string,
): RequestedItem[] => {
  return items.filter((item) => item.requestStatus === status);
};

export const filterItemsByPriority = (
  items: RequestedItem[],
  priority: string,
): RequestedItem[] => {
  return items.filter((item) => item.priority === priority);
};

export const sortItemsByPriorityAndDate = (
  items: RequestedItem[],
): RequestedItem[] => {
  return items.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority === "High" ? -1 : 1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

export const exportRequestedItemsToCSV = async (
  filters: RequestedItemsSearchFilters = {},
) => {
  try {
    toast.loading("Exporting requested items...", loadingStyles);
    const response = await api.get("/requested-items/export", {
      params: filters,
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `requested-items-export-${new Date().toISOString().split("T")[0]}.csv`,
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

export const checkRequestedItemsServiceHealth = async () => {
  try {
    const response = await api.get("/requested-items/health");
    return response.data;
  } catch (error) {
    handleApiError(error, "Service health check failed");
    throw error;
  }
};

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

export const getAvailablePriorities = (): Array<{
  value: string;
  label: string;
}> => {
  return [
    { value: "High", label: "High" },
    { value: "Normal", label: "Normal" },
  ];
};

export const getAvailableStatuses = (): Array<{
  value: RequestStatus;
  label: string;
  group?: string;
}> => {
  return [
    {
      value: "1_Anfrage gestoppt",
      label: "1. Anfrage gestoppt",
      group: "Request Phase",
    },
    {
      value: "2_Anfrage verschoben",
      label: "2. Anfrage verschoben",
      group: "Request Phase",
    },
    {
      value: "3_Anfrage Phase",
      label: "3. Anfrage Phase",
      group: "Request Phase",
    },

    {
      value: "4_Musterplanung",
      label: "4. Musterplanung",
      group: "Sample Phase",
    },
    {
      value: "5_WAS besprechen",
      label: "5. WAS besprechen",
      group: "Sample Phase",
    },
    {
      value: "6_Musterbeschaffung",
      label: "6. Musterbeschaffung",
      group: "Sample Phase",
    },
    {
      value: "7_Muster Empfänger klären",
      label: "7. Muster Empfänger klären",
      group: "Sample Phase",
    },
    {
      value: "8_Muster vom Kunden in DE",
      label: "8. Muster vom Kunden in DE",
      group: "Sample Phase",
    },
    {
      value: "9_Muster unterwegs",
      label: "9. Muster unterwegs",
      group: "Sample Phase",
    },

    {
      value: "10_Lieferanten Findung",
      label: "10. Lieferanten Findung",
      group: "Supplier Phase",
    },
    {
      value: "11_Rückfragen an Kunden",
      label: "11. Rückfragen an Kunden",
      group: "Supplier Phase",
    },
    {
      value: "11_Angebot erstellen",
      label: "11. Angebot erstellen",
      group: "Supplier Phase",
    },
    {
      value: "12_Angebot besprechen",
      label: "12. Angebot besprechen",
      group: "Supplier Phase",
    },
    {
      value: "13_Artikel erstellen",
      label: "13. Artikel erstellen",
      group: "Supplier Phase",
    },
    {
      value: "14_AB an Kunden Muster",
      label: "14. AB an Kunden Muster",
      group: "Supplier Phase",
    },

    {
      value: "15_Muster bestellen",
      label: "15. Muster bestellen",
      group: "Sample Order",
    },
    {
      value: "16_Muster fertiggestellt",
      label: "16. Muster fertiggestellt",
      group: "Sample Order",
    },
    {
      value: "17_Muster Versand vorbereiten",
      label: "17. Muster Versand vorbereiten",
      group: "Sample Order",
    },
    {
      value: "18_Muster versendet",
      label: "18. Muster versendet",
      group: "Sample Order",
    },
    {
      value: "19_Rückmeldung Liefertermin Muster",
      label: "19. Rückmeldung Liefertermin Muster",
      group: "Sample Order",
    },
    {
      value: "20_Muster auf dem Weg",
      label: "20. Muster auf dem Weg",
      group: "Sample Order",
    },
    {
      value: "21_Muster ist in DE",
      label: "21. Muster ist in DE",
      group: "Sample Order",
    },
    {
      value: "22_Artikel in MIS korrigieren",
      label: "22. Artikel in MIS korrigieren",
      group: "Sample Order",
    },
    {
      value: "23_Muster Versand an Kunden",
      label: "23. Muster Versand an Kunden",
      group: "Sample Order",
    },
    {
      value: "24_Muster Eingang beim Kunden",
      label: "24. Muster Eingang beim Kunden",
      group: "Sample Order",
    },
    {
      value: "25_Kontakt mit Kunden Muster",
      label: "25. Kontakt mit Kunden Muster",
      group: "Sample Order",
    },

    {
      value: "26_Trial order besprechen",
      label: "26. Trial order besprechen",
      group: "Trial Order",
    },
    {
      value: "27_AB an Kunden gesendet",
      label: "27. AB an Kunden gesendet",
      group: "Trial Order",
    },
    {
      value: "28_Trial order bestellt",
      label: "28. Trial order bestellt",
      group: "Trial Order",
    },
    {
      value: "29_Trial order fertiggestellt",
      label: "29. Trial order fertiggestellt",
      group: "Trial Order",
    },
    {
      value: "30_Trial order vorbereiten",
      label: "30. Trial order vorbereiten",
      group: "Trial Order",
    },
    {
      value: "31_Rückmeldung Liefertermin Trial Order",
      label: "31. Rückmeldung Liefertermin Trial Order",
      group: "Trial Order",
    },
    {
      value: "32_Trial order Verfolgung",
      label: "32. Trial order Verfolgung",
      group: "Trial Order",
    },
    {
      value: "33_Trial order Wareneingang DE",
      label: "33. Trial order Wareneingang DE",
      group: "Trial Order",
    },
    {
      value: "34_Trial order Eingang beim Kunde",
      label: "34. Trial order Eingang beim Kunde",
      group: "Trial Order",
    },
    {
      value: "35_Trial order besprechen nach Erhalt",
      label: "35. Trial order besprechen nach Erhalt",
      group: "Trial Order",
    },

    {
      value: "36_Übergabe an COO",
      label: "36. Übergabe an COO",
      group: "Series Production",
    },
    {
      value: "37_Anruf Serienteil Planung",
      label: "37. Anruf Serienteil Planung",
      group: "Series Production",
    },
    {
      value: "38_Bestellung Serienteil erstellen",
      label: "38. Bestellung Serienteil erstellen",
      group: "Series Production",
    },
    {
      value: "39_Serienteil fertiggestellt",
      label: "39. Serienteil fertiggestellt",
      group: "Series Production",
    },
    {
      value: "40_Fracht vorbereiten MIS",
      label: "40. Fracht vorbereiten MIS",
      group: "Series Production",
    },
    {
      value: "41_Versanddetails erhalten",
      label: "41. Versanddetails erhalten",
      group: "Series Production",
    },
    {
      value: "42_Rückmeldung Liefertermin Serienteil",
      label: "42. Rückmeldung Liefertermin Serienteil",
      group: "Series Production",
    },
    {
      value: "43_Serienteil Verfolgung",
      label: "43. Serienteil Verfolgung",
      group: "Series Production",
    },
    {
      value: "44_Serienteil Wareneingang DE",
      label: "44. Serienteil Wareneingang DE",
      group: "Series Production",
    },
    {
      value: "45_Serienteil Eingang beim Kunde",
      label: "45. Serienteil Eingang beim Kunde",
      group: "Series Production",
    },
  ];
};

export const getStatusGroups = (): Array<{
  name: string;
  statuses: Array<{ value: RequestStatus; label: string }>;
}> => {
  const allStatuses = getAvailableStatuses();
  const groups = [
    "Request Phase",
    "Sample Phase",
    "Supplier Phase",
    "Sample Order",
    "Trial Order",
    "Series Production",
  ];

  return groups.map((groupName) => ({
    name: groupName,
    statuses: allStatuses.filter((status) => status.group === groupName),
  }));
};
