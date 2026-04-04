"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  CubeIcon,
  ArchiveBoxIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  EyeIcon as EyeIconOutline,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/UI/CustomButton";
import PageHeader from "@/components/UI/PageHeader";
import {
  EditIcon,
  EyeIcon,
  Plus,
  Package,
  LinkIcon,
  Hash,
  CloudDownloadIcon,
} from "lucide-react";
import { Delete, Sync } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import ReactSelect from "react-select";

import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleItemStatus,
  bulkUpdateItems,
  getItemStatistics,
  searchItems,
  getParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  searchParents,
  getWarehouseItems,
  updateWarehouseStock,
  getItemVariations,
  updateItemVariations,
  getItemQualityCriteria,
  createQualityCriterion,
  updateQualityCriterion,
  deleteQualityCriterion,
  getAllTarics,
  getTaricById,
  createTaric,
  updateTaric,
  deleteTaric,
  searchTarics,
  getTaricStatistics,
  bulkUpsertTarics,
  exportItemsToCSV,
  getPendingSyncCount,
  resetUpdatedFlags,
  Item,
  Parent,
  WarehouseItem,
  VariationValue,
  QualityCriterion,
  Taric,
  PaginatedResponse,
  StatisticsResponse,
} from "@/api/items";
import { getAllSuppliers, Supplier } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { loadingStyles, successStyles, errorStyles } from "@/utils/constants";

type TabType = "items" | "parents" | "warehouse" | "tarics" | "suppliers";

interface FilterState {
  search: string;
  eanSearch: string;
  status: string;
  category: string;
  supplier: string;
  isActive: string;
}

interface TaricFilterState {
  search: string;
}

interface PaginationState {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

const ItemsManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [items, setItems] = useState<Item[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [tarics, setTarics] = useState<Taric[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 30,
    totalRecords: 0,
    totalPages: 1,
  });
  const [showFilters, setShowFilters] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedTarics, setSelectedTarics] = useState<Set<string>>(new Set());
  const [statistics, setStatistics] = useState({
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
    itemsWithStock: 0,
    itemsNeedingSync: 0,
    itemsByCategory: [],
  });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    eanSearch: "",
    status: "",
    category: "",
    supplier: "",
    isActive: "",
  });
  const [taricFilters, setTaricFilters] = useState<TaricFilterState>({
    search: "",
  });

  const [showTaricModal, setShowTaricModal] = useState(false);
  const [taricModalMode, setTaricModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingTaricId, setEditingTaricId] = useState<number | null>(null);
  const [taricFormData, setTaricFormData] = useState({
    code: "",
    name_de: "",
    name_en: "",
    name_cn: "",
    description_de: "",
    description_en: "",
    reguler_artikel: true,
    duty_rate: 0,
  });

  const [categories, setCategories] = useState<any[]>([]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    item_name: "",
    item_name_cn: "",
    ean: "",
    parent_id: 0,
    taric_id: 0,
    cat_id: 0,
    supplier_id: 0,
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
    remark: "",
    model: "",
    price: 0,
    currency: "CNY",
    isActive: true,
    is_qty_dividable: true,
    is_npr: false,
    is_eur_special: false,
    is_rmb_special: false,
    item_no_de: "",
    item_name_de: "",
  });

  const router = useRouter();

  // Fetch pending sync count
  const fetchPendingSyncCount = useCallback(async () => {
    try {
      const response: any = await getPendingSyncCount();
      setPendingSyncCount(response.data?.pendingCount || 0);
    } catch (error) {
      console.error("Error fetching pending sync count:", error);
    }
  }, []);

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "y":
        return "bg-green-100 text-green-700";
      case "inactive":
      case "n":
        return "bg-red-100 text-red-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const matchesEANSearch = (eanValue: any, searchTerm: any) => {
    if (!eanValue || !searchTerm) return false;

    try {
      // Handle scientific notation and ensure we have a clean string
      let eanStr = "";

      // If it's a number, format it properly without scientific notation
      if (typeof eanValue === "number") {
        eanStr = eanValue.toString();
        // Check if it's in scientific notation
        if (eanStr.includes("e")) {
          // Parse as integer to avoid scientific notation
          eanStr = Number(eanValue).toFixed(0);
        }
      } else {
        eanStr = eanValue.toString();
      }

      // Remove all non-digit characters
      const eanDigits = eanStr.replace(/\D/g, "");
      const searchDigits = searchTerm.toString().replace(/\D/g, "");

      if (!eanDigits || !searchDigits) return false;

      // Exact match (most common)
      if (eanDigits === searchDigits) return true;

      // Partial match
      if (eanDigits.includes(searchDigits)) return true;

      // Check if search digits are a suffix of the EAN (useful for scanning)
      if (searchDigits.length >= 4 && eanDigits.endsWith(searchDigits)) {
        return true;
      }

      // Check if EAN digits are a suffix of search (if user typed extra characters)
      if (eanDigits.length >= 4 && searchDigits.endsWith(eanDigits)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error matching EAN:", error);
      return false;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case "items":
          const itemsResponse: any = await getItems({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            isActive: filters.isActive,
            category: filters.category,
          });
          setItems(itemsResponse.data);
          setPagination(itemsResponse.pagination);
          break;

        case "parents":
          const parentsResponse: any = await getParents({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            isActive: filters.isActive,
          });
          setParents(parentsResponse.data);
          setPagination(parentsResponse.pagination);
          break;

        case "warehouse":
          const warehouseResponse: any = await getWarehouseItems({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
            hasStock: filters.status,
          });
          setWarehouseItems(warehouseResponse.data);
          setPagination(warehouseResponse.pagination);
          break;

        case "tarics":
          const taricsResponse: any = await getAllTarics({
            page: pagination.page,
            limit: pagination.limit,
            search: taricFilters.search,
          });
          setTarics(taricsResponse.data);
          setPagination(taricsResponse.pagination);
          break;

        case "suppliers":
          const suppliersResponse: any = await getAllSuppliers({
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search,
          });
          setSuppliers(suppliersResponse.data);
          if (suppliersResponse.pagination) {
            setPagination(suppliersResponse.pagination);
          }
          break;
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.page, pagination.limit, filters, taricFilters]);

  const fetchStatistics = useCallback(async () => {
    try {
      const statsResponse = await getItemStatistics();
      setStatistics(statsResponse.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (activeTab === "items") {
      fetchStatistics();
      fetchPendingSyncCount();
    }
  }, [fetchData, fetchStatistics, fetchPendingSyncCount, activeTab]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [parentsRes, taricsRes, catsRes, suppliersRes]: any =
          await Promise.all([
            getParents({ limit: 1000, isActive: "Y" }),
            getAllTarics({ limit: 1000 }),
            getCategories(),
            getAllSuppliers({ limit: 1000 }),
          ]);

        if (parentsRes?.data) setParents(parentsRes.data);
        if (taricsRes?.data) setTarics(taricsRes.data);
        if (catsRes?.data) setCategories(catsRes.data);
        if (suppliersRes?.data) setSuppliers(suppliersRes.data);

        if (
          (!parentsRes?.data || parentsRes.data.length === 0) &&
          activeTab === "items"
        ) {
          console.warn("No parents found in database.");
        }
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };

    fetchInitialData();
  }, [activeTab]);

  // Handle CSV Export
  const handleExportCSV = async () => {
    if (exporting) return;

    setExporting(true);
    try {
      await exportItemsToCSV(true);
      // Refresh pending sync count after export
      await fetchPendingSyncCount();
      // Refresh statistics to update itemsNeedingSync count
      await fetchStatistics();
      // Refresh items list to show updated is_updated flags
      await fetchData();
    } catch (error: any) {
      console.error("Export failed:", error);
      // Error toast is already handled in the API function
    } finally {
      setExporting(false);
    }
  };

  // Handle reset sync flags (for admin purposes)
  const handleResetSyncFlags = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all sync flags? This will mark all items as synced, even if they haven't been exported to WaWi.",
      )
    ) {
      return;
    }

    try {
      await resetUpdatedFlags();
      toast.success("Sync flags reset successfully", successStyles);
      await fetchPendingSyncCount();
      await fetchStatistics();
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset sync flags", errorStyles);
    }
  };

  const handleViewItem = (itemId: number) => {
    router.push(`/items/${itemId}`);
  };

  const handleEditItem = (itemId: number) => {
    router.push(`/items/${itemId}`);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteItem(itemId);
      fetchData();
      fetchPendingSyncCount();
    } catch (error) {}
  };

  const handleDeleteParent = async (parentId: number) => {
    if (
      !confirm("Are you sure you want to delete this parent and all its items?")
    )
      return;

    try {
      await deleteParent(parentId);
      fetchData();
    } catch (error) {}
  };

  const handleToggleStatus = async (itemId: number, currentStatus: string) => {
    const isActive = currentStatus === "Y";
    try {
      await toggleItemStatus(itemId, !isActive);
      toast.success(
        `Item ${!isActive ? "activated" : "deactivated"} successfully`,
        successStyles,
      );
      fetchData();
      fetchPendingSyncCount();
    } catch (error) {}
  };

  const handleOpenCreateItemModal = () => {
    setItemFormData({
      item_name: "",
      item_name_cn: "",
      ean: "",
      parent_id: 0,
      taric_id: 0,
      cat_id: 0,
      supplier_id: 0,
      weight: 0,
      length: 0,
      width: 0,
      height: 0,
      remark: "",
      model: "",
      price: 0,
      currency: "CNY",
      isActive: true,
      is_qty_dividable: true,
      is_npr: false,
      is_eur_special: false,
      is_rmb_special: false,
      item_no_de: "",
      item_name_de: "",
    });
    setShowItemModal(true);
  };

  const handleCreateItemSubmit = async () => {
    if (!itemFormData.item_name?.trim()) {
      toast.error("Item name is required");
      return;
    }

    if (!itemFormData.parent_id) {
      toast.error("Parent is required");
      return;
    }

    if (!itemFormData.supplier_id) {
      toast.error("Supplier is required");
      return;
    }
    try {
      setLoading(true);
      await createItem({
        item_name: itemFormData.item_name,
        item_name_cn: itemFormData.item_name_cn,
        ean: itemFormData.ean,
        parent_id: itemFormData.parent_id,
        taric_id: itemFormData.taric_id || undefined,
        cat_id: itemFormData.cat_id || undefined,
        supplier_id: itemFormData.supplier_id || undefined,
        weight: itemFormData.weight || undefined,
        length: itemFormData.length || undefined,
        width: itemFormData.width || undefined,
        height: itemFormData.height || undefined,
        remark: itemFormData.remark,
        model: itemFormData.model,
        price: Number(itemFormData.price) || 0,
        currency: itemFormData.currency || "CNY",
        isActive: itemFormData.isActive ? "Y" : "N",
        item_no_de: itemFormData.item_no_de || undefined,
        item_name_de: itemFormData.item_name_de || undefined,
        is_eur_special: itemFormData.is_eur_special ? "Y" : "N",
        is_rmb_special: itemFormData.is_rmb_special ? "Y" : "N",
      });

      setShowItemModal(false);
      fetchData();
      fetchPendingSyncCount();
    } catch (error: any) {
      toast.error(error.message || "Failed to create item", errorStyles);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = () => {
    router.push("/parents/new");
  };
  console.log(parents);

  const handleCreateTaric = () => {
    setTaricModalMode("create");
    setTaricFormData({
      code: "",
      name_de: "",
      name_en: "",
      name_cn: "",
      description_de: "",
      description_en: "",
      reguler_artikel: true,
      duty_rate: 0,
    });
    setShowTaricModal(true);
  };

  const handleEditTaric = async (taric: Taric) => {
    try {
      setLoading(true);
      const response: any = await getTaricById(taric.id);
      setTaricFormData({
        code: response.data.code || "",
        name_de: response.data.name_de || "",
        name_en: response.data.name_en || "",
        name_cn: response.data.name_cn || "",
        description_de: response.data.description_de || "",
        description_en: response.data.description_en || "",
        reguler_artikel: response.data.reguler_artikel === "Y",
        duty_rate: response.data.duty_rate || 0,
      });
      setTaricModalMode("edit");
      setEditingTaricId(taric.id);
      setShowTaricModal(true);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleViewTaric = (taricId: number) => {
    router.push(`/tarics/${taricId}`);
  };

  const handleDeleteTaric = async (taricId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this TARIC? This action cannot be undone.",
      )
    )
      return;

    try {
      await deleteTaric(taricId);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete TARIC", errorStyles);
    }
  };

  const handleSubmitTaric = async () => {
    if (!taricFormData.code) {
      toast.error("TARIC code is required", errorStyles);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...taricFormData,
        reguler_artikel: taricFormData.reguler_artikel ? "Y" : "N",
      };
      if (taricModalMode === "create") {
        await createTaric(payload);
      } else if (taricModalMode === "edit" && editingTaricId) {
        await updateTaric(editingTaricId, payload);
      }
      setShowTaricModal(false);
      fetchData();
    } catch (error: any) {
      console.error("Taric submit error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to save TARIC";
      toast.error(message, errorStyles);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeleteTarics = async () => {
    if (selectedTarics.size === 0) {
      toast.error("No TARICs selected", errorStyles);
      return;
    }

    if (
      !confirm(`Are you sure you want to delete ${selectedTarics.size} TARICs?`)
    ) {
      return;
    }

    try {
      const ids = Array.from(selectedTarics).map((id) => parseInt(id));
      for (const id of ids) {
        await deleteTaric(id);
      }
      setSelectedTarics(new Set());
      fetchData();
    } catch (error) {}
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) {
      toast.error("No items selected", errorStyles);
      return;
    }

    if (
      !confirm(`Are you sure you want to delete ${selectedItems.size} items?`)
    ) {
      return;
    }

    try {
      const ids = Array.from(selectedItems).map((id) => parseInt(id));
      await bulkUpdateItems(ids, { isActive: "N" });
      toast.success(
        `${selectedItems.size} items deactivated successfully`,
        successStyles,
      );
      setSelectedItems(new Set());
      fetchData();
      fetchPendingSyncCount();
    } catch (error) {
      toast.error("Failed to delete items", errorStyles);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedItems.size === 0) {
      toast.error("No items selected", errorStyles);
      return;
    }

    try {
      const ids = Array.from(selectedItems).map((id) => parseInt(id));
      await bulkUpdateItems(ids, { isActive: "Y" });
      toast.success(
        `${selectedItems.size} items activated successfully`,
        successStyles,
      );
      setSelectedItems(new Set());
      fetchData();
      fetchPendingSyncCount();
    } catch (error) {
      toast.error("Failed to activate items", errorStyles);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedItems.size === 0) {
      toast.error("No items selected", errorStyles);
      return;
    }

    try {
      const ids = Array.from(selectedItems).map((id) => parseInt(id));
      await bulkUpdateItems(ids, { isActive: "N" });
      toast.success(
        `${selectedItems.size} items deactivated successfully`,
        successStyles,
      );
      setSelectedItems(new Set());
      fetchData();
      fetchPendingSyncCount();
    } catch (error) {
      toast.error("Failed to deactivate items", errorStyles);
    }
  };

  const handleSelectAll = () => {
    const currentData = getCurrentData();
    const currentSelection =
      activeTab === "tarics" ? selectedTarics : selectedItems;

    if (currentSelection.size === currentData.length) {
      if (activeTab === "tarics") {
        setSelectedTarics(new Set());
      } else {
        setSelectedItems(new Set());
      }
    } else {
      const newSelection = new Set(
        currentData.map((item: any) => item.id.toString()),
      );
      if (activeTab === "tarics") {
        setSelectedTarics(newSelection);
      } else {
        setSelectedItems(newSelection);
      }
    }
  };

  const handleSelectItem = (id: string) => {
    if (activeTab === "tarics") {
      const newSelection = new Set(selectedTarics);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      setSelectedTarics(newSelection);
    } else {
      const newSelection = new Set(selectedItems);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      setSelectedItems(newSelection);
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case "items":
        return items;
      case "parents":
        return parents;
      case "warehouse":
        return warehouseItems;
      case "tarics":
        return tarics;
      case "suppliers":
        return suppliers;
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();

    return data.filter((item) => {
      const it = item as any;

      if (activeTab === "items" && filters.eanSearch) {
        const eanMatches = matchesEANSearch(it.ean, filters.eanSearch);
        if (!eanMatches) return false;
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesGlobal =
          it.id?.toString().includes(searchLower) ||
          it.name?.toLowerCase().includes(searchLower) ||
          it.de_no?.toLowerCase().includes(searchLower) ||
          it.item_name?.toLowerCase().includes(searchLower) ||
          it.item_no_de?.toLowerCase().includes(searchLower) ||
          it.name_en?.toLowerCase().includes(searchLower) ||
          matchesEANSearch(it.ean, filters.search);

        if (!matchesGlobal) return false;
      }
      if (filters.isActive && it.is_active?.trim() !== filters.isActive.trim())
        return false;
      if (
        filters.category &&
        it.category?.toString().trim().toLowerCase() !==
          filters.category.trim().toLowerCase()
      )
        return false;

      return true;
    });
  };
  const filteredData = getFilteredData();

  const renderTableHeaders = () => {
    switch (activeTab) {
      case "items":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs text-nowrap font-semibold text-gray-600 uppercase tracking-wider">
              DE Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              EAN
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              English Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Sync Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </>
        );

      case "parents":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              DE Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              German Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              English Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Item Count
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </>
        );

      case "warehouse":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Item No
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              German Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Stock Qty
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              MSQ
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Buffer
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Stock Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </>
        );

      case "tarics":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              TARIC Code
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              German Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              English Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Chinese Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Duty Rate
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Item Count
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </>
        );

      case "suppliers":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </>
        );

      default:
        return null;
    }
  };

  const renderTableRows = () => {
    const data = filteredData;

    switch (activeTab) {
      case "items":
        return data.map((item: any) => {
          // Highlight EAN if it matches search
          const eanMatches =
            filters.search && matchesEANSearch(item.ean, filters.search);

          return (
            <tr
              key={item.id}
              onClick={() => {
                router.push(`/items/${item.id}`);
              }}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="p-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id.toString())}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectItem(item.id.toString());
                  }}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">
                  {item.de_no || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div
                  className={`text-sm font-medium ${eanMatches ? "text-green-600 font-bold" : "text-gray-900"}`}
                >
                  {item.ean?.toString() || "-"}
                  {eanMatches && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Match
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-900">
                  {item.item_name || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-900">
                  {item.name_en || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-900">
                  {item.category || "-"}
                </div>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    item.is_active,
                  )}`}
                >
                  {item.is_active === "Y" ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.is_updated
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.is_updated ? "Pending Sync" : "Synced"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm text-gray-600 text-nowrap">
                  {formatDate(item.created_at)}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewItem(item.id);
                    }}
                    className="text-blue-600 hover:text-blue-900 p-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditItem(item.id);
                    }}
                    className="text-green-600 hover:text-green-900 p-1"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item.id);
                    }}
                    className="text-red-600 hover:text-red-900 p-1"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        });

      case "parents":
        return data.map((parent: any) => (
          <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedItems.has(parent.id.toString())}
                onChange={() => handleSelectItem(parent.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {parent.de_no || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {parent.name_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {parent.name_en || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {parent.item_count || 0}
              </div>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                  parent.is_active,
                )}`}
              >
                {parent.is_active === "Y" ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-600">
                {formatDate(parent.created_at)}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/parents/${parent.id}`);
                  }}
                  className="text-blue-600 hover:text-blue-900 p-1"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/parents/${parent.id}/edit`);
                  }}
                  className="text-green-600 hover:text-green-900 p-1"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteParent(parent.id);
                  }}
                  className="text-red-600 hover:text-red-900 p-1"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ));

      case "warehouse":
        return data.map((warehouse: any) => (
          <tr key={warehouse.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedItems.has(warehouse.id.toString())}
                onChange={() => handleSelectItem(warehouse.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {warehouse.item_no_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {warehouse.item_name_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{warehouse.stock_qty}</div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{warehouse.msq}</div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{warehouse.buffer}</div>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                  warehouse.is_stock_item,
                )}`}
              >
                {warehouse.is_stock_item === "Y" ? "Yes" : "No"}
              </span>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                  warehouse.is_active,
                )}`}
              >
                {warehouse.is_active === "Y" ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateWarehouseStock(warehouse.id, {
                      stock_qty: warehouse.stock_qty + 1,
                    });
                  }}
                  className="text-green-600 hover:text-green-900"
                >
                  + Stock
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateWarehouseStock(warehouse.id, {
                      is_stock_item:
                        warehouse.is_stock_item === "Y" ? "N" : "Y",
                    });
                  }}
                  className="text-blue-600 hover:text-blue-900"
                >
                  {warehouse.is_stock_item === "Y"
                    ? "Remove Stock"
                    : "Add Stock"}
                </button>
              </div>
            </td>
          </tr>
        ));

      case "suppliers":
        return data.map((supplier: any) => (
          <tr
            key={supplier.id}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => router.push("/suppliers")}
          >
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedItems.has(supplier.id.toString())}
                onChange={() => handleSelectItem(supplier.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3 font-medium">{supplier.name}</td>
            <td className="px-4 py-3">{supplier.company_name}</td>
            <td className="px-4 py-3">{supplier.contact_person}</td>
            <td className="px-4 py-3">{supplier.email}</td>
            <td className="px-4 py-3 text-right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/suppliers");
                }}
                className="text-primary hover:underline hover:text-primary/80"
              >
                Manage
              </button>
            </td>
          </tr>
        ));

      case "tarics":
        return data.map((taric: any) => (
          <tr key={taric.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedTarics.has(taric.id.toString())}
                onChange={() => handleSelectItem(taric.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {taric.code || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {taric.name_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {taric.name_en || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {taric.name_cn || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {taric.duty_rate ? `${taric.duty_rate}%` : "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {taric.item_count || 0}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-600">
                {formatDate(taric.created_at)}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewTaric(taric.id);
                  }}
                  className="text-blue-600 hover:text-blue-900 p-1"
                  title="View Details"
                >
                  <EyeIconOutline className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTaric(taric);
                  }}
                  className="text-green-600 hover:text-green-900 p-1"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTaric(taric.id);
                  }}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ));

      default:
        return null;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination({ ...pagination, page: newPage });
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      category: "",
      eanSearch: "",
      supplier: "",
      isActive: "",
    });
  };

  const resetTaricFilters = () => {
    setTaricFilters({
      search: "",
    });
  };

  const getSelectedCount = () => {
    return activeTab === "tarics" ? selectedTarics.size : selectedItems.size;
  };

  useEffect(() => {
    if (activeTab === "items" && filters.search) {
      const itemsWithEAN = items
        .filter((item) => item.ean)
        .map((item) => ({
          id: item.id,
          ean: item.ean,
          name: item.item_name,
        }));
      console.log("Items with EAN:", itemsWithEAN);
      console.log("Filtered data:", filteredData);
    }
  }, [items, filters.search, filteredData, activeTab]);

  return (
    <div className="w-full mx-auto">
      <div
        className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <PageHeader title="Items Management" icon={Package} />
            {activeTab === "items" && pendingSyncCount > 0 && (
              <div className="mt-2 text-sm text-yellow-600 flex items-center gap-2">
                <Sync className="w-4 h-4" />
                <span>{pendingSyncCount} item(s) pending sync to WaWi</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            {activeTab === "items" && (
              <>
                <button
                  onClick={handleExportCSV}
                  disabled={exporting || pendingSyncCount === 0}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    exporting || pendingSyncCount === 0
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {exporting ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <CloudDownloadIcon className="w-5 h-5" />
                      Sync to WaWi ({pendingSyncCount})
                    </>
                  )}
                </button>

                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={handleResetSyncFlags}
                    className="px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all flex items-center gap-2"
                    title="Admin: Reset all sync flags"
                  >
                    <ArrowPathIcon className="w-5 h-5" />
                    Reset Sync Flags
                  </button>
                )}
              </>
            )}

            {getSelectedCount() > 0 && (
              <>
                {activeTab === "tarics" ? (
                  <button
                    onClick={handleBulkDeleteTarics}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-2"
                  >
                    Delete Selected ({selectedTarics.size})
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleBulkActivate}
                      className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                    >
                      Activate Selected
                    </button>
                    <button
                      onClick={handleBulkDeactivate}
                      className="px-4 py-2.5 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-all flex items-center gap-2"
                    >
                      Deactivate Selected
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      Delete Selected
                    </button>
                  </>
                )}
              </>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-[#8CC21B] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <FunnelIcon className="w-5 h-5" />
              Filters
            </button>

            <button
              onClick={() => fetchData()}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Refresh
            </button>

            {activeTab === "items" && (
              <button
                onClick={handleOpenCreateItemModal}
                className="px-4 py-2.5 bg-[#8CC21B] text-white rounded-lg font-medium hover:bg-[#8CC21B] transition-all flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                New Item
              </button>
            )}
            {activeTab === "tarics" && (
              <button
                onClick={handleCreateTaric}
                className="px-4 py-2.5 bg-[#8CC21B] text-white rounded-lg font-medium hover:bg-[#8CC21B] transition-all flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                New TARIC
              </button>
            )}
            {activeTab === "suppliers" && (
              <button
                onClick={() => router.push("/suppliers")}
                className="px-4 py-2.5 bg-[#8CC21B] text-white rounded-lg font-medium hover:bg-[#7ab318] transition-all flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Manage Suppliers
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: "items", label: "Items", icon: CubeIcon },
                { key: "parents", label: "Parents", icon: BuildingOfficeIcon },
                { key: "warehouse", label: "Warehouse", icon: ArchiveBoxIcon },
                { key: "tarics", label: "TARICs", icon: DocumentTextIcon },
                { key: "suppliers", label: "Suppliers", icon: TruckIcon },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                  {tab.key === "items" && pendingSyncCount > 0 && (
                    <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                      {pendingSyncCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            {activeTab === "items" && (
              <div className="relative mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-green-600" /> EAN Search
                </label>
                <input
                  type="text"
                  placeholder="Scan or type EAN..."
                  value={filters.eanSearch}
                  onChange={(e) =>
                    setFilters({ ...filters, eanSearch: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-green-200 rounded-md focus:border-green-500 outline-none text-sm transition-all bg-white"
                />
                {filters.eanSearch && (
                  <button
                    onClick={() => setFilters({ ...filters, eanSearch: "" })}
                    className="absolute right-2 top-7 text-gray-400 hover:text-red-500"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {activeTab === "tarics" ? (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search code or name..."
                      value={taricFilters.search}
                      onChange={(e) =>
                        setTaricFilters({
                          ...taricFilters,
                          search: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={resetTaricFilters}
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Reset Filters
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.isActive}
                      onChange={(e) =>
                        setFilters({ ...filters, isActive: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Status</option>
                      <option value="Y">Active</option>
                      <option value="N">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFilters({ ...filters, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">All Categories</option>
                      {Array.from(
                        new Set(
                          categories.map((c) => c.name?.toString().trim()),
                        ),
                      )
                        .filter(Boolean)
                        .sort()
                        .map((name) => {
                          return (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button
                      onClick={resetFilters}
                      className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Reset Filters
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab !== "tarics" && (
          <div className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}... (EAN, name, DE number, etc.)`}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all text-gray-700 placeholder-gray-400"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters({ ...filters, search: "" })}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            {filters.search && (
              <p className="text-xs text-gray-500 mt-1 ml-2">
                Searching for: "{filters.search}"
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-20 flex justify-center items-center">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary" />
                <p className="mt-4 text-gray-600">Loading {activeTab}...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4">
                        <input
                          type="checkbox"
                          checked={
                            (activeTab === "tarics"
                              ? selectedTarics.size === filteredData.length
                              : selectedItems.size === filteredData.length) &&
                            filteredData.length > 0
                          }
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                      </th>
                      {renderTableHeaders()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          No {activeTab} found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      renderTableRows()
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Showing{" "}
                    {Math.min(
                      (pagination.page - 1) * pagination.limit + 1,
                      pagination.totalRecords,
                    )}{" "}
                    to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.totalRecords,
                    )}{" "}
                    of {pagination.totalRecords} {activeTab}
                  </p>
                  {getSelectedCount() > 0 && (
                    <span className="text-sm font-medium text-primary">
                      {getSelectedCount()} selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TARIC Modal */}
      {showTaricModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {taricModalMode === "edit"
                    ? "Edit TARIC"
                    : "Create New TARIC"}
                </h2>
                <button
                  onClick={() => setShowTaricModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    TARIC Code *
                  </label>
                  <input
                    type="text"
                    value={taricFormData.code}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        code: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter TARIC code"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    German Name
                  </label>
                  <input
                    type="text"
                    value={taricFormData.name_de}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        name_de: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter German name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    English Name
                  </label>
                  <input
                    type="text"
                    value={taricFormData.name_en}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        name_en: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter English name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Chinese Name
                  </label>
                  <input
                    type="text"
                    value={taricFormData.name_cn}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        name_cn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter Chinese name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Duty Rate (%)
                  </label>
                  <input
                    type="number"
                    value={taricFormData.duty_rate}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        duty_rate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter duty rate"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Regular Artikel
                  </label>
                  <select
                    value={taricFormData.reguler_artikel ? "Y" : "N"}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        reguler_artikel: e.target.value === "Y",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                  >
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    German Description
                  </label>
                  <textarea
                    value={taricFormData.description_de}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        description_de: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter German description"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    English Description
                  </label>
                  <textarea
                    value={taricFormData.description_en}
                    onChange={(e) =>
                      setTaricFormData({
                        ...taricFormData,
                        description_en: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 backdrop-blur-sm rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all"
                    placeholder="Enter English description"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowTaricModal(false)}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/80 rounded-lg hover:bg-white/60 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitTaric}
                    disabled={!taricFormData.code}
                    className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#8CC21B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {taricModalMode === "edit" ? "Update" : "Create"} TARIC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Create New Item
                </h2>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={itemFormData.item_name}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter item name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chinese Name
                  </label>
                  <input
                    type="text"
                    value={itemFormData.item_name_cn}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_name_cn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter Chinese name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EAN
                  </label>
                  <input
                    type="text"
                    value={itemFormData.ean}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        ean: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter EAN"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DE Number
                  </label>
                  <input
                    type="text"
                    value={itemFormData.item_no_de}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_no_de: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter DE number (e.g. DE1024)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DE Item Name
                  </label>
                  <input
                    type="text"
                    value={itemFormData.item_name_de}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_name_de: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter DE item name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent *
                  </label>
                  <ReactSelect
                    options={
                      parents?.map((parent) => ({
                        value: parent.id,
                        label: `${parent.name_de} (${parent.de_no})`,
                      })) || []
                    }
                    value={
                      itemFormData.parent_id
                        ? {
                            value: itemFormData.parent_id,
                            label: (() => {
                              const p = parents?.find(
                                (x) => x.id === itemFormData.parent_id,
                              );
                              return p
                                ? `${p.name_de} (${p.de_no})`
                                : "Unknown";
                            })(),
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setItemFormData({
                        ...itemFormData,
                        parent_id: opt ? opt.value : 0,
                      })
                    }
                    isClearable
                    isSearchable
                    placeholder="Select Parent..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TARIC
                  </label>
                  <ReactSelect
                    options={
                      tarics?.map((taric) => ({
                        value: taric.id,
                        label: `${taric.code} - ${taric.name_de}`,
                      })) || []
                    }
                    value={
                      itemFormData.taric_id
                        ? {
                            value: itemFormData.taric_id,
                            label: (() => {
                              const t = tarics?.find(
                                (x) => x.id === itemFormData.taric_id,
                              );
                              return t ? `${t.code} - ${t.name_de}` : "Unknown";
                            })(),
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setItemFormData({
                        ...itemFormData,
                        taric_id: opt ? opt.value : 0,
                      })
                    }
                    isClearable
                    isSearchable
                    placeholder="Select a Taric..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <ReactSelect
                    options={
                      categories?.map((cat) => ({
                        value: cat.id,
                        label: cat.name,
                      })) || []
                    }
                    value={
                      itemFormData.cat_id
                        ? {
                            value: itemFormData.cat_id,
                            label:
                              categories?.find(
                                (x) => x.id === itemFormData.cat_id,
                              )?.name || "Unknown",
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setItemFormData({
                        ...itemFormData,
                        cat_id: opt ? opt.value : 0,
                      })
                    }
                    isClearable
                    isSearchable
                    placeholder="Select Category..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <ReactSelect
                    options={
                      suppliers?.map((s) => ({
                        value: s.id,
                        label: s.company_name || s.name || "Unnamed Supplier",
                      })) || []
                    }
                    value={
                      itemFormData.supplier_id
                        ? {
                            value: itemFormData.supplier_id,
                            label: (() => {
                              const s = suppliers?.find(
                                (x) => x.id === itemFormData.supplier_id,
                              );
                              return s
                                ? s.company_name || s.name || "Unnamed"
                                : "Unknown";
                            })(),
                          }
                        : null
                    }
                    onChange={(opt) =>
                      setItemFormData({
                        ...itemFormData,
                        supplier_id: opt ? opt.value : 0,
                      })
                    }
                    isClearable
                    isSearchable
                    placeholder="Select Supplier..."
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={itemFormData.weight}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        weight: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter weight"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    value={itemFormData.length}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        length: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter length"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Width (cm)
                  </label>
                  <input
                    type="number"
                    value={itemFormData.width}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter width"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={itemFormData.height}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter height"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    value={itemFormData.model}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        model: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter model"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    value={itemFormData.price}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        price:
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <ReactSelect
                    options={[
                      { value: "CNY", label: "CNY (¥)" },
                      { value: "EUR", label: "EUR (€)" },
                      { value: "USD", label: "USD ($)" },
                      { value: "GBP", label: "GBP (£)" },
                    ]}
                    value={{
                      value: itemFormData.currency,
                      label: (() => {
                        switch (itemFormData.currency) {
                          case "CNY":
                            return "CNY (¥)";
                          case "EUR":
                            return "EUR (€)";
                          case "USD":
                            return "USD ($)";
                          case "GBP":
                            return "GBP (£)";
                          default:
                            return itemFormData.currency;
                        }
                      })(),
                    }}
                    onChange={(opt) =>
                      setItemFormData({
                        ...itemFormData,
                        currency: opt ? opt.value : "CNY",
                      })
                    }
                    className="text-sm"
                    placeholder="Select Currency..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    value={itemFormData.remark}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        remark: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter remarks"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={itemFormData.isActive ? "Y" : "N"}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        isActive: e.target.value === "Y",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Y">Active</option>
                    <option value="N">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Dividable
                  </label>
                  <select
                    value={itemFormData.is_qty_dividable ? "Y" : "N"}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        is_qty_dividable: e.target.value === "Y",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                </div>

                <div className="flex items-center gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_eur_special"
                      checked={itemFormData.is_eur_special}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          is_eur_special: e.target.checked,
                          is_rmb_special: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor="is_eur_special"
                      className="text-sm font-medium text-gray-700"
                    >
                      Special Item
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-6 mt-6 border-t">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItemSubmit}
                  disabled={
                    !itemFormData.item_name?.trim() || !itemFormData.parent_id
                  }
                  className="flex-1 px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#8CC21B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsManagementPage;
