// src/api/itemApi.ts
import { toast } from "react-hot-toast";
import { api, handleApiError } from "../utils/api";
import { loadingStyles, successStyles } from "@/utils/constants";
import { ResponseInterface } from "@/utils/interfaces";

export interface Item {
  id: number;
  de_no: string | null;
  name_de: string | null;
  name_en: string | null;
  name_cn: string | null;
  item_name: string;
  item_name_cn: string | null;
  ean: bigint | null;
  is_active: string;
  parent_id: number | null;
  taric_id: number | null;
  category_id: number | null;
  category: string | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  remark: string | null;
  model: string | null;
  supplier_id: number | null;
  supplier_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Parent {
  id: number;
  de_no: string;
  name_de: string;
  name_en: string | null;
  name_cn: string | null;
  is_active: string;
  taric_id: number | null;
  supplier_id: number | null;
  item_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface WarehouseItem {
  id: number;
  item_id: number;
  item_no_de: string;
  item_name_de: string;
  item_name_en: string;
  stock_qty: number;
  msq: number;
  buffer: number;
  is_active: string;
  is_stock_item: string;
  created_at: Date;
}

export interface VariationValue {
  id: number;
  item_id: number;
  value_de: string | null;
  value_de_2: string | null;
  value_de_3: string | null;
  value_en: string | null;
  value_en_2: string | null;
  value_en_3: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QualityCriterion {
  id: number;
  item_id: number;
  name: string;
  picture: string | null;
  description: string | null;
  description_cn: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ItemDetails {
  id: number;
  itemNo: string;
  name: string;
  nameCN: string;
  ean: string;
  category: string;
  model: string;
  remark: string;
  supplier_id: number | null;
  supplier_name: string | null;
  isActive: boolean;
  parent: {
    noDE: string;
    nameDE: string;
    nameEN: string;
    isActive: boolean;
    isSpecialItem: boolean;
    priceEUR: number;
    priceRMB: number;
    isEURSpecial: boolean;
    isRMBSpecial: boolean;
  };
  dimensions: {
    isbn: string;
    weight: string;
    length: string;
    width: string;
    height: string;
  };
  variationsDE: {
    variations: string[];
    values: string[];
  };
  variationsEN: {
    variations: string[];
    values: string[];
  };
  others: {
    taricCode: string;
    isQTYdiv: boolean;
    mc: string;
    er: string;
    isMeter: boolean;
    isPU: boolean;
    isNPR: boolean;
    isNew: boolean;
    warehouseItem: string;
    idDE: string;
    noDE: string;
    nameDE: string;
    nameEN: string;
    isActive: boolean;
    isStock: boolean;
    qty: string;
    msq: string;
    isNAO: boolean;
    buffer: string;
    isSnSI: boolean;
  };
  qualityCriteria: QualityCriterion[];
  attachments: any[];
  pictures: {
    shopPicture: string;
    ebayPictures: string;
  };
  nprRemarks: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface StatisticsResponse {
  success: boolean;
  data: {
    totalItems: number;
    activeItems: number;
    inactiveItems: number;
    itemsWithStock: number;
    itemsByCategory: Array<{
      category: string;
      count: string;
    }>;
  };
}

// ============================================
// ITEM API FUNCTIONS
// ============================================

// Get all items with pagination and filters
export const getItems = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  supplier?: string;
  isActive?: string;
  parentId?: string;
  taricId?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}) => {
  try {
    const response = await api.get("/items", {
      params,
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch items");
    throw error;
  }
};

// Get item by ID
export const getItemById = async (id: number) => {
  try {
    const response: ResponseInterface = await api.get(`/items/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch item details");
    throw error;
  }
};

// Get item by Category ID
export const getItemByCategory = async (categoryId: number) => {
  try {
    const response: ResponseInterface = await api.get(`/items/${categoryId}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch item details by category");
    throw error;
  }
};

// Create new item
export const createItem = async (itemData: {
  item_name: string;
  item_name_cn?: string;
  ean?: string;
  parent_id: number;
  taric_id?: number;
  cat_id?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  remark?: string;
  model?: string;
  supplier_id?: number;
  isActive?: string;
}) => {
  try {
    toast.loading("Creating item...", loadingStyles);
    const response = await api.post("/items", itemData);
    toast.dismiss();
    toast.success("Item created successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create item");
    throw error;
  }
};

// Update item
export const updateItem = async (
  id: number,
  itemData: Partial<{
    item_name: string;
    item_name_cn: string;
    ean: string | null;
    parent_id: number;
    taric_id: number;
    cat_id: number;
    weight: number;
    length: number;
    width: number;
    height: number;
    remark: string;
    model: string;
    supplier_id: number;
    isActive: string;
    is_qty_dividable: string;
    is_npr: string;
    is_eur_special: string;
    is_rmb_special: string;
    ItemID_DE?: number;
    is_dimension_special?: string;
    FOQ?: number;
    FSQ?: number;
    ISBN?: number;
    RMB_Price?: number;
    many_components?: number;
    effort_rating?: number;
    is_pu_item?: number;
    is_meter_item?: number;
    is_new?: string;
    supp_cat?: string;
    note?: string;
    photo?: string;
    pix_path?: string;
    pix_path_eBay?: string;
    npr_remark?: string;
  }>
) => {
  try {
    toast.loading("Updating item...", loadingStyles);
    const response = await api.put(`/items/${id}`, itemData);
    toast.dismiss();
    toast.success("Item updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update item");
    throw error;
  }
};

// Delete item
export const deleteItem = async (id: number) => {
  try {
    toast.loading("Deleting item...", loadingStyles);
    const response = await api.delete(`/items/${id}`);
    toast.dismiss();
    toast.success("Item deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete item");
    throw error;
  }
};

// Toggle item status
export const toggleItemStatus = async (id: number, isActive: boolean) => {
  try {
    toast.loading("Updating status...", loadingStyles);
    const response = await api.patch(`/items/${id}/status`, {
      isActive,
    });
    toast.dismiss();
    toast.success(
      `Item ${isActive ? "activated" : "deactivated"} successfully`,
      successStyles
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update item status");
    throw error;
  }
};

// Bulk update items
export const bulkUpdateItems = async (
  ids: number[],
  updates: Record<string, any>
) => {
  try {
    toast.loading("Updating items...", loadingStyles);
    const response = await api.patch("/items/bulk-update", {
      ids,
      updates,
    });
    toast.dismiss();
    toast.success(`${ids.length} items updated successfully`, successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to bulk update items");
    throw error;
  }
};

// Get item statistics
export const getItemStatistics = async () => {
  try {
    const response: ResponseInterface = await api.get(
      "/items/stats/statistics"
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch statistics");
    throw error;
  }
};

// Search items
export const searchItems = async (query: string, limit: number = 10) => {
  try {
    const response: ResponseInterface = await api.get(
      "/items/search/quick-search",
      {
        params: { q: query, limit },
      }
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to search items");
    throw error;
  }
};

export interface Taric {
  id: number;
  code: string;
  name_de: string | null;
  name_en: string | null;
  name_cn: string | null;
  description_de: string | null;
  description_en: string | null;
  reguler_artikel: string;
  duty_rate: number | null;
  item_count: number;
  parent_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface TaricDetails {
  id: number;
  code: string;
  name_de: string | null;
  name_en: string | null;
  name_cn: string | null;
  description_de: string | null;
  description_en: string | null;
  reguler_artikel: string;
  duty_rate: number | null;
  created_at: Date;
  updated_at: Date;
  items: Array<{
    id: number;
    item_name: string;
    item_name_cn: string | null;
    ean: bigint | null;
    parent: string | null;
    category: string | null;
  }>;
  parents: Array<{
    id: number;
    de_no: string;
    name_de: string;
    name_en: string | null;
  }>;
  statistics: {
    total_items: number;
    total_parents: number;
  };
}

export interface PaginatedTaricResponse {
  success: boolean;
  data: Taric[];
  pagination: {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface TaricStatistics {
  success: boolean;
  data: {
    totalTarics: number;
    taricsWithItems: number;
    taricsWithParents: number;
    taricsWithoutRelations: number;
    topTaricsByItems: Array<{
      id: number;
      code: string;
      name_de: string;
      item_count: number;
    }>;
    topTaricsByParents: Array<{
      id: number;
      code: string;
      name_de: string;
      parent_count: number;
    }>;
  };
}

// Get all tarics with pagination and filters
export const getAllTarics = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  code?: string;
  name?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}) => {
  try {
    const response = await api.get("/items/tarics/all", {
      params,
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch TARICs");
    throw error;
  }
};

// Get taric by ID
export const getTaricById = async (id: number) => {
  try {
    const response: ResponseInterface = await api.get(`/items/tarics/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch TARIC details");
    throw error;
  }
};

// Create new taric
export const createTaric = async (taricData: {
  code: string;
  name_de?: string;
  name_en?: string;
  name_cn?: string;
  description_de?: string;
  description_en?: string;
  reguler_artikel?: string;
  duty_rate?: number;
}) => {
  try {
    toast.loading("Creating TARIC...", loadingStyles);
    const response = await api.post("/items/tarics/create", taricData);
    toast.dismiss();
    toast.success("TARIC created successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create TARIC");
    throw error;
  }
};

// Update taric
export const updateTaric = async (
  id: number,
  taricData: Partial<{
    code: string;
    name_de: string;
    name_en: string;
    name_cn: string;
    description_de: string;
    description_en: string;
    reguler_artikel: string;
    duty_rate: number;
  }>
) => {
  try {
    toast.loading("Updating TARIC...", loadingStyles);
    const response = await api.put(`/items/tarics/edit/${id}`, taricData);
    toast.dismiss();
    toast.success("TARIC updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update TARIC");
    throw error;
  }
};

// Delete taric
export const deleteTaric = async (id: number) => {
  try {
    toast.loading("Deleting TARIC...", loadingStyles);
    const response = await api.delete(`/items/tarics/delete/${id}`);
    toast.dismiss();
    toast.success("TARIC deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete TARIC");
    throw error;
  }
};

// Search tarics by code or name
export const searchTarics = async (query: string, limit: number = 20) => {
  try {
    const response: ResponseInterface = await api.get(
      "/items/tarics/search/quick-search",
      {
        params: { q: query, limit },
      }
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to search TARICs");
    throw error;
  }
};

// Get taric statistics
export const getTaricStatistics = async () => {
  try {
    const response: ResponseInterface = await api.get(
      "/items/tarics/stats/statistics"
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch TARIC statistics");
    throw error;
  }
};

// Bulk create/update tarics
export const bulkUpsertTarics = async (
  tarics: Array<{
    code: string;
    name_de?: string;
    name_en?: string;
    name_cn?: string;
    description_de?: string;
    description_en?: string;
    reguler_artikel?: string;
    duty_rate?: number;
  }>
) => {
  try {
    toast.loading("Processing TARICs...", loadingStyles);
    const response = await api.post("/items/tarics/bulk-upsert", { tarics });
    toast.dismiss();
    toast.success("TARICs processed successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to process TARICs");
    throw error;
  }
};

// Get all tarics (simple list for dropdowns)
export const getAllTaricsSimple = async () => {
  try {
    const response = await api.get("/items/tarics", {
      params: {
        limit: 10000, // Get all tarics
        sortBy: "code",
        sortOrder: "ASC",
      },
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch TARICs list");
    throw error;
  }
};
// ============================================
// PARENT API FUNCTIONS
// ============================================

// Get all parents with pagination and filters
export const getParents = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
  supplierId?: string;
  taricId?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}) => {
  try {
    const response = await api.get("/items/parents/items", {
      params,
    });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch parents");
    throw error;
  }
};

// Get parent by ID
export const getParentById = async (id: number) => {
  try {
    const response = await api.get(`/items/parents/${id}`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch parent details");
    throw error;
  }
};

// Create new parent
export const createParent = async (parentData: {
  de_no: string;
  name_de: string;
  name_en?: string;
  name_cn?: string;
  taric_id?: number;
  supplier_id?: number;
  var_de_1?: string;
  var_de_2?: string;
  var_de_3?: string;
  var_en_1?: string;
  var_en_2?: string;
  var_en_3?: string;
}) => {
  try {
    toast.loading("Creating parent...", loadingStyles);
    const response = await api.post("/items/parents", parentData);
    toast.dismiss();
    toast.success("Parent created successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create parent");
    throw error;
  }
};

// Update parent
export const updateParent = async (
  id: number,
  parentData: Partial<{
    de_no: string;
    name_de: string;
    name_en: string;
    name_cn: string;
    taric_id: number;
    supplier_id: number;
    var_de_1: string;
    var_de_2: string;
    var_de_3: string;
    var_en_1: string;
    var_en_2: string;
    var_en_3: string;
    is_NwV: string;
    is_var_unilingual: string;
    is_active: string;
    parent_rank: number;
  }>
) => {
  try {
    toast.loading("Updating parent...", loadingStyles);
    const response = await api.put(`/items/parents/${id}`, parentData);
    toast.dismiss();
    toast.success("Parent updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update parent");
    throw error;
  }
};

// Delete parent
export const deleteParent = async (id: number) => {
  try {
    toast.loading("Deleting parent...", loadingStyles);
    const response = await api.delete(`/items/parents/${id}`);
    toast.dismiss();
    toast.success("Parent deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete parent");
    throw error;
  }
};

// Search parents
export const searchParents = async (query: string, limit: number = 10) => {
  try {
    const response: ResponseInterface = await api.get(
      "/items/parents/search/quick-search",
      {
        params: { q: query, limit },
      }
    );
    return response;
  } catch (error) {
    handleApiError(error, "Failed to search parents");
    throw error;
  }
};

export const getWarehouseItems = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  hasStock?: string;
  isStockItem?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}) => {
  try {
    const response = await api.get("/items/warehouse/items", { params });
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch warehouse items");
    throw error;
  }
};

// Update warehouse stock
export const updateWarehouseStock = async (
  id: number,
  stockData: {
    stock_qty?: number;
    msq?: number;
    buffer?: number;
    is_stock_item?: string;
  }
) => {
  try {
    toast.loading("Updating warehouse stock...", loadingStyles);
    const response = await api.patch(`/items/warehouse/${id}/stock`, stockData);
    toast.dismiss();
    toast.success("Warehouse stock updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update warehouse stock");
    throw error;
  }
};

// ============================================
// VARIATION API FUNCTIONS
// ============================================

// Get item variations
export const getItemVariations = async (itemId: number) => {
  try {
    const response = await api.get(`/items/${itemId}/variations`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch variations");
    throw error;
  }
};

// Update item variations
export const updateItemVariations = async (
  itemId: number,
  variations: Array<{
    value_de?: string;
    value_de_2?: string;
    value_de_3?: string;
    value_en?: string;
    value_en_2?: string;
    value_en_3?: string;
  }>
) => {
  try {
    toast.loading("Updating variations...", loadingStyles);
    const response = await api.put(`/items/${itemId}/variations`, variations);
    toast.dismiss();
    toast.success("Variations updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update variations");
    throw error;
  }
};

// ============================================
// QUALITY CRITERIA API FUNCTIONS
// ============================================

// Get item quality criteria
export const getItemQualityCriteria = async (itemId: number) => {
  try {
    const response = await api.get(`/items/${itemId}/quality`);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to fetch quality criteria");
    throw error;
  }
};

// Create quality criterion
export const createQualityCriterion = async (
  itemId: number,
  criterionData: {
    name: string;
    picture?: string;
    description?: string;
    description_cn?: string;
  }
) => {
  try {
    toast.loading("Creating quality criterion...", loadingStyles);
    const response = await api.post(`/items/${itemId}/quality`, criterionData);
    toast.dismiss();
    toast.success("Quality criterion created successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to create quality criterion");
    throw error;
  }
};

// Update quality criterion
export const updateQualityCriterion = async (
  id: number,
  criterionData: Partial<{
    name: string;
    picture: string;
    description: string;
    description_cn: string;
  }>
) => {
  try {
    toast.loading("Updating quality criterion...", loadingStyles);
    const response = await api.put(`/items/quality/${id}`, criterionData);
    toast.dismiss();
    toast.success("Quality criterion updated successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to update quality criterion");
    throw error;
  }
};

// Delete quality criterion
export const deleteQualityCriterion = async (id: number) => {
  try {
    toast.loading("Deleting quality criterion...", loadingStyles);
    const response = await api.delete(`/items/quality/${id}`);
    toast.dismiss();
    toast.success("Quality criterion deleted successfully", successStyles);
    return response;
  } catch (error) {
    handleApiError(error, "Failed to delete quality criterion");
    throw error;
  }
};

export const downloadOrderPdf = async (id: string) => {
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
