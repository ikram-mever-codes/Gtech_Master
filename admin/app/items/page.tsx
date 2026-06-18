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
import { uploadFile, deleteFile } from "@/api/library";
import {
  successStyles,
  errorStyles,
  loadingStyles,
  BASE_URL,
} from "@/utils/constants";
import CustomModal from "@/components/UI/CustomModal";
import { TagFilterSelector } from "@/components/Tags/TagFilterSelector";
import {
  TagBadge,
  TagPickerInput,
  EntityTagSelector,
  sortTags,
  type Tag,
} from "@/components/Tags/TagManager";
import { syncEntityTags } from "@/api/tags";

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

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingNew, setExportingNew] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [newItemsCount, setNewItemsCount] = useState(0);

  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedTarics, setSelectedTarics] = useState<Set<string>>(new Set());

  const [statistics, setStatistics] = useState<any>({
    totalItems: 0,
    activeItems: 0,
    inactiveItems: 0,
  });

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    eanSearch: "",
    status: "",
    category: "",
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
            if (res.pagination) {
              setItemsTotalRecords(res.pagination.totalRecords || 0);
              setItemsTotalPages(res.pagination.totalPages || 1);
            } else {
              setItemsTotalRecords(data.length);
              setItemsTotalPages(Math.ceil(data.length / PAGE_LIMIT));
            }
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
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [parentsRes, taricsRes, catsRes, suppliersRes]: any =
          await Promise.all([
            getParents({ limit: 1000, isActive: "Y" }),
            getAllTarics({ limit: 1000 }),
            getCategories(),
            getAllSuppliers({ limit: 1000 }),
          ]);
        if (!active) return;
        if (parentsRes?.data) setRefParents(parentsRes.data);
        if (taricsRes?.data) setRefTarics(taricsRes.data);
        if (catsRes?.data)
          setCategories(
            catsRes.data.filter(
              (c: any) => !c.name?.toString().trim().startsWith("Imported"),
            ),
          );
        if (suppliersRes?.data) setRefSuppliers(suppliersRes.data);
      } catch (e) {
        console.error("Failed to fetch reference data", e);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
      console.error("Error fetching counts:", e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "items") refreshCounts();
  }, [activeTab, refreshCounts]);

  useEffect(() => {
    const supplierParam = searchParams.get("supplier");
    if (supplierParam) setFilters((p) => ({ ...p, supplier: supplierParam }));
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [filters, taricSearch, activeTab]);

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

  const totalRecords = activeTab === "items" ? itemsTotalRecords : filteredAll.length;
  const totalPages = activeTab === "items" ? itemsTotalPages : Math.max(1, Math.ceil(totalRecords / PAGE_LIMIT));
  const safePage = Math.min(page, totalPages);
  const pageData = useMemo(
    () => activeTab === "items" ? filteredAll : filteredAll.slice((safePage - 1) * PAGE_LIMIT, safePage * PAGE_LIMIT),
    [filteredAll, safePage, activeTab],
  );
  const [showItemPreview, setShowItemPreview] = useState(false);
  const [previewRow, setPreviewRow] = useState<any>(null);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewEdit, setPreviewEdit] = useState(false);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<any[]>([]);

  const toBool = (v: any) =>
    v === "Y" || v === "Yes" || v === true || v === 1 || v === "1";

  const transformDetail = (raw: any) => {
    const activeSupplierId =
      raw.supplier_id ||
      raw.supplierItems?.find((si: any) => si.isDefault)?.supplierId ||
      null;
    const def = raw.supplierItems?.find(
      (si: any) =>
        si.isDefault || Number(si.supplierId) === Number(activeSupplierId),
    );
    return {
      ...raw,
      id: raw.id,
      supplier_id: activeSupplierId,
      customer_id: raw.customer_id ?? raw.customer?.id ?? null,
      isActive: toBool(raw.isActive),
      isLabelPrint:
        raw.isLabelPrint !== undefined ? toBool(raw.isLabelPrint) : false,
      supplierItems: raw.supplierItems || [],
      supplierItem:
        raw.supplierItem ||
        (def
          ? {
            priceRMB: def.priceRMB || "0",
            isPO: def.isPO || "No",
            moq: def.moq || "0",
            interval: def.interval || "0",
            leadTime: def.leadTime || "",
            noteCN: def.noteCN || "",
            url: def.url || "",
          }
          : {
            priceRMB: "0",
            isPO: "No",
            moq: "0",
            interval: "0",
            leadTime: "",
            noteCN: "",
            url: "",
          }),
      parent: {
        ...raw.parent,
        isActive: toBool(raw.parent?.isActive),
        isSpecialItem: toBool(raw.parent?.isSpecialItem),
        isEURSpecial: toBool(raw.parent?.isEURSpecial),
        isRMBSpecial: toBool(raw.parent?.isRMBSpecial),
        isDimensionSpecial: toBool(raw.parent?.isDimensionSpecial),
      },
      others: {
        ...raw.others,
        isQTYdiv: toBool(raw.others?.isQTYdiv),
        isStock: toBool(raw.others?.isStock),
        isActive: toBool(raw.others?.isActive),
        isNew: toBool(raw.others?.isNew),
        isNPR: toBool(raw.others?.isNPR),
        isDimensionSpecial: toBool(raw.others?.isDimensionSpecial),
      },
      dimensions: raw.dimensions || {},
      pictures: {
        shopPicture: raw.pictures?.shopPicture || "",
        ebayPictures: raw.pictures?.ebayPictures || "",
        pixPath: raw.pictures?.pixPath || "",
      },
      attachments: raw.attachments || [],
    };
  };

  const openItemPreview = async (row: any) => {
    setPreviewRow(row);
    setPreviewItem(null);
    setPreviewQuality([]);
    setPreviewEdit(false);
    setShowItemPreview(true);
    setPreviewLoading(true);
    try {
      const [detailRes, qualityRes]: any = await Promise.all([
        getItemById(row.id),
        getItemQualityCriteria(row.id),
      ]);
      setPreviewItem(transformDetail(detailRes?.data || {}));
      setPreviewQuality(qualityRes?.data || []);
    } catch (e) {
      console.error("Failed to load item detail:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowItemPreview(false);
    setPreviewRow(null);
    setPreviewItem(null);
    setPreviewEdit(false);
  };

  const patchPreview = (patch: any) =>
    setPreviewItem((p: any) => ({ ...p, ...patch }));
  const patchPreviewDim = (key: string, val: any) =>
    setPreviewItem((p: any) => ({
      ...p,
      dimensions: { ...p.dimensions, [key]: val },
    }));
  const patchPreviewSupplierItem = (patch: any) =>
    setPreviewItem((p: any) => ({
      ...p,
      supplierItem: { ...p.supplierItem, ...patch },
    }));

  const buildItemUpdatePayload = (d: any) => {
    const toNum = (v: any) => {
      if (v === null || v === undefined || v === "") return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const toInt = (v: any) => {
      if (v === null || v === undefined || v === "") return null;
      const n = parseInt(v);
      return isNaN(n) ? null : n;
    };
    return {
      item_name: d.name ?? d.item_name,
      item_name_cn: d.nameCN ?? d.item_name_cn,
      ean: (d.ean || "").toString(),
      model: d.model,
      remark: d.remark,
      cat_id: toInt(d.category_id),
      isActive: d.isActive ? "Y" : "N",
      weight: toNum(d.dimensions?.weight),
      length: toNum(d.dimensions?.length),
      width: toNum(d.dimensions?.width),
      height: toNum(d.dimensions?.height),
      is_qty_dividable: d.others?.isQTYdiv ? "Y" : "N",
      is_dimension_special: d.others?.isDimensionSpecial ? "Y" : "N",
      is_eur_special: d.parent?.isEURSpecial ? "Y" : "N",
      is_rmb_special: d.parent?.isRMBSpecial ? "Y" : "N",
      is_new: d.others?.isNew ? "Y" : "N",
      is_npr: d.others?.isNPR ? "Y" : "N",
      isLabelPrint: !!d.isLabelPrint,
      supplier_id: toInt(d.supplier_id),
      customer_id: d.customer_id ?? null,
      supplierItems: d.supplierItems,
      supplierItem: {
        price_rmb: toNum(d.supplierItem?.priceRMB),
        is_po: d.supplierItem?.isPO,
        moq: toInt(d.supplierItem?.moq),
        oi: toInt(d.supplierItem?.interval),
        lead_time: d.supplierItem?.leadTime,
        note_cn: d.supplierItem?.noteCN,
        url: d.supplierItem?.url,
      },
      price: toNum(d.price ?? d.transfer_price),
      transfer_price_EUR: toNum(d.price ?? d.transfer_price),
      warehouseItemData: {
        is_stock_item: d.others?.isStock ? "Y" : "N",
        is_active: d.others?.isActive ? "Y" : "N",
        msq: toNum(d.others?.msq),
        buffer: toInt(d.others?.buffer),
        item_no_de: d.others?.noDE,
        item_name_de: d.others?.nameDE,
      },
      photo: d.pictures?.shopPicture,
      pix_path: d.pictures?.pixPath,
      pix_path_eBay: d.pictures?.ebayPictures,
    };
  };

  const handleSavePreview = async () => {
    if (!previewItem) return;
    if (!previewItem.supplier_id) {
      toast.error("Supplier is required", errorStyles);
      return;
    }
    setPreviewSaving(true);
    const tid = toast.loading("Saving item...", loadingStyles);
    try {
      await updateItem(previewItem.id, buildItemUpdatePayload(previewItem));
      toast.success("Item updated", { id: tid, ...successStyles });
      setPreviewEdit(false);
      const fresh: any = await getItemById(previewItem.id);
      setPreviewItem(transformDetail(fresh?.data || {}));
      reloadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to update item", {
        id: tid,
        ...errorStyles,
      });
    } finally {
      setPreviewSaving(false);
    }
  };

  const handleDeletePreviewItem = async () => {
    if (!previewItem) return;
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteItem(previewItem.id);
      toast.success("Item deleted", successStyles);
      closePreview();
      reloadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete item", errorStyles);
    }
  };

  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [editingQuality, setEditingQuality] = useState<any>(null);
  const [qualityForm, setQualityForm] = useState<any>({
    name: "",
    description: "",
    descriptionCN: "",
    picture: null as File | null,
    pictureUrl: "",
  });

  const openQualityModal = (q: any = null) => {
    if (q) {
      setEditingQuality(q);
      setQualityForm({
        name: q.name || "",
        description: q.description || "",
        descriptionCN: q.descriptionCN || "",
        picture: null,
        pictureUrl: q.picture || "",
      });
    } else {
      setEditingQuality(null);
      setQualityForm({
        name: "",
        description: "",
        descriptionCN: "",
        picture: null,
        pictureUrl: "",
      });
    }
    setQualityModalOpen(true);
  };

  const saveQuality = async () => {
    if (!previewItem) return;
    try {
      let pictureUrl = qualityForm.pictureUrl;
      if (qualityForm.picture) {
        const fd = new FormData();
        fd.append("file", qualityForm.picture);
        const up = await uploadFile(fd);
        pictureUrl = up.data.url;
      }
      const payload = {
        name: qualityForm.name,
        description: qualityForm.description,
        description_cn: qualityForm.descriptionCN,
        picture: pictureUrl,
      };
      if (editingQuality)
        await updateQualityCriterion(editingQuality.id, payload);
      else await createQualityCriterion(previewItem.id, payload);
      const fresh = await getItemQualityCriteria(previewItem.id);
      setPreviewQuality(fresh.data || []);
      setQualityModalOpen(false);
      toast.success("Quality criterion saved", successStyles);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quality criterion", errorStyles);
    }
  };

  const removeQuality = async (qid: number) => {
    if (!confirm("Delete this quality criterion?")) return;
    try {
      await deleteQualityCriterion(qid);
      setPreviewQuality((prev) => prev.filter((q) => q.id !== qid));
    } catch (e) {
      console.error(e);
    }
  };

  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const uploadPreviewAttachments = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !previewItem) return;
    const tid = toast.loading("Uploading attachments...", loadingStyles);
    setUploadingAttachments(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append("file", files[i]);
        fd.append("itemId", String(previewItem.id));
        fd.append("isPublic", "true");
        await uploadFile(fd, false);
      }
      const fresh: any = await getItemById(previewItem.id);
      setPreviewItem(transformDetail(fresh?.data || {}));
      toast.success("Attachments uploaded", { id: tid, ...successStyles });
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload attachments", { id: tid, ...errorStyles });
    } finally {
      setUploadingAttachments(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const deletePreviewAttachment = async (fileId: string) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      await deleteFile(fileId);
      setPreviewItem((p: any) => ({
        ...p,
        attachments: (p.attachments || []).filter((a: any) => a.id !== fileId),
      }));
      toast.success("Attachment deleted", successStyles);
    } catch (e) {
      toast.error("Failed to delete attachment", errorStyles);
    }
  };

  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemTags, setNewItemTags] = useState<Tag[]>([]);
  const [itemFormData, setItemFormData] = useState<any>({
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
    is_eur_special: false,
    is_rmb_special: false,
    item_no_de: "",
    item_name_de: "",
  });

  const openCreateItemModal = () => {
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
      is_eur_special: false,
      is_rmb_special: false,
      item_no_de: "",
      item_name_de: "",
    });
    setNewItemTags([]);
    setShowItemModal(true);
  };

  const handleCreateItemSubmit = async () => {
    if (!itemFormData.item_name?.trim())
      return toast.error("Item name is required");
    if (!itemFormData.parent_id) return toast.error("Parent is required");
    if (!itemFormData.supplier_id) return toast.error("Supplier is required");
    try {
      const result = await createItem({
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
      const createdId =
        (result as any)?.data?.id || (result as any)?.data?.data?.id;
      if (createdId && newItemTags.length > 0)
        await syncEntityTags(
          createdId,
          "item",
          newItemTags.map((t) => t.id),
        );
      setShowItemModal(false);
      reloadItems();
    } catch (e: any) {
      toast.error(e.message || "Failed to create item", errorStyles);
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
    } catch { }
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
    } catch { }
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
      category: "",
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
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Email
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Tags
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
    switch (activeTab) {
      case "items":
        return pageData.map((item: any) => {
          const isNew = item.is_new === "Y";
          const thumb = getThumb(item);
          return (
            <tr
              key={item.id}
              onClick={() => openItemPreview(item)}
              className={`cursor-pointer transition-colors ${isNew
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
                  {(item.customer_name || item.company_name || item.company) && (
                    <>
                      <span>-</span>
                      <span className="text-blue-600 font-medium">
                        {item.customer_name || item.company_name || item.company}
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
          <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
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
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${parent.is_active === "Y"
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
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/parents/${parent.id}`)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="View"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => router.push(`/parents/${parent.id}/edit`)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  title="Edit"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteParent(parent.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Delete"
                >
                  <Delete className="w-4 h-4" />
                </button>
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
          <tr key={taric.id} className="hover:bg-gray-50 transition-colors">
            <td className="p-4">
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
            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/tarics/${taric.id}`)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="View"
                >
                  <EyeIconOutline className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditTaric(taric)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => removeTaric(taric.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        ));

      case "suppliers":
        return pageData.map((s: any) => (
          <tr
            key={s.id}
            className="hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => router.push("/suppliers")}
          >
            <td className="p-4">
              <input
                type="checkbox"
                checked={selectedItems.has(s.id.toString())}
                onChange={() => toggleSelect(s.id.toString())}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                onClick={(e) => e.stopPropagation()}
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
            <td className="px-4 py-3 text-right">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push("/suppliers");
                }}
                className="text-primary hover:underline"
              >
                Manage
              </button>
            </td>
          </tr>
        ));
      default:
        return null;
    }
  };

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <div className="text-sm text-gray-900 break-words">{children}</div>
    </div>
  );

  const inputCls =
    "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all";

  const previewCompanyOrCat =
    getCompany(previewRow) || previewRow?.category || "—";
  const previewItemNo =
    previewItem?.others?.noDE ||
    previewRow?.de_no ||
    previewRow?.warehouse_data?.item_no_de ||
    "-";

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
            <PageHeader title="Items" icon={Package} />
            {activeTab === "items" && pendingSyncCount > 0 && (
              <div className="mt-2 text-sm text-yellow-600 flex items-center gap-2">
                <Sync className="w-4 h-4" />
                <span>{pendingSyncCount} item(s) pending sync to WaWi</span>
              </div>
            )}
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
                onClick={openCreateItemModal}
                gradient={true}
                size="small"
                startIcon={<PlusIcon className="w-5 h-5" />}
              >
                New Item
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
              <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full">
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
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.search
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
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.eanSearch
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
                    onReset={() =>
                      setFilters((prev) => ({ ...prev, tags: "" }))
                    }
                  />
                </div>
                <div className="relative flex-grow flex-shrink flex-1 min-w-[120px]">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Company..."
                      value={filters.company || ""}
                      onChange={(e) =>
                        setFilters({ ...filters, company: e.target.value })
                      }
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.company
                        ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
                        : "text-gray-900 border-gray-300 bg-white"
                        }`}
                    />
                    {filters.company && (
                      <button
                        onClick={() => setFilters({ ...filters, company: "" })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-[90px] flex-shrink-0">
                  <select
                    value={filters.isLabel || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, isLabel: e.target.value })
                    }
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.isLabel
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
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.supplier
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
                    className={`w-full px-2 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${filters.category
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
            ) : activeTab === "tarics" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search code or name..."
                    value={taricSearch}
                    onChange={(e) => setTaricSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <button
                    onClick={() => setTaricSearch("")}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 border border-rose-200 rounded-lg bg-rose-50/50 hover:bg-rose-50"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
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
        
        {activeTab !== "tarics" && activeTab !== "items" && (
          <div className="mb-6">
            <div className="relative">
              <MagnifyingGlassIcon className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}... (EAN, name, DE number, etc.)`}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400 pl-12"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters({ ...filters, search: "" })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
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
      {showItemPreview && previewRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    {getThumb(previewItem || previewRow) ? (
                      <img
                        src={getThumb(previewItem || previewRow)!}
                        alt="thumb"
                        className="w-full h-full object-cover"
                        onError={(e) =>
                        ((e.target as HTMLImageElement).style.display =
                          "none")
                        }
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 truncate">
                      {previewRow.item_name || "Item"}
                    </h2>
                    <p className="text-xs text-gray-500 truncate">
                      {previewCompanyOrCat} · ItemNo {previewItemNo} · ID{" "}
                      {previewRow.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600 mt-1"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm font-medium text-gray-700">
                  Edit Mode
                </span>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-2">
                    {previewEdit ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    disabled={previewLoading}
                    className={`${previewEdit ? "bg-gray-600" : "bg-gray-200"} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50`}
                    onClick={() => setPreviewEdit(!previewEdit)}
                  >
                    <span
                      className={`${previewEdit ? "translate-x-4" : "translate-x-0"} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition`}
                    />
                  </button>
                </div>
              </div>
              <div className="mb-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Tags
                </p>
                {previewEdit ? (
                  <EntityTagSelector
                    entityId={previewRow.id}
                    entityType="item"
                    initialTags={(previewItem || previewRow)?.tags || []}
                    tagOrder={(previewItem || previewRow)?.tagOrder}
                    onTagsUpdated={(newTags: any[]) =>
                      setPreviewItem((p: any) =>
                        p
                          ? {
                            ...p,
                            tags: newTags,
                            tagOrder: newTags.map((t) => t.id).join(","),
                          }
                          : p,
                      )
                    }
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {sortTags(
                      (previewItem || previewRow)?.tags || [],
                      (previewItem || previewRow)?.tagOrder,
                    ).map((tag: Tag) => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))}
                    {(!(previewItem || previewRow)?.tags ||
                      (previewItem || previewRow)?.tags.length === 0) && (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Item No">{previewItemNo}</Field>
                <Field label="Company">{getCompany(previewRow) || "—"}</Field>
                <Field label="IsLabel">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(previewItem?.isLabelPrint ?? previewRow.isLabelPrint) ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                  >
                    {(previewItem?.isLabelPrint ?? previewRow.isLabelPrint)
                      ? "Yes"
                      : "No"}
                  </span>
                </Field>
                <Field label="CAT">
                  {previewEdit && previewItem ? (
                    <select
                      className={inputCls}
                      value={previewItem.category_id?.toString() ?? ""}
                      onChange={(e) =>
                        patchPreview({
                          category_id: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id.toString()}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    previewRow.category || previewItem?.category || "—"
                  )}
                </Field>
                <Field label="EAN">
                  {previewItem?.ean || previewRow.ean || "—"}
                </Field>
                <Field label="ID (system)">{previewRow.id}</Field>
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Item Name">
                  {previewEdit && previewItem ? (
                    <input
                      className={inputCls}
                      value={previewItem.name ?? previewItem.item_name ?? ""}
                      onChange={(e) =>
                        patchPreview({
                          name: e.target.value,
                          item_name: e.target.value,
                        })
                      }
                    />
                  ) : (
                    previewRow.item_name || "—"
                  )}
                </Field>
                <Field label="Item Name DE">
                  {previewEdit && previewItem ? (
                    <input
                      className={inputCls}
                      value={previewItem.others?.nameDE ?? ""}
                      onChange={(e) =>
                        setPreviewItem((p: any) => ({
                          ...p,
                          others: { ...p.others, nameDE: e.target.value },
                        }))
                      }
                    />
                  ) : (
                    previewItem?.others?.nameDE ||
                    previewRow.item_name_de ||
                    previewRow.name_de ||
                    "—"
                  )}
                </Field>
                <Field label="Item Name CN">
                  {previewEdit && previewItem ? (
                    <input
                      className={inputCls}
                      value={
                        previewItem.nameCN ?? previewItem.item_name_cn ?? ""
                      }
                      onChange={(e) =>
                        patchPreview({
                          nameCN: e.target.value,
                          item_name_cn: e.target.value,
                        })
                      }
                    />
                  ) : (
                    previewItem?.nameCN || previewRow.item_name_cn || "—"
                  )}
                </Field>
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Remark (EN/DE)">
                  {previewEdit && previewItem ? (
                    <textarea
                      rows={2}
                      className={inputCls}
                      value={previewItem.remark ?? ""}
                      onChange={(e) => patchPreview({ remark: e.target.value })}
                    />
                  ) : (
                    previewItem?.remark || previewRow.remark || "—"
                  )}
                </Field>
                <Field label="Remark CN">
                  {previewItem?.remarkCN ||
                    previewItem?.remark_cn ||
                    previewRow.remark_cn ||
                    "—"}
                </Field>
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                {(["length", "width", "height", "weight"] as const).map(
                  (dim) => (
                    <Field
                      key={dim}
                      label={dim[0].toUpperCase() + dim.slice(1)}
                    >
                      {previewEdit && previewItem ? (
                        <input
                          type="number"
                          step="0.01"
                          className={inputCls}
                          value={previewItem.dimensions?.[dim] ?? ""}
                          onChange={(e) => patchPreviewDim(dim, e.target.value)}
                        />
                      ) : (
                        (previewItem?.dimensions?.[dim] ??
                          previewRow[dim] ??
                          "—")
                      )}
                    </Field>
                  ),
                )}
              </div>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <Field label="Default Supplier">
                  {previewEdit && previewItem ? (
                    <select
                      className={inputCls}
                      value={previewItem.supplier_id?.toString() ?? ""}
                      onChange={(e) => {
                        const sid = parseInt(e.target.value);
                        const sDetail = refSuppliers.find(
                          (s: any) => s.id === sid,
                        );
                        const sName = sDetail
                          ? !hasChinese(sDetail.name || "")
                            ? sDetail.name
                            : (sDetail as any).company_name || "Unknown"
                          : "Unknown";
                        setPreviewItem((p: any) => {
                          let items = (p.supplierItems || []).map(
                            (si: any) => ({
                              ...si,
                              isDefault: Number(si.supplierId) === sid,
                            }),
                          );
                          if (
                            !items.some(
                              (si: any) => Number(si.supplierId) === sid,
                            )
                          ) {
                            items = [
                              ...items.map((si: any) => ({
                                ...si,
                                isDefault: false,
                              })),
                              {
                                id: -Date.now(),
                                supplierId: sid,
                                supplierName: sName,
                                priceRMB: "0",
                                isPO: "No",
                                moq: "0",
                                interval: "0",
                                leadTime: "",
                                noteCN: "",
                                url: "",
                                isDefault: true,
                              },
                            ];
                          }
                          const def = items.find((si: any) => si.isDefault);
                          return {
                            ...p,
                            supplier_id: sid,
                            supplierItems: items,
                            supplierItem: {
                              priceRMB: def?.priceRMB || "0",
                              isPO: def?.isPO || "No",
                              moq: def?.moq || "0",
                              interval: def?.interval || "0",
                              leadTime: def?.leadTime || "",
                              noteCN: def?.noteCN || "",
                              url: def?.url || "",
                            },
                          };
                        });
                      }}
                    >
                      <option value="">Select a Supplier</option>
                      {refSuppliers.map((s: any) => (
                        <option
                          key={s.id}
                          value={s.id.toString()}
                        >{`[ID: ${s.id}] ${!hasChinese(s.name) ? s.name : s.company_name || ""}`}</option>
                      ))}
                    </select>
                  ) : (
                    (() => {
                      const sid =
                        previewItem?.supplier_id || previewRow.supplier_id;
                      const matched = refSuppliers.find(
                        (s: any) => s.id === sid,
                      );
                      const name = matched
                        ? !hasChinese(matched.name || "")
                          ? matched.name
                          : (matched as any).company_name
                        : previewRow.supplier_name;
                      return sid ? `[ID: ${sid}] ${name || ""}` : "—";
                    })()
                  )}
                </Field>
                <Field label="Price (RMB) ¥">
                  {previewEdit && previewItem ? (
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls}
                      value={previewItem.supplierItem?.priceRMB ?? ""}
                      onChange={(e) =>
                        patchPreviewSupplierItem({ priceRMB: e.target.value })
                      }
                    />
                  ) : (
                    (previewItem?.supplierItem?.priceRMB ??
                      previewRow.rmb_price ??
                      "—")
                  )}
                </Field>
                <Field label="Transfer Price (EUR)">
                  {previewEdit && previewItem ? (
                    <input
                      type="number"
                      step="0.01"
                      className={inputCls}
                      value={
                        previewItem.price ?? previewItem.transfer_price ?? ""
                      }
                      onChange={(e) => patchPreview({ price: e.target.value })}
                    />
                  ) : (
                    (previewItem?.price ??
                      previewItem?.transfer_price ??
                      previewRow.transfer_price_EUR ??
                      "—")
                  )}
                </Field>
                <Field label="Status">
                  {previewEdit && previewItem ? (
                    <select
                      className={inputCls}
                      value={previewItem.isActive ? "Y" : "N"}
                      onChange={(e) =>
                        patchPreview({ isActive: e.target.value === "Y" })
                      }
                    >
                      <option value="Y">Active</option>
                      <option value="N">Inactive</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(previewRow.is_active)}`}
                    >
                      {(previewItem?.isActive ?? previewRow.is_active === "Y")
                        ? "Active"
                        : "Inactive"}
                    </span>
                  )}
                </Field>
              </div>
              <div className="mt-5">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Sales Price per Qty (Bulk Prices)
                </p>
                {(() => {
                  const bulk =
                    previewItem?.bulkPrices ||
                    previewItem?.salesPrices ||
                    previewItem?.quantityPrices ||
                    [];
                  if (!bulk || bulk.length === 0)
                    return <p className="text-sm text-gray-400">—</p>;
                  return (
                    <div className="flex flex-wrap gap-2">
                      {bulk.map((bp: any, i: number) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
                        >
                          {bp.qty ?? bp.quantity ?? bp.minQty}+ :{" "}
                          {bp.price ?? bp.value}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Quality Criteria ({previewQuality.length})
                  </h3>
                  <button
                    onClick={() => openQualityModal()}
                    className="px-2.5 py-1 text-xs bg-[#8CC21B] text-white rounded-md hover:bg-[#7ab318] flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
                {previewLoading ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : previewQuality.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No quality criteria for this item.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {previewQuality.map((q: any) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {q.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {q.description}
                            {q.descriptionCN ? ` · ${q.descriptionCN}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {q.picture && (
                            <button
                              onClick={() =>
                                window.open(
                                  resolveUrl(q.picture)!.replace(
                                    "/upload/fl_attachment/",
                                    "/upload/",
                                  ),
                                  "_blank",
                                )
                              }
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <EyeIconOutline className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openQualityModal(q)}
                            className="text-emerald-600 hover:text-emerald-800"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeQuality(q.id)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Attachments ({previewItem?.attachments?.length || 0})
                  </h3>
                  <button
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachments || !previewItem}
                    className="px-2.5 py-1 text-xs bg-[#8CC21B] text-white rounded-md hover:bg-[#7ab318] flex items-center gap-1 disabled:opacity-50"
                  >
                    <DocumentIcon className="w-3.5 h-3.5" />
                    {uploadingAttachments ? "Uploading..." : "Upload"}
                  </button>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={uploadPreviewAttachments}
                  />
                </div>
                {previewLoading ? (
                  <p className="text-xs text-gray-400">Loading…</p>
                ) : !previewItem?.attachments ||
                  previewItem.attachments.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No attachments for this item.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {previewItem.attachments.map((att: any, i: number) => {
                      const url = resolveUrl(att.url) || "";
                      return (
                        <div
                          key={att.id || i}
                          className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                        >
                          <span
                            className="text-sm text-gray-900 break-all min-w-0 pr-3"
                            title={att.originalName || att.filename}
                          >
                            {att.originalName || att.filename || "Attachment"}
                          </span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                              onClick={() =>
                                window.open(
                                  url.replace(
                                    "/upload/fl_attachment/",
                                    "/upload/",
                                  ),
                                  "_blank",
                                )
                              }
                              className="text-blue-600 hover:text-blue-800"
                              title="View"
                            >
                              <EyeIconOutline className="w-4 h-4" />
                            </button>
                            <a
                              href={
                                url.includes("cloudinary") &&
                                  !url.includes("/raw/")
                                  ? url.replace(
                                    "/upload/",
                                    "/upload/fl_attachment/",
                                  )
                                  : url
                              }
                              download={att.originalName || att.filename}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#8CC21B] hover:text-[#7ab318]"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => deletePreviewAttachment(att.id)}
                              className="text-rose-600 hover:text-rose-800"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4 text-blue-500" />
                  Pictures
                </h3>
                {(() => {
                  const pics = previewItem
                    ? [
                      previewItem.pictures?.shopPicture,
                      previewItem.pictures?.ebayPictures,
                      ...(previewItem.pictures?.pixPath || "")
                        .split(",")
                        .filter(Boolean),
                    ].filter(Boolean)
                    : [getThumb(previewRow)].filter(Boolean);
                  if (!pics || pics.length === 0)
                    return (
                      <p className="text-xs text-gray-400">No pictures.</p>
                    );
                  return (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {pics.map((url: any, i: number) => (
                        <div
                          key={i}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                        >
                          <img
                            src={resolveUrl(url)!}
                            alt={`pic-${i}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() =>
                              window.open(
                                resolveUrl(url)!.replace(
                                  "/upload/fl_attachment/",
                                  "/upload/",
                                ),
                                "_blank",
                              )
                            }
                            onError={(e) =>
                            ((e.target as HTMLImageElement).src =
                              "https://placehold.co/200x200?text=—")
                            }
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex justify-between gap-2 pt-6 mt-6 border-t">
                <button
                  onClick={handleDeletePreviewItem}
                  className="px-4 py-2 text-xs text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/items/${previewRow.id}`)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <EyeIconOutline className="w-4 h-4" />
                    Full Details
                  </button>
                  <button
                    onClick={closePreview}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {previewEdit && (
                    <button
                      onClick={handleSavePreview}
                      disabled={previewSaving || previewLoading}
                      className="px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
                    >
                      {previewSaving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <CustomModal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        title={
          editingQuality ? "Update Quality Criterion" : "Add Quality Criterion"
        }
        width="max-w-md"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <button
              onClick={() => setQualityModalOpen(false)}
              className="px-4 py-2 flex items-center gap-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <XCircleIcon className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={saveQuality}
              className="px-4 py-2 flex items-center gap-2 text-white bg-[#00A651] rounded-lg hover:bg-[#008c44]"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {editingQuality ? "Update" : "Add"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              value={qualityForm.name}
              onChange={(e) =>
                setQualityForm((p: any) => ({ ...p, name: e.target.value }))
              }
              placeholder="Quality name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Photo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="popup-quality-photo"
                className="hidden"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  setQualityForm((p: any) => ({
                    ...p,
                    picture: e.target.files![0],
                  }))
                }
              />
              <label
                htmlFor="popup-quality-photo"
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
              >
                Choose file
              </label>
              <span className="text-sm text-gray-500">
                {qualityForm.picture
                  ? qualityForm.picture.name
                  : qualityForm.pictureUrl
                    ? "Existing photo"
                    : "No file chosen"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={qualityForm.description}
              onChange={(e) =>
                setQualityForm((p: any) => ({
                  ...p,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description CN
            </label>
            <textarea
              value={qualityForm.descriptionCN}
              onChange={(e) =>
                setQualityForm((p: any) => ({
                  ...p,
                  descriptionCN: e.target.value,
                }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
      </CustomModal>

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
                  className="text-gray-400 hover:text-gray-600"
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
                    value={itemFormData.item_name_cn}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_name_cn: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    EAN
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={itemFormData.ean}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          ean: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Leave empty to auto-generate"
                    />
                    <button
                      onClick={() =>
                        setItemFormData((p: any) => ({
                          ...p,
                          ean: generateEAN13(),
                        }))
                      }
                      className="px-2 text-xs bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Gen
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DE Number
                  </label>
                  <input
                    value={itemFormData.item_no_de}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_no_de: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g. DE1024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DE Item Name
                  </label>
                  <input
                    value={itemFormData.item_name_de}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        item_name_de: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parent *
                  </label>
                  <ReactSelect
                    options={
                      refParents?.map((p) => ({
                        value: p.id,
                        label: `${p.name_de} (${p.de_no})`,
                      })) || []
                    }
                    value={
                      itemFormData.parent_id
                        ? {
                          value: itemFormData.parent_id,
                          label: (() => {
                            const p = refParents?.find(
                              (x) => x.id === itemFormData.parent_id,
                            );
                            return p
                              ? `${p.name_de} (${p.de_no})`
                              : "Unknown";
                          })(),
                        }
                        : null
                    }
                    onChange={(opt: any) =>
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
                      refTarics?.map((t) => ({
                        value: t.id,
                        label: `${t.code} - ${t.name_de}`,
                      })) || []
                    }
                    value={
                      itemFormData.taric_id
                        ? {
                          value: itemFormData.taric_id,
                          label: (() => {
                            const t = refTarics?.find(
                              (x) => x.id === itemFormData.taric_id,
                            );
                            return t ? `${t.code} - ${t.name_de}` : "Unknown";
                          })(),
                        }
                        : null
                    }
                    onChange={(opt: any) =>
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
                      categories?.map((c) => ({
                        value: c.id,
                        label: c.name,
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
                    onChange={(opt: any) =>
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
                      refSuppliers?.map((s) => ({
                        value: s.id,
                        label: getSupplierLabel(s),
                      })) || []
                    }
                    value={
                      itemFormData.supplier_id
                        ? {
                          value: itemFormData.supplier_id,
                          label: (() => {
                            const s = refSuppliers?.find(
                              (x) => x.id === itemFormData.supplier_id,
                            );
                            return s ? getSupplierLabel(s) : "Unknown";
                          })(),
                        }
                        : null
                    }
                    onChange={(opt: any) =>
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
                {(["weight", "length", "width", "height"] as const).map(
                  (dim) => (
                    <div key={dim}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {dim[0].toUpperCase() + dim.slice(1)} (
                        {dim === "weight" ? "kg" : "cm"})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={(itemFormData as any)[dim]}
                        onChange={(e) =>
                          setItemFormData({
                            ...itemFormData,
                            [dim]: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  ),
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <input
                    value={itemFormData.model}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        model: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
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
                      label: itemFormData.currency,
                    }}
                    onChange={(opt: any) =>
                      setItemFormData({
                        ...itemFormData,
                        currency: opt ? opt.value : "CNY",
                      })
                    }
                    className="text-sm"
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
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_special"
                    checked={itemFormData.is_eur_special}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        is_eur_special: e.target.checked,
                        is_rmb_special: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-green-600 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_special"
                    className="text-sm font-medium text-gray-700"
                  >
                    Special Item
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <TagPickerInput
                    category="item"
                    selectedTags={newItemTags}
                    onChange={setNewItemTags}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-6 mt-6 border-t">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItemSubmit}
                  disabled={
                    !itemFormData.item_name?.trim() || !itemFormData.parent_id
                  }
                  className="flex-1 px-4 py-2 bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
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
