"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import Select from "react-select";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
  X,
  RefreshCw,
  User,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlusCircle,
  Loader2,
  ChevronDown,
  Package,
  Clock,
} from "lucide-react";

import {
  getAllInvoices,
  generateInvoicePdf,
  deleteInvoice,
  markInvoiceAsPaid,
  cancelInvoice,
  getExpandedInvoiceDetails,
  updateInvoice,
} from "@/api/invoice";
import SpreadSheet from "@/components/UI/SpreadSheet";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/UI/PageHeader";
import Link from "next/link";
import CargosTab from "@/components/cargos/CargosTab";
import CargoTypesTab from "@/components/cargos/CargoTypesTab";
import PackingListTab from "./PackingListTab";
import {
  getAllCustomers,
  CustomerData as APICustomerData,
} from "@/api/customers";
import {
  updateOrderItemStatus,
  splitOrderItem,
  updateOrderItemPrice,
  downloadCommercialInvoice,
  getAllOrders,
  getOrderStatusColor,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} from "@/api/orders";
import { getAllCargos, CargoType, assignOrdersToCargo } from "@/api/cargos";
import { getAllTaricsSimple, getItems, updateItem } from "@/api/items";
import { getAllSuppliers, getSupplierItems } from "@/api/suppliers";
import { getCategories } from "@/api/categories";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import { ShoppingCart, Truck } from "lucide-react";

import { toast } from "react-hot-toast";
import CustomModal from "@/components/UI/CustomModal";
import SegmentedControl from "@/components/UI/SegmentedControl";
import { Pencil, Scissors, MoveRight } from "lucide-react";
import ItemSelectorWithQuantity from "@/components/orders/ItemSelectorWithQuantity";
import OrdersTable from "@/components/orders/OrdersTable";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import { formatDate } from "@/utils/date";
import { formatCountryCode } from "@/utils/address";

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");

const getInputClass = (hasValue: boolean, isEmptySelect: boolean = false) => {
  return `w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all ${hasValue
    ? "font-bold text-emerald-600 border-emerald-500 bg-emerald-50/20"
    : isEmptySelect
      ? "text-gray-400 border-gray-300 bg-white"
      : "text-gray-900 border-gray-300 bg-white"
    }`;
};

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  cargoNo?: string;
  invoiceDate: string;
  deliveryDate: string;
  netTotal: number;
  taxAmount: number;
  pdfUrl: string;
  grossTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  shippingMethod: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes?: string;
  customer: {
    id: string;
    companyName: string;
    email: string;
    contactPhoneNumber: string;
    contactEmail?: string;
    taxNumber?: string;
    addressLine1?: string;
    city?: string;
    country?: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    articleNumber?: string;
    description: string;
    unitPrice: number;
    netPrice: number;
    taxRate: number;
    taxAmount: number;
    grossPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
  bill_to?: string;
  ship_to?: string;
  customItemCount?: number;
  description?: string;
  freightCost?: number | string;
  remark?: string;
  customTotalQty?: number;
  cargoId?: number | null;
  cargo?: { id: number; cargo_no?: string } | null;
}

interface FilterOptions {
  status: string;
  dateFrom: string;
  dateTo: string;
  customer: string;
  minAmount: string;
  maxAmount: string;
}

const invoiceTabs = [
  { id: "orders", label: "Orders" },
  { id: "order_items", label: "Order Items" },
  { id: "open_invoices", label: "Open Invoices" },
  { id: "closed_invoices", label: "Closed Invoices" },
  { id: "cargos", label: "Cargos" },
  { id: "cargo_type", label: "Cargo Type" },
  { id: "packing_list", label: "Packing List" },
] as const;

type Item = {
  id: string | number;
  item_name?: string;
  name?: string;
  ean?: number | string;
  RMB_Price?: number;
  supplier_id?: string | number;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  item: any;
  taric?: any;
  price?: number;
  currency?: string;
  supplier_name?: string;
};

type Option = { value: string; label: string };



type InvoiceTab = (typeof invoiceTabs)[number]["id"];


const InvoiceListPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSelector((state: RootState) => state.user);
  const cargosTabRef = useRef<any>(null);
  const cargoTypesTabRef = useRef<any>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<APICustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInvTab, setActiveInvTab] = useState<InvoiceTab>(
    () => (searchParams.get("tab") as InvoiceTab) || "orders",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [cargoStatusFilter, setCargoStatusFilter] = useState("Open");
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof Invoice>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {},
  );

  const [filters, setFilters] = useState<FilterOptions>({
    status: "",
    dateFrom: "",
    dateTo: "",
    customer: "",
    minAmount: "",
    maxAmount: "",
  });

  const [expandedStates, setExpandedStates] = useState<
    Record<
      string,
      { taric?: boolean; items?: boolean; data?: any; loading?: boolean }
    >
  >({});

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"taric" | "items">("taric");

  const handleOpenInvoiceDetails = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetailsModal(true);
    setModalActiveTab("taric");
    setInvoiceEditForm({
      description: invoice.description || "",
      freightCost: invoice.freightCost?.toString() || "",
      remark: invoice.remark || "",
    });

    const currentState = expandedStates[invoice.id] || {};
    if (!currentState.data) {
      setExpandedStates((prev) => ({
        ...prev,
        [invoice.id]: { ...currentState, loading: true },
      }));
      try {
        const response = await getExpandedInvoiceDetails(invoice.id);
        if (response.success) {
          setExpandedStates((prev) => ({
            ...prev,
            [invoice.id]: { taric: true, items: true, data: response.data, loading: false },
          }));
        }
      } catch (error) {
        console.error(error);
        setExpandedStates((prev) => ({
          ...prev,
          [invoice.id]: { ...currentState, loading: false },
        }));
      }
    }
  };

  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [showQTYModal, setShowQTYModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [cargos, setCargos] = useState<CargoType[]>([]);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [newQty, setNewQty] = useState<number>(0);
  const [targetCargoId, setTargetCargoId] = useState<string>("");


  const [expandedPriceItemId, setExpandedPriceItemId] = useState<string | null>(
    null,
  );
  const [editingPrice, setEditingPrice] = useState<number>(0);

  const [splitRemarks, setSplitRemarks] = useState<string>("");
  const [tarics, setTarics] = useState<any[]>([]);
  const [selectedTaricCode, setSelectedTaricCode] = useState<string>("");
  const [expandedTaricGroupId, setExpandedTaricGroupId] = useState<
    string | null
  >(null);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceEditForm, setInvoiceEditForm] = useState({
    description: "",
    freightCost: "",
    remark: "",
  });

  const [showTaricModal, setShowTaricModal] = useState(false);
  const [selectedTaricGroup, setSelectedTaricGroup] = useState<any>(null);
  const [qtyRemarks, setQtyRemarks] = useState("");

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [itemsAll, setItemsAll] = useState<any[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<any[]>([]);
  const [itemsBySupplier, setItemsBySupplier] = useState<any[]>([]);
  const [loadingItemsAll, setLoadingItemsAll] = useState(false);
  const [loadingItemsByCategory, setLoadingItemsByCategory] = useState(false);
  const [loadingItemsBySupplier, setLoadingItemsBySupplier] = useState(false);
  const [orderNoFilter, setOrderNoFilter] = useState<string>(
    () => searchParams.get("order_no") || "",
  );
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [remarksCN, setRemarksCN] = useState("");

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

  const isTab1 = activeInvTab !== "order_items";
  const isTab2 = false;
  const isConvertMode = mode === "convert";

  const effectiveItems = useMemo(() => {
    if (form.supplier_id) return itemsBySupplier;
    if (form.category_id) return itemsByCategory;
    return itemsAll;
  }, [form.supplier_id, itemsBySupplier, form.category_id, itemsByCategory, itemsAll]);

  const loadingItems =
    loadingItemsAll ||
    (isTab1 && !!form.supplier_id && loadingItemsBySupplier) ||
    (isTab1 && !!form.category_id && loadingItemsByCategory);

  const canSubmit = useMemo(() => {
    if (isConvertMode) return orderItems.length > 0;
    const hasItems = orderItems.length > 0;
    const hasComment = !!form.comment?.trim();
    const tabOk =
      (isTab1 ? !!form.category_id || !!form.supplier_id : true) &&
      (isTab2 ? !!form.customer_id : true);
    return hasItems && hasComment && tabOk;
  }, [isConvertMode, orderItems.length, form.comment, form.category_id, form.supplier_id, form.customer_id, isTab1, isTab2]);

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

  const handleCustomerChange = (customer_id: string) =>
    setForm((prev) => ({ ...prev, customer_id }));

  const handleCategoryChange = async (
    category_id: string,
    resetOrderItemsFlag: boolean = true,
  ) => {
    setForm((prev) => ({ ...prev, category_id }));
    setSelectedItemId("");
    if (resetOrderItemsFlag) setOrderItems([]);

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

  const handleCreateOrder = async () => {
    if (!form.comment?.trim()) return toast.error("Please add a comment");
    if (orderItems.length === 0)
      return toast.error("Please add at least one item");
    if (isTab1 && !form.category_id && !form.supplier_id)
      return toast.error("Please select a category or supplier for Orders");

    const payload = {
      customer_id: form.customer_id || null,
      category_id: form.category_id || null,
      supplier_id: form.supplier_id || null,
      comment: form.comment?.slice(0, 200) || null,
      status: 1,
      items: orderItems.map((x) => ({
        item_id: Number(x.item_id),
        qty: Number(x.qty),
        remark_de: x.remark_de || null,
      })),
    };

    const res = await createOrder(payload as any);
    if (res?.success) {
      toast.success("Order created successfully");
    }
    setShowModal(false);
    resetForm();
    fetchOrders();
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
    fetchOrders();
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this Order?")) return;
    await deleteOrder(orderId);
    fetchOrders();
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

  const toggleExpansion = async (id: string, type: "taric" | "items") => {
    const currentState = expandedStates[id] || {};
    let isCurrentlyOpen =
      type === "taric" ? currentState.taric : currentState.items;

    let newState: any;
    if (activeInvTab === "closed_invoices") {
      const bothActive = currentState.taric && currentState.items;
      newState = { ...currentState, taric: !bothActive, items: !bothActive };
      isCurrentlyOpen = bothActive;
    } else {
      newState = { ...currentState, [type]: !isCurrentlyOpen };
    }

    if (!isCurrentlyOpen && !currentState.data) {
      setExpandedStates((prev) => ({
        ...prev,
        [id]: { ...newState, loading: true },
      }));
      try {
        const response = await getExpandedInvoiceDetails(id);
        if (response.success) {
          setExpandedStates((prev) => ({
            ...prev,
            [id]: { ...newState, data: response.data, loading: false },
          }));
        }
      } catch (error) {
        console.error(error);
        setExpandedStates((prev) => ({
          ...prev,
          [id]: { ...newState, loading: false },
        }));
      }
    } else {
      setExpandedStates((prev) => ({ ...prev, [id]: newState }));
    }
  };

  useEffect(() => {
    getAllCargos({ limit: 1000, availableOnly: true }).then((res) => {
      if (res.success) setCargos(res.data);
    });
    getAllTaricsSimple().then((res) => {
      if (res.success) setTarics(res.data);
    });
  }, []);

  const handleReassignItem = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      const cargoIdNum = Number(targetCargoId);

      if (activeInvTab === "orders") {
        await assignOrdersToCargo(cargoIdNum, [Number(selectedItem.id)], false);
        toast.success(`Order ${selectedItem.order_no} assigned to Cargo ${targetCargoId}`);
        setShowREModal(false);
        await fetchOrders();
      } else {
        await updateOrderItemStatus(selectedItem.id, { cargo_id: cargoIdNum });

        const orderId = selectedItem.order_id || selectedItem.order?.id;
        if (orderId) {
          await assignOrdersToCargo(cargoIdNum, [Number(orderId)], true);
        }

        toast.success("Item reassigned successfully");
        setShowREModal(false);

        const invId = Object.keys(expandedStates).find((key) =>
          expandedStates[key].data?.detailedItems?.some(
            (it: any) => it.id === selectedItem.id,
          ),
        );

        if (invId) {
          setExpandedStates((prev) => {
            const newState = { ...prev };
            delete newState[invId];
            return newState;
          });
        }

        await loadInvoices();
      }
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
      );
      toast.success("Item split and moved successfully");
      setShowSPModal(false);
      setSplitRemarks("");
      const invId = Object.keys(expandedStates).find((key) =>
        expandedStates[key].data?.detailedItems?.some(
          (it: any) => it.id === selectedItem.id,
        ),
      );
      if (invId) {
        setExpandedStates((prev) => {
          const newState = { ...prev };
          delete newState[invId];
          return newState;
        });
      }
      await loadInvoices();
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
        (oi: any) => {
          const itemTaricCode = oi.item?.taric?.code || "";
          const isProjectItem =
            !itemTaricCode ||
            itemTaricCode === "0" ||
            itemTaricCode === "0000000000";
          let oiGroupKey = "";
          if (oi.set_taric_code) {
            const codes = oi.set_taric_code.split("/");
            const target = codes.length > 1 ? codes[1].trim() : codes[0].trim();
            oiGroupKey = `set_${target}`;
          } else {
            const taricId = oi.item?.taric?.id;
            oiGroupKey = taricId ? `taric_${taricId}` : "unknown";
          }
          return oiGroupKey === group.taricId;
        },
      );

      if (itemsInGroup && itemsInGroup.length > 0) {
        for (const oi of itemsInGroup) {
          const originalCode = oi.item?.taric?.code;
          const hasOriginal =
            originalCode &&
            originalCode !== "0" &&
            originalCode !== "0000000000";

          let newTaricValue = "";
          if (hasOriginal) {
            newTaricValue = `${originalCode}/${selectedTaricCode}`;
          } else {
            const priorSet = oi.set_taric_code;
            if (priorSet && priorSet.includes("/")) {
              const parts = priorSet.split("/");
              newTaricValue = `${parts[0]}/${selectedTaricCode}`;
            } else if (priorSet && priorSet !== selectedTaricCode) {
              newTaricValue = `${priorSet}/${selectedTaricCode}`;
            } else {
              newTaricValue = selectedTaricCode;
            }
          }
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

  const handlePrintLabel = (item: any) => {
    const details = item.item;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${details?.item_name || "Item"}</title>
          <style>
            @page { size: 100mm 150mm; margin: 0; }
            body { 
              font-family: 'Poppins', sans-serif; 
              padding: 20px; 
              border: 1px solid #eee; 
              width: 100mm; 
              height: 150mm; 
              box-sizing: border-box; 
              position: relative;
            }
            .header { border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .item-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; height: 48px; overflow: hidden; }
            .ean { font-size: 11px; margin-bottom: 5px; color: #555; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .label-field { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
            .value-field { font-size: 12px; font-weight: bold; margin-bottom: 2px; }
            .barcode { margin-top: 20px; text-align: center; }
            .qr-placeholder { width: 80px; height: 80px; background: #eee; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 8px; border: 1px dashed #ccc; }
            .footer { position: absolute; bottom: 20px; left: 20px; right: 20px; font-size: 9px; text-align: center; color: #999; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div class="item-name">${details?.item_name || "N/A"}</div>
            <div class="ean">EAN: ${details?.ean || "-"}</div>
          </div>
          <div class="details">
            <div>
              <div class="label-field">Order / Cargo No.</div>
              <div class="value-field">${item.order?.order_no || "-"}</div>
            </div>
            <div>
              <div class="label-field">QTY Label</div>
              <div class="value-field">${item.qty_label || item.qty}</div>
            </div>
            <div>
              <div class="label-field">SOID</div>
              <div class="value-field">${item.supplier_order_id || "-"}</div>
            </div>
            <div>
              <div class="label-field">Taric</div>
              <div class="value-field">${details?.taric?.code || "-"}</div>
            </div>
          </div>
          <div class="barcode">
            <div class="qr-placeholder">G-TECH LABEL</div>
            <div style="font-size: 9px; margin-top: 5px; font-weight: 500;">Item ID: ${item.id}</div>
          </div>
          <div class="footer">
            Printed on ${new Date().toLocaleString("de-DE")}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };



  const fetchCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.categories || [];
      setCategories(arr);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await getAllSuppliers({ limit: 1000 });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.suppliers || [];
      setSuppliers(arr);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  }, []);

  const fetchAllItems = useCallback(async () => {
    try {
      setLoadingItemsAll(true);
      const response = await getItems({ limit: 10000 });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.items || [];
      setItemsAll(arr);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItemsAll([]);
    } finally {
      setLoadingItemsAll(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await getAllOrders();
      if (response?.success) setOrders(response.data);
      else if (response?.data) setOrders(response.data);
    } catch (error) {
      console.error("Error fetching Orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const itemById = useMemo(() => {
    const map = new Map<string, any>();
    for (const it of itemsAll) map.set(String(it.id), it);
    return map;
  }, [itemsAll]);

  const getCategoryName = useCallback(
    (categoryId: string | number) =>
      categories.find((c) => String(c.id) === String(categoryId))?.name ?? "-",
    [categories],
  );

  const getSupplierName = useCallback(
    (supplierId: any) => {
      const s = suppliers.find((c) => String(c.id) === String(supplierId));
      if (!s) return String(supplierId);
      const englishName = (s.name && !hasChinese(s.name)) ? s.name : ((s.company_name && !hasChinese(s.company_name)) ? s.company_name : null);
      if (englishName) return englishName;
      const chineseName = s.name_cn || s.company_name || s.name;
      if (chineseName) return chineseName;
      return s.name_de || String(s.id);
    },
    [suppliers],
  );

  const orderItemsFlat = useMemo(() => {
    let allItems = orders.flatMap((o: any) =>
      (o.items || []).map((i: any) => ({
        ...i,
        order_id: o.id,
        parentOrder: o,
        order_no: o.order_no,
        order_status: o.status,
        item_status: i.status || "NSO",
        supplier_id: i.supplier_id || i.item?.supplier_id || o.supplier_id,
        category_id: o.category_id,
        comment: o.comment,
      })),
    );

    const filterParam = searchParams.get("filter");
    if (filterParam) {
      if (filterParam === "unassigned_cargo") {
        allItems = allItems.filter((i: any) => !i.cargo_id || i.cargo_id === 0);
      } else if (filterParam === "purchase_problem") {
        allItems = allItems.filter((i: any) =>
          (i.problems && i.problems !== "" && (i.problems.toLowerCase().includes("purchase") || i.problems.toLowerCase().includes("buy"))) ||
          (i.status && String(i.status).toLowerCase().includes("purchase"))
        );
      } else if (filterParam === "check_problem") {
        allItems = allItems.filter((i: any) =>
          (i.problems && i.problems !== "" && (i.problems.toLowerCase().includes("check") || i.problems.toLowerCase().includes("verify")))
        );
      } else if (filterParam === "rmb_special_no_value") {
        allItems = allItems.filter((i: any) => {
          const it = i.item || {};
          const price = i.rmb_price || it.rmb_price || it.RMB_Price || 0;
          return it.is_rmb_special === "Y" && (!price || parseFloat(String(price)) === 0);
        });
      } else if (filterParam === "eur_special_no_value") {
        allItems = allItems.filter((i: any) => {
          const it = i.item || {};
          const hasEUR = (it.price && parseFloat(String(it.price)) > 0) || (it.transfer_price_EUR && parseFloat(String(it.transfer_price_EUR)) > 0);
          return it.is_eur_special === "Y" && !hasEUR;
        });
      } else if (filterParam === "dimension_special_no_value") {
        allItems = allItems.filter((i: any) => {
          const it = i.item || {};
          const hasDim = (it.weight && parseFloat(String(it.weight)) > 0) &&
            (it.length && parseFloat(String(it.length)) > 0) &&
            (it.width && parseFloat(String(it.width)) > 0) &&
            (it.height && parseFloat(String(it.height)) > 0);
          return it.is_dimension_special === "Y" && !hasDim;
        });
      }
    }

    if (!orderNoFilter) return allItems;
    const s = orderNoFilter.toLowerCase();
    return allItems.filter((i) =>
      String(i.order_no).toLowerCase().includes(s) ||
      String(i.ean || i.item?.ean || "").toLowerCase().includes(s) ||
      String(i.item_name || i.itemName || i.item?.item_name || "").toLowerCase().includes(s)
    );
  }, [orders, orderNoFilter, searchParams]);

  const filteredOrders = useMemo(() => {
    if (!orderNoFilter) return orders;
    const s = orderNoFilter.toLowerCase();
    return orders.filter((o: any) =>
      String(o.order_no).toLowerCase().includes(s) ||
      String(o.id).toLowerCase().includes(s) ||
      (o.comment || "").toLowerCase().includes(s),
    );
  }, [orders, orderNoFilter]);

  const handleGoToItems = (orderNo: string) => {
    setOrderNoFilter(orderNo);
    setActiveInvTab("order_items");
  };

  const handleViewOrder = (order: any) => {
    setViewOrder(order);
    setViewItems(
      (order.items || []).map((it: any) => ({
        ...it,
        itemName: it.item?.item_name || it.item?.name || it.itemName || "Unknown",
      }))
    );
    setShowViewModal(true);
  };

  const closeView = () => {
    setShowViewModal(false);
    setViewOrder(null);
    setViewItems([]);
  };

  const handleOpenReassignModal = (item: any) => {
    setSelectedItem(item);
    setTargetCargoId(item.cargo_id ? String(item.cargo_id) : "");
    setShowREModal(true);
  };

  const handleOpenSplitModal = (item: any) => {
    setSelectedItem(item);
    setSplitQty(item.qty_label || item.qty || 0);
    setRemarksCN(item.remarks_cn || "");
    setShowSPModal(true);
  };

  const handleAssignSupplier = async (orderItemId: number | string, supplierId: number, baseItemId?: number | string) => {
    try {
      await updateOrderItemStatus(orderItemId, { supplier_id: supplierId });
      if (baseItemId) {
        await updateItem(Number(baseItemId), { supplier_id: supplierId });
      }
      await Promise.all([
        fetchOrders(),
        fetchAllItems()
      ]);
      toast.success("Supplier assigned successfully");
    } catch (error) {
      console.error("Failed to assign supplier:", error);
      toast.error("Failed to assign supplier");
    }
  };

  useEffect(() => {
    loadInvoices();
    if (activeInvTab === "orders" || activeInvTab === "order_items") {
      fetchOrders();
      fetchCustomers();
      fetchCategories();
      fetchSuppliers();
      fetchAllItems();
    }
  }, [activeInvTab]);

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
    if (tabParam) {
      const validTabs = ["orders", "order_items", "open_invoices", "closed_invoices", "cargos", "cargo_type", "packing_list"];
      if (validTabs.includes(tabParam)) {
        setActiveInvTab(tabParam as InvoiceTab);
      }
    }
    const orderNo = searchParams.get("order_no");
    if (orderNo !== null) {
      setOrderNoFilter(orderNo);
    }
  }, [searchParams]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response: any = await getAllCustomers({ limit: 1000 });
      if (response?.data?.businesses) {
        setCustomers(response.data.businesses);
      } else if (Array.isArray(response?.data)) {
        setCustomers(response.data);
      } else if (Array.isArray(response)) {
        setCustomers(response);
      } else {
        setCustomers([]);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
    }
  };

  useEffect(() => {
    let filtered = invoices || [];

    if (activeInvTab === "open_invoices") {
      filtered = filtered.filter(
        (invoice) =>
          invoice.status !== "paid" && invoice.status !== "cancelled",
      );
    } else if (activeInvTab === "closed_invoices") {
      filtered = filtered.filter(
        (invoice) =>
          invoice.status === "paid" || invoice.status === "cancelled",
      );
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
          invoice.customer?.companyName?.toLowerCase().includes(searchLower) ||
          invoice.customer?.email?.toLowerCase().includes(searchLower) ||
          invoice.customer?.contactEmail?.toLowerCase().includes(searchLower) ||
          (invoice.orderNumber &&
            invoice.orderNumber.toLowerCase().includes(searchLower)) ||
          (invoice.cargoNo &&
            invoice.cargoNo.toLowerCase().includes(searchLower)),
      );
    }

    if (filters.status) {
      filtered = filtered.filter(
        (invoice) => invoice.status === filters.status,
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        (invoice) =>
          new Date(invoice.invoiceDate) >= new Date(filters.dateFrom),
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(
        (invoice) => new Date(invoice.invoiceDate) <= new Date(filters.dateTo),
      );
    }

    if (filters.customer) {
      const customerLower = filters.customer.toLowerCase();
      filtered = filtered.filter(
        (invoice) =>
          invoice.customer?.companyName
            ?.toLowerCase()
            .includes(customerLower) ||
          invoice.customer?.email?.toLowerCase().includes(customerLower) ||
          invoice.customer?.contactEmail?.toLowerCase().includes(customerLower),
      );
    }

    if (filters.minAmount) {
      filtered = filtered.filter(
        (invoice) => invoice.grossTotal >= parseFloat(filters.minAmount),
      );
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(
        (invoice) => invoice.grossTotal <= parseFloat(filters.maxAmount),
      );
    }

    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === "customer") {
        aValue = a.customer?.companyName || "";
        bValue = b.customer?.companyName || "";
      }

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === "asc" ? 1 : -1;
      if (bValue == null) return sortDirection === "asc" ? -1 : 1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [searchTerm, filters, invoices, sortField, sortDirection, activeInvTab]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await getAllInvoices();
      setInvoices(response?.data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load invoices:", error);
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Invoice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDownloadPDF = async (pdfUrl: string) => {
    router.push(`${pdfUrl}`);
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      if (!invoice || invoice.freightCost === null || invoice.freightCost === undefined || Number(invoice.freightCost) <= 0) {
        toast.error("Please provide a freight cost by editing the invoice before verifying it.");
        return;
      }
      if (!invoice.description || !invoice.description.trim()) {
        toast.error("Please provide a description by editing the invoice before verifying it.");
        return;
      }

      setActionLoading((prev) => ({ ...prev, [`paid-${invoiceId}`]: true }));
      await markInvoiceAsPaid(invoiceId);
      await loadInvoices();
      setSelectedInvoice((prev) => prev ? { ...prev, status: "paid" } : null);
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
    if (invoiceEditForm.freightCost === "" || invoiceEditForm.freightCost === null || invoiceEditForm.freightCost === undefined || Number(invoiceEditForm.freightCost) <= 0) {
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
      setEditingInvoiceId(null);
      await loadInvoices();
      setSelectedInvoice((prev) => prev ? {
        ...prev,
        description: invoiceEditForm.description,
        freightCost: invoiceEditForm.freightCost,
        remark: invoiceEditForm.remark,
      } : null);
      toast.success("Invoice changes saved successfully");
    } catch (error) {
      console.error("Failed to save invoice edits:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`save-${invoiceId}`]: false }));
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    try {
      setActionLoading((prev) => ({ ...prev, [`cancel-${invoiceId}`]: true }));
      await cancelInvoice(invoiceId);
      await loadInvoices();
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [`cancel-${invoiceId}`]: false }));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this invoice? This action cannot be undone.",
      )
    ) {
      try {
        setActionLoading((prev) => ({
          ...prev,
          [`delete-${invoiceId}`]: true,
        }));
        await deleteInvoice(invoiceId);
        await loadInvoices();
      } catch (error) {
        console.error("Failed to delete invoice:", error);
      } finally {
        setActionLoading((prev) => ({
          ...prev,
          [`delete-${invoiceId}`]: false,
        }));
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4" />;
      case "sent":
        return <Clock className="w-4 h-4" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return { backgroundColor: "#E8F5E8", color: "#2E7D32" };
      case "sent":
        return { backgroundColor: "#E3F2FD", color: "#1976D2" };
      case "overdue":
        return { backgroundColor: "#FFF3E0", color: "#F57C00" };
      case "cancelled":
        return { backgroundColor: "#FFEBEE", color: "#D32F2F" };
      default:
        return { backgroundColor: "#F5F5F5", color: "#757575" };
    }
  };

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInvoices = filteredInvoices.slice(startIndex, endIndex);

  const totalAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.grossTotal) || 0),
    0,
  );
  const totalPaid = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.paidAmount) || 0),
    0,
  );
  const outstandingAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.outstandingAmount) || 0),
    0,
  );

  return (
    <div
      className="min-h-screen font-['Poppins']"
      style={{ backgroundColor: "#F8F9FA", color: "#212529" }}
    >
      <div className="w-full mx-auto p-0">
        {searchParams.get("filter") && searchParams.get("hide_banner") !== "true" && (
          <div className="mb-6 px-5 py-3 bg-[#FFF3CD] border border-[#FFEBA2] rounded-md text-[#856404] flex items-center justify-between text-sm shadow-sm animate-pulse">
            <div className="flex items-center gap-2">
              <span className="font-bold">⚠️ Reports & Control Health Audit View Active:</span>
              <span className="font-semibold text-gray-800">
                {(() => {
                  switch (searchParams.get("filter")) {
                    case "unassigned_cargo": return "Order items unassigned to cargo";
                    case "rmb_special_no_value": return "RMB Special SET with no value";
                    case "eur_special_no_value": return "EUR Special SET with no value";
                    case "dimension_special_no_value": return "Dimension Special SET with no value";
                    default: return searchParams.get("filter");
                  }
                })()}
              </span>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("filter");
                window.location.href = `/invoices?${params.toString()}`;
              }}
              className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-bold transition-all"
            >
              Clear Audit Filter
            </button>
          </div>
        )}
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
                New Cargo
              </button>
            ) : activeInvTab === "cargo_type" ? (
              <button
                onClick={() => cargoTypesTabRef.current?.handleOpenCreate?.()}
                className="px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-xl flex items-center gap-2 font-semibold shadow-sm transition-all text-sm"
              >
                <Plus className="h-4 w-4" />
                New Cargo Type
              </button>
            ) : (activeInvTab === "orders" || activeInvTab === "order_items") ? (
              <button
                onClick={() => {
                  resetForm();
                  setMode("create");
                  setShowModal(true);
                }}
                className="px-4 py-2.5 bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-xl flex items-center gap-2 font-semibold shadow-sm transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                New Order
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
              className={`px-6 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap -mb-px ${activeInvTab === tab.id
                ? "text-[#8CC21B] border-b-2 border-[#8CC21B]"
                : "text-gray-500 hover:text-gray-900 border-b-2 border-transparent"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder={
                (activeInvTab === "open_invoices" || activeInvTab === "closed_invoices")
                  ? "Search invoices, customers, or order numbers..."
                  : activeInvTab === "cargos"
                    ? "Search cargos..."
                    : activeInvTab === "cargo_type"
                      ? "Search cargo types..."
                      : activeInvTab === "packing_list"
                        ? "Search packing lists..."
                        : "Search..."
              }
              value={
                (activeInvTab === "open_invoices" || activeInvTab === "closed_invoices")
                  ? searchTerm
                  : orderNoFilter
              }
              onChange={(e) => {
                if (activeInvTab === "open_invoices" || activeInvTab === "closed_invoices") {
                  setSearchTerm(e.target.value);
                } else {
                  setOrderNoFilter(e.target.value);
                }
              }}
              className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white text-black"
            />
            {((activeInvTab === "open_invoices" || activeInvTab === "closed_invoices") ? searchTerm : orderNoFilter) && (
              <button
                onClick={() => {
                  if (activeInvTab === "open_invoices" || activeInvTab === "closed_invoices") {
                    setSearchTerm("");
                  } else {
                    setOrderNoFilter("");
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {activeInvTab === "cargos" && (
            <SegmentedControl
              options={[
                { value: "Open", label: "Open" },
                { value: "Shipped", label: "Shipped" },
                { value: "Delivered", label: "Delivered" },
              ]}
              value={cargoStatusFilter}
              onChange={setCargoStatusFilter}
            />
          )}

        </div>

        {(activeInvTab === "orders" || activeInvTab === "order_items") && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm mb-6">
            {activeInvTab === "order_items" && orderNoFilter && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-100 mb-4 rounded-[4px]">
                <span className="text-xs text-blue-700 font-medium">
                  🔍 Showing items for order:&nbsp;
                  <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded text-blue-800">
                    {orderNoFilter}
                  </span>
                </span>
                <button
                  onClick={() => setOrderNoFilter("")}
                  className="text-[10px] text-blue-600 hover:text-blue-800 underline font-semibold ml-1"
                >
                  Clear filter (show all)
                </button>
              </div>
            )}
            <OrdersTable
              orders={activeInvTab === "orders" ? filteredOrders : orderItemsFlat}
              loading={loadingOrders}
              getCategoryName={getCategoryName}
              getSupplierName={getSupplierName}
              getOrderStatusColor={getOrderStatusColor}
              onView={handleViewOrder}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
              canDelete={user?.role === "ADMIN"}
              showConvert={false}
              onConvert={undefined}
              onReassign={handleOpenReassignModal}
              onGoToItems={handleGoToItems}
              activeTab={activeInvTab}
              itemById={itemById}
              suppliers={suppliers}
              onAssignSupplier={handleAssignSupplier}
              onSplit={handleOpenSplitModal}
              router={router}
            />
          </div>
        )}

        {(activeInvTab === "open_invoices" ||
          activeInvTab === "closed_invoices") && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F5E8" }}
                    >
                      <FileText
                        className="w-5 h-5"
                        style={{ color: "#059669" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#6C757D" }}
                      >
                        Total Invoices
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ color: "#212529" }}
                      >
                        {filteredInvoices.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F5E8" }}
                    >
                      <DollarSign
                        className="w-5 h-5"
                        style={{ color: "#2E7D32" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#6C757D" }}
                      >
                        Total Amount
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ color: "#212529" }}
                      >
                        $
                        {Number(totalAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#E8F4D6" }}
                    >
                      <CheckCircle
                        className="w-5 h-5"
                        style={{ color: "#8CC21B" }}
                      />
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#6C757D" }}
                      >
                        Paid Amount
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ color: "#212529" }}
                      >
                        ${Number(totalPaid).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="bg-white rounded-[4px] p-4 lg:p-6 border border-[#E9ECEF]"
                  style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-[4px]"
                      style={{ backgroundColor: "#FFF3E0" }}
                    >
                      <Clock className="w-5 h-5" style={{ color: "#F57C00" }} />
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#6C757D" }}
                      >
                        Outstanding
                      </p>
                      <p
                        className="text-xl font-bold"
                        style={{ color: "#212529" }}
                      >
                        ${Number(outstandingAmount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8CC21B]" />
                      <p className="text-xs text-[#6C757D]">
                        Loading invoices...
                      </p>
                    </div>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-[#ADB5BD]" />
                      <h3 className="text-lg font-medium mb-1 text-[#212529]">
                        No invoices found
                      </h3>
                      <p className="text-xs text-[#6C757D]">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF]">
                          <tr>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                                #
                              </th>
                            )}
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              <div className="flex items-center gap-1.5">ID</div>
                            </th>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                                Invoice No
                              </th>
                            )}
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              Bill To
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              Ship To
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              Cargo No.
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices"
                                ? "Date created"
                                : "Closed Date"}
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices"
                                ? "Count Item"
                                : "Item Count"}
                            </th>
                            <th className="text-left py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                              {activeInvTab === "open_invoices"
                                ? "QTY"
                                : "Total Qty"}
                            </th>
                            {activeInvTab === "closed_invoices" && (
                              <th className="text-right py-3.5 px-4 font-semibold text-[11px] uppercase tracking-wider text-[#495057]">
                                Total Price
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F3F5]">
                          {currentInvoices.map((invoice, index) => {
                            return (
                              <React.Fragment key={invoice.id}>
                                <tr
                                  onClick={() => handleOpenInvoiceDetails(invoice)}
                                  className="hover:bg-[#F8F9FA] transition-colors group cursor-pointer font-medium"
                                >
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs text-[#212529]">
                                      {startIndex + index + 1}
                                    </td>
                                  )}
                                  <td className="py-4 px-4 text-xs text-[#212529] font-bold">
                                    {invoice.id.slice(-5).toUpperCase()}
                                  </td>
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs font-semibold text-[#212529]">
                                      {invoice.invoiceNumber || "N/A"}
                                    </td>
                                  )}
                                  <td className="py-4 px-4 text-xs text-[#212529]">
                                    {(() => {
                                      const v = invoice.bill_to;
                                      if (!v || typeof v === "object")
                                        return "N/A";
                                      const s = String(v).trim();
                                      return s.length > 1 ? s : "N/A";
                                    })()}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#6C757D]">
                                    {(() => {
                                      const v = invoice.ship_to;
                                      if (!v || typeof v === "object") return "-";
                                      const s = String(v).trim();
                                      return s.length > 1 ? s : "-";
                                    })()}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#212529]">
                                    {invoice.cargo?.cargo_no || "No Cargo"}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#495057]">
                                    {formatDate(invoice.invoiceDate)}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#212529]">
                                    {invoice.customItemCount ??
                                      invoice.items?.length ??
                                      0}
                                  </td>
                                  <td className="py-4 px-4 text-xs text-[#212529] font-medium">
                                    {invoice.customTotalQty ??
                                      invoice.items?.reduce(
                                        (sum: any, item: any) =>
                                          sum + item.quantity,
                                        0,
                                      ) ??
                                      0}
                                  </td>
                                  {activeInvTab === "closed_invoices" && (
                                    <td className="py-4 px-4 text-xs text-right font-bold text-[#212529]">
                                      {Number(invoice.grossTotal).toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )}
                                    </td>
                                  )}
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="lg:hidden divide-y divide-[#F1F3F5]">
                      {currentInvoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          onClick={() => handleOpenInvoiceDetails(invoice)}
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px]">
                                {invoice.id.slice(-5).toUpperCase()}
                              </div>
                              <div className="font-bold text-sm text-[#212529]">
                                {activeInvTab === "closed_invoices"
                                  ? invoice.invoiceNumber
                                  : `ID: ${invoice.id.slice(-5)}`}
                              </div>
                            </div>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase"
                              style={getStatusColor(invoice.status)}
                            >
                              {invoice.status}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">Customer</span>
                              <span className="font-medium text-[#212529]">
                                {invoice.customer?.companyName}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">
                                {activeInvTab === "open_invoices"
                                  ? "Cargo"
                                  : "Cargo No."}
                              </span>
                              <span className="font-medium text-[#212529]">
                                {invoice.cargo?.cargo_no || "-"}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6C757D]">Items / Qty</span>
                              <span className="font-medium text-[#212529]">
                                {invoice.customItemCount ?? invoice.items?.length ?? 0} /{" "}
                                {invoice.customTotalQty ?? (invoice.items?.reduce(
                                  (sum, item) => sum + item.quantity,
                                  0,
                                ) ?? 0)}
                              </span>
                            </div>
                            {activeInvTab === "closed_invoices" && (
                              <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-gray-100">
                                <span className="text-[#6C757D]">
                                  Total Price
                                </span>
                                <span className="text-[#212529]">
                                  ${Number(invoice.grossTotal).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between p-4 border-t border-[#E9ECEF] bg-[#F8F9FA]">
                        <div className="text-[11px] font-medium text-[#6C757D]">
                          Showing {startIndex + 1} to{" "}
                          {Math.min(endIndex, filteredInvoices.length)} of{" "}
                          {filteredInvoices.length} invoices
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              setCurrentPage(Math.max(1, currentPage - 1))
                            }
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-[#495057]" />
                          </button>
                          {[...Array(totalPages)].map((_, i) => (
                            <button
                              key={i + 1}
                              onClick={() => setCurrentPage(i + 1)}
                              className={`min-w-[28px] h-7 text-[11px] font-bold rounded-[4px] border transition-all ${currentPage === i + 1
                                ? "bg-[#8CC21B] text-white border-[#8CC21B] shadow-md"
                                : "bg-white text-[#495057] border-[#DEE2E6] hover:bg-gray-50"
                                }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                          <button
                            onClick={() =>
                              setCurrentPage(
                                Math.min(totalPages, currentPage + 1),
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="p-1.5 rounded-[4px] border border-[#DEE2E6] bg-white disabled:opacity-30 hover:bg-gray-50 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-[#495057]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
              <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#8CC21B]" />
                    Invoice Details
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {selectedInvoice.id} {selectedInvoice.invoiceNumber ? `| Invoice No: ${selectedInvoice.invoiceNumber}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-[4px] uppercase"
                    style={getStatusColor(selectedInvoice.status)}
                  >
                    {selectedInvoice.status}
                  </span>

                  {activeInvTab === "open_invoices" ? (
                    <button
                      onClick={() => handleMarkAsPaid(selectedInvoice.id)}
                      disabled={actionLoading[`paid-${selectedInvoice.id}`]}
                      className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      {actionLoading[`paid-${selectedInvoice.id}`] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      VERIFY
                    </button>
                  ) : (
                    <>
                      <button
                        className="px-4 py-2 border border-[#DC3545] text-[#DC3545] text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-[#DC3545]/10 transition-colors disabled:opacity-50"
                        title="Download PDF"
                        disabled={actionLoading[`pdf-${selectedInvoice.id}`]}
                        onClick={async () => {
                          try {
                            setActionLoading((prev) => ({
                              ...prev,
                              [`pdf-${selectedInvoice.id}`]: true,
                            }));
                            await downloadCommercialInvoice(
                              selectedInvoice.id,
                              selectedInvoice.invoiceNumber,
                              selectedInvoice.cargo?.cargo_no || selectedInvoice.cargoNo
                            );
                          } catch (error) {
                            console.error("PDF Generation failed", error);
                          } finally {
                            setActionLoading((prev) => ({
                              ...prev,
                              [`pdf-${selectedInvoice.id}`]: false,
                            }));
                          }
                        }}
                      >
                        {actionLoading[`pdf-${selectedInvoice.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        Download PDF
                      </button>
                      <button className="px-4 py-2 bg-[#F15A24] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#D9481B] transition-colors">
                        <RefreshCw className="w-3 h-3" /> Ship
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowInvoiceDetailsModal(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors ml-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 flex-1 text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Customer</span>
                    <span className="text-sm font-semibold text-gray-800 block mt-1">{selectedInvoice.customer?.companyName || "N/A"}</span>
                    {selectedInvoice.customer?.email && (
                      <span className="text-xs text-gray-500 block mt-0.5">{selectedInvoice.customer.email}</span>
                    )}
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Bill To / Ship To</span>
                    <span className="text-sm font-semibold text-gray-800 block mt-1">
                      Bill To: {typeof selectedInvoice.bill_to === "string" ? selectedInvoice.bill_to : "N/A"}
                    </span>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      Ship To: {typeof selectedInvoice.ship_to === "string" ? selectedInvoice.ship_to : "N/A"}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Cargo No / Dates</span>
                    <span className="text-sm font-semibold text-gray-800 block mt-1">Cargo: {selectedInvoice.cargo?.cargo_no || "No Cargo"}</span>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      Date: {formatDate(selectedInvoice.invoiceDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">Items / Totals</span>
                    <span className="text-sm font-semibold text-gray-800 block mt-1">
                      {selectedInvoice.customItemCount ?? selectedInvoice.items?.length ?? 0} Items | {selectedInvoice.customTotalQty ?? 0} Qty
                    </span>
                    {activeInvTab === "closed_invoices" && (
                      <span className="text-sm font-bold text-emerald-600 block mt-0.5">
                        Total: ${Number(selectedInvoice.grossTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
                {activeInvTab === "open_invoices" && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Edit Invoice Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Description *</label>
                        <input
                          type="text"
                          value={invoiceEditForm.description}
                          onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                          placeholder="Description (e.g. Freight cost)"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Freight Cost *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={invoiceEditForm.freightCost}
                          onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, freightCost: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                          placeholder="Freight Cost"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#495057] mb-1.5">Remark</label>
                      <textarea
                        value={invoiceEditForm.remark}
                        onChange={(e) => setInvoiceEditForm({ ...invoiceEditForm, remark: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-[#8CC21B] text-black"
                        placeholder="Remark"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleSaveInvoiceEdit(selectedInvoice.id)}
                        disabled={actionLoading[`save-${selectedInvoice.id}`]}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#059669] rounded-lg hover:bg-green-700 flex items-center gap-1.5 shadow-md disabled:opacity-50"
                      >
                        {actionLoading[`save-${selectedInvoice.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex border-b border-gray-200">
                    <button
                      onClick={() => setModalActiveTab("taric")}
                      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${modalActiveTab === "taric"
                        ? "border-[#8CC21B] text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Taric Summary
                    </button>
                    <button
                      onClick={() => setModalActiveTab("items")}
                      className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all relative ${modalActiveTab === "items"
                        ? "border-[#8CC21B] text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Items List
                    </button>
                  </div>

                  <div className="min-h-[300px]">
                    {expandedStates[selectedInvoice.id]?.loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#8CC21B]" />
                          <p className="text-xs text-[#6C757D]">Loading data details...</p>
                        </div>
                      </div>
                    ) : modalActiveTab === "taric" ? (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold text-[#495057] uppercase tracking-wider mb-2">
                          Items shown in invoice based on Taric
                        </h4>
                        <SpreadSheet
                          data={expandedStates[selectedInvoice.id]?.data?.taricGroups || []}
                          loading={expandedStates[selectedInvoice.id]?.loading}
                          showTotals={true}
                          columns={
                            activeInvTab === "closed_invoices"
                              ? [
                                {
                                  header: "Position",
                                  render: (_: any, idx: number) => idx + 1,
                                  width: "50px",
                                },
                                {
                                  header: "Taric Name EN",
                                  render: (it: any) => it.taricNameEn,
                                  width: "250px",
                                },
                                {
                                  header: "Taric Code",
                                  render: (it: any) => (
                                    <span style={it.isProjectItem ? { color: "#F59E0B", fontWeight: 600 } : undefined}>
                                      {it.taricCode}
                                    </span>
                                  ),
                                  width: "110px",
                                },
                                {
                                  header: "Duty rate",
                                  render: (it: any) => (it.dutyRate ? `${Number(it.dutyRate).toFixed(2)}` : "-"),
                                  width: "80px",
                                },
                                {
                                  header: "Total Qty",
                                  render: (it: any) => it.totalQty,
                                  align: "center",
                                  width: "80px",
                                },
                                {
                                  header: "Unit Price",
                                  render: (it: any) => it.unitPrice || "0.00",
                                  width: "80px",
                                },
                                {
                                  header: "Total Price",
                                  render: (it: any) =>
                                    (Number(it.totalPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                                  width: "100px",
                                },
                              ]
                              : [
                                {
                                  header: "Position",
                                  render: (_: any, idx: number) => idx + 1,
                                  width: "50px",
                                },
                                {
                                  header: "Taric Name EN",
                                  render: (it: any) => it.taricNameEn,
                                  width: "250px",
                                },
                                {
                                  header: "Taric Code",
                                  render: (it: any) => (
                                    <span style={it.isProjectItem ? { color: "#F59E0B", fontWeight: 600 } : undefined}>
                                      {it.taricCode}
                                    </span>
                                  ),
                                  width: "110px",
                                },
                                {
                                  header: "Duty rate",
                                  render: (it: any) => (it.dutyRate ? `${Number(it.dutyRate).toFixed(2)}` : "-"),
                                  width: "80px",
                                },
                                {
                                  header: "Total Qty",
                                  render: (it: any) => it.totalQty,
                                  align: "center",
                                  width: "80px",
                                },
                                {
                                  header: "Unit Price",
                                  render: (it: any) => it.unitPrice || "0.00",
                                  width: "80px",
                                },
                                {
                                  header: "Total Price",
                                  render: (it: any) =>
                                    (Number(it.totalPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                                  width: "100px",
                                },
                                {
                                  header: "Operation",
                                  render: (group: any) => (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTaricGroup(group);
                                        setSelectedTaricCode("");
                                        setShowTaricModal(true);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1 bg-[#1A73E8] text-white text-[10px] font-bold rounded hover:bg-[#1557B0]"
                                    >
                                      <RefreshCw className="w-3 h-3" /> Set taric
                                    </button>
                                  ),
                                  width: "110px",
                                },
                              ]
                          }
                          expandedRowId={null}
                          totalCols={
                            activeInvTab === "closed_invoices"
                              ? [
                                {
                                  label: "Grand Total",
                                  value: "",
                                  colSpan: 4,
                                  align: "left",
                                },
                                {
                                  value:
                                    expandedStates[selectedInvoice.id]?.data?.taricGroups?.reduce(
                                      (s: number, g: any) => s + (g.totalQty || 0),
                                      0,
                                    ) || 0,
                                  width: "80px",
                                  align: "center",
                                },
                                {
                                  value: "",
                                  width: "80px",
                                },
                                {
                                  value: (
                                    expandedStates[selectedInvoice.id]?.data?.taricGroups?.reduce(
                                      (s: number, g: any) => s + (g.totalPrice || 0),
                                      0,
                                    ) || 0
                                  ).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                                  width: "100px",
                                  align: "left",
                                },
                              ]
                              : [
                                {
                                  label: "Grand Total",
                                  value: "",
                                  colSpan: 4,
                                  align: "left",
                                },
                                {
                                  value:
                                    expandedStates[selectedInvoice.id]?.data?.taricGroups?.reduce(
                                      (s: number, g: any) => s + (g.totalQty || 0),
                                      0,
                                    ) || 0,
                                  width: "80px",
                                  align: "center",
                                },
                                {
                                  value: "",
                                  width: "80px",
                                },
                                {
                                  value: (
                                    expandedStates[selectedInvoice.id]?.data?.taricGroups?.reduce(
                                      (s: number, g: any) => s + (g.totalPrice || 0),
                                      0,
                                    ) || 0
                                  ).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                                  width: "100px",
                                  align: "left",
                                },
                                {
                                  value: "",
                                  width: "110px",
                                },
                              ]
                          }
                        />
                      </div>
                    ) : (
                      <SpreadSheet
                        data={expandedStates[selectedInvoice.id]?.data?.detailedItems || []}
                        loading={expandedStates[selectedInvoice.id]?.loading}
                        columns={
                          activeInvTab === "closed_invoices"
                            ? [
                              {
                                header: "#",
                                render: (_: any, idx: number) => idx + 1,
                                width: "40px",
                              },
                              {
                                header: "EAN",
                                render: (it: any) => it._fallbackEan || it.item?.ean || "-",
                                width: "110px",
                              },
                              {
                                header: "Item Name",
                                render: (it: any) => (
                                  <div className="line-clamp-2 leading-tight py-1" title={it.item?.item_name}>
                                    {it.item?.item_name}
                                  </div>
                                ),
                                width: "350px",
                              },
                              {
                                header: "Taric code",
                                render: (it: any) => it.set_taric_code || it.item?.taric?.code || "-",
                                width: "100px",
                              },
                              {
                                header: "QTY",
                                render: (it: any) => <span className="font-bold">{it.qty}</span>,
                                width: "60px",
                                align: "center",
                              },
                              {
                                header: "EUR",
                                render: (it: any) => it.eur_special_price || it._fallbackEk || "0",
                                width: "60px",
                                align: "center",
                              },
                              {
                                header: "EK",
                                render: (it: any) => {
                                  const unitPrice = Number(it.eur_special_price || it._fallbackEk) || 0;
                                  const totalPrice = (it.qty || 0) * unitPrice;
                                  return <span className="font-bold text-[#10B981]">{totalPrice.toFixed(2)}</span>;
                                },
                                width: "80px",
                                align: "center",
                              },
                            ]
                            : [
                              {
                                header: "ID",
                                render: (it: any) => (
                                  <div className="flex flex-col gap-1.5 p-1">
                                    <div className="px-2 py-1 bg-[#495057] text-white text-[10px] font-bold rounded-[4px] text-center mb-1 flex items-center justify-center gap-1.5 font-sans">
                                      <FileText className="w-3 h-3" /> {it.id}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem(it);
                                          setNewQty(it.qty_label || it.qty);
                                          setQtyRemarks(it.remarks_cn || "");
                                          setShowQTYModal(true);
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#495057] text-white rounded-[4px] hover:bg-[#343A40] transition shadow-sm uppercase"
                                      >
                                        <Package className="w-2.5 h-2.5" /> QtyLabel
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem(it);
                                          setSplitQty(Math.floor(it.qty * 0.5));
                                          setTargetCargoId("");
                                          setSplitRemarks(it.remarks_cn || "");
                                          setShowSPModal(true);
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#F15A24] text-white rounded-[4px] hover:bg-[#D9481B] transition shadow-sm uppercase"
                                      >
                                        <Scissors className="w-2.5 h-2.5" /> Split
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedItem(it);
                                          setTargetCargoId(it.cargo_id || "");
                                          setShowREModal(true);
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-[9px] font-bold bg-[#4F46E5] text-white rounded-[4px] hover:bg-[#4338CA] transition shadow-sm uppercase"
                                      >
                                        <RefreshCw className="w-2.5 h-2.5" /> ReAssign
                                      </button>
                                    </div>
                                  </div>
                                ),
                                width: "100px",
                              },
                              {
                                header: "EAN",
                                render: (it: any) => it._fallbackEan || it.item?.ean || "-",
                                width: "110px",
                              },
                              {
                                header: "Item Name",
                                render: (it: any) => (
                                  <div className="line-clamp-3 leading-tight break-words" title={it.item?.item_name}>
                                    {it.item?.item_name}
                                  </div>
                                ),
                                width: "250px",
                              },
                              {
                                header: "Taric code",
                                render: (it: any) => it.set_taric_code || it.item?.taric?.code,
                                width: "90px",
                              },
                              {
                                header: "Remark",
                                render: (it: any) => `// ${it.remark_de || ""}`,
                                width: "80px",
                              },
                              {
                                header: "Order_no",
                                render: (it: any) => it.order?.order_no || "-",
                                width: "80px",
                              },
                              {
                                header: "SOID",
                                render: (it: any) => it.supplier_order_id || "-",
                                width: "50px",
                              },
                              {
                                header: "Status",
                                render: (it: any) => it.status,
                                width: "60px",
                              },
                              {
                                header: "V(dm³)",
                                render: (it: any) => it.v?.toFixed(2),
                                width: "60px",
                                align: "center",
                              },
                              {
                                header: "W(kg)",
                                render: (it: any) => it.w?.toFixed(2),
                                width: "60px",
                                align: "center",
                              },
                              {
                                header: "QTY",
                                render: (it: any) => (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold">
                                      {it.qty_label ? `${it.qty_label}/${it.qty}` : it.qty}
                                    </span>
                                  </div>
                                ),
                                width: "60px",
                                align: "center",
                              },
                              {
                                header: "EUR",
                                render: (it: any) => it.eur_special_price || it._fallbackEk || "0",
                                width: "45px",
                                align: "center",
                              },
                              {
                                header: "EK",
                                render: (it: any) => {
                                  const unitPrice = Number(it.eur_special_price || it._fallbackEk) || 0;
                                  const totalPrice = (it.qty || 0) * unitPrice;
                                  return <span className="font-bold text-[#10B981]">{totalPrice.toFixed(2)}</span>;
                                },
                                width: "65px",
                                align: "center",
                              },
                              {
                                header: "Action",
                                render: (it: any) =>
                                  it.item?.is_eur_special === "Y" &&
                                    (!it.eur_special_price || Number(it.eur_special_price) === 0) ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedPriceItemId(expandedPriceItemId === it.id ? null : it.id);
                                        setEditingPrice(it.eur_special_price || 0);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444] text-white text-[10px] font-bold rounded-[4px] hover:bg-red-600 transition-all shadow-md whitespace-nowrap"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" /> SET EUR PRICE
                                    </button>
                                  ) : null,
                                width: "120px",
                              },
                            ]
                        }
                        expandedRowId={expandedPriceItemId}
                        renderRowDetails={(it: any) => (
                          <div className="bg-[#F8F9FA] p-4 rounded-md border border-gray-200 mt-2 shadow-inner">
                            <h4 className="text-[11px] font-bold text-[#495057] uppercase mb-3 tracking-wider flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-[#EF4444] rounded-full"></div>
                              Set EUR Price for Item {it.id}
                            </h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-bold text-[#6C757D] uppercase mb-1.5">
                                  EUR Special Price
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingPrice}
                                    onChange={(e) => setEditingPrice(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-[4px] text-sm focus:ring-2 focus:ring-[#EF4444] focus:border-transparent outline-none transition-all shadow-sm font-medium text-black"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedPriceItemId(null);
                                  }}
                                  className="px-4 py-2 text-[11px] font-bold text-[#495057] bg-white border border-[#DEE2E6] rounded-[4px] hover:bg-gray-50 transition-all uppercase shadow-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetPrice(it.id);
                                  }}
                                  className="px-5 py-2 text-[11px] font-bold text-white bg-[#10B981] rounded-[4px] hover:bg-[#059669] transition-all uppercase shadow-md flex items-center gap-2"
                                >
                                  <Check className="w-3.5 h-3.5" /> Set Price
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        showTotals={false}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showREModal && selectedItem && (
          <CustomModal
            isOpen={showREModal}
            onClose={() => setShowREModal(false)}
            title={
              selectedItem.cargo_id
                ? (selectedItem.order_no
                  ? `Reassign Order No: ${selectedItem.order_no}`
                  : `Reassign Item ID: ${selectedItem.id}`)
                : (selectedItem.order_no
                  ? `Assign Order No: ${selectedItem.order_no}`
                  : `Assign Item ID: ${selectedItem.id}`)
            }
          >
            <div className="p-4 space-y-4 min-h-[320px] flex flex-col justify-between">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                  Select Target Cargo
                </label>
                <Select
                  className="text-sm"
                  menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  options={cargos
                    .filter((c) => {
                      const status = (c.cargo_status || "").trim().toLowerCase();
                      return status !== "shipped" && status !== "delivered";
                    })
                    .map((c) => ({
                      value: String(c.id),
                      label: `${c.cargo_no} ${c.cargo_status ? `(${c.cargo_status})` : ""}`,
                    }))}
                  value={
                    cargos
                      .map((c) => ({
                        value: String(c.id),
                        label: `${c.cargo_no} ${c.cargo_status ? `(${c.cargo_status})` : ""}`,
                      }))
                      .find((opt) => opt.value === String(targetCargoId)) ||
                    null
                  }
                  onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
                  placeholder="Search or Select Cargo..."
                  isSearchable
                  isClearable
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowREModal(false)}
                  className="px-5 py-2 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[4px] transition-all uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReassignItem}
                  disabled={!targetCargoId}
                  className="px-6 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 disabled:opacity-50 transition-all font-bold uppercase shadow-md flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {selectedItem.cargo_id ? "Confirm Reassign" : "Confirm Assign"}
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showSPModal && selectedItem && (
          <CustomModal
            isOpen={showSPModal}
            onClose={() => setShowSPModal(false)}
            title="Split Item Position Across Cargos"
          >
            <div className="p-4 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Split Quantity:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={splitQty}
                    onChange={(e) => setSplitQty(Number(e.target.value))}
                    min={1}
                    max={selectedItem.qty - 1}
                    className="w-full border-2 border-[#10B981] rounded-xl p-3 text-lg outline-none focus:ring-0 shadow-sm"
                    placeholder="Enter quantity to split"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-2 px-1">
                  Available to split: {selectedItem.qty}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Target Cargo (Optional)
                </label>
                <Select
                  menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                  options={cargos
                    .filter((c) => {
                      const status = (c.cargo_status || "").trim().toLowerCase();
                      return status !== "shipped" && status !== "delivered";
                    })
                    .map((c) => ({
                      value: String(c.id),
                      label: `${c.cargo_no} (${c.cargo_status})`,
                    }))}
                  value={
                    cargos
                      .map((c) => ({
                        value: String(c.id),
                        label: `${c.cargo_no} (${c.cargo_status})`,
                      }))
                      .find((opt) => opt.value === targetCargoId) || null
                  }
                  onChange={(opt: any) => setTargetCargoId(opt?.value || "")}
                  placeholder="Select cargo..."
                  isClearable
                  className="text-sm shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Review (CN)
                </label>
                <textarea
                  value={splitRemarks}
                  onChange={(e) => setSplitRemarks(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[#10B981] min-h-[100px]"
                  placeholder="Chinese review or split notes..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSplitItem}
                  disabled={splitQty <= 0 || splitQty >= selectedItem.qty}
                  className="w-full sm:w-auto px-10 py-3 bg-[#10B981] text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  Split & Move Item Position
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showTaricModal && selectedTaricGroup && (
          <CustomModal
            isOpen={showTaricModal}
            onClose={() => setShowTaricModal(false)}
            title="Set Taric Code"
          >
            <div className="p-4 space-y-4">
              <p className="text-[11px] font-bold text-gray-600 mb-1 uppercase tracking-tight">
                Current taric code is :{" "}
                <span className="text-black ml-1">
                  {selectedTaricGroup.taricCode}
                </span>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select new taric code
                </label>
                <select
                  value={selectedTaricCode}
                  onChange={(e) => setSelectedTaricCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#1A73E8] bg-white text-black"
                >
                  <option value="">Select Taric Code</option>
                  {tarics.map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.code} -{" "}
                      {t.description_de ||
                        t.name_de ||
                        t.name_en ||
                        "No description available"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowTaricModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 uppercase font-bold text-[10px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSetTaric(selectedTaricGroup)}
                  disabled={!selectedTaricCode}
                  className="px-6 py-2 text-sm bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0] disabled:opacity-50 uppercase font-bold text-[10px]"
                >
                  Update Taric
                </button>
              </div>
            </div>
          </CustomModal>
        )}

        {showQTYModal && selectedItem && (
          <CustomModal
            isOpen={showQTYModal}
            onClose={() => setShowQTYModal(false)}
            title={`Update QtyLabel for this item`}
          >
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New QtyLabel
                </label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Remarks
                </label>
                <textarea
                  value={qtyRemarks}
                  onChange={(e) => setQtyRemarks(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#8CC21B]"
                  placeholder="Enter remarks..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowQTYModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateQty}
                  disabled={newQty <= 0}
                  className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Update QtyLabel
                </button>
              </div>
            </div>
          </CustomModal>
        )}


        <OrderDetailsModal
          isOpen={showViewModal}
          onClose={closeView}
          viewOrder={viewOrder}
          viewItems={viewItems}
          getCategoryName={getCategoryName}
          getSupplierName={getSupplierName}
        />

        {showModal && (
          <CustomModal
            isOpen={showModal}
            onClose={closeModal}
            width="max-w-4xl"
            title={
              mode === "edit"
                ? "Edit Order"
                : "Create New Order"
            }
            footer={
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={mode === "edit" ? handleUpdateOrder : handleCreateOrder}
                  className="px-6 py-2 rounded-lg bg-[#059669] text-white font-semibold hover:bg-green-700 shadow-md transition-all font-bold"
                >
                  {mode === "edit" ? "Update Order" : "Create Order"}
                </button>
              </div>
            }
          >
            <div className="space-y-4 text-black">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Category:</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier:</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.company_name || s.name || "Unnamed Supplier"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Item then quantity:</label>
                <ItemSelectorWithQuantity
                  items={effectiveItems}
                  selectedItemId={selectedItemId}
                  onItemChange={setSelectedItemId}
                  onAdd={handleAddItemToOrder}
                  disabled={loadingItems}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment:</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50 text-black"
                  placeholder="Enter order comment..."
                  rows={3}
                />
              </div>
              {orderItems.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-[4px] shadow-md">
                    <thead className="bg-gray-100 text-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium border-b">ID</th>
                        <th className="px-4 py-2 text-left text-sm font-medium border-b w-[120px]">Item name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium border-b">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium border-b">Item remark</th>
                        <th className="px-4 py-2 text-left text-sm font-medium border-b">Price</th>
                        <th className="px-4 py-2 text-center text-sm font-medium border-b">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {orderItems.map((row) => (
                        <tr key={row.item_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm border-b">{row.item_id}</td>
                          <td className="px-4 py-2 text-sm border-b"><div className="line-clamp-2 leading-tight max-w-[120px]">{row.itemName}</div></td>
                          <td className="px-4 py-2 text-sm border-b">
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={(e) => handleUpdateOrderItemQty(row.item_id, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-[4px] text-black"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm border-b">
                            <input
                              type="text"
                              value={row.remark_de}
                              onChange={(e) => handleUpdateOrderItemRemark(row.item_id, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-[4px] text-black"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm border-b">{row.price} {row.currency}</td>
                          <td className="px-4 py-2 text-center border-b">
                            <button
                              onClick={() => handleRemoveOrderItem(row.item_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CustomModal>
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
