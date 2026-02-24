import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export interface DeliveryAddress {
  id?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  additionalInfo?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface Request {
  id?: string;
  itemName: string;
  description?: string;
  images?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    [key: string]: any;
  };

  isEstimated?: boolean;
  quantity: number;
  purchasePrice: any;
  currency: "RMB" | "HKD" | "EUR" | "USD";
  notes?: string;
  specifications?: string;
  material?: string;
  color?: string;
  finish?: string;
  hasSample?: boolean;
  sampleQuantity?: number;
  expectedDeliveryDate?: string;
  status: "Draft" | "Pending" | "Quoted" | "Ordered" | "Cancelled";
  asanaLink?: string;
}

export interface Inquiry {
  id: string;
  name: string;
  description?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  image?: string;
  isFragile?: any;
  purchasePrice?: any;
  isEstimated?: boolean;
  requiresSpecialHandling?: any;
  handlingInstructions?: any;
  numberOfPackages?: any;
  packageType?: any;
  purchasePriceCurrency?: any;
  isAssembly: boolean;
  assemblyInstructions?: string;
  customer: any;
  contactPerson?: any;
  deliveryAddress?: DeliveryAddress;
  requests: Request[];
  status:
  | "Draft"
  | "Submitted"
  | "In Review"
  | "Quoted"
  | "Negotiation"
  | "Accepted"
  | "Rejected"
  | "Cancelled";
  totalEstimatedCost?: number;
  priority: "Low" | "Medium" | "High" | "Urgent";
  referenceNumber?: string;
  requiredByDate?: Date;
  internalNotes?: string;
  termsConditions?: string;
  projectLink?: string;
  asanaLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInquiryPayload {
  name: string;
  description?: string;
  image?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  isAssembly?: boolean;
  isEstimated?: boolean;
  customerId: string;
  isFragile: any;
  requiresSpecialHandling: any;
  handlingInstructions: any;
  numberOfPackages: any;
  packageType: any;
  purchasePrice: any;
  purchasePriceCurrency: any;
  contactPersonId?: string;
  status?: Inquiry["status"];
  priority?: Inquiry["priority"];
  referenceNumber?: string;
  requiredByDate?: Date;
  internalNotes?: string;
  termsConditions?: string;
  projectLink?: string;
  asanaLink?: string;
  assemblyInstructions?: string;
  deliveryAddress?: Omit<DeliveryAddress, "id">;
  requests?: Omit<Request, "id" | "inquiryId" | "inquiry">[];
}

export interface UpdateInquiryPayload extends Partial<CreateInquiryPayload> {
  id: string;
}

export interface InquirySearchFilters {
  search?: string;
  customerId?: string;
  status?: string;
  priority?: string;
  contactPersonId?: string;
  isAssembly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface InquiryStatistics {
  total: number;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byPriority: Array<{
    priority: string;
    count: number;
  }>;
  assemblyCount: number;
}

export const getAvailableCurrencies = () => [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "RMB", label: "RMB" },
  { value: "HKD", label: "HKD" },
];
export const getInquiryStatuses = () => [
  { value: "Draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  {
    value: "Submitted",
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "In Review",
    label: "In Review",
    color: "bg-yellow-100 text-yellow-800",
  },
  { value: "Quoted", label: "Quoted", color: "bg-purple-100 text-purple-800" },
  {
    value: "Negotiation",
    label: "Negotiation",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "Accepted",
    label: "Accepted",
    color: "bg-green-100 text-green-800",
  },
  { value: "Rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  {
    value: "Cancelled",
    label: "Cancelled",
    color: "bg-gray-300 text-gray-800",
  },
];

export const getRequestStatuses = () => [
  { value: "Draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  { value: "Pending", label: "Pending", color: "bg-blue-100 text-blue-800" },
  { value: "Quoted", label: "Quoted", color: "bg-purple-100 text-purple-800" },
  { value: "Ordered", label: "Ordered", color: "bg-green-100 text-green-800" },
  { value: "Cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export const getPriorityOptions = () => [
  { value: "Low", label: "Low", color: "bg-green-100 text-green-800" },
  { value: "Medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  { value: "High", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "Urgent", label: "Urgent", color: "bg-red-100 text-red-800" },
];

export const getAllInquiries = async (filters?: InquirySearchFilters) => {
  try {
    const response = await api.get("/inquiries", { params: filters });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch inquiries");
    throw error;
  }
};

export const getInquiryById = async (id: string) => {
  try {
    const response = await api.get(`/inquiries/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch inquiry");
    throw error;
  }
};

export const createInquiry = async (inquiryData: CreateInquiryPayload) => {
  try {
    toast.loading("Creating inquiry...", loadingStyles);
    const response = await api.post("/inquiries", inquiryData);
    toast.dismiss();
    toast.success("Inquiry created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Inquiry creation failed");
    throw error;
  }
};

export const updateInquiry = async (inquiryData: UpdateInquiryPayload) => {
  try {
    toast.loading("Updating inquiry...", loadingStyles);
    const response = await api.put(`/inquiries/${inquiryData.id}`, inquiryData);
    toast.dismiss();
    toast.success("Inquiry updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Inquiry update failed");
    throw error;
  }
};

export const deleteInquiry = async (id: string) => {
  try {
    toast.loading("Deleting inquiry...", loadingStyles);
    await api.delete(`/inquiries/${id}`);
    toast.dismiss();
    toast.success("Inquiry deleted successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Inquiry deletion failed");
    throw error;
  }
};

export const getInquiriesByCustomer = async (customerId: string) => {
  try {
    const response = await api.get(`/inquiries/customer/${customerId}`);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch customer inquiries");
    throw error;
  }
};

export const addRequestToInquiry = async (
  inquiryId: string,
  requestData: Omit<Request, "id" | "inquiryId" | "inquiry">
) => {
  try {
    toast.loading("Adding request...", loadingStyles);
    const response = await api.post(
      `/inquiries/${inquiryId}/requests`,
      requestData
    );
    toast.dismiss();
    toast.success("Request added successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to add request");
    throw error;
  }
};

export const updateRequestInInquiry = async (
  inquiryId: string,
  requestId: string,
  requestData: Partial<Request>
) => {
  try {
    toast.loading("Updating request...", loadingStyles);
    const response = await api.put(
      `/inquiries/${inquiryId}/requests/${requestId}`,
      requestData
    );
    toast.dismiss();
    toast.success("Request updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update request");
    throw error;
  }
};

export const removeRequestFromInquiry = async (
  inquiryId: string,
  requestId: string
) => {
  try {
    toast.loading("Removing request...", loadingStyles);
    await api.delete(`/inquiries/${inquiryId}/requests/${requestId}`);
    toast.dismiss();
    toast.success("Request removed successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Failed to remove request");
    throw error;
  }
};

export const getInquiryStatistics = async () => {
  try {
    const response = await api.get("/inquiries/s/statistics");
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics");
    throw error;
  }
};

export const exportInquiriesToCSV = async (filters?: InquirySearchFilters) => {
  try {
    toast.loading("Exporting to CSV...", loadingStyles);
    const response = await api.get("/inquiries/export/csv", {
      params: filters,
      responseType: "blob",
    });

    toast.dismiss();
    toast.success("Export completed", successStyles);

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `inquiries_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    handleApiError(error, "Export failed");
    throw error;
  }
};

export const updateInquiryStatus = async (
  inquiryId: string,
  status: Inquiry["status"]
) => {
  try {
    toast.loading("Updating status...", loadingStyles);
    const response = await api.patch(`/inquiries/${inquiryId}/status`, {
      status,
    });
    toast.dismiss();
    toast.success("Status updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update status");
    throw error;
  }
};

export const updateInquiryPriority = async (
  inquiryId: string,
  priority: Inquiry["priority"]
) => {
  try {
    toast.loading("Updating priority...", loadingStyles);
    const response = await api.patch(`/inquiries/${inquiryId}/priority`, {
      priority,
    });
    toast.dismiss();
    toast.success("Priority updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update priority");
    throw error;
  }
};

export const convertInquiryToItem = async (
  inquiryId: string,
  conversionData: any
) => {
  try {
    toast.loading("Converting inquiry to item...", loadingStyles);
    const response = await api.post(
      `/inquiries/${inquiryId}/convert-to-item`,
      conversionData
    );
    toast.dismiss();
    toast.success("Inquiry converted to item successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to convert inquiry to item");
    throw error;
  }
};

export const convertRequestToItem = async (
  requestId: string,
  conversionData: any
) => {
  try {
    toast.loading("Converting request to item...", loadingStyles);
    const response = await api.post(
      `/requested-items/${requestId}/convert-to-item`,
      conversionData
    );
    toast.dismiss();
    toast.success("Request converted to item successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to convert request to item");
    throw error;
  }
};
