import { api, handleApiError } from "@/utils/api";
import { toast } from "react-hot-toast";
import { loadingStyles, successStyles } from "@/utils/constants";

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

  quantityPrices: QuantityPrice[];

  unitPrices: UnitPrice[];

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

  // Unit pricing configuration at offer level
  useUnitPrices: boolean;
  unitPriceDecimalPlaces: number;
  totalPriceDecimalPlaces: number;
  maxUnitPriceColumns: number;
  defaultUnitPrices?: UnitPrice[];

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

  // Unit pricing settings for offer
  useUnitPrices?: boolean;
  unitPriceDecimalPlaces?: number;
  totalPriceDecimalPlaces?: number;
  maxUnitPriceColumns?: number;
  defaultUnitPrices?: UnitPrice[];
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
  quantityPrices?: QuantityPrice[];
  unitPrices?: UnitPriceDto[];
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
    unitPrices?: UnitPriceDto[];
    basePrice?: number;
    samplePrice?: number;
    lineTotal?: number;
    notes?: string;
  }>;
}

export interface CopyPastePricesPayload {
  data: string;
}

export interface OfferSearchFilters {
  search?: string;
  inquiryId?: string;
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
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

export const getUnitPriceDefaults = () => ({
  useUnitPrices: false,
  unitPriceDecimalPlaces: 3,
  totalPriceDecimalPlaces: 2,
  maxUnitPriceColumns: 3,
});

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
      `/offers/inquiry/${inquiryId}`,
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

export const toggleOfferUnitPrices = async (
  offerId: string,
  useUnitPrices: boolean
) => {
  try {
    toast.loading(
      useUnitPrices ? "Enabling unit prices..." : "Disabling unit prices...",
      loadingStyles
    );
    const response: any = await api.post(
      `/offers/${offerId}/toggle-unit-prices`,
      { useUnitPrices }
    );
    toast.dismiss();
    toast.success(
      `Unit prices ${
        useUnitPrices ? "enabled" : "disabled"
      } successfully for all line items`,
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

export const bulkUpdateOfferUnitPrices = async (
  offerId: string,
  unitPrices: UnitPriceDto[]
) => {
  try {
    toast.loading("Updating unit prices for all line items...", loadingStyles);
    const response: any = await api.put(`/offers/${offerId}/bulk-unit-prices`, {
      unitPrices,
    });
    toast.dismiss();
    toast.success("Unit prices updated for all line items", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to update unit prices");
    throw error;
  }
};

export const syncUnitPricesAcrossOffer = async (
  offerId: string,
  templateUnitPrices?: UnitPriceDto[]
) => {
  try {
    toast.loading("Syncing unit prices across line items...", loadingStyles);
    const payload = templateUnitPrices ? { templateUnitPrices } : {};
    const response: any = await api.post(
      `/offers/${offerId}/sync-unit-prices`,
      payload
    );
    toast.dismiss();
    toast.success("Unit prices synced across all line items", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to sync unit prices");
    throw error;
  }
};

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
  price = Number(price);
  return price.toFixed(decimalPlaces);
};

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
  unitPrice: number,
  decimalPlaces = 2
): number => {
  const qty = parseFloat(quantity) || 0;
  return parseFloat((qty * unitPrice).toFixed(decimalPlaces));
};

export const getOfferStatusColor = (status: string) => {
  const statusObj = getOfferStatuses().find((s) => s.value === status);
  return statusObj?.color || "bg-gray-100 text-gray-800";
};

export const getActivePrice = (
  lineItem: OfferLineItem,
  offerUsesUnitPrices: boolean
): QuantityPrice | UnitPrice | null => {
  if (
    offerUsesUnitPrices &&
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
  lineItem: OfferLineItem,
  offerUsesUnitPrices: boolean
): "quantity" | "unit" | null => {
  if (
    offerUsesUnitPrices &&
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

export const calculateLineItemTotal = (
  lineItem: OfferLineItem,
  offerUsesUnitPrices: boolean
): number => {
  const activePrice = getActivePrice(lineItem, offerUsesUnitPrices);
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

export const processUnitPricesForUpdate = (
  unitPricesDto: UnitPriceDto[],
  totalPriceDecimalPlaces = 2
): any => {
  return unitPricesDto.map((upDto, index) => {
    const qty = parseFloat(upDto.quantity) || 0;
    const unitPrice = parseFloat(upDto.unitPrice.toString()) || 0;
    const totalPrice =
      upDto.totalPrice ||
      parseFloat((qty * unitPrice).toFixed(totalPriceDecimalPlaces));

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

export const createDefaultUnitPrices = (
  quantities: string[] = ["1000", "5000", "10000"]
): UnitPrice[] => {
  const now = new Date();
  return quantities.map((quantity, index) => ({
    id: `unit-price-default-${index}`,
    quantity,
    unitPrice: 0,
    totalPrice: 0,
    isActive: index === 0,
    createdAt: now,
    updatedAt: now,
  }));
};

export const prepareLineItemForUnitPrices = (
  lineItem: Partial<OfferLineItem>,
  offerUnitPriceSettings: {
    unitPriceDecimalPlaces: number;
    totalPriceDecimalPlaces: number;
    maxUnitPriceColumns: number;
  }
) => {
  return {
    ...lineItem,
    unitPrices:
      lineItem.unitPrices ||
      createDefaultUnitPrices().map((up) => ({
        ...up,
        totalPrice: parseFloat(
          (parseFloat(up.quantity) * up.unitPrice).toFixed(
            offerUnitPriceSettings.totalPriceDecimalPlaces
          )
        ),
      })),
    quantityPrices: lineItem.quantityPrices || [],
  };
};

export const migrateOfferToUnitPrices = async (offerId: string) => {
  try {
    toast.loading("Migrating offer to unit prices...", loadingStyles);
    const response: any = await api.post(
      `/offers/${offerId}/migrate-to-unit-prices`
    );
    toast.dismiss();
    toast.success("Offer migrated to unit prices successfully", successStyles);
    return response.data;
  } catch (error) {
    handleApiError(error, "Failed to migrate offer to unit prices");
    throw error;
  }
};

// Check if offer uses unit prices
export const offerUsesUnitPrices = (offer: Offer): boolean => {
  return offer.useUnitPrices || false;
};

export const getOfferUnitPriceSettings = (offer: Offer) => ({
  useUnitPrices: offer.useUnitPrices || false,
  unitPriceDecimalPlaces: offer.unitPriceDecimalPlaces || 3,
  totalPriceDecimalPlaces: offer.totalPriceDecimalPlaces || 2,
  maxUnitPriceColumns: offer.maxUnitPriceColumns || 3,
  defaultUnitPrices: offer.defaultUnitPrices || createDefaultUnitPrices(),
});

export const formatUnitPriceForOffer = (
  price: number,
  offer: Offer
): string => {
  return formatUnitPrice(price, offer.unitPriceDecimalPlaces || 3);
};

export const formatTotalPriceForOffer = (
  price: number,
  offer: Offer
): string => {
  return formatTotalPrice(price);
};

export const calculateOfferTotals = (
  lineItems: OfferLineItem[],
  offerUsesUnitPrices: boolean
) => {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + calculateLineItemTotal(item, offerUsesUnitPrices),
    0
  );

  return {
    subtotal,
  };
};

export const updateLineItemsForUnitPriceChange = async (
  offerId: string,
  useUnitPrices: boolean
): Promise<void> => {
  if (useUnitPrices) {
    await syncUnitPricesAcrossOffer(offerId);
  }
};

export const migrateToUnitPrices = async (lineItemId: string) => {
  console.warn(
    "migrateToUnitPrices is deprecated. Use migrateOfferToUnitPrices instead."
  );
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

export const toggleUnitPrices = async (
  lineItemId: string,
  useUnitPrices: boolean
) => {
  console.warn(
    "toggleUnitPrices for individual line items is deprecated. Use toggleOfferUnitPrices instead."
  );
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

export const getOfferStatusesFromApiAlias = getOfferStatusesFromApi;
export const getAvailableCurrenciesFromApiAlias = getAvailableCurrenciesFromApi;

export const formatPrice = formatUnitPrice;
export const prepareLineItemForUnitPricesLegacy = (
  lineItem: Partial<OfferLineItem>
) => {
  console.warn(
    "prepareLineItemForUnitPricesLegacy is deprecated. Use prepareLineItemForUnitPrices with offer settings instead."
  );
  const defaults = getUnitPriceDefaults();
  return {
    ...lineItem,
    unitPrices: lineItem.unitPrices || createDefaultUnitPrices(),
    quantityPrices: lineItem.quantityPrices || [],
  };
};
