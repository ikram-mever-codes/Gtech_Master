"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { Plus, FileText, ShoppingCart, Truck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import PageHeader from "@/components/UI/PageHeader";
import CargosTab from "@/components/cargos/CargosTab";
import CargoTypesTab from "@/components/cargos/CargoTypesTab";
import {
  markInvoiceAsPaid,
  getExpandedInvoiceDetails,
  updateInvoice,
} from "@/api/invoice";
import {
  updateOrderItemStatus,
  splitOrderItem,
  updateOrderItemPrice,
  getOrderById,
  updateOrder,
  deleteOrder,
} from "@/api/orders";
import { assignOrdersToCargo } from "@/api/cargos";
import { getItems, updateItem } from "@/api/items";
import { getSupplierItems } from "@/api/suppliers";
import { getTaricGroupKey } from "@/utils/invoice";

import {
  useInvoicesTabData,
  InvoicesTab,
} from "../../hooks/useInvoicesTabData";
import PackingListTab from "./PackingListTab";
import InvoicesFilterBar from "./InvoicesFilterBar";
import InvoicesTable from "./InvoicesTable";
import OrdersTabPanel from "./OrdersTabPanel";
import {
  InvoiceDetailsModal,
  OrderFormModal,
  OrderDetailsModal,
  ReassignModal,
  SplitModal,
  TaricModal,
  QtyModal,
} from "./LazyModals";
import {
  Invoice,
  FilterOptions,
  InvoiceSortField,
  InvoiceEditForm,
  ExpandedStates,
  initialFilterOptions,
  filterAndSortInvoices,
  getBillToDisplayName as getBillToDisplayNameFrom,
  getCargoTypeNameFromInvoice as getCargoTypeNameFrom,
} from "./invoiceHelpers";
import {
  buildOrderItemsFlat,
  filterOrders,
  getCategoryNameFrom,
  getSupplierNameFrom,
} from "./orderHelpers";

const invoiceTabs = [
  { id: "orders", label: "Orders" },
  { id: "order_items", label: "Order Items" },
  { id: "open_invoices", label: "Open Invoices" },
  { id: "closed_invoices", label: "Closed Invoices" },
  { id: "cargos", label: "Cargos" },
  { id: "cargo_type", label: "Cargo Type" },
  { id: "packing_list", label: "Packing List" },
] as const satisfies readonly { id: InvoicesTab; label: string }[];

type InvoiceTab = InvoicesTab;

const validTabs: string[] = invoiceTabs.map((t) => t.id);

const InvoiceListPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);
  const cargosTabRef = useRef<any>(null);
  const cargoTypesTabRef = useRef<any>(null);

  const tabData = useInvoicesTabData();

  const [activeInvTab, setActiveInvTab] = useState<InvoiceTab>(
    () => (searchParams.get("tab") as InvoiceTab) || "orders",
  );

  // Lazy, cached per-tab data loading (see useInvoicesTabData).
  const { ensureLoaded } = tabData;
  useEffect(() => {
    ensureLoaded(activeInvTab);
  }, [activeInvTab, ensureLoaded]);

  // ---------------------------------------------------------------------
  // Filters / search / sort / pagination
  // ---------------------------------------------------------------------
  const [searchTerm, setSearchTerm] = useState("");
  const [orderNoFilter, setOrderNoFilter] = useState<string>(
    () => searchParams.get("order_no") || "",
  );
  const [cargoStatusFilter, setCargoStatusFilter] = useState("Open");
  const [filters, setFilters] = useState<FilterOptions>(initialFilterOptions);
  const [sortField, setSortField] = useState<InvoiceSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const filteredInvoices = useMemo(
    () =>
      filterAndSortInvoices(
        tabData.invoices,
        activeInvTab,
        searchTerm,
        filters,
        sortField,
        sortDirection,
      ),
    [
      tabData.invoices,
      activeInvTab,
      searchTerm,
      filters,
      sortField,
      sortDirection,
    ],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    filters,
    tabData.invoices,
    sortField,
    sortDirection,
    activeInvTab,
  ]);

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filterParam = searchParams.get("filter");

  const orderItemsFlat = useMemo(
    () => buildOrderItemsFlat(tabData.orders, filterParam, orderNoFilter),
    [tabData.orders, orderNoFilter, filterParam],
  );

  const filteredOrders = useMemo(
    () => filterOrders(tabData.orders, filterParam, orderNoFilter),
    [tabData.orders, orderNoFilter, filterParam],
  );

  // ---------------------------------------------------------------------
  // URL <-> state sync
  // ---------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeInvTab);
    if (orderNoFilter) params.set("order_no", orderNoFilter);
    else params.delete("order_no");
    const qs = params.toString();
    router.replace(qs ? `/invoices?${qs}` : "/invoices", { scroll: false });
  }, [activeInvTab, orderNoFilter, router, searchParams]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveInvTab(tabParam as InvoiceTab);
    }
    const orderNo = searchParams.get("order_no");
    if (orderNo !== null) {
      setOrderNoFilter(orderNo);
    }
  }, [searchParams]);

  // ---------------------------------------------------------------------
  // Invoice rows: expansion + details modal
  // ---------------------------------------------------------------------
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedStates, setExpandedStates] = useState<ExpandedStates>({});
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"taric" | "items">(
    "taric",
  );
  const [invoiceEditForm, setInvoiceEditForm] = useState<InvoiceEditForm>({
    description: "",
    freightCost: "",
    remark: "",
  });
  const [expandedPriceItemId, setExpandedPriceItemId] = useState<string | null>(
    null,
  );
  const [editingPrice, setEditingPrice] = useState<number>(0);

  /** Loads the expanded (taric groups + detailed items) data for an invoice
   * once; shared by the row expander and the details modal. */
  const loadExpandedDetails = async (invoice: Invoice, logLabel?: string) => {
    const currentState = expandedStates[invoice.id] || {};
    if (currentState.data) return;
    setExpandedStates((prev) => ({
      ...prev,
      [invoice.id]: { ...currentState, loading: true },
    }));
    try {
      const response = await getExpandedInvoiceDetails(invoice.id);
      if (response.success) {
        setExpandedStates((prev) => ({
          ...prev,
          [invoice.id]: {
            taric: true,
            items: true,
            data: response.data,
            loading: false,
          },
        }));
      }
    } catch (error) {
      if (logLabel) console.error(logLabel, error);
      else console.error(error);
      setExpandedStates((prev) => ({
        ...prev,
        [invoice.id]: { ...currentState, loading: false },
      }));
    }
  };

  const handleToggleRowExpand = async (invoice: Invoice) => {
    const next = new Set(expandedInvoiceIds);
    if (next.has(invoice.id)) {
      next.delete(invoice.id);
    } else {
      next.add(invoice.id);
      await loadExpandedDetails(invoice, "Failed to load invoice items:");
    }
    setExpandedInvoiceIds(next);
  };

  const handleOpenInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetailsModal(true);
    setModalActiveTab("taric");
    setInvoiceEditForm({
      description: invoice.description || "",
      freightCost: invoice.freightCost?.toString() || "",
      remark: invoice.remark || "",
    });
    await loadExpandedDetails(invoice);
  };

  const getCargoTypeName = useCallback(
    (invoice: Invoice) =>
      getCargoTypeNameFrom(invoice, tabData.cargos, tabData.cargoTypesList),
    [tabData.cargos, tabData.cargoTypesList],
  );

  const getBillToDisplayName = useCallback(
    (invoice: Invoice) =>
      getBillToDisplayNameFrom(invoice, tabData.gtechCompanies),
    [tabData.gtechCompanies],
  );

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const invoice = tabData.invoices.find((inv) => inv.id === invoiceId);
      if (
        !invoice ||
        invoice.freightCost === null ||
        invoice.freightCost === undefined ||
        Number(invoice.freightCost) <= 0
      ) {
        toast.error(
          "Please provide a freight cost by editing the invoice before verifying it.",
        );
        return;
      }
      if (!invoice.description || !invoice.description.trim()) {
        toast.error(
          "Please provide a description by editing the invoice before verifying it.",
        );
        return;
      }

      setActionLoading((prev) => ({ ...prev, [`paid-${invoiceId}`]: true }));
      await markInvoiceAsPaid(invoiceId);
      await tabData.refetchInvoices();
      setSelectedInvoice((prev) => (prev ? { ...prev, status: "paid" } : null));
      toast.success("Invoice verified successfully");
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`paid-${invoiceId}`]: false }));
    }
  };

  const handleSaveInvoiceEdit = async (invoiceId: string) => {
    if (!invoiceEditForm.description?.trim()) {
      toast.error("Description is required");
      return;
    }
    if (
      invoiceEditForm.freightCost === "" ||
      invoiceEditForm.freightCost === null ||
      invoiceEditForm.freightCost === undefined ||
      Number(invoiceEditForm.freightCost) <= 0
    ) {
      toast.error("Freight Cost must be greater than 0");
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [`save-${invoiceId}`]: true }));
      await updateInvoice({
        id: invoiceId,
        description: invoiceEditForm.description,
        freightCost: invoiceEditForm.freightCost,
        remark: invoiceEditForm.remark,
      });
      await tabData.refetchInvoices();
      setSelectedInvoice((prev) =>
        prev
          ? {
              ...prev,
              description: invoiceEditForm.description,
              freightCost: invoiceEditForm.freightCost,
              remark: invoiceEditForm.remark,
            }
          : null,
      );
      toast.success("Invoice changes saved successfully");
    } catch (error) {
      console.error("Failed to save invoice edits:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`save-${invoiceId}`]: false }));
    }
  };

  const handleSetPrice = async (itemId: string | number) => {
    try {
      const res = await updateOrderItemPrice(itemId, editingPrice);
      if (res.success) {
        setExpandedPriceItemId(null);
        Object.keys(expandedStates).forEach(async (invId) => {
          if (expandedStates[invId].items) {
            const response = await getExpandedInvoiceDetails(invId);
            if (response.success) {
              setExpandedStates((prev) => ({
                ...prev,
                [invId]: { ...prev[invId], data: response.data },
              }));
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  // ---------------------------------------------------------------------
  // Order-item action modals (Reassign / Split / Taric / Qty)
  // ---------------------------------------------------------------------
  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [showQTYModal, setShowQTYModal] = useState(false);
  const [showTaricModal, setShowTaricModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [newQty, setNewQty] = useState<number>(0);
  const [targetCargoId, setTargetCargoId] = useState<string>("");
  const [splitRemarks, setSplitRemarks] = useState<string>("");
  const [qtyRemarks, setQtyRemarks] = useState("");
  const [selectedTaricCode, setSelectedTaricCode] = useState<string>("");
  const [selectedTaricGroup, setSelectedTaricGroup] = useState<any>(null);

  // Openers used by the invoice tables / Invoice Details modal.
  const openQtyModal = (it: any) => {
    setSelectedItem(it);
    setNewQty(it.qty_label || it.qty);
    setQtyRemarks(it.remarks_cn || "");
    setShowQTYModal(true);
  };

  const openInvoiceItemSplitModal = (it: any) => {
    setSelectedItem(it);
    setSplitQty(Math.floor(it.qty * 0.5));
    setTargetCargoId("");
    setSplitRemarks(it.remarks_cn || "");
    setShowSPModal(true);
  };

  const openInvoiceItemReassignModal = (it: any) => {
    setSelectedItem(it);
    setTargetCargoId(it.cargo_id || "");
    setShowREModal(true);
  };

  const openTaricModal = (group: any) => {
    setSelectedTaricGroup(group);
    setSelectedTaricCode("");
    setShowTaricModal(true);
  };

  // Openers used by OrdersTable (Orders / Order Items tabs).
  const handleOpenReassignModal = (item: any) => {
    setSelectedItem(item);
    setTargetCargoId(item.cargo_id ? String(item.cargo_id) : "");
    setShowREModal(true);
  };

  const handleOpenSplitModal = (item: any) => {
    setSelectedItem(item);
    setSplitQty(item.qty_label || item.qty || 0);
    setShowSPModal(true);
  };

  /** After a reassign / split: reload invoices, orders and the Cargos tab,
   * then refresh every currently expanded invoice's details and drop the
   * cached details of collapsed ones. */
  const refreshAfterItemMove = async () => {
    await Promise.all([
      tabData.refetchInvoices(),
      tabData.refetchOrders(),
      cargosTabRef.current?.fetchCargos?.(),
    ]);

    const expandedKeys = Object.keys(expandedStates).filter(
      (key) => expandedStates[key]?.items || expandedStates[key]?.taric,
    );

    if (expandedKeys.length > 0) {
      await Promise.all(
        expandedKeys.map(async (invId) => {
          try {
            const res = await getExpandedInvoiceDetails(invId);
            if (res?.success) {
              setExpandedStates((prev) => ({
                ...prev,
                [invId]: { ...prev[invId], data: res.data },
              }));
            }
          } catch (e) {
            console.error(
              `Failed to refresh expanded details for invoice ${invId}`,
              e,
            );
          }
        }),
      );
    }

    setExpandedStates((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        if (!newState[key]?.items && !newState[key]?.taric) {
          delete newState[key].data;
        }
      });
      return newState;
    });
  };

  const handleReassignItem = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      const cargoIdNum = Number(targetCargoId);
      const isItem =
        activeInvTab === "order_items" ||
        !!selectedItem.item_id ||
        !!selectedItem.parentOrder;

      if (isItem) {
        await updateOrderItemStatus(selectedItem.id, { cargo_id: cargoIdNum });
      } else {
        const orderId = selectedItem.order_id || selectedItem.id;
        await assignOrdersToCargo(cargoIdNum, [Number(orderId)], false);
        toast.success(
          `Order ${selectedItem.order_no || orderId} assigned to Cargo ${targetCargoId}`,
        );
      }

      setShowREModal(false);
      await refreshAfterItemMove();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign/reassign cargo");
    }
  };

  const handleSplitItem = async () => {
    if (!selectedItem || splitQty <= 0) return;
    try {
      await splitOrderItem(
        selectedItem.id,
        splitQty,
        targetCargoId,
        splitRemarks,
        selectedItem.cargo_id,
      );
      toast.success("Item split and moved successfully");
      setShowSPModal(false);
      setSplitRemarks("");
      await refreshAfterItemMove();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetTaric = async (group: any) => {
    if (!selectedTaricCode || !group) return;
    try {
      const invId = Object.keys(expandedStates).find(
        (key) =>
          expandedStates[key].taric &&
          expandedStates[key].data?.taricGroups?.some(
            (g: any) => g.taricId === group.taricId,
          ),
      );

      if (!invId) {
        toast.error("Could not find invoice for this taric group");
        return;
      }

      const itemsInGroup = expandedStates[invId].data?.detailedItems?.filter(
        (oi: any) => getTaricGroupKey(oi) === group.taricId,
      );

      if (itemsInGroup && itemsInGroup.length > 0) {
        for (const oi of itemsInGroup) {
          const originalCode = oi.item?.taric?.code;
          const hasOriginal =
            originalCode &&
            originalCode !== "0" &&
            originalCode !== "0000000000";

          // Always re-base on "original/new" rather than chaining through
          // every prior override — set_taric_code only needs to carry the
          // original code (for audit) and the current one.
          const newTaricValue = hasOriginal
            ? `${originalCode}/${selectedTaricCode}`
            : selectedTaricCode;
          await updateOrderItemStatus(oi.id, { set_taric_code: newTaricValue });
        }
        toast.success("Taric codes updated successfully");
        setShowTaricModal(false);
        setSelectedTaricCode("");

        const res = await getExpandedInvoiceDetails(invId);
        if (res.success) {
          setExpandedStates((prev) => ({
            ...prev,
            [invId]: { ...prev[invId], data: res.data },
          }));
        }
      } else {
        toast.error("No items found in this group to update");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update taric codes");
    }
  };

  const handleUpdateQty = async () => {
    if (!selectedItem || newQty <= 0) return;
    try {
      await updateOrderItemStatus(selectedItem.id, {
        qty_label: newQty,
        remarks_cn: qtyRemarks,
      });
      toast.success("QtyLabel updated successfully");
      setShowQTYModal(false);
      setQtyRemarks("");
      const invId = Object.keys(expandedStates).find((key) =>
        expandedStates[key].data?.detailedItems?.some(
          (it: any) => it.id === selectedItem.id,
        ),
      );
      if (invId) {
        const res = await getExpandedInvoiceDetails(invId);
        setExpandedStates((prev) => ({
          ...prev,
          [invId]: { ...prev[invId], data: res.data },
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------------------
  // Orders / Order Items: view + edit order
  // ---------------------------------------------------------------------
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "convert">("create");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [form, setForm] = useState({
    comment: "",
    customer_id: "",
    category_id: "",
    supplier_id: "",
    status: "",
    ref_no: "",
  });
  const [itemsByCategory, setItemsByCategory] = useState<any[]>([]);
  const [itemsBySupplier, setItemsBySupplier] = useState<any[]>([]);
  const [loadingItemsByCategory, setLoadingItemsByCategory] = useState(false);
  const [loadingItemsBySupplier, setLoadingItemsBySupplier] = useState(false);

  const isTab1 = activeInvTab !== "order_items";

  const effectiveItems = useMemo(() => {
    if (form.supplier_id) return itemsBySupplier;
    if (form.category_id) return itemsByCategory;
    return tabData.itemsAll;
  }, [
    form.supplier_id,
    itemsBySupplier,
    form.category_id,
    itemsByCategory,
    tabData.itemsAll,
  ]);

  const loadingItems =
    tabData.loadingItemsAll ||
    (isTab1 && !!form.supplier_id && loadingItemsBySupplier) ||
    (isTab1 && !!form.category_id && loadingItemsByCategory);

  const itemById = useMemo(() => {
    const map = new Map<string, any>();
    for (const it of tabData.itemsAll) map.set(String(it.id), it);
    return map;
  }, [tabData.itemsAll]);

  const getCategoryName = useCallback(
    (categoryId: string | number) =>
      getCategoryNameFrom(tabData.categories, categoryId),
    [tabData.categories],
  );

  const getSupplierName = useCallback(
    (supplierId: any) => getSupplierNameFrom(tabData.suppliers, supplierId),
    [tabData.suppliers],
  );

  const resetForm = useCallback(() => {
    setForm({
      comment: "",
      customer_id: "",
      category_id: "",
      supplier_id: "",
      status: "",
      ref_no: "",
    });
    setSelectedItemId("");
    setOrderItems([]);
    setItemsByCategory([]);
    setItemsBySupplier([]);
    setSelectedOrder(null);
    setMode("create");
  }, []);

  const fetchItemsByCategory = useCallback(async (category_id: string) => {
    if (!category_id) {
      setItemsByCategory([]);
      return;
    }
    try {
      setLoadingItemsByCategory(true);
      const response = await getItems({ category: category_id });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.items || [];
      setItemsByCategory(arr);
    } catch (error) {
      console.error("Error fetching category items:", error);
      setItemsByCategory([]);
    } finally {
      setLoadingItemsByCategory(false);
    }
  }, []);

  const handleCategoryChange = async (category_id: string) => {
    setForm((prev) => ({ ...prev, category_id }));
    setSelectedItemId("");
    setOrderItems([]);
    if (category_id) {
      await fetchItemsByCategory(category_id);
      return;
    }
    setItemsByCategory([]);
  };

  const handleSupplierChange = async (
    supplier_id: string,
    resetOrderItemsFlag: boolean = true,
  ) => {
    setForm((prev) => ({ ...prev, supplier_id }));
    setSelectedItemId("");
    if (resetOrderItemsFlag) setOrderItems([]);

    if (supplier_id) {
      setLoadingItemsBySupplier(true);
      try {
        const response: any = await getSupplierItems(supplier_id);
        const data = response?.data ?? response;
        const arr = Array.isArray(data) ? data : data?.items || [];
        setItemsBySupplier(arr);
      } catch (e) {
        console.error(e);
        toast.error("Failed to fetch supplier items");
        setItemsBySupplier([]);
      } finally {
        setLoadingItemsBySupplier(false);
      }
      return;
    }
    setItemsBySupplier([]);
  };

  const handleAddItemToOrder = (item_id: string, qty: number) => {
    const item = itemById.get(String(item_id));
    const itemName = item?.item_name || item?.name || "Unnamed Item";

    setOrderItems((prev) => {
      const idx = prev.findIndex((x) => x.item_id === String(item_id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [
        ...prev,
        {
          item_id: String(item_id),
          itemName,
          qty,
          remark_de: "",
          price: item?.price
            ? Number(item.price)
            : item?.RMB_Price
              ? Number(item.RMB_Price)
              : undefined,
          currency: item?.currency || "CNY",
        },
      ];
    });
    toast.success(`Added ${qty}x ${itemName} to order`);
  };

  const handleRemoveOrderItem = (item_id: string) =>
    setOrderItems((prev) => prev.filter((x) => x.item_id !== item_id));

  const handleUpdateOrderItemQty = (item_id: string, qty: number) => {
    if (!qty || qty <= 0) return;
    setOrderItems((prev) =>
      prev.map((x) => (x.item_id === item_id ? { ...x, qty } : x)),
    );
  };

  const handleUpdateOrderItemRemark = (item_id: string, remark_de: string) => {
    setOrderItems((prev) =>
      prev.map((x) => (x.item_id === item_id ? { ...x, remark_de } : x)),
    );
  };

  const handleEditOrder = async (order: any) => {
    setForm({
      category_id: String(order.category_id ?? ""),
      customer_id: String(order.customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
      ref_no: "",
    });

    setMode("edit");
    setSelectedOrder(order);
    setShowModal(true);

    const category_id = String(order.category_id ?? "");
    if (category_id) await fetchItemsByCategory(category_id);
    else setItemsByCategory([]);

    const supplier_id = String(order.supplier_id ?? "");
    if (supplier_id) await handleSupplierChange(supplier_id, false);
    else setItemsBySupplier([]);

    const detailRes: any = await getOrderById(order.id);
    const detail = detailRes?.data ?? detailRes;
    const lines = detail?.items ?? detail?.data?.items ?? [];

    if (Array.isArray(lines)) {
      setOrderItems(
        lines.map((l: any) => {
          const id = String(l.item_id ?? "");
          const item = itemById.get(id);
          return {
            item_id: id,
            itemName: item?.item_name || item?.name || "Unknown item",
            qty: Number(l.qty ?? 1),
            remark_de: String(l.remark_de ?? ""),
          };
        }),
      );
    } else {
      setOrderItems([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder?.id) return;
    if (orderItems.length === 0)
      return toast.error("Please add at least one item");

    const payload = {
      customer_id: (form.customer_id || null) as any,
      category_id: (form.category_id || null) as any,
      supplier_id: (form.supplier_id || null) as any,
      comment: (form.comment || "").slice(0, 200),
      status: Number(form.status || selectedOrder.status || 1),
      items: orderItems.map((x) => ({
        item_id: Number(x.item_id),
        qty: Number(x.qty),
        remark_de: x.remark_de || null,
      })),
    };

    await updateOrder(selectedOrder.id, payload);
    setShowModal(false);
    resetForm();
    tabData.refetchOrders();
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this Order?")) return;
    await deleteOrder(orderId);
    tabData.refetchOrders();
  };

  const handleGoToItems = (orderNo: string) => {
    setOrderNoFilter(orderNo);
    setActiveInvTab("order_items");
  };

  const handleViewOrder = (order: any) => {
    setViewOrder(order);
    const sortedItems = [...(order.items || [])].sort((a: any, b: any) => {
      const posA = Number(a.position ?? a.id ?? 0);
      const posB = Number(b.position ?? b.id ?? 0);
      return posA - posB;
    });
    setViewItems(
      sortedItems.map((it: any) => ({
        ...it,
        itemName:
          it.item?.item_name || it.item?.name || it.itemName || "Unknown",
      })),
    );
    setShowViewModal(true);
  };

  const closeView = () => {
    setShowViewModal(false);
    setViewOrder(null);
    setViewItems([]);
  };

  const handleAssignSupplier = async (
    orderItemId: number | string,
    supplierId: number,
    baseItemId?: number | string,
  ) => {
    try {
      await updateOrderItemStatus(orderItemId, { supplier_id: supplierId });
      if (baseItemId) {
        await updateItem(Number(baseItemId), { supplier_id: supplierId });
      }
      await Promise.all([tabData.refetchOrders(), tabData.refetchAllItems()]);
      toast.success("Supplier assigned successfully");
    } catch (error) {
      console.error("Failed to assign supplier:", error);
      toast.error("Failed to assign supplier");
    }
  };

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <div className="w-full mx-auto">
      <div
        className="bg-white min-h-[80vh] rounded-lg shadow-sm pb-8 p-6"
        style={{
          border: "1px solid #e0e0e0",
          background: "linear-gradient(to bottom, #ffffff, #f9f9f9)",
        }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <PageHeader
              title={
                activeInvTab === "orders"
                  ? "Orders"
                  : activeInvTab === "order_items"
                    ? "Order Items"
                    : activeInvTab === "cargos"
                      ? "Cargos"
                      : activeInvTab === "cargo_type"
                        ? "Cargo Types"
                        : "Delivery"
              }
              icon={
                activeInvTab === "orders" || activeInvTab === "order_items"
                  ? ShoppingCart
                  : activeInvTab === "cargos" || activeInvTab === "cargo_type"
                    ? Truck
                    : FileText
              }
            />
          </div>
          <div className="flex items-center gap-3">
            {activeInvTab === "cargos" ? (
              <button
                onClick={() => cargosTabRef.current?.handleOpenCreate?.()}
                className="px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-xl flex items-center gap-2 font-semibold shadow-sm transition-all text-sm"
              >
                <Plus className="h-4 w-4" />
                Cargo
              </button>
            ) : activeInvTab === "cargo_type" ? (
              <button
                onClick={() => cargoTypesTabRef.current?.handleOpenCreate?.()}
                className="px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-xl flex items-center gap-2 font-semibold shadow-sm transition-all text-sm"
              >
                <Plus className="h-4 w-4" />
                Cargo Type
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex overflow-x-auto mb-6 border-b border-gray-100 pb-px">
          {invoiceTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveInvTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap -mb-px ${
                activeInvTab === tab.id
                  ? "text-[#8CC21B] border-b-2 border-[#8CC21B]"
                  : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <InvoicesFilterBar
          activeInvTab={activeInvTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          orderNoFilter={orderNoFilter}
          setOrderNoFilter={setOrderNoFilter}
          filters={filters}
          cargoStatusFilter={cargoStatusFilter}
          setCargoStatusFilter={setCargoStatusFilter}
          onReset={() => {
            setSearchTerm("");
            setOrderNoFilter("");
            setFilters(initialFilterOptions);
            setCargoStatusFilter("Open");
          }}
        />

        {(activeInvTab === "orders" || activeInvTab === "order_items") && (
          <OrdersTabPanel
            activeInvTab={activeInvTab}
            orderNoFilter={orderNoFilter}
            onClearOrderNoFilter={() => setOrderNoFilter("")}
            orders={activeInvTab === "orders" ? filteredOrders : orderItemsFlat}
            loading={tabData.loadingOrders}
            getCategoryName={getCategoryName}
            getSupplierName={getSupplierName}
            onView={handleViewOrder}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            canDelete={user?.role === "ADMIN"}
            onReassign={handleOpenReassignModal}
            onGoToItems={handleGoToItems}
            itemById={itemById}
            suppliers={tabData.suppliers}
            onAssignSupplier={handleAssignSupplier}
            onSplit={handleOpenSplitModal}
            router={router}
            cargos={tabData.cargos}
          />
        )}

        {(activeInvTab === "open_invoices" ||
          activeInvTab === "closed_invoices") && (
          <InvoicesTable
            activeInvTab={activeInvTab}
            loading={tabData.loadingInvoices}
            filteredInvoices={filteredInvoices}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            setCurrentPage={setCurrentPage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            expandedInvoiceIds={expandedInvoiceIds}
            expandedStates={expandedStates}
            onToggleRowExpand={handleToggleRowExpand}
            onOpenInvoiceDetails={handleOpenInvoiceDetails}
            getBillToDisplayName={getBillToDisplayName}
            getCargoTypeName={getCargoTypeName}
            onOpenQtyModal={openQtyModal}
            onOpenSplitModal={openInvoiceItemSplitModal}
            onOpenReassignModal={openInvoiceItemReassignModal}
          />
        )}

        {activeInvTab === "cargos" && (
          <div
            className="bg-white rounded-[4px] border border-[#E9ECEF] p-4"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <CargosTab
              ref={cargosTabRef}
              searchTerm={orderNoFilter}
              statusFilter={cargoStatusFilter}
              setStatusFilter={setCargoStatusFilter}
            />
          </div>
        )}

        {activeInvTab === "cargo_type" && (
          <div
            className="bg-white rounded-[4px] border border-[#E9ECEF] p-4"
            style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
          >
            <CargoTypesTab ref={cargoTypesTabRef} searchQuery={orderNoFilter} />
          </div>
        )}

        {activeInvTab === "packing_list" && (
          <div className="bg-white rounded-[4px] border border-[#E9ECEF] p-4 shadow-sm">
            <PackingListTab searchTerm={orderNoFilter} />
          </div>
        )}

        {showInvoiceDetailsModal && selectedInvoice && (
          <InvoiceDetailsModal
            isOpen={showInvoiceDetailsModal}
            onClose={() => setShowInvoiceDetailsModal(false)}
            selectedInvoice={selectedInvoice}
            activeInvTab={activeInvTab}
            actionLoading={actionLoading}
            setActionLoading={setActionLoading}
            modalActiveTab={modalActiveTab}
            expandedStates={expandedStates}
            invoiceEditForm={invoiceEditForm}
            setInvoiceEditForm={setInvoiceEditForm}
            onMarkAsPaid={handleMarkAsPaid}
            onSaveInvoiceEdit={handleSaveInvoiceEdit}
            expandedPriceItemId={expandedPriceItemId}
            setExpandedPriceItemId={setExpandedPriceItemId}
            editingPrice={editingPrice}
            setEditingPrice={setEditingPrice}
            onSetPrice={handleSetPrice}
            onOpenQtyModal={openQtyModal}
            onOpenSplitModal={openInvoiceItemSplitModal}
            onOpenReassignModal={openInvoiceItemReassignModal}
            onOpenTaricModal={openTaricModal}
          />
        )}

        {showREModal && selectedItem && (
          <ReassignModal
            isOpen={showREModal}
            onClose={() => setShowREModal(false)}
            selectedItem={selectedItem}
            cargos={tabData.cargos}
            targetCargoId={targetCargoId}
            setTargetCargoId={setTargetCargoId}
            onConfirm={handleReassignItem}
            onCargoCreated={(newCargo) => {
              tabData.setCargos((prev) => [...prev, newCargo]);
            }}
          />
        )}

        {showSPModal && selectedItem && (
          <SplitModal
            isOpen={showSPModal}
            onClose={() => setShowSPModal(false)}
            selectedItem={selectedItem}
            cargos={tabData.cargos}
            splitQty={splitQty}
            setSplitQty={setSplitQty}
            targetCargoId={targetCargoId}
            setTargetCargoId={setTargetCargoId}
            splitRemarks={splitRemarks}
            setSplitRemarks={setSplitRemarks}
            onConfirm={handleSplitItem}
          />
        )}

        {showTaricModal && selectedTaricGroup && (
          <TaricModal
            isOpen={showTaricModal}
            onClose={() => setShowTaricModal(false)}
            selectedTaricGroup={selectedTaricGroup}
            tarics={tabData.tarics}
            selectedTaricCode={selectedTaricCode}
            setSelectedTaricCode={setSelectedTaricCode}
            onConfirm={() => handleSetTaric(selectedTaricGroup)}
          />
        )}

        {showQTYModal && selectedItem && (
          <QtyModal
            isOpen={showQTYModal}
            onClose={() => setShowQTYModal(false)}
            selectedItem={selectedItem}
            newQty={newQty}
            setNewQty={setNewQty}
            qtyRemarks={qtyRemarks}
            setQtyRemarks={setQtyRemarks}
            onConfirm={handleUpdateQty}
          />
        )}

        {showViewModal && (
          <OrderDetailsModal
            isOpen={showViewModal}
            onClose={closeView}
            viewOrder={viewOrder}
            viewItems={viewItems}
            getCategoryName={getCategoryName}
            getSupplierName={getSupplierName}
          />
        )}

        {showModal && (
          <OrderFormModal
            isOpen={showModal}
            onClose={closeModal}
            mode={mode}
            categories={tabData.categories}
            suppliers={tabData.suppliers}
            form={form}
            onCategoryChange={handleCategoryChange}
            onSupplierChange={handleSupplierChange}
            onCommentChange={(comment) =>
              setForm((prev) => ({ ...prev, comment }))
            }
            effectiveItems={effectiveItems}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
            onAddItem={handleAddItemToOrder}
            loadingItems={loadingItems}
            orderItems={orderItems}
            onUpdateOrderItemQty={handleUpdateOrderItemQty}
            onUpdateOrderItemRemark={handleUpdateOrderItemRemark}
            onRemoveOrderItem={handleRemoveOrderItem}
            onSubmit={handleUpdateOrder}
          />
        )}
      </div>
    </div>
  );
};

const InvoiceListPageWrapper: React.FC = () => (
  <Suspense
    fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}
  >
    <InvoiceListPage />
  </Suspense>
);

export default InvoiceListPageWrapper;
