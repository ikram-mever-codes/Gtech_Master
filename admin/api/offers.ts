import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

export type PricingMode = "classic" | "matrix";

export interface PriceMatrixEntry {
  id: string;
  quantity: string;
  price: number | null;
  total: number | null;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface PriceMatrixEntryPayload {
  id?: string;
  quantity: string;
  price?: number | string | null;
  isActive?: boolean;
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
  sourceItemId?: string;
  requestedItemId?: string;

  // Classic mode
  baseQuantity?: string;
  basePrice?: number;

  // Matrix mode
  priceMatrix?: PriceMatrixEntry[];

  samplePrice?: number;
  sampleQuantity?: string;
  lineTotal: number;
  position: number;
  isAssemblyItem: boolean;
  isComponent: boolean;
  parentItemId?: string;
  notes?: string;

  /** Extra weight, decimal-capable (e.g. 0.1, 2, 4.5). */
  extraWeight?: number;
  /** Expected delivery date for this line item. */
  expectedDeliveryDate?: Date | string;
  /** UI highlight color for this offer line (e.g. "#FFEE58"). */
  highlightColor?: string;

  createdAt: Date;
  updatedAt: Date;
  activePrice?: PriceMatrixEntry | null;
}

export interface CreateOfferFromItemPayload {
  title?: string;
  currency?: string;
  validUntil?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  pricingMode?: PricingMode;
  taxRate?: number;
  unitPriceDecimalPlaces?: number;
  totalPriceDecimalPlaces?: number;
  maxUnitPriceColumns?: number;
  customerId?: string;
  itemIds?: string[];
}

export interface CreateOfferFromCustomerPayload {
  title?: string;
  currency?: "EUR" | "USD" | "RMB" | "HKD";
  validUntil?: Date | string;
  notes?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  pricingMode?: PricingMode;
  taxRate?: number;
  unitPriceDecimalPlaces?: number;
  totalPriceDecimalPlaces?: number;
  maxUnitPriceColumns?: number;
}

export interface CreateLineItemPayload {
  itemName: string;
  material?: string;
  specification?: string;
  description?: string;
  baseQuantity?: string;
  basePrice?: number | string;
  notes?: string;
  extraWeight?: number | string;
  expectedDeliveryDate?: Date | string;
  highlightColor?: string;
  weight?: number | string;
  sourceItemId?: string;
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
  paymentMethod?: string;
  shippingMethod?: string;
  deliveryTime?: string;
  currency: "RMB" | "HKD" | "EUR" | "USD";
  pricingMode: PricingMode;
  taxRate: number;
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

  unitPriceDecimalPlaces: number;
  totalPriceDecimalPlaces: number;
  maxUnitPriceColumns: number;
  defaultPriceMatrix?: PriceMatrixEntry[];

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
  validUntil?: Date | string;
  termsConditions?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  paymentMethod?: string;
  shippingMethod?: string;
  deliveryTime?: string;
  currency?: "RMB" | "HKD" | "EUR" | "USD";
  pricingMode?: PricingMode;
  taxRate?: number;
  discountPercentage?: number;
  discountAmount?: number;
  shippingCost?: number;
  notes?: string;
  internalNotes?: string;
  deliveryAddress?: DeliveryAddress;
  assemblyName?: string;
  assemblyDescription?: string;
  assemblyNotes?: string;
  unitPriceDecimalPlaces?: number;
  totalPriceDecimalPlaces?: number;
  maxUnitPriceColumns?: number;
  defaultPriceMatrix?: PriceMatrixEntryPayload[];
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
  priceMatrix?: PriceMatrixEntryPayload[];
  baseQuantity?: string;
  basePrice?: number | string;
  samplePrice?: number | string;
  sampleQuantity?: string;
  lineTotal?: number | string;
  position?: number;
  notes?: string;
  extraWeight?: number | string;
  expectedDeliveryDate?: Date | string;
  highlightColor?: string;
}

export interface BulkUpdateLineItemsPayload {
  lineItems: Array<{
    id: string;
    priceMatrix?: PriceMatrixEntryPayload[];
    basePrice?: number | string;
    samplePrice?: number | string;
    lineTotal?: number | string;
    notes?: string;
    extraWeight?: number | string;
    expectedDeliveryDate?: Date | string;
    highlightColor?: string;
  }>;
}

export interface OfferSearchFilters {
  search?: string;
  inquiryId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface LinkedDocumentRef {
  id: string;
  number: string;
  date?: string;
  status?: string;
}

export interface LinkedDocumentsResult {
  orders?: LinkedDocumentRef[];
  invoices?: LinkedDocumentRef[];
  invoiceCorrections?: LinkedDocumentRef[];
  deliveryNotes?: LinkedDocumentRef[];
}

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

export const getAvailableCurrencies = () => [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "RMB", label: "RMB (¥)" },
  { value: "HKD", label: "HKD (HK$)" },
];

export const getAllOffers = async (filters?: OfferSearchFilters) => {
  try {
    const response: any = await api.get("/offers", { params: filters });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offers");
    throw error;
  }
};

export const getOfferById = async (id: string) => {
  try {
    const response: any = await api.get(`/offers/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer");
    throw error;
  }
};

export const createOfferFromInquiry = async (
  inquiryId: string,
  offerData: CreateOfferPayload,
) => {
  try {
    toast.loading("Creating offer...", loadingStyles);
    const response: any = await api.post(
      `/offers/inquiry/${inquiryId}`,
      offerData,
    );
    toast.dismiss();
    return response;
  } catch (error) {
    handleApiError(error, "Offer creation failed");
    throw error;
  }
};

export const createOfferFromItem = async (
  itemId: string,
  payload: CreateOfferFromItemPayload,
) => {
  try {
    toast.loading("Creating offer...", loadingStyles);
    const response: any = await api.post(
      `/offers/from-item/${itemId}`,
      payload,
    );
    toast.dismiss();
    return response;
  } catch (error) {
    handleApiError(error, "Offer creation failed");
    throw error;
  }
};

export const updateOffer = async (
  id: string,
  offerData: UpdateOfferPayload,
) => {
  try {
    const response: any = await api.put(`/offers/${id}`, offerData);
    return response;
  } catch (error) {
    handleApiError(error, "Offer update failed");
    throw error;
  }
};

export const deleteOffer = async (id: string) => {
  try {
    toast.loading("Deleting offer...", loadingStyles);
    await api.delete(`/offers/${id}`);
    toast.dismiss();
    toast.success("Offer deleted successfully", successStyles);
  } catch (error) {
    handleApiError(error, "Offer deletion failed");
    throw error;
  }
};

export const createOfferRevision = async (
  id: string,
  revisionData: CreateOfferPayload,
) => {
  try {
    toast.loading("Creating revision...", loadingStyles);
    const response: any = await api.post(
      `/offers/${id}/revisions`,
      revisionData,
    );
    toast.dismiss();
    toast.success("Offer revision created successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Revision creation failed");
    throw error;
  }
};

export const updateLineItem = async (
  offerId: string,
  lineItemId: string,
  data: UpdateLineItemPayload,
) => {
  try {
    const response: any = await api.put(
      `/offers/${offerId}/line-items/${lineItemId}`,
      data,
    );
    return response.data ?? response;
  } catch (error) {
    handleApiError(error, "Failed to update line item");
    throw error;
  }
};

export const bulkUpdateLineItems = async (
  offerId: string,
  data: BulkUpdateLineItemsPayload,
) => {
  try {
    toast.loading("Updating line items...", loadingStyles);
    const response: any = await api.put(
      `/offers/${offerId}/line-items/bulk`,
      data,
    );
    toast.dismiss();
    toast.success("Line items updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update line items");
    throw error;
  }
};

export const generateOfferPdf = async (id: string) => {
  try {
    toast.loading("Generating PDF...", loadingStyles);
    const response: any = await api.post(`/offers/${id}/generate-pdf`);
    toast.dismiss();
    toast.success("PDF generated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to generate PDF");
    throw error;
  }
};

export const downloadOfferPdf = async (id: string, offerNumber?: string) => {
  try {
    toast.loading("Preparing download...", loadingStyles);
    const offerResponse: any = await getOfferById(id);
    const offer = offerResponse.data || offerResponse;
    if (!offer.pdfGenerated) {
      await generateOfferPdf(id);
    }
    const response: any = await api.get(`/offers/${id}/download-pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    if (blob.size === 0) {
      throw new Error("The downloaded PDF is empty.");
    }
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      toast.dismiss();
    }, 1000);

    return true;
  } catch (error) {
    toast.dismiss();
    console.error("Error downloading PDF:", error);
    toast.error("Failed to download PDF");
    throw error;
  }
};

export const getOffersByInquiry = async (
  inquiryId: string,
  page = 1,
  limit = 20,
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

export const getOfferStatistics = async () => {
  try {
    const response: any = await api.get("/offers/statistics");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer statistics");
    throw error;
  }
};

// Orders / invoices / invoice corrections / delivery notes linked to this
// offer. Fails soft (returns an empty result) instead of throwing, since this
// depends on Order/Invoice/DeliveryNote modules that may not be wired in on
// every environment yet.
export const getOfferLinkedDocuments = async (
  offerId: string,
): Promise<{ success: boolean; data: LinkedDocumentsResult | null }> => {
  try {
    const response: any = await api.get(`/offers/${offerId}/linked-documents`);
    return response?.success ? response : { success: false, data: null };
  } catch (error) {
    return { success: false, data: null };
  }
};

export const getOfferStatusesFromApi = async () => {
  try {
    const response: any = await api.get("/offers/statuses");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer statuses");
    throw error;
  }
};

export const getAvailableCurrenciesFromApi = async () => {
  try {
    const response: any = await api.get("/offers/currencies");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch currencies");
    throw error;
  }
};

export const formatCurrency = (amount: any, currency: any) => {
  const formatter = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: currency === "EUR" ? "EUR" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

export const formatUnitPrice = (price: number, decimalPlaces = 3): string => {
  if (isNaN(price) || !isFinite(price)) {
    return `0.${"0".repeat(decimalPlaces)}`;
  }
  return Number(price).toFixed(decimalPlaces);
};

export const formatTotalPrice = (price: number): string => {
  if (isNaN(price) || !isFinite(price)) return "0.00";
  return price.toFixed(2);
};

export const getOfferStatusColor = (status: string) => {
  const statusObj = getOfferStatuses().find((s) => s.value === status);
  return statusObj?.color || "bg-gray-100 text-gray-800";
};

export const createOfferLineItem = async (
  offerId: string,
  payload: CreateLineItemPayload,
) => {
  try {
    const response: any = await api.post(
      `/offers/${offerId}/line-items`,
      payload,
    );
    return response.data ?? response;
  } catch (error) {
    handleApiError(error, "Failed to add line item");
    throw error;
  }
};

export const deleteOfferLineItem = async (
  offerId: string,
  lineItemId: string,
) => {
  try {
    const response: any = await api.delete(
      `/offers/${offerId}/line-items/${lineItemId}`,
    );
    return response.data ?? response;
  } catch (error) {
    handleApiError(error, "Failed to remove line item");
    throw error;
  }
};

export const deletePriceColumn = async (offerId: string, quantity: string) => {
  try {
    const response: any = await api.delete(`/offers/${offerId}/price-column`, {
      params: { quantity },
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete the price tier");
    throw error;
  }
};

export async function pasteMatrixPrices(
  offerId: string,
  payload: { data: string; tierCount: number },
) {
  // No internal toast: the modal shows a message built from the server's
  // own result (how many line items were updated), which is more useful
  // than a generic one — don't double it up here.
  const response: any = await api.post(
    `/offers/${offerId}/paste-matrix`,
    payload,
  );
  return response;
}

export async function addPriceMatrixEntry(
  lineItemId: string,
  payload: { quantity: string; price?: number | string | null },
) {
  try {
    const response: any = await api.post(
      `/offers/line-items/${lineItemId}/price-matrix`,
      payload,
    );
    return response.data ?? response;
  } catch (error) {
    handleApiError(error, "Failed to add the price tier");
    throw error;
  }
}

// No priceType segment anymore — matrix is the only mode with tiers.
export async function setActivePrice(lineItemId: string, priceIndex: number) {
  try {
    const response: any = await api.put(
      `/offers/line-items/${lineItemId}/active-price/${priceIndex}`,
    );
    return response.data ?? response;
  } catch (error) {
    handleApiError(error, "Failed to set the active price");
    throw error;
  }
}
