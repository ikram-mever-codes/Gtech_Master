"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  TruckIcon,
  EyeIcon as EyeIconOutline,
  PhotoIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import CustomButton from "@/components/UI/CustomButton";
import { EditIcon, EyeIcon, Package, Hash } from "lucide-react";
import { Delete, Sync } from "@mui/icons-material";
import { toast } from "react-hot-toast";
import ReactSelect from "react-select";

import {
  getItems,
  getItemById,
  createItem,
  deleteItem,
  toggleItemStatus,
  bulkUpdateItems,
  getItemStatistics,
  getParents,
  deleteParent,
  getWarehouseItems,
  updateWarehouseStock,
  getItemQualityCriteria,
  createQualityCriterion,
  updateQualityCriterion,
  deleteQualityCriterion,
  getAllTarics,
  getTaricById,
  createTaric,
  updateTaric,
  deleteTaric,
  updateItem,
  exportItemsToCSV,
  getPendingSyncCount,
  resetUpdatedFlags,
  getNewItemsCount,
  exportNewItemsToCSV,
  Item,
  Parent,
  WarehouseItem,
  Taric,
} from "@/api/items";
import { getAllSuppliers, Supplier } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { getAllCustomers } from "@/api/customers";
import { uploadFile, deleteFile } from "@/api/library";
import {
  successStyles,
  errorStyles,
  loadingStyles,
  BASE_URL,
} from "@/utils/constants";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import ItemCreateModal from "@/components/Item/ItemCreateModal";
import ParentModal from "@/components/Item/ParentModal";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { TagBadge, sortTags, type Tag } from "@/components/Tags/TagManager";
import ItemPreviewModal from "@/components/Item/ItemPreviewModal";

type TabType = "items" | "parents" | "warehouse" | "tarics" | "suppliers";

interface FilterState {
  search: string;
  eanSearch: string;
  status: string;
  category: string;
  supplier: string;
  isActive: string;
  tags?: string;
  company?: string;
  isLabel?: string;
}

const PAGE_LIMIT = 30;
const FETCH_ALL_LIMIT = 100000;

const getInputClass = (hasValue: boolean, isEmptySelect: boolean = false) => {
  return `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${hasValue
    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
    : isEmptySelect
      ? "text-gray-400 border-gray-300 bg-white"
      : "text-gray-900 border-gray-300 bg-white"
    }`;
};

const ItemsManagementPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auditFilter = searchParams.get("filter") || "";

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = searchParams.get("tab");
    if (
      t === "parents" ||
      t === "warehouse" ||
      t === "tarics" ||
      t === "suppliers"
    )
      return t;
    return "items";
  });
  const [tabData, setTabData] = useState<Record<TabType, any[]>>({
    items: [],
    parents: [],
    warehouse: [],
    tarics: [],
    suppliers: [],
  });
  const [loadedTabs, setLoadedTabs] = useState<Set<TabType>>(new Set());
  const [refParents, setRefParents] = useState<Parent[]>([]);
  const [refTarics, setRefTarics] = useState<Taric[]>([]);
  const [refSuppliers, setRefSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [refDataLoaded, setRefDataLoaded] = useState(false);
  const refDataLoadingRef = useRef(false);
  const [itemsFirstLoaded, setItemsFirstLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingNew, setExportingNew] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [newItemsCount, setNewItemsCount] = useState(0);

  const [showItemPreview, setShowItemPreview] = useState(false);
  const [previewRow, setPreviewRow] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewForm, setPreviewForm] = useState<any>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEdit, setPreviewEdit] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPictures, setUploadingPictures] = useState(false);
  const [page, setPage] = useState(() => {
    const p = parseInt(searchParams.get("page") || "1", 10);
    return isNaN(p) || p < 1 ? 1 : p;
  });
  const didMountRef = useRef(false);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedTarics, setSelectedTarics] = useState<Set<string>>(new Set());
  const [showParentModal, setShowParentModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  const [statistics, setStatistics] = useState<any>({
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
  });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    eanSearch: "",
    status: "",
    category: "PRO",
    supplier: "",
    isActive: "Y",
    tags: "",
    company: "",
    isLabel: "",
  });
  const [taricSearch, setTaricSearch] = useState("");
  const [itemsTotalRecords, setItemsTotalRecords] = useState(0);
  const [itemsTotalPages, setItemsTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedEanSearch, setDebouncedEanSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setDebouncedEanSearch(filters.eanSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search, filters.eanSearch]);

  const reqIdRef = useRef(0);
  const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

  const getSupplierLabel = (s: any) => {
    const name = s.name || "";
    const isEnglish = name && !hasChinese(name);
    return `[ID: ${s.id}]${isEnglish ? " " + name : ""}`;
  };

  const getCompany = (item: any) =>
    item?.customer_name ||
    item?.company_display_name ||
    item?.companyDisplayName ||
    item?.customer?.companyName ||
    item?.customer?.company_name ||
    item?.customer?.name ||
    item?.company_name ||
    item?.company ||
    "";

  const resolveUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.includes("cloudinary.com")) return url;
    if (url.includes("/uploads/")) {
      const fileName = url.split("/uploads/").pop();
      try {
        const apiOrigin = new URL(BASE_URL).origin;
        return `${apiOrigin}/uploads/${fileName}`;
      } catch {
        return url;
      }
    }
    return url;
  };

  const getThumb = (item: any) =>
    resolveUrl(
      item?.photo ||
        item?.pix_path_eBay ||
        item?.pictures?.shopPicture ||
        (item?.pix_path ? item.pix_path.split(",").filter(Boolean)[0] : null) ||
        null,
    );

  const formatDate = (d: string | Date | null | undefined) => {
    if (!d || d === "0000-00-00 00:00:00") return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "y":
        return "bg-green-100 text-green-700";
      case "inactive":
      case "n":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const matchesEANSearch = (eanValue: any, searchTerm: any) => {
    if (!eanValue || !searchTerm) return false;
    try {
      let eanStr =
        typeof eanValue === "number"
          ? eanValue.toString().includes("e")
            ? Number(eanValue).toFixed(0)
            : eanValue.toString()
          : eanValue.toString();
      const eanDigits = eanStr.replace(/\D/g, "");
      const searchDigits = searchTerm.toString().replace(/\D/g, "");
      if (!eanDigits || !searchDigits) return false;
      if (eanDigits.includes(searchDigits)) return true;
      if (searchDigits.length >= 4 && eanDigits.endsWith(searchDigits))
        return true;
      return false;
    } catch {
      return false;
    }
  };

  const matchesTags = (row: any, tagStr: string) => {
    const ids = tagStr
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const inc = ids.filter((x) => !x.startsWith("!"));
    const exc = ids.filter((x) => x.startsWith("!")).map((x) => x.slice(1));
    const rowTagIds = (row.tags || []).map((t: any) => String(t.id));
    if (inc.length && !inc.every((id) => rowTagIds.includes(String(id))))
      return false;
    if (exc.length && exc.some((id) => rowTagIds.includes(String(id))))
      return false;
    return true;
  };

  const calculateEAN13Checksum = (ean12: string) => {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(ean12[i], 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const r = sum % 10;
    return r === 0 ? 0 : 10 - r;
  };
  const generateEAN13 = () => {
    let ean12 = "";
    for (let i = 0; i < 12; i++) ean12 += Math.floor(Math.random() * 10);
    return `${ean12}${calculateEAN13Checksum(ean12)}`;
  };
  const refreshCountsRef = useRef<() => Promise<void>>(async () => {});

  // ---------------------------------------------------------------------------
  // Field mapping: normalize whatever shape getItemById / the row returns into
  // one consistent object the preview/edit modal can rely on. Falls back to the
  // already-loaded list row when a field is missing from the detail response.
  // ---------------------------------------------------------------------------
  const normalizeItem = (raw: any, fallbackRow: any) => {
    const r = raw || {};
    const fb = fallbackRow || {};
    const pick = (...vals: any[]) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && v !== "") return v;
      }
      return "";
    };
    return {
      id: r.id ?? fb.id,
      // Names
      item_name: pick(r.item_name, fb.item_name),
      item_name_cn: pick(r.item_name_cn, fb.item_name_cn),
      item_name_de: pick(
        r.item_name_de,
        r.name_de,
        fb.item_name_de,
        fb.name_de,
      ),
      name_de: pick(r.name_de, r.parent?.name_de, fb.name_de),
      name_en: pick(r.name_en, r.parent?.name_en, fb.name_en),
      name_cn: pick(r.name_cn, r.parent?.name_cn, fb.name_cn),
      // Identifiers
      de_no: pick(r.de_no, r.parent?.de_no, fb.de_no),
      ean: pick(r.ean, fb.ean),
      ItemID_DE: pick(r.ItemID_DE, fb.ItemID_DE),
      model: pick(r.model, fb.model),
      // Classification
      category: pick(r.category?.name, r.category, r.supp_cat, fb.category),
      cat_id: pick(r.cat_id, r.category_id, r.category?.id, fb.category_id),
      supplier_id: String(pick(r.supplier_id, fb.supplier_id) || ""),
      taric_id: String(pick(r.taric_id, fb.taric_id) || ""),
      parent_id: pick(r.parent_id, r.parent?.id, fb.parent_id),
      // Company / customer
      customer_id: String(
        pick(r.customer_id, r.customer?.id, fb.customer_id) || "",
      ),
      customer_name: getCompany(r) || getCompany(fb) || "",
      // Status / flags
      isActive: pick(r.isActive, r.is_active, fb.is_active, "Y"),
      isLabelPrint: r.isLabelPrint ?? fb.isLabelPrint ?? false,
      is_new: pick(r.is_new, fb.is_new, "N"),
      // Dimensions / pricing
      weight: r.weight ?? fb.weight ?? "",
      length: r.length ?? fb.length ?? "",
      width: r.width ?? fb.width ?? "",
      height: r.height ?? fb.height ?? "",
      price: r.price ?? fb.price ?? "",
      transfer_price_EUR: r.transfer_price_EUR ?? fb.transfer_price_EUR ?? "",
      // Misc
      remark: pick(r.remark, fb.remark),
      photo: r.photo ?? fb.photo ?? null,
      pix_path: r.pix_path ?? fb.pix_path ?? null,
      pix_path_eBay: r.pix_path_eBay ?? fb.pix_path_eBay ?? null,
      tags: r.tags ?? fb.tags ?? [],
      tagOrder: r.tagOrder ?? fb.tagOrder,
      created_at: r.created_at ?? fb.created_at,
      updated_at: r.updated_at ?? fb.updated_at,
    };
  };

  const fetchTab = useCallback(
    async (tab: TabType, force = false) => {
      if (!force && loadedTabs.has(tab)) {
        setLoading(false);
        return;
      }
      const reqId = ++reqIdRef.current;
      setLoading(true);
      try {
        let data: any[] = [];
        switch (tab) {
          case "items": {
            const res: any = await getItems(
              {
                page: page,
                limit: PAGE_LIMIT,
                search: debouncedSearch || undefined,
                eanSearch: debouncedEanSearch || undefined,
                isActive: filters.isActive || undefined,
                category: filters.category || undefined,
                supplier: filters.supplier || undefined,
                tags: filters.tags || undefined,
                isLabel: filters.isLabel || undefined,
                company: filters.company || undefined,
                filter: auditFilter || undefined,
              },
              { refresh: force },
            );
            data = res.data || [];
            setItemsFirstLoaded(true);
            if (res.pagination) {
              setItemsTotalRecords(res.pagination.totalRecords || 0);
              setItemsTotalPages(res.pagination.totalPages || 1);
            } else {
              setItemsTotalRecords(data.length);
              setItemsTotalPages(Math.ceil(data.length / PAGE_LIMIT));
            }
            refreshCountsRef.current();
            break;
          }
          case "parents": {
            const res: any = await getParents({
              page: 1,
              limit: FETCH_ALL_LIMIT,
            });
            data = res.data || [];
            break;
          }
          case "warehouse": {
            const res: any = await getWarehouseItems({
              page: 1,
              limit: FETCH_ALL_LIMIT,
              filter: auditFilter || undefined,
            });
            data = res.data || [];
            break;
          }
          case "tarics": {
            const res: any = await getAllTarics({
              page: 1,
              limit: FETCH_ALL_LIMIT,
            });
            data = res.data || [];
            break;
          }
          case "suppliers": {
            const res: any = await getAllSuppliers({
              page: 1,
              limit: FETCH_ALL_LIMIT,
            });
            data = res.data || [];
            break;
          }
        }
        if (reqId !== reqIdRef.current) return;
        setTabData((prev) => ({ ...prev, [tab]: data }));
        setLoadedTabs((prev) => new Set(prev).add(tab));
      } catch (err) {
        console.error(`Error loading ${tab}:`, err);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [
      auditFilter,
      loadedTabs,
      page,
      debouncedSearch,
      debouncedEanSearch,
      filters.isActive,
      filters.category,
      filters.supplier,
      filters.tags,
      filters.isLabel,
      filters.company,
    ],
  );

  useEffect(() => {
    if (activeTab === "items") {
      fetchTab("items", true);
    }
  }, [
    activeTab,
    page,
    debouncedSearch,
    debouncedEanSearch,
    filters.isActive,
    filters.category,
    filters.supplier,
    filters.tags,
    filters.isLabel,
    filters.company,
  ]);

  useEffect(() => {
    if (activeTab !== "items") {
      fetchTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoadedTabs((prev) => {
      const next = new Set(prev);
      next.delete("items");
      next.delete("warehouse");
      return next;
    });
    setTabData((prev) => ({ ...prev, items: [], warehouse: [] }));
    fetchTab(activeTab, true);
  }, [auditFilter]);

  // items have painted, or the first time a modal that needs it opens.
  const loadReferenceData = useCallback(async () => {
    if (refDataLoadingRef.current || refDataLoaded) return;
    refDataLoadingRef.current = true;
    try {
      const [parentsRes, taricsRes, catsRes, suppliersRes, customersRes]: any =
        await Promise.all([
          getParents({ limit: 1000, isActive: "Y" }),
          getAllTarics({ limit: 1000 }),
          getCategories(),
          getAllSuppliers({ limit: 1000 }),
          getAllCustomers({ limit: 1000 }),
        ]);
      if (parentsRes?.data) setRefParents(parentsRes.data);
      if (taricsRes?.data) setRefTarics(taricsRes.data);
      if (catsRes?.data)
        setCategories(
          catsRes.data.filter(
            (c: any) => !c.name?.toString().trim().startsWith("Imported"),
          ),
        );
      if (suppliersRes?.data) setRefSuppliers(suppliersRes.data);
      if (customersRes?.data)
        setAllCustomers(customersRes.data.customers || customersRes.data || []);
      setRefDataLoaded(true);
    } catch (e) {
      console.error("Failed to fetch reference data", e);
    } finally {
      refDataLoadingRef.current = false;
    }
  }, [refDataLoaded]);

  const refreshCounts = useCallback(async () => {
    try {
      const [statsRes, pendingRes, newCountRes] = await Promise.allSettled([
        getItemStatistics(),
        getPendingSyncCount(),
        getNewItemsCount(),
      ]);
      if (statsRes.status === "fulfilled") {
        const stats: any = statsRes.value;
        setStatistics(stats.data);
      }
      if (pendingRes.status === "fulfilled") {
        const pending: any = pendingRes.value;
        setPendingSyncCount(pending.data?.pendingCount || 0);
      }
      if (newCountRes.status === "fulfilled") {
        const newCount: any = newCountRes.value;
        setNewItemsCount(newCount.data?.count || 0);
      }
    } catch (e) {
      console.error("[refreshCounts] error:", e);
    }
  }, []);

  refreshCountsRef.current = refreshCounts;

  useEffect(() => {
    if (!itemsFirstLoaded) return;
    const t1 = setTimeout(() => loadReferenceData(), 300);
    const t2 = setTimeout(() => {
      if (activeTab === "items") refreshCounts();
    }, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFirstLoaded]);

  useEffect(() => {
    const supplierParam = searchParams.get("supplier");
    if (supplierParam) setFilters((p) => ({ ...p, supplier: supplierParam }));
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [filters, taricSearch, activeTab]);

  // Reset to page 1 when filters change — but not on first mount (preserve ?page=N)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    setPage(1);
  }, [filters, taricSearch, activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  }, [page, router]);

  const reloadItems = useCallback(async () => {
    await fetchTab("items", true);
    if (activeTab === "items") refreshCounts();
  }, [fetchTab, activeTab, refreshCounts]);

  const filteredAll = useMemo(() => {
    const data = tabData[activeTab] || [];

    if (activeTab === "items") {
      return data;
    }

    if (activeTab === "tarics") {
      const s = taricSearch.trim().toLowerCase();
      if (!s) return data;
      return data.filter((t: any) =>
        [t.code, t.name_de, t.name_en, t.name_cn].some((v) =>
          (v || "").toString().toLowerCase().includes(s),
        ),
      );
    }

    const s = filters.search.trim().toLowerCase();
    let res = data;
    if (s) {
      res = res.filter((row: any) => {
        const fields =
          activeTab === "parents"
            ? [row.de_no, row.name_de, row.name_en]
            : activeTab === "warehouse"
              ? [row.item_no_de, row.item_name_de]
              : [row.name, row.company_name, row.contact_person, row.email];
        return fields.some((v) =>
          (v || "").toString().toLowerCase().includes(s),
        );
      });
    }
    if (activeTab === "suppliers" && filters.tags)
      res = res.filter((r: any) => matchesTags(r, filters.tags!));
    return res;
  }, [tabData, activeTab, filters, taricSearch]);

  const totalRecords =
    activeTab === "items" ? itemsTotalRecords : filteredAll.length;
  const totalPages =
    activeTab === "items"
      ? itemsTotalPages
      : Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(
    () =>
      activeTab === "items"
        ? filteredAll
        : filteredAll.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT),
    [filteredAll, safePage, activeTab],
  );

  const [showItemModal, setShowItemModal] = useState(false);

  const openItemPreview = (row: any) => {
    setPreviewRow(row);
    setPreviewEdit(false); // always open in view mode
    setShowItemPreview(true);
    loadReferenceData(); // make sure dropdowns (customers/suppliers/tarics) are ready
  };

  const closePreview = () => {
    setShowItemPreview(false);
    setPreviewRow(null);
    setPreviewItem(null);
    setPreviewForm({});
    setPreviewEdit(false);
    setPreviewSaving(false);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  // Load full detail + map fields whenever the preview opens for a row.
  useEffect(() => {
    if (!showItemPreview || !previewRow?.id) return;
    let cancelled = false;
    setPreviewEdit(false);
    setPreviewLoading(true);
    setShowCustomerDropdown(false);
    (async () => {
      try {
        const res: any = await getItemById(previewRow.id);
        const raw = res?.data ?? res;
        if (cancelled) return;
        const normalized = normalizeItem(raw, previewRow);
        setPreviewItem(normalized);
        setPreviewForm(normalized);
        setCustomerSearch(normalized.customer_name || "");
      } catch (e) {
        // Fall back to the row we already have so the modal still shows values.
        if (cancelled) return;
        const normalized = normalizeItem(null, previewRow);
        setPreviewItem(normalized);
        setPreviewForm(normalized);
        setCustomerSearch(normalized.customer_name || "");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showItemPreview, previewRow?.id]);

  // Searchable customer options (deduped + filtered by the search box).
  const customerOptions = useMemo(() => {
    const seen = new Map<string, any>();
    allCustomers
      .filter((c) => c.companyName)
      .forEach((c) => {
        if (!seen.has(String(c.id))) seen.set(String(c.id), c);
      });
    let arr = Array.from(seen.values());
    const q = customerSearch.trim().toLowerCase();
    if (q)
      arr = arr.filter(
        (c) =>
          (c.companyName || "").toLowerCase().includes(q) ||
          String(c.id).includes(q),
      );
    return arr
      .sort((a, b) => (a.companyName || "").localeCompare(b.companyName || ""))
      .slice(0, 50);
  }, [allCustomers, customerSearch]);

  const setForm = (key: string, value: any) =>
    setPreviewForm((p: any) => ({ ...p, [key]: value }));

  const onCategoryChange = (name: string) => {
    const found = categories.find(
      (c) => (c.name || "").toString().trim() === name,
    );
    setPreviewForm((p: any) => ({
      ...p,
      category: name,
      cat_id: found?.id ?? p.cat_id,
    }));
  };

  const selectCustomer = (c: any) => {
    setPreviewForm((p: any) => ({
      ...p,
      customer_id: String(c.id),
      customer_name: c.companyName,
    }));
    setCustomerSearch(c.companyName);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setPreviewForm((p: any) => ({ ...p, customer_id: "", customer_name: "" }));
    setCustomerSearch("");
  };

  const savePreview = async () => {
    if (!previewForm?.id) return;
    setPreviewSaving(true);
    try {
      const payload: any = {
        item_name: previewForm.item_name,
        item_name_cn: previewForm.item_name_cn,
        model: previewForm.model,
        remark: previewForm.remark,
        ean: previewForm.ean,
        cat_id: previewForm.cat_id || null,
        supplier_id: previewForm.supplier_id || null,
        taric_id: previewForm.taric_id || null,
        customer_id: previewForm.customer_id || null,
        isActive: previewForm.isActive,
        isLabelPrint: previewForm.isLabelPrint ? 1 : 0,
        weight: previewForm.weight === "" ? null : previewForm.weight,
        length: previewForm.length === "" ? null : previewForm.length,
        width: previewForm.width === "" ? null : previewForm.width,
        height: previewForm.height === "" ? null : previewForm.height,
        price: previewForm.price === "" ? null : previewForm.price,
        transfer_price_EUR:
          previewForm.transfer_price_EUR === ""
            ? null
            : previewForm.transfer_price_EUR,
      };
      await updateItem(previewForm.id, payload);
      toast.success("Item updated successfully", successStyles);
      setPreviewEdit(false);
      closePreview();
      reloadItems();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || e?.message || "Failed to update item",
        errorStyles,
      );
    } finally {
      setPreviewSaving(false);
    }
  };

  const [showTaricModal, setShowTaricModal] = useState(false);
  const [taricMode, setTaricMode] = useState<"create" | "edit">("create");
  const [editingTaricId, setEditingTaricId] = useState<number | null>(null);
  const [taricForm, setTaricForm] = useState<any>({
    code: "",
    name_de: "",
    name_en: "",
    name_cn: "",
    description_de: "",
    description_en: "",
    reguler_artikel: true,
    duty_rate: 0,
  });

  const openCreateTaric = () => {
    setTaricMode("create");
    setTaricForm({
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

  const openEditTaric = async (taric: Taric) => {
    try {
      const res: any = await getTaricById(taric.id);
      setTaricForm({
        code: res.data.code || "",
        name_de: res.data.name_de || "",
        name_en: res.data.name_en || "",
        name_cn: res.data.name_cn || "",
        description_de: res.data.description_de || "",
        description_en: res.data.description_en || "",
        reguler_artikel: res.data.reguler_artikel === "Y",
        duty_rate: res.data.duty_rate || 0,
      });
      setTaricMode("edit");
      setEditingTaricId(taric.id);
      setShowTaricModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const submitTaric = async () => {
    if (!taricForm.code)
      return toast.error("TARIC code is required", errorStyles);
    try {
      const payload = {
        ...taricForm,
        reguler_artikel: taricForm.reguler_artikel ? "Y" : "N",
      };
      if (taricMode === "create") await createTaric(payload);
      else if (editingTaricId) await updateTaric(editingTaricId, payload);
      setShowTaricModal(false);
      fetchTab("tarics", true);
    } catch (e: any) {
      toast.error(
        e.response?.data?.message || e.message || "Failed to save TARIC",
        errorStyles,
      );
    }
  };

  const removeTaric = async (id: number) => {
    if (!confirm("Delete this TARIC? This cannot be undone.")) return;
    try {
      await deleteTaric(id);
      fetchTab("tarics", true);
    } catch (e) {
      toast.error("Failed to delete TARIC", errorStyles);
    }
  };

  const handleExportCSV = async (type: "updated" | "new" = "updated") => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportItemsToCSV(true, type);
      reloadItems();
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleExportNewCSV = async () => {
    if (exportingNew) return;
    setExportingNew(true);
    try {
      await exportNewItemsToCSV(true);
      reloadItems();
    } catch (e) {
      console.error("New items export failed:", e);
    } finally {
      setExportingNew(false);
    }
  };

  const handleResetSyncFlags = async () => {
    if (!confirm("Reset all sync flags? This marks all items as synced."))
      return;
    try {
      await resetUpdatedFlags();
      toast.success("Sync flags reset successfully", successStyles);
      reloadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to reset sync flags", errorStyles);
    }
  };

  const handleDeleteParent = async (id: number) => {
    if (!confirm("Delete this parent and all its items?")) return;
    try {
      await deleteParent(id);
      fetchTab("parents", true);
    } catch {}
  };

  const handleBulk = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedItems.size === 0)
      return toast.error("No items selected", errorStyles);
    if (action === "delete" && !confirm(`Delete ${selectedItems.size} items?`))
      return;
    const ids = Array.from(selectedItems).map((id) => parseInt(id));
    try {
      await bulkUpdateItems(ids, {
        isActive: action === "activate" ? "Y" : "N",
      });
      toast.success(
        `${ids.length} items ${action === "activate" ? "activated" : "deactivated"}`,
        successStyles,
      );
      setSelectedItems(new Set());
      reloadItems();
    } catch {
      toast.error(`Failed to ${action} items`, errorStyles);
    }
  };

  const handleBulkDeleteTarics = async () => {
    if (selectedTarics.size === 0)
      return toast.error("No TARICs selected", errorStyles);
    if (!confirm(`Delete ${selectedTarics.size} TARICs?`)) return;
    try {
      for (const id of Array.from(selectedTarics).map((x) => parseInt(x)))
        await deleteTaric(id);
      setSelectedTarics(new Set());
      fetchTab("tarics", true);
    } catch {}
  };

  const isTaricTab = activeTab === "tarics";
  const currentSelection = isTaricTab ? selectedTarics : selectedItems;
  const getSelectedCount = () => currentSelection.size;

  const toggleSelect = (id: string) => {
    const setter = isTaricTab ? setSelectedTarics : setSelectedItems;
    const sel = isTaricTab ? selectedTarics : selectedItems;
    const next = new Set(sel);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const handleSelectAll = () => {
    const ids = pageData.map((d: any) => d.id.toString());
    const setter = isTaricTab ? setSelectedTarics : setSelectedItems;
    const sel = isTaricTab ? selectedTarics : selectedItems;
    if (ids.every((id) => sel.has(id))) setter(new Set());
    else setter(new Set(ids));
  };

  const resetFilters = () =>
    setFilters({
      search: "",
      status: "",
      category: "PRO",
      eanSearch: "",
      supplier: "",
      isActive: "",
      tags: "",
      company: "",
      isLabel: "",
    });

  const renderTableHeaders = () => {
    switch (activeTab) {
      case "items":
        return (
          <>
            <th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[6%]">
              Pic
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[40%]">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[24%]">
              Name DE / CN
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[12%]">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[18%]">
              Remark
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
          </>
        );
      case "suppliers":
        return (
          <>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Tags
            </th>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    switch (activeTab) {
      case "items":
        return pageData.map((item: any) => {
          const isNew = item.is_new === "Y";
          const thumb = getThumb(item);
          return (
            <tr
              key={item.id}
              onClick={() => openItemPreview(item)}
              className={`cursor-pointer transition-colors ${
                isNew
                  ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-400"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="px-2 py-2">
                <div className="w-15 h-15 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt="thumb"
                      className="w-full h-full object-cover"
                      onError={(e) =>
                        ((e.target as HTMLImageElement).style.display = "none")
                      }
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900 break-words">
                  {item.item_name || "-"}
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-gray-700">
                    {item.de_no || "-"}
                  </span>
                  {(item.customer_name ||
                    item.company_name ||
                    item.company) && (
                    <>
                      <span>-</span>
                      <span className="text-blue-600 font-medium">
                        {item.customer_name ||
                          item.company_name ||
                          item.company}
                      </span>
                    </>
                  )}
                  {item.isLabelPrint && (
                    <>
                      <span>-</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 rounded uppercase tracking-wider">
                        Label
                      </span>
                    </>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                {(item.item_name_de || item.name_de) && (
                  <div className="text-xs text-gray-700 font-medium break-words">
                    {item.item_name_de || item.name_de}
                  </div>
                )}
                {item.item_name_cn && (
                  <div className="text-xs text-gray-500 mt-0.5 break-words">
                    {item.item_name_cn}
                  </div>
                )}
                {!item.item_name_de && !item.name_de && !item.item_name_cn && (
                  <span className="text-gray-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="text-xs text-gray-600">
                  {item.category || "—"}
                </div>
              </td>
              <td className="px-4 py-3">
                <div
                  className="text-xs text-gray-500 max-w-[250px] break-words"
                  title={item.remark || ""}
                >
                  {item.remark || "—"}
                </div>
              </td>
            </tr>
          );
        });

      case "parents":
        return pageData.map((parent: any) => (
          <tr
            key={parent.id}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => {
              setSelectedParentId(parent.id);
              setShowParentModal(true);
            }}
          >
            <td className="p-4" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedItems.has(parent.id.toString())}
                onChange={() => toggleSelect(parent.id.toString())}
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
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  parent.is_active === "Y"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {parent.is_active === "Y" ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-600">
                {formatDate(parent.created_at || parent.updated_at)}
              </div>
            </td>
          </tr>
        ));

      case "warehouse":
        return pageData.map((w: any) => (
          <tr key={w.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedItems.has(w.id.toString())}
                onChange={() => toggleSelect(w.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">
                {w.item_no_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">
                {w.item_name_de || "-"}
              </div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{w.stock_qty}</div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{w.msq}</div>
            </td>
            <td className="px-4 py-3">
              <div className="text-sm text-gray-900">{w.buffer}</div>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${w.is_stock_item === "Y" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                {w.is_stock_item === "Y" ? "Yes" : "No"}
              </span>
            </td>
            <td className="px-4 py-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${w.is_active === "Y" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                {w.is_active === "Y" ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    updateWarehouseStock(w.id, { stock_qty: w.stock_qty + 1 })
                  }
                  className="text-green-600 hover:text-green-900"
                >
                  + Stock
                </button>
                <button
                  onClick={() =>
                    updateWarehouseStock(w.id, {
                      is_stock_item: w.is_stock_item === "Y" ? "N" : "Y",
                    })
                  }
                  className="text-blue-600 hover:text-blue-900"
                >
                  {w.is_stock_item === "Y" ? "Remove Stock" : "Add Stock"}
                </button>
              </div>
            </td>
          </tr>
        ));

      case "tarics":
        return pageData.map((taric: any) => (
          <tr
            key={taric.id}
            className="hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => openEditTaric(taric)}
          >
            <td className="p-4" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedTarics.has(taric.id.toString())}
                onChange={() => toggleSelect(taric.id.toString())}
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
                {formatDate(taric.created_at || taric.updated_at)}
              </div>
            </td>
          </tr>
        ));

      case "suppliers":
        return pageData.map((s: any) => (
          <tr
            key={s.id}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => router.push(`/suppliers?supplierId=${s.id}`)}
          >
            <td className="p-4" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedItems.has(s.id.toString())}
                onChange={() => toggleSelect(s.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
            </td>
            <td className="px-4 py-3 font-medium">{s.name || `ID: ${s.id}`}</td>
            <td className="px-4 py-3">{s.contact_person}</td>
            <td className="px-4 py-3">{s.email}</td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1 max-w-[150px]">
                {sortTags(s.tags || [], s.tagOrder).map((tag: Tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
                {(!s.tags || s.tags.length === 0) && (
                  <span className="text-xs text-gray-400">—</span>
                )}
              </div>
            </td>
          </tr>
        ));
      default:
        return null;
    }
  };

  // ---- Small render helpers for the preview/edit modal ----------------------
  const labelCls =
    "block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1";
  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all";

  const roField = (label: string, value: any) => (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="text-sm text-gray-900 break-words">
        {value !== undefined && value !== null && value !== "" ? value : "—"}
      </div>
    </div>
  );

  const editText = (
    label: string,
    key: string,
    type: string = "text",
    placeholder = "",
  ) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type}
        value={previewForm?.[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) =>
          setForm(
            key,
            type === "number"
              ? e.target.value === ""
                ? ""
                : e.target.value
              : e.target.value,
          )
        }
        className={inputCls}
      />
    </div>
  );

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
            <PageHeader
              title={
                activeTab === "items"
                  ? "Items"
                  : activeTab === "parents"
                    ? "Parents"
                    : activeTab === "tarics"
                      ? "TARICs"
                      : activeTab === "suppliers"
                        ? "Suppliers"
                        : "Warehouse"
              }
              icon={
                activeTab === "items"
                  ? Package
                  : activeTab === "parents"
                    ? BuildingOfficeIcon
                    : activeTab === "tarics"
                      ? DocumentTextIcon
                      : activeTab === "suppliers"
                        ? TruckIcon
                        : ArchiveBoxIcon
              }
            />
          </div>

          <div className="flex gap-1.5 items-center flex-wrap justify-end">
            {activeTab === "items" && (
              <CustomButton
                onClick={handleExportNewCSV}
                disabled={exportingNew || newItemsCount === 0}
                loading={exportingNew}
                gradient={true}
                size="small"
                startIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              >
                Export to WaWi CSV ({newItemsCount})
              </CustomButton>
            )}
            {activeTab === "items" && (
              <>
                <CustomButton
                  onClick={() => handleExportCSV()}
                  disabled={exporting || pendingSyncCount === 0}
                  loading={exporting}
                  gradient={true}
                  size="small"
                  startIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
                >
                  Sync to WaWi ({pendingSyncCount})
                </CustomButton>
                {process.env.NODE_ENV === "development" && (
                  <CustomButton
                    onClick={handleResetSyncFlags}
                    gradient={true}
                    size="small"
                    startIcon={<ArrowPathIcon className="w-4 h-4" />}
                  >
                    Reset Sync Flags
                  </CustomButton>
                )}
              </>
            )}
            {getSelectedCount() > 0 &&
              (isTaricTab ? (
                <CustomButton
                  onClick={handleBulkDeleteTarics}
                  gradient={true}
                  size="small"
                  color="error"
                >
                  Delete ({selectedTarics.size})
                </CustomButton>
              ) : (
                <>
                  <CustomButton
                    onClick={() => handleBulk("activate")}
                    gradient={true}
                    size="small"
                    color="success"
                  >
                    Activate
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleBulk("deactivate")}
                    gradient={true}
                    size="small"
                    color="warning"
                  >
                    Deactivate
                  </CustomButton>
                  <CustomButton
                    onClick={() => handleBulk("delete")}
                    gradient={true}
                    size="small"
                    color="error"
                  >
                    Delete
                  </CustomButton>
                </>
              ))}
            {activeTab === "items" && (
              <CustomButton
                onClick={() => setShowItemModal(true)}
                gradient={true}
                size="small"
                startIcon={<PlusIcon className="w-5 h-5" />}
              >
                New Item
              </CustomButton>
            )}
            {activeTab === "parents" && (
              <CustomButton
                onClick={() => {
                  setSelectedParentId(null);
                  setShowParentModal(true);
                }}
                gradient={true}
                size="small"
                startIcon={<PlusIcon className="w-5 h-5" />}
              >
                Add Parent
              </CustomButton>
            )}
            {activeTab === "tarics" && (
              <CustomButton
                onClick={openCreateTaric}
                gradient={true}
                size="small"
                startIcon={<PlusIcon className="w-5 h-5" />}
              >
                New TARIC
              </CustomButton>
            )}
            {activeTab === "suppliers" && (
              <CustomButton
                onClick={() => router.push("/suppliers")}
                gradient={true}
                size="small"
                startIcon={<PlusIcon className="w-5 h-5" />}
              >
                Manage Suppliers
              </CustomButton>
            )}
          </div>
        </div>
        {auditFilter && searchParams.get("hide_banner") !== "true" && (
          <div className="mb-6 px-5 py-3 bg-[#FFF3CD] border border-[#FFEBA2] rounded-md text-[#856404] flex items-center justify-between text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold">
                ⚠️ Reports &amp; Control Health Audit View Active:
              </span>
              <span className="font-semibold text-gray-800">{auditFilter}</span>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("filter");
                window.location.href = `/items?${params.toString()}`;
              }}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-bold"
            >
              Clear Audit Filter
            </button>
          </div>
        )}

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
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mb-6 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
          {activeTab === "items" ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
                <FunnelIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="relative flex-grow flex-shrink flex-1 min-w-[140px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Name..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                      filters.search
                        ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                        : "text-gray-900 border-gray-300 bg-white"
                    }`}
                  />
                  {filters.search && (
                    <button
                      onClick={() => setFilters({ ...filters, search: "" })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="relative flex-grow flex-shrink flex-1 min-w-[120px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Item No..."
                    value={filters.eanSearch}
                    onChange={(e) =>
                      setFilters({ ...filters, eanSearch: e.target.value })
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                      filters.eanSearch
                        ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                        : "text-gray-900 border-gray-300 bg-white"
                    }`}
                  />
                  {filters.eanSearch && (
                    <button
                      onClick={() => setFilters({ ...filters, eanSearch: "" })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-grow flex-shrink flex-1 min-w-[180px]">
                <TagFilterSelector
                  category="item"
                  compact={true}
                  onChange={(tagString) =>
                    setFilters((prev) => ({ ...prev, tags: tagString }))
                  }
                  onReset={() => setFilters((prev) => ({ ...prev, tags: "" }))}
                />
              </div>
              <div className="relative flex-grow flex-shrink flex-1 min-w-[180px]">
                <CustomerSearchInput
                  value={filters.company || ""}
                  onChange={(id, name) =>
                    setFilters({ ...filters, company: name })
                  }
                  placeholder="Company..."
                  mode="customers"
                  initialLabel={filters.company || ""}
                />
              </div>

              <div className="w-[90px] flex-shrink-0">
                <select
                  value={filters.isLabel || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, isLabel: e.target.value })
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                    filters.isLabel
                      ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                      : "text-gray-400 border-gray-300 bg-white"
                  }`}
                >
                  <option value="">isLabel...</option>
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </select>
              </div>

              <div className="flex-grow flex-shrink flex-1 min-w-[150px]">
                <select
                  value={filters.supplier}
                  onChange={(e) =>
                    setFilters({ ...filters, supplier: e.target.value })
                  }
                  className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                    filters.supplier
                      ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                      : "text-gray-400 border-gray-300 bg-white"
                  }`}
                >
                  <option value="">Supplier...</option>
                  {refSuppliers.map((s) => (
                    <option key={s.id} value={s.id.toString()}>
                      {`[${s.id}] ${s.company_name || s.name || ""}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-[105px] flex-shrink-0">
                <select
                  value={filters.category}
                  onChange={(e) =>
                    setFilters({ ...filters, category: e.target.value })
                  }
                  className={`w-full px-2 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${
                    filters.category
                      ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                      : "text-gray-400 border-gray-300 bg-white"
                  }`}
                >
                  <option value="">Category</option>
                  {Array.from(
                    new Set(categories.map((c) => c.name?.toString().trim())),
                  )
                    .filter(Boolean)
                    .sort()
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="shrink-0">
                <button
                  onClick={resetFilters}
                  className="w-full lg:w-auto px-2.5 py-2 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>
          ) : activeTab === "parents" ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
                <FunnelIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search Parents..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className={getInputClass(!!filters.search)}
                />
              </div>
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
            </div>
          ) : activeTab === "tarics" ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
                <FunnelIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search TARICs..."
                  value={taricSearch}
                  onChange={(e) => setTaricSearch(e.target.value)}
                  className={getInputClass(!!taricSearch)}
                />
              </div>
              <button
                onClick={() => setTaricSearch("")}
                className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
            </div>
          ) : activeTab === "suppliers" ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <div className="flex items-center gap-1.5 text-gray-400 shrink-0 select-none px-1">
                <FunnelIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search Suppliers..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className={getInputClass(!!filters.search)}
                />
              </div>
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-sm font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reset
              </button>
            </div>
          ) : (
            <div className="flex items-end justify-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            </div>
          )}
        </div>

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
                      {activeTab !== "items" && (
                        <th className="p-4">
                          <input
                            type="checkbox"
                            checked={
                              pageData.length > 0 &&
                              pageData.every((d: any) =>
                                currentSelection.has(d.id.toString()),
                              )
                            }
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                        </th>
                      )}
                      {renderTableHeaders()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={activeTab === "items" ? 5 : 10}
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
                    {totalRecords === 0 ? 0 : (safePage - 1) * PAGE_LIMIT + 1}{" "}
                    to {Math.min(safePage * PAGE_LIMIT, totalRecords)} of{" "}
                    {totalRecords} {activeTab}
                  </p>
                  {getSelectedCount() > 0 && (
                    <span className="text-sm font-medium text-primary">
                      {getSelectedCount()} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
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

      <ItemPreviewModal
        isOpen={showItemPreview}
        onClose={closePreview}
        itemId={previewRow?.id}
      />

      {showTaricModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-md w-full">
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {taricMode === "edit" ? "Edit TARIC" : "Create New TARIC"}
                </h2>
                <button
                  onClick={() => setShowTaricModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                {(
                  [
                    ["TARIC Code *", "code", "text"],
                    ["German Name", "name_de", "text"],
                    ["English Name", "name_en", "text"],
                    ["Chinese Name", "name_cn", "text"],
                  ] as const
                ).map(([label, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={(taricForm as any)[key]}
                      onChange={(e) =>
                        setTaricForm((p: any) => ({
                          ...p,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Duty Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={taricForm.duty_rate}
                    onChange={(e) =>
                      setTaricForm((p: any) => ({
                        ...p,
                        duty_rate: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => setShowTaricModal(false)}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white/80 border border-gray-300/80 rounded-lg hover:bg-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitTaric}
                    disabled={!taricForm.code}
                    className="flex-1 px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
                  >
                    {taricMode === "edit" ? "Update" : "Create"} TARIC
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ItemCreateModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        isRequest={false}
        onCreated={reloadItems}
      />
      <ParentModal
        isOpen={showParentModal}
        onClose={() => setShowParentModal(false)}
        parentId={selectedParentId}
        onSaved={() => fetchTab("parents", true)}
        tarics={refTarics}
        suppliers={refSuppliers}
      />
    </div>
  );
};

export default ItemsManagementPage;
