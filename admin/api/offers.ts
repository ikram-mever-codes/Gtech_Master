import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

// Types
export interface QuantityPrice {
  quantity: string;
  price: number;
  isActive: boolean;
  total: number;
}

export interface CustomerSnapshot {
  id: string;
  companyName: string;
  legalName?: string;
  email?: string;
  contactEmail?: string;
  contactPhoneNumber?: string;
  vatId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  street?: string;
  state?: string;
  additionalInfo?: string;
}

export interface DeliveryAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  additionalInfo?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface OfferLineItem {
  id: string;
  itemName: string;
  material?: string;
  specification?: string;
  description?: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  purchasePrice?: number;
  purchaseCurrency?: "RMB" | "HKD" | "EUR" | "USD";
  quantityPrices: QuantityPrice[];
  baseQuantity?: string;
  basePrice?: number;
  samplePrice?: number;
  sampleQuantity?: string;
  lineTotal: number;
  position: number;
  isAssemblyItem: boolean;
  isComponent: boolean;
  parentItemId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  activePrice?: QuantityPrice; // Helper field
}

export interface Offer {
  id: string;
  offerNumber: string;
  title: string;
  inquiryId: string;
  customerSnapshot: CustomerSnapshot;
  deliveryAddress: DeliveryAddress;
  status:
    | "Draft"
    | "Submitted"
    | "Negotiation"
    | "Accepted"
    | "Rejected"
    | "Expired"
    | "Cancelled";
  validUntil: Date;
  termsConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  deliveryTime?: string;
  currency: "RMB" | "HKD" | "EUR" | "USD";
  discountPercentage?: number;
  discountAmount?: number;
  shippingCost?: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  internalNotes?: string;
  isAssembly: boolean;
  assemblyName?: string;
  assemblyDescription?: string;
  assemblyNotes?: string;
  pdfPath?: string;
  pdfGenerated: boolean;
  pdfGeneratedAt?: Date;
  revision: number;
  previousOfferNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  lineItems: OfferLineItem[];
  inquiry?: {
    id: string;
    name: string;
    customer: any;
  };
}

export interface CreateOfferPayload {
  title?: string;
  validUntil?: Date;
  termsConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  deliveryTime?: string;
  currency?: "RMB" | "HKD" | "EUR" | "USD";
  discountPercentage?: number;
  discountAmount?: number;
  shippingCost?: number;
  notes?: string;
  internalNotes?: string;
  deliveryAddress?: DeliveryAddress;
  assemblyName?: string;
  assemblyDescription?: string;
  assemblyNotes?: string;
}

export interface UpdateOfferPayload extends Partial<CreateOfferPayload> {
  status?: Offer["status"];
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
}

export interface UpdateLineItemPayload {
  itemName?: string;
  material?: string;
  specification?: string;
  description?: string;
  quantityPrices?: QuantityPrice[];
  baseQuantity?: string;
  basePrice?: number;
  samplePrice?: number;
  sampleQuantity?: string;
  lineTotal?: number;
  position?: number;
  notes?: string;
}

export interface BulkUpdateLineItemsPayload {
  lineItems: Array<{
    id: string;
    quantityPrices?: QuantityPrice[];
    basePrice?: number;
    samplePrice?: number;
    lineTotal?: number;
    notes?: string;
  }>;
}

export interface CopyPastePricesPayload {
  data: string; // Tab-separated values
}

export interface OfferSearchFilters {
  search?: string;
  inquiryId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Status options for offers
export const getOfferStatuses = () => [
  { value: "Draft", label: "Draft", color: "bg-gray-100 text-gray-800" },
  {
    value: "Submitted",
    label: "Submitted",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "Negotiation",
    label: "Negotiation",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "Accepted",
    label: "Accepted",
    color: "bg-green-100 text-green-800",
  },
  { value: "Rejected", label: "Rejected", color: "bg-red-100 text-red-800" },
  {
    value: "Expired",
    label: "Expired",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "Cancelled",
    label: "Cancelled",
    color: "bg-gray-300 text-gray-800",
  },
];

// Currency options
export const getAvailableCurrencies = () => [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "RMB", label: "RMB (¥)" },
  { value: "HKD", label: "HKD (HK$)" },
];

// Main API functions
export const getAllOffers = async (filters?: OfferSearchFilters) => {
  try {
    const response: any = await api.get("/offers/offers", { params: filters });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offers");
    throw error;
  }
};

export const getOfferById = async (id: string) => {
  try {
    const response: any = await api.get(`/offers/offers/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer");
    throw error;
  }
};

export const createOfferFromInquiry = async (
  inquiryId: string,
  offerData: CreateOfferPayload
) => {
  try {
    toast.loading("Creating offer...", loadingStyles);
    const response: any = await api.post(
      `/offers/inquiry/${inquiryId}/offers`,
      offerData
    );
    toast.dismiss();
    toast.success("Offer created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Offer creation failed");
    throw error;
  }
};

export const updateOffer = async (
  id: string,
  offerData: UpdateOfferPayload
) => {
  try {
    toast.loading("Updating offer...", loadingStyles);
    const response: any = await api.put(`/offers/offers/${id}`, offerData);
    toast.dismiss();
    toast.success("Offer updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Offer update failed");
    throw error;
  }
};

export const deleteOffer = async (id: string) => {
  try {
    toast.loading("Deleting offer...", loadingStyles);
    await api.delete(`/offers/offers/${id}`);
    toast.dismiss();
    toast.success("Offer deleted successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Offer deletion failed");
    throw error;
  }
};

export const createOfferRevision = async (
  id: string,
  revisionData: CreateOfferPayload
) => {
  try {
    toast.loading("Creating revision...", loadingStyles);
    const response: any = await api.post(
      `/offers/${id}/revisions`,
      revisionData
    );
    toast.dismiss();
    toast.success("Offer revision created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Revision creation failed");
    throw error;
  }
};

// Line item operations
export const updateLineItem = async (
  offerId: string,
  lineItemId: string,
  data: UpdateLineItemPayload
) => {
  try {
    toast.loading("Updating line item...", loadingStyles);
    const response: any = await api.put(
      `/offers/${offerId}/line-items/${lineItemId}`,
      data
    );
    toast.dismiss();
    toast.success("Line item updated successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update line item");
    throw error;
  }
};

export const bulkUpdateLineItems = async (
  offerId: string,
  data: BulkUpdateLineItemsPayload
) => {
  try {
    toast.loading("Updating line items...", loadingStyles);
    const response: any = await api.put(
      `/offers/${offerId}/line-items/bulk`,
      data
    );
    toast.dismiss();
    toast.success("Line items updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update line items");
    throw error;
  }
};

export const addQuantityPrice = async (
  lineItemId: string,
  data: { quantity: string; price: number; isActive?: boolean }
) => {
  try {
    toast.loading("Adding price...", loadingStyles);
    const response: any = await api.post(
      `/line-items/${lineItemId}/quantity-prices`,
      data
    );
    toast.dismiss();
    toast.success("Price added successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to add price");
    throw error;
  }
};

export const setActivePrice = async (
  lineItemId: string,
  priceIndex: number
) => {
  try {
    toast.loading("Setting active price...", loadingStyles);
    const response: any = await api.put(
      `/line-items/${lineItemId}/active-price/${priceIndex}`
    );
    toast.dismiss();
    toast.success("Active price set successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to set active price");
    throw error;
  }
};

// Copy/paste operations
export const copyPastePrices = async (
  offerId: string,
  data: CopyPastePricesPayload
) => {
  try {
    toast.loading("Processing copied data...", loadingStyles);
    const response: any = await api.post(
      `/offers/${offerId}/copy-paste-prices`,
      data
    );
    toast.dismiss();
    toast.success("Prices copied successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to process copied data");
    throw error;
  }
};

// PDF operations
export const generateOfferPdf = async (id: string) => {
  try {
    toast.loading("Generating PDF...", loadingStyles);
    const response: any = await api.post(`/offers/offers/${id}/generate-pdf`);
    toast.dismiss();
    toast.success("PDF generated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to generate PDF");
    throw error;
  }
};

export const downloadOfferPdf = async (id: string) => {
  try {
    const response: any = await api.get(`/offers/offers/${id}/download-pdf`, {
      responseType: "blob",
    });

    // Create blob URL for download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `offer-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  } catch (error) {
    handleApiError(error, "Failed to download PDF");
    throw error;
  }
};

// Get offers by inquiry
export const getOffersByInquiry = async (
  inquiryId: string,
  page = 1,
  limit = 20
) => {
  try {
    const response: any = await api.get(`/inquiry/${inquiryId}/offers`, {
      params: { page, limit },
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offers for inquiry");
    throw error;
  }
};

// Statistics
export const getOfferStatistics = async () => {
  try {
    const response: any = await api.get("/offers/statistics");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer statistics");
    throw error;
  }
};

// Helper functions
export const formatCurrency = (amount: any, currency: any) => {
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
};

export const formatPrice = (price: number, digits = 3) => {
  return price.toFixed(digits);
};

export const calculateLineTotal = (quantity: string, price: number): number => {
  const qty = parseFloat(quantity) || 0;
  return parseFloat((qty * price).toFixed(2));
};

export const getOfferStatusColor = (status: string) => {
  const statusObj = getOfferStatuses().find((s) => s.value === status);
  return statusObj?.color || "bg-gray-100 text-gray-800";
};
