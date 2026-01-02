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

export interface UnitPrice {
  id: string;
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
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

  // Legacy quantity prices
  quantityPrices: QuantityPrice[];

  // New unit prices functionality
  useUnitPrices: boolean;
  unitPriceDecimalPlaces: number;
  totalPriceDecimalPlaces: number;
  unitPrices: UnitPrice[];
  maxUnitPriceColumns: number;

  // Base pricing
  baseQuantity?: string;
  basePrice?: number;

  // Sample pricing
  samplePrice?: number;
  sampleQuantity?: string;

  // Line item totals
  lineTotal: number;
  position: number;

  // Assembly related
  isAssemblyItem: boolean;
  isComponent: boolean;
  parentItemId?: string;

  // Notes
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Helper fields
  activePrice?: QuantityPrice | UnitPrice;
  activePriceType?: "quantity" | "unit";
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

export interface UnitPriceDto {
  id?: string;
  quantity: string;
  unitPrice: number;
  totalPrice?: number;
  isActive?: boolean;
}

export interface UpdateLineItemPayload {
  itemName?: string;
  material?: string;
  specification?: string;
  description?: string;

  // Legacy quantity prices
  quantityPrices?: QuantityPrice[];

  // Unit prices functionality
  unitPrices?: UnitPriceDto[];
  useUnitPrices?: boolean;
  unitPriceDecimalPlaces?: number;
  totalPriceDecimalPlaces?: number;
  maxUnitPriceColumns?: number;

  // Base pricing
  baseQuantity?: string;
  basePrice?: number;

  // Sample pricing
  samplePrice?: number;
  sampleQuantity?: string;

  // Totals and positioning
  lineTotal?: number;
  position?: number;

  // Notes
  notes?: string;
}

export interface BulkUpdateLineItemsPayload {
  lineItems: Array<{
    id: string;
    quantityPrices?: QuantityPrice[];
    unitPrices?: UnitPriceDto[];
    useUnitPrices?: boolean;
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

// Unit price configuration defaults
export const getUnitPriceDefaults = () => ({
  unitPriceDecimalPlaces: 3,
  totalPriceDecimalPlaces: 2,
  maxUnitPriceColumns: 3,
});

// Main API functions
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
  offerData: CreateOfferPayload
) => {
  try {
    toast.loading("Creating offer...", loadingStyles);
    const response: any = await api.post(
      `/inquiry/${inquiryId}/offers`,
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
    const response: any = await api.put(`/offers/${id}`, offerData);
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

// Price management operations

// Add quantity price (legacy)
export const addQuantityPrice = async (
  lineItemId: string,
  data: { quantity: string; price: number; isActive?: boolean }
) => {
  try {
    toast.loading("Adding price...", loadingStyles);
    const response: any = await api.post(
      `/offers/line-items/${lineItemId}/quantity-prices`,
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

// Add unit price (new)
export const addUnitPrice = async (
  lineItemId: string,
  data: { quantity: string; unitPrice: number; isActive?: boolean }
) => {
  try {
    toast.loading("Adding unit price...", loadingStyles);
    const response: any = await api.post(
      `/offers/line-items/${lineItemId}/unit-prices`,
      data
    );
    toast.dismiss();
    toast.success("Unit price added successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to add unit price");
    throw error;
  }
};

// Set active price (supports both types)
export const setActivePrice = async (
  lineItemId: string,
  priceType: "quantity" | "unit",
  priceIndex: number
) => {
  try {
    toast.loading("Setting active price...", loadingStyles);
    const response: any = await api.put(
      `/offers/line-items/${lineItemId}/active-price/${priceType}/${priceIndex}`
    );
    toast.dismiss();
    toast.success("Active price set successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to set active price");
    throw error;
  }
};

// Toggle unit prices feature
export const toggleUnitPrices = async (
  lineItemId: string,
  useUnitPrices: boolean
) => {
  try {
    toast.loading(
      useUnitPrices ? "Enabling unit prices..." : "Disabling unit prices...",
      loadingStyles
    );
    const response: any = await api.post(
      `/offers/line-items/${lineItemId}/toggle-unit-prices`,
      { useUnitPrices }
    );
    toast.dismiss();
    toast.success(
      `Unit prices ${useUnitPrices ? "enabled" : "disabled"} successfully`,
      successStyles
    );
    return response.data;
  } catch (error) {
    handleApiError(
      error,
      `Failed to ${useUnitPrices ? "enable" : "disable"} unit prices`
    );
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
    const response: any = await api.post(`/offers/${id}/generate-pdf`);
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
    const response: any = await api.get(`/offers/${id}/download-pdf`, {
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

// Get offer statuses
export const getOfferStatusesFromApi = async () => {
  try {
    const response: any = await api.get("/offers/statuses");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch offer statuses");
    throw error;
  }
};

// Get available currencies
export const getAvailableCurrenciesFromApi = async () => {
  try {
    const response: any = await api.get("/offers/currencies");
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch currencies");
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

// Format price with specified decimal places
export const formatPrice = (price: number, digits = 3): string => {
  if (isNaN(price) || !isFinite(price)) {
    return "0.000";
  }
  return price.toFixed(digits);
};

// Format total price (2 decimal places)
export const formatTotalPrice = (price: number): string => {
  if (isNaN(price) || !isFinite(price)) {
    return "0.00";
  }
  return price.toFixed(2);
};

export const calculateLineTotal = (quantity: string, price: number): number => {
  const qty = parseFloat(quantity) || 0;
  return parseFloat((qty * price).toFixed(2));
};

export const calculateUnitPriceTotal = (
  quantity: string,
  unitPrice: number
): number => {
  const qty = parseFloat(quantity) || 0;
  return parseFloat((qty * unitPrice).toFixed(2));
};

export const getOfferStatusColor = (status: string) => {
  const statusObj = getOfferStatuses().find((s) => s.value === status);
  return statusObj?.color || "bg-gray-100 text-gray-800";
};

// Unit price helper functions
export const getActivePrice = (
  lineItem: OfferLineItem
): QuantityPrice | UnitPrice | null => {
  if (
    lineItem.useUnitPrices &&
    lineItem.unitPrices &&
    lineItem.unitPrices.length > 0
  ) {
    return lineItem.unitPrices.find((up) => up.isActive) || null;
  } else if (lineItem.quantityPrices && lineItem.quantityPrices.length > 0) {
    return lineItem.quantityPrices.find((qp) => qp.isActive) || null;
  }
  return null;
};

export const getActivePriceType = (
  lineItem: OfferLineItem
): "quantity" | "unit" | null => {
  if (
    lineItem.useUnitPrices &&
    lineItem.unitPrices &&
    lineItem.unitPrices.length > 0
  ) {
    const activeUnitPrice = lineItem.unitPrices.find((up) => up.isActive);
    return activeUnitPrice ? "unit" : null;
  } else if (lineItem.quantityPrices && lineItem.quantityPrices.length > 0) {
    const activeQuantityPrice = lineItem.quantityPrices.find(
      (qp) => qp.isActive
    );
    return activeQuantityPrice ? "quantity" : null;
  }
  return null;
};

export const calculateLineItemTotal = (lineItem: OfferLineItem): number => {
  const activePrice = getActivePrice(lineItem);
  if (activePrice) {
    if ("totalPrice" in activePrice) {
      // Unit price
      return activePrice.totalPrice;
    } else {
      // Quantity price
      return activePrice.total;
    }
  } else if (lineItem.basePrice && lineItem.baseQuantity) {
    return calculateLineTotal(lineItem.baseQuantity, lineItem.basePrice);
  }
  return 0;
};

// Process unit prices from DTO to proper format
export const processUnitPricesForUpdate = (
  unitPricesDto: UnitPriceDto[]
): any => {
  return unitPricesDto.map((upDto, index) => {
    const qty = parseFloat(upDto.quantity) || 0;
    const unitPrice = parseFloat(upDto.unitPrice.toString()) || 0;
    const totalPrice = upDto.totalPrice || qty * unitPrice;

    return {
      id: upDto.id || `unit-price-${index}-${Date.now()}`,
      quantity: upDto.quantity,
      unitPrice,
      totalPrice,
      isActive: upDto.isActive || index === 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
};

// Default unit price structure for new line items
export const createDefaultUnitPrices = (
  quantities: string[] = ["1000", "5000", "10000"]
): UnitPriceDto[] => {
  const now = new Date();
  return quantities.map((quantity, index) => ({
    id: `unit-price-default-${index}`,
    quantity,
    unitPrice: 0,
    totalPrice: 0,
    isActive: index === 0,
  }));
};

// Prepare line item data for unit prices
export const prepareLineItemForUnitPrices = (
  lineItem: Partial<OfferLineItem>
) => {
  const defaults = getUnitPriceDefaults();

  return {
    ...lineItem,
    useUnitPrices: true,
    unitPriceDecimalPlaces: defaults.unitPriceDecimalPlaces,
    totalPriceDecimalPlaces: defaults.totalPriceDecimalPlaces,
    maxUnitPriceColumns: defaults.maxUnitPriceColumns,
    unitPrices: lineItem.unitPrices || createDefaultUnitPrices(),
    quantityPrices: lineItem.quantityPrices || [],
  };
};

// Export function to migrate legacy quantity prices to unit prices
export const migrateToUnitPrices = async (lineItemId: string) => {
  try {
    toast.loading("Migrating to unit prices...", loadingStyles);
    const response: any = await api.post(
      `/offers/line-items/${lineItemId}/migrate-to-unit-prices`
    );
    toast.dismiss();
    toast.success("Migrated to unit prices successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to migrate to unit prices");
    throw error;
  }
};

// Alias functions to maintain backward compatibility
export const getOfferStatusesFromApiAlias = getOfferStatusesFromApi;
export const getAvailableCurrenciesFromApiAlias = getAvailableCurrenciesFromApi;
