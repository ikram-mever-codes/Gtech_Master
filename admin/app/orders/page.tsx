"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Select from "react-select";
import {
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  PrinterIcon,
  ScissorsIcon,
  ArrowRightCircleIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderItemStatus,
  updateOrderItemLabel,
  type Order,
  type OrderSearchFilters,
  getOrderStatusColor,
  downloadItemLabel,
} from "@/api/orders";
import {
  getAllCargos,
  assignOrdersToCargo,
  type CargoType,
} from "@/api/cargos";
import {
  createSupplierOrder,
  getAllSupplierOrders,
  updateSupplierOrder,
  deleteSupplierOrder,
  downloadPurchaseOrder,
  type SupplierOrder,
} from "@/api/supplier_orders";

import { getAllCustomers } from "@/api/customers";
import {
  getAllSuppliers,
  getSupplierItems,
  type Supplier,
} from "@/api/suppliers";
import { getItems, updateItem } from "@/api/items";
import { getCategories } from "@/api/categories";
import CustomButton from "@/components/UI/CustomButton";
import CustomModal from "@/components/UI/CustomModal";
import PageHeader from "@/components/UI/PageHeader";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import { ShoppingCart, Search, RefreshCw } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import ItemSelectorWithQuantity from "@/components/orders/ItemSelectorWithQuantity";
import OrdersTable from "@/components/orders/OrdersTable";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";

const hasChinese = (str: string) => /[\u4e00-\u9fa5]/.test(str || "");
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
type Customer = {
  id: string | number;
  companyName: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  deliveryAddressLine1?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  contactEmail?: string;
  email?: string;
  legalName?: string;
  contactPhoneNumber?: string;
};
type Category = { id: string | number; name: string };

type Option = { value: string; label: string };
type OrderItemRow = {
  item_id: string;
  itemName: string;
  qty: number;
  qty_label?: number;
  remark_de: string;
  remarks_cn?: string;
  remark_en?: string;
  ean?: string;
  status?: string;
  price?: number;
  currency?: string;
  item?: any;
  supplier_id?: string;
  customer_id?: string;
  supplier_order_id?: number | string;
  taric_code?: string;
  supplier_name?: string;
};

type Mode = "create" | "edit" | "convert";



const tabs = [
  {
    id: "nso",
    label: "NSO (No Supplier Orders)",
    description: "Orders with no supplier",
  },
  {
    id: "supplier_orders",
    label: "Suppliers Order",
    description: "Orders with suppliers",
  },
  {
    id: "purchase_order",
    label: "Purchase order",
    description: "List of created PO for all Suppliers",
  },
  {
    id: "problems",
    label: "Problems",
    description: "Manage order problems and label reprints",
  },
  {
    id: "label_print",
    label: "Label Print",
    description: "Print and manage labels",
  },
] as const;



const OrderPage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.user);

  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    () => (searchParams.get("tab") as any) || "nso",
  );
  const [orderNoFilter, setOrderNoFilter] = useState<string>(
    () => searchParams.get("order_no") || "",
  );
  const activeTabObj = tabs.find((t) => t.id === activeTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cargos, setCargos] = useState<CargoType[]>([]);
  const [supplierOrdersList, setSupplierOrdersList] = useState<SupplierOrder[]>(
    [],
  );
  const [expandedSupplierOrderId, setExpandedSupplierOrderId] = useState<
    number | null
  >(null);
  const [loadingSupplierOrders, setLoadingSupplierOrders] = useState(false);
  const [supplierOrderSearch, setSupplierOrderSearch] = useState("");
  const [poSearch, setPoSearch] = useState("");

  const [itemsAll, setItemsAll] = useState<Item[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Item[]>([]);
  const [itemsBySupplier, setItemsBySupplier] = useState<Item[]>([]);
  const [loadingItemsAll, setLoadingItemsAll] = useState(false);
  const [loadingItemsByCategory, setLoadingItemsByCategory] = useState(false);
  const [loadingItemsBySupplier, setLoadingItemsBySupplier] = useState(false);

  const [filters, setFilters] = useState<OrderSearchFilters>({
    search: "",
    status: undefined,
  });

  const [mode, setMode] = useState<Mode>("create");
  const [showModal, setShowModal] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewItems, setViewItems] = useState<OrderItemRow[]>([]);

  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignOrder, setReassignOrder] = useState<any>(null);
  const [showSupplierConfirm, setShowSupplierConfirm] = useState(false);
  const [pendingNsoGroup, setPendingNsoGroup] = useState<any>(null);

  const [form, setForm] = useState({
    comment: "",
    customer_id: "",
    category_id: "",
    supplier_id: "",
    status: "",
    ref_no: "",
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [targetCargoId, setTargetCargoId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [nsoSearch, setNsoSearch] = useState("");
  const [expandedNsoId, setExpandedNsoId] = useState<string | null>(null);

  const [isEditQtyModalOpen, setIsEditQtyModalOpen] = useState(false);
  const [editQtyItem, setEditQtyItem] = useState<any>(null);
  const [newQty, setNewQty] = useState<string>("");
  const [newRemarkCN, setNewRemarkCN] = useState<string>("");
  const [reprintSearch, setReprintSearch] = useState("");

  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [remarksCN, setRemarksCN] = useState("");
  const [poForm, setPoForm] = useState({
    po_description: "",
    comment_items: "",
    comment_attachments: "",
    comment_quality: "",
    comment_delivery_left: "",
    comment_delivery_right: "",
  });
  const [isPOEditing, setIsPOEditing] = useState(false);
  const [isSOEditing, setIsSOEditing] = useState(false);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of itemsAll) map.set(String(it.id), it);
    for (const it of itemsByCategory) map.set(String(it.id), it);
    for (const it of itemsBySupplier) map.set(String(it.id), it);
    return map;
  }, [itemsAll, itemsByCategory, itemsBySupplier]);

  const problemItems = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        if (it.status?.toLowerCase().includes("problem") || it.problems) {
          list.push({ ...it, parentOrder: o });
        }
      });
    });

    const filterParam = searchParams.get("filter");
    if (filterParam === "purchase_problem") {
      return list.filter((i: any) =>
        (i.problems && (i.problems.toLowerCase().includes("purchase") || i.problems.toLowerCase().includes("buy"))) ||
        (i.status && String(i.status).toLowerCase().includes("purchase"))
      );
    } else if (filterParam === "check_problem") {
      return list.filter((i: any) =>
        (i.problems && (i.problems.toLowerCase().includes("check") || i.problems.toLowerCase().includes("verify")))
      );
    }

    return list;
  }, [orders, searchParams]);

  const reprintItems = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const isPrinted =
          it.status?.toLowerCase() === "printed" || it.printed === "Y";
        if (isPrinted) {
          const searchLower = reprintSearch.toLowerCase();
          const itemData = itemById.get(String(it.item_id));
          const matchesSearch =
            !reprintSearch ||
            String(it.id).includes(reprintSearch) ||
            String(it.item_id).includes(reprintSearch) ||
            it.item?.ean?.toString().includes(reprintSearch) ||
            itemData?.ean?.toString().includes(reprintSearch) ||
            it.item?.item_name?.toLowerCase().includes(searchLower) ||
            it.item?.name?.toLowerCase().includes(searchLower) ||
            it.itemName?.toLowerCase().includes(searchLower) ||
            itemData?.item_name?.toLowerCase().includes(searchLower) ||
            itemData?.name?.toLowerCase().includes(searchLower) ||
            o.order_no?.toString().toLowerCase().includes(searchLower) ||
            it.remark_de?.toLowerCase().includes(searchLower) ||
            it.remarks_cn?.toLowerCase().includes(searchLower);

          if (matchesSearch) {
            list.push({ ...it, parentOrder: o });
          }
        }
      });
    });
    return list;
  }, [orders, reprintSearch, itemById]);
  const handlePrintLabel = async (row: any) => {
    if (!row.id) {
      toast.error("Invalid Item ID");
      return;
    }
    await downloadItemLabel(row.id);
  };
  const purchaseOrdersList = useMemo(() => {
    return supplierOrdersList.filter((so) => {
      const isPurchaseOrder = so.order_type?.name === "Purchase Order" && so.is_po_created === 1;
      if (!isPurchaseOrder) return false;

      const searchLower = poSearch.toLowerCase();
      const poNo = `PO${new Date(so.created_at).getFullYear().toString().slice(-2)}${String(so.id).padStart(3, "0")}`;
      return (
        !poSearch ||
        String(so.id).includes(poSearch) ||
        poNo.toLowerCase().includes(searchLower) ||
        so.supplier?.company_name?.toLowerCase().includes(searchLower) ||
        so.remark?.toLowerCase().includes(searchLower)
      );
    });
  }, [supplierOrdersList, poSearch]);

  const labelPrintItems = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const searchLower = reprintSearch.toLowerCase();

        const itemData = itemById.get(String(it.item_id));

        const eanSources = [
          it.item?.ean,
          itemData?.ean,
          it.ean,
          it.warehouse_data?.ean,
          it.item?.warehouse_data?.ean,
          o.items?.find((i: any) => i.item_id === it.item_id)?.item?.ean,
        ].filter(Boolean);

        const matchesEAN = eanSources.some((ean) =>
          ean?.toString().toLowerCase().includes(searchLower),
        );

        const matchesSearch =
          !reprintSearch ||
          matchesEAN ||
          String(it.id).toLowerCase().includes(searchLower) ||
          String(it.item_id).toLowerCase().includes(searchLower) ||
          it.item?.item_name?.toLowerCase().includes(searchLower) ||
          it.item?.name?.toLowerCase().includes(searchLower) ||
          it.itemName?.toLowerCase().includes(searchLower) ||
          itemData?.item_name?.toLowerCase().includes(searchLower) ||
          itemData?.name?.toLowerCase().includes(searchLower) ||
          o.order_no?.toString().toLowerCase().includes(searchLower) ||
          it.remark_de?.toLowerCase().includes(searchLower) ||
          it.remarks_cn?.toLowerCase().includes(searchLower);

        if (matchesSearch) {
          list.push({ ...it, parentOrder: o });
        }
      });
    });
    return list;
  }, [orders, reprintSearch, itemById]);
  const orderItemDetailsMap = useMemo(() => {
    const map = new Map<string, any>();
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        map.set(String(it.id), {
          order_no: o.order_no,
          cargo_id: o.cargo_id || it.cargo_id,
          price: it.price || it.item?.rmb_price || it.item?.RMB_Price || it.item?.rmb_special_price || it.item?.others?.rmbPrice || 0,
          status:
            it.status ||
            it.item_status ||
            (o.status === 4 ? "Purchased" : "SO"),
          parentOrder: o,
        });
      });
    });
    return map;
  }, [orders]);

  const getCategoryName = useCallback(
    (categoryId: string | number) =>
      categories.find((c) => String(c.id) === String(categoryId))?.name ?? "-",
    [categories],
  );

  const getCustomerName = useCallback(
    (customerId: any) =>
      customers.find((c) => String(c.id) === String(customerId))?.companyName ??
      "-",
    [customers],
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

  const supplierMap = useMemo(() => {
    const map = new Map<string, any>();
    suppliers.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [suppliers]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [categories]);

  const getSupplierNameOpt = useCallback(
    (supplierId: any) => {
      const s = supplierMap.get(String(supplierId));
      if (!s) return String(supplierId);
      const englishName = (s.name && !hasChinese(s.name)) ? s.name : ((s.company_name && !hasChinese(s.company_name)) ? s.company_name : null);
      if (englishName) return englishName;
      const chineseName = s.name_cn || s.company_name || s.name;
      if (chineseName) return chineseName;
      return s.name_de || String(s.id);
    },
    [supplierMap],
  );

  const nsoGroups = useMemo(() => {
    if (loadingOrders) return { express: [], normal: [] };

    const groups = {
      express: new Map<string, any>(),
      normal: new Map<string, any>(),
    };

    const recognizedSet = new Set(suppliers.map(s => String(s.id)));

    orders.forEach((o: any) => {
      const isExpress = (o.comment || "").toLowerCase().includes("express");
      const targetMap = isExpress ? groups.express : groups.normal;

      (o.items || []).forEach((item: any) => {
        if (item.supplier_order_id) return;
        const rawStatus = (item.status || "").trim().toUpperCase();
        if (rawStatus && rawStatus !== "NSO" && rawStatus !== "SO") return;

        const itemDetails = item.item || itemById.get(String(item.item_id));

        let sId = 0;
        const o_sid = String(o.supplier_id || "0");
        const i_sid = String(itemDetails?.supplier_id || "0");

        if (o_sid !== "0" && recognizedSet.has(o_sid)) {
          sId = Number(o_sid);
        } else if (i_sid !== "0" && recognizedSet.has(i_sid)) {
          sId = Number(i_sid);
        }

        const sid = sId;
        if (sid === 0) return;

        const catId = Number(o.category_id || 0);
        const groupKey = `${sid}_${catId}`;

        if (!targetMap.has(groupKey)) {
          targetMap.set(groupKey, {
            id: groupKey,
            supplier_id: sid,
            supplier_name: getSupplierNameOpt(sid),
            order_type:
              categoryMap.get(String(o.category_id))?.name ||
              (o.category_id ? `Imported ${o.category_id}` : "Taobao"),
            category_id: o.category_id,
            count: 0,
            qty: 0,
            items: [],
          });
        }

        const g = targetMap.get(groupKey);
        g.count += 1;
        g.qty += Number(item.qty || 0);
        g.items.push({ ...item, _order_no: o.order_no });
      });
    });

    const filterBySearch = (arr: any[]) => {
      if (!nsoSearch) return arr;
      const s = nsoSearch.toLowerCase();
      return arr.filter(
        (g) =>
          String(g.supplier_id).includes(s) ||
          g.supplier_name.toLowerCase().includes(s),
      );
    };

    return {
      express: filterBySearch(Array.from(groups.express.values())),
      normal: filterBySearch(Array.from(groups.normal.values())),
    };
  }, [orders, itemById, supplierMap, categoryMap, getSupplierNameOpt, nsoSearch, loadingOrders, suppliers]);

  const isTab1 = true;
  const isTab2 = false;
  const isConvertMode = mode === "convert";

  const effectiveItems: Item[] = useMemo(() => {
    if (form.supplier_id) return itemsBySupplier;
    if (form.category_id) return itemsByCategory;
    return itemsAll;
  }, [
    form.supplier_id,
    itemsBySupplier,
    form.category_id,
    itemsByCategory,
    itemsAll,
  ]);

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
  }, [
    isConvertMode,
    orderItems.length,
    form.comment,
    form.category_id,
    form.supplier_id,
    form.customer_id,
    isTab1,
    isTab2,
  ]);

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

  const handlePurchaseItem = async (itemId: string | number) => {
    try {
      await updateOrderItemStatus(itemId, { status: "Purchased" });
      await Promise.all([fetchOrders(), fetchSupplierOrders()]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBackToNSO = async (itemId: string | number) => {
    if (!window.confirm("Return this item to NSO?")) return;
    try {
      await updateOrderItemStatus(itemId, {
        status: "NSO",
        supplier_order_id: null,
      });
      await Promise.all([fetchOrders(), fetchSupplierOrders()]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditQty = (item: any) => {
    setEditQtyItem(item);
    setNewQty(String(item.qty_label || item.qty || ""));
    setNewRemarkCN(item.remarks_cn || "");
    setIsEditQtyModalOpen(true);
  };

  const saveQtyChanges = async () => {
    if (!editQtyItem) return;
    try {
      await updateOrderItemStatus(editQtyItem.id, {
        qty_label: Number(newQty),
        remarks_cn: newRemarkCN,
      });
      setIsEditQtyModalOpen(false);
      fetchOrders();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update item");
    }
  };

  const handleSplitItemAction = async () => {
    if (!selectedItem || splitQty < 0) return;
    try {
      await updateOrderItemLabel(selectedItem.id, splitQty, remarksCN);
      toast.success("Quantity updated successfully");
      setShowSPModal(false);
      setRemarksCN("");
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReassignItemAction = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      const isItem = !!(selectedItem.item_id || selectedItem.parentOrder);
      const cargoIdNum = Number(targetCargoId);

      if (isItem) {
        await updateOrderItemStatus(selectedItem.id, {
          cargo_id: cargoIdNum,
        });

        const orderId = selectedItem.order_id || selectedItem.parentOrder?.id;
        if (orderId) {
          await assignOrdersToCargo(cargoIdNum, [Number(orderId)]);
        }

        toast.success(
          `Item reassigned to Cargo ${targetCargoId} — invoice updated!`,
        );
      } else {
        await assignOrdersToCargo(cargoIdNum, [Number(selectedItem.id)]);
        toast.success(
          `Order ${selectedItem.order_no} reassigned to Cargo ${targetCargoId} — invoice generated!`,
        );
      }

      setShowREModal(false);
      fetchOrders();
      fetchCargos();
    } catch (err) {
      console.error(err);
      toast.error("Failed to reassign");
    }
  };

  const calcV = (it: any) => {
    const d = itemById.get(String(it.item_id));
    if (d?.length && d?.width && d?.height)
      return (d.length * d.width * d.height) / 1000;
    return 0;
  };

  const calcW = (it: any) => itemById.get(String(it.item_id))?.weight || 0;

  const fetchCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.categories || [];
      setCategories(arr);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await getAllCustomers({ limit: 1000 });
      const data = response?.data ?? response;
      const arr = Array.isArray(data) ? data : data?.customers || [];
      setCustomers(arr);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to fetch customers");
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
      toast.error("Failed to fetch suppliers");
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
      toast.error("Failed to fetch items");
      setItemsAll([]);
    } finally {
      setLoadingItemsAll(false);
    }
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
      toast.error("Failed to fetch category items");
      setItemsByCategory([]);
    } finally {
      setLoadingItemsByCategory(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await getAllOrders(filters);
      if (response?.success) setOrders(response.data);
      else if (response?.data) setOrders(response.data);
    } catch (error) {
      console.error("Error fetching Orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", activeTab);
    if (orderNoFilter) params.set("order_no", orderNoFilter);
    else params.delete("order_no");
    const qs = params.toString();
    router.replace(qs ? `/orders?${qs}` : "/orders", { scroll: false });
  }, [activeTab, orderNoFilter, router, searchParams]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const validTabs = ["nso", "supplier_orders", "purchase_order", "problems", "label_print"];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
    const orderNoParam = searchParams.get("order_no");
    if (orderNoParam !== null) {
      setOrderNoFilter(orderNoParam);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCustomers();
    fetchCategories();
    fetchSuppliers();
    fetchAllItems();
    fetchCargos();
  }, [fetchCustomers, fetchCategories, fetchSuppliers, fetchAllItems]);

  useEffect(() => {
    console.log("DEBUG: Suppliers count in state:", suppliers.length);
  }, [suppliers]);

  const fetchCargos = useCallback(async () => {
    try {
      const res = await getAllCargos({ limit: 1000 });
      const data = res?.data ?? res;
      setCargos(Array.isArray(data) ? data : data?.cargos || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchSupplierOrders = useCallback(async () => {
    try {
      setLoadingSupplierOrders(true);
      const res: any = await getAllSupplierOrders({
        search: supplierOrderSearch,
      });
      if (res.success) setSupplierOrdersList(res.data);
      else if (Array.isArray(res.data)) setSupplierOrdersList(res.data);
      else if (Array.isArray(res)) setSupplierOrdersList(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSupplierOrders(false);
    }
  }, [supplierOrderSearch]);

  const handleCreateSupplierOrderFromNSO = (group: any) => {
    if (group.supplier_id === 0) {
      toast.error("Please assign a supplier to these items first");
      return;
    }
    setPendingNsoGroup(group);
    setShowSupplierConfirm(true);
  };

  const confirmCreateSupplierOrder = async () => {
    if (!pendingNsoGroup) return;
    setShowSupplierConfirm(false);
    try {
      const sid = Number(pendingNsoGroup.supplier_id || 0);
      const cid = Number(pendingNsoGroup.category_id || 0);

      await createSupplierOrder({
        supplier_id: sid > 0 ? sid : null,
        order_type_id: cid > 0 ? cid : null,
        item_ids: pendingNsoGroup.items.map((i: any) => Number(i.id)),
      });
      await fetchOrders();
      await fetchSupplierOrders();
      await fetchAllItems();
    } catch (e) {
      console.error(e);
    } finally {
      setPendingNsoGroup(null);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const validTabs = ["nso", "supplier_orders", "purchase_order", "problems", "label_print"];
      if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
    const orderNo = searchParams.get("order_no");
    if (orderNo !== null) {
      setOrderNoFilter(orderNo);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "supplier_orders" || activeTab === "purchase_order")
      fetchSupplierOrders();
  }, [activeTab, fetchSupplierOrders]);

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
  const openPO = (so: any) => {
    setMode("edit");
    setIsPOEditing(true);
    setSelectedOrder(so);
    setPoForm({
      po_description: so.po_description || "",
      comment_items: so.comment_items || "",
      comment_attachments: so.comment_attachments || "",
      comment_quality: so.comment_quality || "",
      comment_delivery_left: so.comment_delivery_left || "",
      comment_delivery_right: so.comment_delivery_right || "",
    });
    setOrderItems((so.items || []).map((it: any) => {
      const det = orderItemDetailsMap.get(String(it.id));
      const resolvedPrice =
        det?.rmb_special_price ||
        it.rmb_special_price ||
        it.rmb_price ||
        it.item?.rmb_price ||
        it.item?.rmb_special_price ||
        it.item?.RMB_Price ||
        it.item?.others?.rmbPrice ||
        det?.price ||
        it.price ||
        0;
      return {
        ...it,
        price: resolvedPrice
      };
    }));
    setShowModal(true);
  };
  const handleSavePO = async () => {
    if (!selectedOrder) return;
    try {
      await updateSupplierOrder(selectedOrder.id, {
        ...poForm,
        items: orderItems,
        is_po_created: 1,
      });
      setShowModal(false);
      fetchSupplierOrders();
      toast.success("Purchase Order updated successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update Purchase Order");
    }
  };
  const openCreate = () => {
    resetForm();
    setMode("create");
    setShowModal(true);
  };
  const openEdit = async (order: Order) => {
    if (activeTab === "purchase_order") {
      const so = order as any;
      setMode("edit");
      setSelectedOrder(so);
      setPoForm({
        po_description: so.po_description || "",
        comment_items: so.comment_items || "",
        comment_attachments: so.comment_attachments || "",
        comment_quality: so.comment_quality || "",
        comment_delivery_left: so.comment_delivery_left || "",
        comment_delivery_right: so.comment_delivery_right || "",
      });
      setOrderItems(so.items || []);
      setShowModal(true);
      return;
    }

    if (activeTab === "supplier_orders") {
      const so = order as any;
      setMode("edit");
      setIsSOEditing(true);
      setSelectedOrder(so);
      setForm({
        supplier_id: String(so.supplier_id || ""),
        category_id: String(so.order_type_id || ""),
        ref_no: so.ref_no || "",
        comment: so.remark || "",
        status: String(so.status || ""),
        customer_id: "",
      });
      setShowModal(true);
      return;
    }

    setMode("edit");
    setSelectedOrder(order);
    setShowModal(true);

    setForm({
      category_id: String(order.category_id ?? ""),
      customer_id: String(order.customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
      ref_no: "",
    });

    const category_id = String(order.category_id ?? "");
    if (isTab1 && category_id) await fetchItemsByCategory(category_id);
    else setItemsByCategory([]);

    const supplier_id = String(order.supplier_id ?? "");
    if (isTab1 && supplier_id) await handleSupplierChange(supplier_id, false);
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

  const openConvert = async (order: Order) => {
    setMode("convert");
    setSelectedOrder(order);
    setShowModal(true);

    setForm({
      category_id: String(order.category_id ?? "1"),
      customer_id: String(order.customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
      ref_no: "",
    });

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
            itemName:
              l.item_name ||
              l.itemName ||
              item?.item_name ||
              item?.name ||
              "Unknown item",
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
    setIsPOEditing(false);
    setIsSOEditing(false);
    resetForm();
  };

  const openView = async (order: Order) => {
    setViewOrder(order);
    setShowViewModal(true);

    try {
      const detailRes: any = await getOrderById(order.id);
      const detail = detailRes?.data ?? detailRes;
      if (detail && detail.id) {
        setViewOrder(detail);
      }
      const lines = detail?.items ?? detail?.data?.items ?? [];

      if (Array.isArray(lines)) {
        setViewItems(
          lines.map((l: any) => {
            const id = String(l.item_id ?? "");
            const item = itemById.get(id);
            const resolvedSupplierId =
              l.supplier_id ||
              l.item?.supplier_id ||
              item?.supplier_id ||
              null;
            return {
              item_id: id,
              itemName:
                l.item_name ||
                l.itemName ||
                l.item?.item_name ||
                item?.item_name ||
                item?.name ||
                "Unknown item",
              qty: Number(l.qty ?? 1),
              qty_label: l.qty_label,
              remark_de: String(l.remark_de ?? ""),
              remarks_cn: String(l.remarks_cn ?? ""),
              remark_en: String(l.remark_en ?? ""),
              ean: l.ean || l.item?.ean || item?.ean || "-",
              price: l.price || item?.price || 0,
              currency: l.currency || item?.currency || "CNY",
              status: l.status || "NSO",
              item: l.item || item || null,
              supplier_id: resolvedSupplierId,
              supplier_name:
                l.supplier_name ||
                l.item?.supplier?.company_name ||
                l.item?.supplier?.name ||
                (item as any)?.supplier?.company_name ||
                (item as any)?.supplier?.name ||
                null,
              taric_code: l.taric_code || l.item?.taric?.code || item?.taric || null,
            };
          }),
        );
      } else {
        setViewItems([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load order details");
      setViewItems([]);
    }
  };

  const closeView = () => {
    setShowViewModal(false);
    setViewOrder(null);
    setViewItems([]);
  };

  const handleCreateOrder = async () => {
    if (!form.comment?.trim()) return toast.error("Please add a comment");
    if (orderItems.length === 0)
      return toast.error("Please add at least one item");
    if (isTab1 && !form.category_id && !form.supplier_id)
      return toast.error("Please select a category or supplier for Orders");
    if (isTab2 && !form.customer_id)
      return toast.error("Please select a customer for Customer Orders");

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

    await createOrder(payload as any);
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

  const handleUpdateSO = async () => {
    if (!selectedOrder?.id) return;
    try {
      const isNewTypePO = categories.find(c => String(c.id) === String(form.category_id))?.name === "Purchase Order";
      const isOldTypePO = selectedOrder?.order_type?.name === "Purchase Order";

      await updateSupplierOrder(selectedOrder.id, {
        supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
        order_type_id: form.category_id ? Number(form.category_id) : null,
        ref_no: form.ref_no || "",
        remark: form.comment || "",
        is_po_created: (isNewTypePO && isOldTypePO) ? (selectedOrder?.is_po_created || 0) : 0,
      });
      setShowModal(false);
      setIsSOEditing(false);
      resetForm();
      fetchSupplierOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const handleConvertOrder = async () => {
    if (!selectedOrder?.id) return;
    if (orderItems.length === 0) return toast.error("No items to convert");

    const originalId = selectedOrder.id;
    const originalOrderNo = String(selectedOrder.order_no || "");
    const category_id = selectedOrder.category_id ?? form.category_id ?? null;

    try {
      const createPayload = {
        customer_id: null,
        category_id: category_id ? String(category_id) : null,
        comment:
          (selectedOrder.comment ?? form.comment ?? "").slice(0, 200) || null,
        status: 1,
        items: orderItems.map((x) => ({
          item_id: Number(x.item_id),
          qty: Number(x.qty),
          remark_de: x.remark_de?.trim() ? x.remark_de : null,
        })),
      };

      const created: any = await createOrder(createPayload as any);
      const newOrderNo =
        created?.data?.order_no ||
        created?.data?.data?.order_no ||
        created?.order_no ||
        "";

      const marker = newOrderNo
        ? ` | Converted to ${newOrderNo}`
        : ` | Converted`;
      const nextComment = ((selectedOrder.comment ?? "") + marker).slice(
        0,
        200,
      );

      await updateOrder(originalId, {
        status: 4,
        comment: nextComment,
      });

      toast.success(
        newOrderNo
          ? `Converted ${originalOrderNo} → ${newOrderNo}`
          : `Converted ${originalOrderNo}`,
      );

      setShowModal(false);
      resetForm();
      fetchOrders();
    } catch (e) {
      console.error(e);
      toast.error("Convert failed");
    }
  };

  const handleDeleteOrder = async (orderId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this Order?")) return;
    await deleteOrder(orderId);
    fetchOrders();
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

  const nsoOrders = useMemo(
    () => orders.filter((o: any) => !o.supplier_id),
    [orders],
  );
  const supplierOrders = useMemo(
    () => orders.filter((o: any) => !!o.supplier_id),
    [orders],
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

  const visibleOrders =
    activeTab === "nso"
      ? nsoOrders
      : activeTab === "supplier_orders"
        ? supplierOrders
        : [];

  const defaultAction = (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => {
          fetchOrders();
          fetchSupplierOrders();
        }}
        disabled={loadingOrders || loadingSupplierOrders}
        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 h-[38px]"
      >
        <ArrowPathIcon
          className={`h-4 w-4 ${loadingOrders || loadingSupplierOrders ? "animate-spin" : ""}`}
        />
        Refresh
      </button>

      <CustomButton
        gradient={true}
        onClick={openCreate}
        className="px-4 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition-all shadow-md font-bold flex items-center gap-2 h-[38px]"
      >
        <PlusIcon className="h-4 w-4" />
        New Order
      </CustomButton>
    </div>
  );

  const tabActions: Record<(typeof tabs)[number]["id"], React.ReactNode> = {
    nso: defaultAction,
    supplier_orders: defaultAction,
    purchase_order: defaultAction,
    problems: defaultAction,
    label_print: defaultAction,
  };

  const lockAllExceptQty = isConvertMode;

  return (
    <>
      <div className="min-h-screen bg-transparent font-poppins">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <PageHeader
                  title={activeTabObj?.label || "Orders"}
                  icon={ShoppingCart}
                />
              </div>

              <div className="flex items-center gap-3">
                <CustomButton
                  gradient={true}
                  onClick={openCreate}
                  className="px-4 py-2.5 text-sm bg-[#8CC21B] hover:bg-[#7ab318] text-white rounded-xl shadow-sm transition-all font-semibold flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5 text-white" />
                  New Order
                </CustomButton>
              </div>
            </div>
          </div>

          {searchParams.get("filter") && searchParams.get("hide_banner") !== "true" && (
            <div className="mb-6 px-5 py-3 bg-[#FFF3CD] border border-[#FFEBA2] rounded-md text-[#856404] flex items-center justify-between text-sm shadow-sm animate-pulse">
              <div className="flex items-center gap-2">
                <span className="font-bold">⚠️ Reports & Control Health Audit View Active:</span>
                <span className="font-semibold text-gray-800">
                  {(() => {
                    switch (searchParams.get("filter")) {
                      case "unassigned_cargo": return "Order items unassigned to cargo";
                      case "purchase_problem": return "Orders with purchase problem";
                      case "check_problem": return "Orders with Check Problem";
                      default: return searchParams.get("filter");
                    }
                  })()}
                </span>
              </div>
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("filter");
                  window.location.href = `/orders?${params.toString()}`;
                }}
                className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-xs font-bold transition-all"
              >
                Clear Audit Filter
              </button>
            </div>
          )}

          <div className="border-b border-gray-100 mb-6 pb-px">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                  }}
                  className={`py-3.5 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === tab.id
                    ? "border-[#8CC21B] text-[#8CC21B]"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "nso"
                    ? "Search NSOs..."
                    : activeTab === "supplier_orders"
                      ? "Search Supplier Orders..."
                      : activeTab === "purchase_order"
                        ? "Search purchase orders..."
                        : activeTab === "problems"
                          ? "Search items..."
                          : "Search reprint items..."
                }
                value={
                  activeTab === "nso"
                    ? nsoSearch
                    : activeTab === "supplier_orders"
                      ? supplierOrderSearch
                      : activeTab === "purchase_order"
                        ? poSearch
                        : reprintSearch
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeTab === "nso") setNsoSearch(val);
                  else if (activeTab === "supplier_orders") setSupplierOrderSearch(val);
                  else if (activeTab === "purchase_order") setPoSearch(val);
                  else setReprintSearch(val);
                }}
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CC21B]/20 focus:border-[#8CC21B] transition-all bg-white text-black"
              />
            </div>

            <button
              onClick={() => {
                fetchOrders();
                fetchSupplierOrders();
              }}
              disabled={loadingOrders || loadingSupplierOrders}
              className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-all flex items-center gap-1.5 text-sm font-semibold"
              title="Refresh"
            >
              <RefreshCw
                className={`h-4.5 w-4.5 ${loadingOrders || loadingSupplierOrders ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {activeTab === "nso" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px] relative">
                {loadingOrders && (
                  <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-4 transition-all duration-300">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#059669] rounded-full animate-spin shadow-lg"></div>
                    <p className="text-sm font-bold text-gray-600 animate-pulse uppercase tracking-widest">
                      Processing NSO Data...
                    </p>
                  </div>
                )}
                <div className="h-4"></div>
                {(() => {
                  const renderNsoItemDetails = (row: any) => (
                    <div className="p-4 bg-white border border-gray-100 rounded-lg shadow-inner m-2">
                      <h4 className="font-bold text-gray-700 mb-3 ml-1 text-sm uppercase">
                        Order Items in this Group (Total: {row.count}):
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-gray-100 text-gray-500 font-semibold uppercase">
                            <tr>
                              <th className="px-3 py-2 border-b">Order No</th>
                              <th className="px-3 py-2 border-b">EAN</th>
                              <th className="px-3 py-2 border-b w-[200px]">
                                Item Name
                              </th>
                              <th className="px-3 py-2 border-b">Remark</th>
                              <th className="px-3 py-2 border-b text-center">
                                Qty
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {row.items.map((it: any, idx: number) => {
                              const d = it.item || itemById.get(String(it.item_id));
                              const name =
                                d?.item_name ||
                                d?.name ||
                                it.item_name ||
                                "Unknown";
                              const ean = d?.ean || it.ean || "-";
                              return (
                                <tr
                                  key={it.id || idx}
                                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                >
                                  <td className="px-3 py-2 font-bold">
                                    <button
                                      onClick={() => {
                                        const targetOrder = {
                                          id: it.order_id,
                                          order_no: it._order_no,
                                        };
                                        openView(targetOrder);
                                      }}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {it._order_no || "-"}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {ean}
                                  </td>
                                  <td className="px-3 py-2 font-medium text-gray-900 line-clamp-2 leading-tight max-w-[120px]">
                                    {name}
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 italic">
                                    {it.remark_de || it.remarks_cn || "-"}
                                  </td>
                                  <td className="px-3 py-2 font-bold text-center">
                                    {it.qty}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );

                  return (
                    <>
                      <div className="mb-10">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">
                          Express Orders
                        </h2>
                        <DataTable
                          data={nsoGroups.express}
                          columns={[
                            {
                              header: "SupplierID",
                              width: "120px",
                              align: "center",
                              render: (row) => (
                                <div className="flex items-center justify-center gap-1 group cursor-pointer">
                                  <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-md">
                                    {row.supplier_id}
                                    <div className="bg-white rounded-full p-0.5">
                                      <ChevronDownIcon
                                        className={`h-3 w-3 text-[#475569] transition-transform ${expandedNsoId === row.id ? "rotate-180" : ""}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              header: "Supplier name",
                              render: (row) => row.supplier_name,
                              align: "center",
                            },
                            {
                              header: "Order Type",
                              render: (row) => row.order_type,
                              align: "center",
                            },
                            {
                              header: "Count",
                              render: (row) => row.count,
                              align: "center",
                            },
                            {
                              header: "QTY",
                              render: (row) => row.qty,
                              align: "center",
                            },
                            {
                              header: "Actions",
                              align: "center",
                              render: (row) => (
                                <div className="flex justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateSupplierOrderFromNSO(row);
                                    }}
                                    disabled={row.supplier_id === 0}
                                    className={`${row.supplier_id === 0
                                      ? "bg-gray-400 cursor-not-allowed opacity-75"
                                      : "bg-[#059669] hover:bg-green-700"
                                      } text-white px-4 py-2 rounded-[4px] flex items-center gap-2 text-xs font-bold transition shadow-md`}
                                  >
                                    <PlusCircleIcon className="h-5 w-5" />
                                    {row.supplier_id === 0
                                      ? "Set Supplier"
                                      : "Supplier order"}
                                  </button>
                                </div>
                              ),
                            },
                          ]}
                          loading={loadingOrders}
                          emptyMessage={loadingOrders ? "Loading NSO Data..." : "No Express NSOs found"}
                          getRowClassName={() => "bg-red-50"}
                          expandedRowId={expandedNsoId}
                          onRowClick={(row) =>
                            setExpandedNsoId(
                              expandedNsoId === row.id ? null : row.id,
                            )
                          }
                          renderRowDetails={renderNsoItemDetails}
                        />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">
                          Normal Orders
                        </h2>
                        <DataTable
                          data={nsoGroups.normal}
                          columns={[
                            {
                              header: "SupplierID",
                              width: "120px",
                              align: "center",
                              render: (row) => (
                                <div className="flex items-center justify-center gap-1 group cursor-pointer">
                                  <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-md">
                                    {row.supplier_id}
                                    <div className="bg-white rounded-full p-0.5">
                                      <ChevronDownIcon
                                        className={`h-3 w-3 text-[#475569] transition-transform ${expandedNsoId === row.id ? "rotate-180" : ""}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              header: "Supplier",
                              render: (row) => row.supplier_name,
                              align: "center",
                            },
                            {
                              header: "Order Type",
                              render: (row) => row.order_type,
                              align: "center",
                            },
                            {
                              header: "Count",
                              render: (row) => row.count,
                              align: "center",
                            },
                            {
                              header: "QTY",
                              render: (row) => row.qty,
                              align: "center",
                            },
                            {
                              header: "Actions",
                              align: "center",
                              render: (row) => (
                                <div className="flex justify-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateSupplierOrderFromNSO(row);
                                    }}
                                    disabled={row.supplier_id === 0}
                                    className={`${row.supplier_id === 0
                                      ? "bg-gray-400 cursor-not-allowed opacity-75"
                                      : "bg-[#059669] hover:bg-green-700"
                                      } text-white px-4 py-2 rounded-[4px] flex items-center gap-2 text-xs font-bold transition shadow-md`}
                                  >
                                    <PlusCircleIcon className="h-5 w-5" />
                                    {row.supplier_id === 0
                                      ? "Set Supplier"
                                      : "Supplier order"}
                                  </button>
                                </div>
                              ),
                            },
                          ]}
                          loading={loadingOrders}
                          emptyMessage={loadingOrders ? "Loading NSO Data..." : "No Normal NSOs found"}
                          expandedRowId={expandedNsoId}
                          onRowClick={(row) =>
                            setExpandedNsoId(
                              expandedNsoId === row.id ? null : row.id,
                            )
                          }
                          renderRowDetails={renderNsoItemDetails}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeTab === "supplier_orders" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="h-4"></div>
                <DataTable
                  data={supplierOrdersList}
                  expandedRowId={expandedSupplierOrderId}
                  renderRowDetails={(row) => {
                    const items = (row as any).items || [];
                    return (
                      <div className="bg-white p-4 border-t border-b border-gray-200">
                        <DataTable
                          data={items}
                          showTotals={items.length > 0}
                          columns={[
                            {
                              header: "#",
                              width: "35px",
                              render: (_, i) => i + 1,
                              align: "center",
                              renderTotal: () => (
                                <b className="text-[11px] uppercase">Grand</b>
                              ),
                            },
                            {
                              header: "EAN",
                              width: "100px",
                              render: (item: any) => {
                                const details = itemById.get(
                                  String(item.item_id),
                                );
                                const parent = orderItemDetailsMap.get(
                                  String(item.id),
                                );
                                const isSo =
                                  parent?.status === "SO" ||
                                  item.status === "SO";
                                return (
                                  <div className="flex flex-col gap-1 items-center">
                                    {isSo && (
                                      <button
                                        onClick={() => handleBackToNSO(item.id)}
                                        className="bg-[#f43f5e] hover:bg-rose-700 text-white rounded-[4px] px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 w-full justify-center transition-all shadow-sm active:scale-95"
                                      >
                                        <ArrowUturnLeftIcon className="h-2.5 w-2.5" />{" "}
                                        NSO
                                      </button>
                                    )}
                                    <span className="font-semibold text-[10px] text-gray-600">
                                      {details?.ean || "-"}
                                    </span>
                                  </div>
                                );
                              },
                              align: "center",
                            },
                            {
                              header: "Item Name",
                              width: "200px",
                              render: (item: any) => (
                                <div className="text-[10px] leading-tight font-semibold text-gray-800 line-clamp-3 break-words">
                                  {item.item?.item_name ||
                                    itemById.get(String(item.item_id))
                                      ?.item_name ||
                                    itemById.get(String(item.item_id))?.name ||
                                    "Unknown"}
                                </div>
                              ),
                            },
                            {
                              header: "Remarks",
                              render: (item: any) => (
                                <div className="text-[10px] text-gray-500 italic max-h-12 overflow-y-auto min-w-[120px]">
                                  {item.remark_de || "-"}
                                </div>
                              ),
                            },
                            {
                              header: "Order_no",
                              width: "80px",
                              render: (item: any) => (
                                <span className="font-mono text-[10px] font-bold text-[#006FBA]">
                                  {orderItemDetailsMap.get(String(item.id))
                                    ?.order_no ||
                                    item.order_no ||
                                    "-"}
                                </span>
                              ),
                              align: "center",
                            },
                            {
                              header: "Cargold",
                              width: "60px",
                              render: (item: any) => (
                                <span className="text-[10px] font-medium text-slate-600">
                                  {orderItemDetailsMap.get(String(item.id))
                                    ?.cargo_id ||
                                    item.cargo_id ||
                                    "-"}
                                </span>
                              ),
                              align: "center",
                            },
                            {
                              header: "V(dm³)",
                              width: "55px",
                              render: (item: any) => calcV(item).toFixed(2),
                              align: "center",
                              renderTotal: (data) => (
                                <span className="font-bold">
                                  {data
                                    .reduce((acc, it) => acc + calcV(it), 0)
                                    .toFixed(2)}
                                </span>
                              ),
                            },
                            {
                              header: "W(kg)",
                              width: "55px",
                              render: (item: any) => calcW(item).toFixed(2),
                              align: "center",
                              renderTotal: (data) => (
                                <span className="font-bold">
                                  {data
                                    .reduce((acc, it) => acc + calcW(it), 0)
                                    .toFixed(2)}
                                </span>
                              ),
                            },
                            {
                              header: "QTY",
                              width: "45px",
                              render: (item: any) => (
                                <span className="font-bold">{item.qty}</span>
                              ),
                              align: "center",
                              renderTotal: (data) => (
                                <span className="font-bold">
                                  {data.reduce(
                                    (acc, it) => acc + (it.qty || 0),
                                    0,
                                  )}
                                </span>
                              ),
                            },
                            {
                              header: "Price",
                              width: "70px",
                              render: (item: any) => {
                                const det = orderItemDetailsMap.get(
                                  String(item.id),
                                );
                                const p =
                                  det?.rmb_special_price ||
                                  item.rmb_special_price ||
                                  item.rmb_price ||
                                  item.item?.rmb_price ||
                                  item.item?.rmb_special_price ||
                                  item.item?.RMB_Price ||
                                  item.item?.others?.rmbPrice ||
                                  det?.price ||
                                  item.price ||
                                  "-";
                                const c = item.currency || "CNY";
                                return p !== "-" ? p : "0";
                              },
                              align: "center",
                            },
                            {
                              header: "Total",
                              width: "70px",
                              render: (item: any) => {
                                const det = orderItemDetailsMap.get(
                                  String(item.id),
                                );
                                const p =
                                  det?.rmb_special_price ||
                                  item.rmb_special_price ||
                                  item.rmb_price ||
                                  item.item?.rmb_price ||
                                  item.item?.rmb_special_price ||
                                  item.item?.RMB_Price ||
                                  item.item?.others?.rmbPrice ||
                                  det?.price ||
                                  item.price ||
                                  0;
                                return (Number(p) * (item.qty || 0)).toFixed(2);
                              },
                              align: "center",
                              renderTotal: (data) => (
                                <span className="font-bold text-green-700">
                                  {data
                                    .reduce((acc, it) => {
                                      const det = orderItemDetailsMap.get(
                                        String(it.id),
                                      );
                                      const p =
                                        det?.rmb_special_price ||
                                        it.rmb_special_price ||
                                        it.rmb_price ||
                                        it.item?.rmb_price ||
                                        it.item?.rmb_special_price ||
                                        it.item?.RMB_Price ||
                                        it.item?.others?.rmbPrice ||
                                        det?.price ||
                                        it.price ||
                                        0;
                                      return acc + Number(p) * (it.qty || 0);
                                    }, 0)
                                    .toFixed(2)}
                                </span>
                              ),
                            },
                            {
                              header: "Status",
                              width: "80px",
                              render: (item: any) => {
                                const st = "SO";
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-700`}
                                  >
                                    {st}
                                  </span>
                                );
                              },
                              align: "center",
                            },
                            {
                              header: "Actions",
                              align: "center",
                              render: (item: any) => {
                                const det = orderItemDetailsMap.get(
                                  String(item.id),
                                );
                                return (
                                  <div className="flex gap-1.5 justify-center flex-wrap w-fit mx-auto">
                                    <button
                                      onClick={() => handleEditQty(item)}
                                      className="bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <PencilIcon className="h-3 w-3" /> QTY
                                    </button>
                                  </div>
                                );
                              },
                            },
                          ]}
                          loading={false}
                          getRowClassName={() => "bg-white"}
                        />
                      </div>
                    );
                  }}
                  columns={[
                    {
                      header: "#",
                      width: "40px",
                      render: (_, i) => i + 1,
                      align: "center",
                    },
                    {
                      header: "SOID",
                      width: "100px",
                      align: "center",
                      render: (row) => (
                        <div
                          onClick={() =>
                            setExpandedSupplierOrderId(
                              expandedSupplierOrderId === row.id
                                ? null
                                : row.id,
                            )
                          }
                          className="flex items-center justify-center gap-1 group cursor-pointer"
                        >
                          <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-md hover:bg-slate-700 transition">
                            {row.id}
                            <div className="bg-white rounded-full p-0.5">
                              <ArrowRightIcon
                                className={`h-2 w-2 text-[#475569] transition-transform ${expandedSupplierOrderId === row.id ? "rotate-90" : ""}`}
                              />
                            </div>
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: "Supplier - ID",
                      width: "300px",
                      render: (row) => (
                        <div className="font-semibold text-gray-700">
                          {row.supplier?.company_name || "-"} -{" "}
                          <span className="text-gray-400">
                            {row.supplier_id || ""}
                          </span>
                        </div>
                      ),
                      align: "center",
                    },
                    {
                      header: "Order Type",
                      width: "120px",
                      render: (row) => row.order_type?.name || "Taobao",
                      align: "center",
                    },
                    {
                      header: "Ref No.",
                      width: "120px",
                      render: (row) => (
                        <div className="text-gray-500 font-medium italic">
                          {row.ref_no || "-"}
                        </div>
                      ),
                      align: "center",
                    },
                    {
                      header: "Remark",
                      render: (row) => (
                        <div className="truncate max-w-[150px]">
                          {row.remark || "-"}
                        </div>
                      ),
                      align: "center",
                    },
                    {
                      header: "Date created",
                      width: "100px",
                      render: (row) =>
                        new Date(row.created_at).toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "2-digit",
                        }),
                      align: "center",
                    },
                    {
                      header: "Actions",
                      align: "center",
                      render: (row) => {
                        const isPurchaseOrder = row.order_type?.name === "Purchase Order";
                        return (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(row as any)}
                              className="px-4 py-1.5 bg-[#059669] text-white text-xs font-bold rounded-[4px] hover:bg-green-700 transition flex items-center gap-2 shadow-md"
                            >
                              <PencilIcon className="h-4 w-4" />
                              Edit
                            </button>
                            {isPurchaseOrder && (
                              <button
                                onClick={() => openPO(row as any)}
                                className={`px-4 py-1.5 rounded-[4px] text-xs font-bold transition flex items-center gap-2 shadow-md ${Number(row.is_po_created) === 1 ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                                {Number(row.is_po_created) === 1 ? "PO Created" : "Create PO"}
                              </button>
                            )}
                          </div>
                        );
                      },
                    },
                  ]}
                  loading={loadingSupplierOrders}
                  getRowClassName={(row) =>
                    expandedSupplierOrderId === row.id ? "bg-blue-50/30" : ""
                  }
                  emptyMessage="No Supplier Orders Found"
                />
              </div>
            ) : activeTab === "purchase_order" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="h-4"></div>
                <DataTable
                  data={purchaseOrdersList}
                  columns={[
                    {
                      header: "ID",
                      width: "60px",
                      render: (row) => <span className="font-semibold">{row.id}</span>,
                      align: "center",
                    },
                    {
                      header: "Date created",
                      width: "120px",
                      render: (row) => (
                        <div className="text-center text-[11px]">
                          {new Date(row.created_at).toLocaleDateString()}
                        </div>
                      ),
                      align: "center",
                    },
                    {
                      header: "PO No.",
                      width: "100px",
                      render: (row) => (
                        <span className="text-[#059669] font-bold">
                          {`PO${new Date(row.created_at).getFullYear().toString().slice(-2)}${String(row.id).padStart(3, "0")}`}
                        </span>
                      ),
                      align: "center",
                    },
                    {
                      header: "SOID",
                      width: "80px",
                      render: (row) => row.id,
                      align: "center",
                    },
                    {
                      header: "Supplier",
                      width: "150px",
                      render: (row) => (
                        <div className="font-medium text-gray-700">
                          {row.supplier_id} - {row.supplier?.company_name || "-"}
                        </div>
                      ),
                      align: "left",
                    },
                    {
                      header: "Description",
                      width: "180px",
                      render: (row) => {
                        const items = row.items || [];
                        const desc = items.map((i: any) => i.item?.item_name || i.item?.name).filter(Boolean).join(", ");
                        return <div className="line-clamp-2 text-[10px] text-gray-500">{desc || row.remark || "-"}</div>;
                      },
                      align: "left",
                    },
                    {
                      header: "Total RMB",
                      width: "100px",
                      render: (row) => {
                        const total = (row.items || []).reduce((sum: number, it: any) => {
                          const p = it.price || it.rmb_special_price || 0;
                          return sum + (Number(p) * (it.qty || 0));
                        }, 0);
                        return <span className="font-bold">¥ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
                      },
                      align: "right",
                    },
                    {
                      header: "Status",
                      width: "100px",
                      render: (row) => {
                        const allPurchased = row.items?.every((it: any) => {
                          const st = (it.status || "").toLowerCase().trim();
                          return st === "purchased" || st === "purchase";
                        });
                        return (
                          <div className="flex flex-col items-center">
                            <span className="text-green-600 font-bold text-[10px] uppercase">
                              {allPurchased ? "Purchased" : "PO"}
                            </span>
                            <span className="text-green-600 font-bold text-[10px] uppercase">
                              {allPurchased ? "Order" : "Created"}
                            </span>
                          </div>
                        );
                      },
                      align: "center",
                    },
                    {
                      header: "Actions",
                      width: "200px",
                      align: "center",
                      render: (row) => (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(row as any)}
                            className="bg-[#059669] text-white px-3 py-1 rounded-[4px] text-[10px] font-bold hover:bg-green-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toast.success("PO Closed")}
                            className="bg-red-600 text-white px-3 py-1 rounded-[4px] text-[10px] font-bold hover:bg-red-700 transition"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => {
                              console.log("Download button clicked for SO ID:", row.id);
                              downloadPurchaseOrder(row.id);
                            }}
                            className="bg-green-700 text-white px-3 py-1 rounded-[4px] text-[10px] font-bold hover:bg-green-800 transition"
                          >
                            Download
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  loading={loadingSupplierOrders}
                  emptyMessage="No Purchase Orders Found"
                />
              </div>
            ) : activeTab === "problems" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px] flex flex-col gap-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">
                      Pending Problems
                    </h2>
                  </div>
                  <DataTable
                    data={problemItems}
                    columns={[
                      {
                        header: "ID",
                        width: "40px",
                        render: (row) => row.id,
                        align: "center",
                      },
                      {
                        header: "Supplier ID",
                        width: "80px",
                        render: (row) =>
                          row.parentOrder?.supplier_id ||
                          row.supplier_id ||
                          "-",
                        align: "center",
                      },
                      {
                        header: "Item name",
                        width: "200px",
                        render: (row) => (
                          <div
                            className="line-clamp-3 leading-tight break-words"
                            title={
                              row.item?.item_name ||
                              itemById.get(String(row.item_id))?.item_name
                            }
                          >
                            {row.item?.item_name ||
                              itemById.get(String(row.item_id))?.item_name ||
                              "Unknown"}
                          </div>
                        ),
                      },
                      {
                        header: "Order No.",
                        width: "80px",
                        render: (row) => row.parentOrder?.order_no || "-",
                        align: "center",
                      },
                      {
                        header: "SOID",
                        width: "50px",
                        render: (row) => row.supplier_order_id || "-",
                        align: "center",
                      },
                      {
                        header: "QTY",
                        width: "40px",
                        render: (row) => row.qty,
                        align: "center",
                      },
                      {
                        header: "Problem type",
                        width: "100px",
                        render: (row) => (
                          <span className="text-red-600 font-semibold uppercase text-[10px]">
                            {row.status}
                          </span>
                        ),
                        align: "center",
                      },
                      {
                        header: "Description",
                        render: (row) => (
                          <div className="line-clamp-2 text-xs italic text-gray-500">
                            {row.problems || "No description"}
                          </div>
                        ),
                      },
                      {
                        header: "Remark",
                        render: (row) => (
                          <div className="truncate max-w-[150px]">
                            {row.remarks_cn || row.remark_de || "-"}
                          </div>
                        ),
                      },
                      {
                        header: "Actions",
                        width: "100px",
                        align: "center",
                        render: (row) => (
                          <button
                            onClick={() => openEdit(row.parentOrder)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[10px] font-bold shadow-md transition-all active:scale-95 flex items-center gap-1 mx-auto"
                          >
                            <PencilIcon className="h-3 w-3" /> View Order
                          </button>
                        ),
                      },
                    ]}
                    emptyMessage="No problem found"
                    loading={loadingOrders}
                  />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">
                      Label Reprint
                    </h2>
                  </div>
                  <DataTable
                    data={reprintItems}
                    columns={[
                      {
                        header: "ID",
                        width: "40px",
                        render: (row) => row.id,
                        align: "center",
                      },
                      {
                        header: "EAN",
                        width: "100px",
                        render: (row) =>
                          itemById.get(String(row.item_id))?.ean || "-",
                        align: "center",
                      },
                      {
                        header: "Item Name",
                        width: "200px",
                        render: (row) => (
                          <div
                            className="line-clamp-3 leading-tight break-words"
                            title={
                              row.item?.item_name ||
                              itemById.get(String(row.item_id))?.item_name
                            }
                          >
                            {row.item?.item_name ||
                              itemById.get(String(row.item_id))?.item_name ||
                              "Unknown"}
                          </div>
                        ),
                      },
                      {
                        header: "Remark",
                        render: (row) => (
                          <div className="truncate max-w-[150px]">
                            {row.remarks_cn || "/"}
                          </div>
                        ),
                      },
                      {
                        header: "Order_no",
                        width: "80px",
                        render: (row) => row.parentOrder?.order_no || "-",
                        align: "center",
                      },
                      {
                        header: "QTY",
                        width: "60px",
                        align: "center",
                        render: (row) => (
                          <div className="flex flex-col items-center leading-none">
                            <span className="font-bold text-gray-800">
                              {row.qty_label || row.qty}
                            </span>
                            {row.qty_label && row.qty_label !== row.qty && (
                              <span className="text-[10px] text-gray-400">
                                Orig: {row.qty}
                              </span>
                            )}
                          </div>
                        ),
                      },
                      {
                        header: "Price",
                        width: "70px",
                        render: (row) => {
                          const val = row.rmb_special_price || row.rmb_price || row.item?.rmb_price || row.item?.rmb_special_price || row.item?.RMB_Price || row.item?.others?.rmbPrice || row.price || row.item?.price || 0;
                          return Number(val).toFixed(2);
                        },
                        align: "center",
                      },
                      {
                        header: "SOID",
                        width: "50px",
                        render: (row) => row.supplier_order_id || "-",
                        align: "center",
                      },
                      {
                        header: "Status",
                        width: "60px",
                        render: (row) => (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                            {row.status}
                          </span>
                        ),
                        align: "center",
                      },
                      {
                        header: "Actions",
                        width: "150px",
                        align: "center",
                        render: (row) => (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditQty(row)}
                              className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                            >
                              <PencilIcon className="h-3 w-3" /> edit
                            </button>
                            <button
                              onClick={() => handlePrintLabel(row)}
                              className="bg-[#059669] hover:bg-green-700 text-white px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95"
                            >
                              <PrinterIcon className="h-3 w-3" /> Print
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage="No items for reprint found"
                    loading={loadingOrders}
                  />
                </div>
              </div>
            ) : activeTab === "label_print" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">
                      Label Management
                    </h2>
                  </div>

                  <DataTable
                    data={labelPrintItems}
                    columns={[
                      {
                        header: "ID",
                        width: "50px",
                        render: (row) => row.id,
                        align: "center",
                      },
                      {
                        header: "EAN",
                        width: "120px",
                        render: (row) => {
                          const ean =
                            row.item?.ean ||
                            row.warehouse_data?.ean ||
                            row.ean ||
                            row.item?.warehouse_data?.ean ||
                            itemById.get(String(row.item_id))?.ean ||
                            "-";

                          const isHighlighted =
                            reprintSearch &&
                            ean !== "-" &&
                            ean
                              .toString()
                              .toLowerCase()
                              .includes(reprintSearch.toLowerCase());

                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const itemId = row.item_id || row.item?.id || (row as any).id;
                                if (itemId) router.push(`/items/${itemId}`);
                              }}
                              className={`font-medium hover:underline ${isHighlighted ? "text-[#059669] font-bold" : "text-blue-600"}`}
                            >
                              {ean}
                            </button>
                          );
                        },
                        align: "center",
                      },
                      {
                        header: "Item Name",
                        width: "250px",
                        render: (row) => (
                          <div
                            className="font-semibold text-gray-800 line-clamp-3 leading-tight break-words"
                            title={row.item?.item_name || row.item?.name}
                          >
                            {row.item?.item_name || row.item?.name || "Unknown"}
                          </div>
                        ),
                      },
                      {
                        header: "Remark",
                        render: (row) => (
                          <div className="text-gray-500 italic text-xs space-y-0.5">
                            {row.remark_de && (
                              <div className=""> {row.remark_de} /</div>
                            )}
                            {row.remarks_cn && (
                              <div className=""> {row.remarks_cn} /</div>
                            )}
                            {row.remark_en && (
                              <div className=""> {row.remark_en}</div>
                            )}
                            {!row.remark_de &&
                              !row.remarks_cn &&
                              !row.remark_en && (
                                <span className="text-gray-300">-</span>
                              )}
                          </div>
                        ),
                      },
                      {
                        header: "Order_no",
                        width: "100px",
                        render: (row) => (
                          <span className="font-mono font-bold text-blue-600">
                            {row.parentOrder?.order_no || "-"}
                          </span>
                        ),
                        align: "center",
                      },
                      {
                        header: "QTY",
                        width: "80px",
                        align: "center",
                        render: (row) => (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-gray-900">
                              {row.qty}
                              {row.qty_label && row.qty_label !== row.qty
                                ? `/${row.qty_label}`
                                : ""}
                            </span>
                            {row.qty_label && row.qty_label !== row.qty && (
                              <span className="text-[9px] text-gray-400 uppercase">
                                Order/Label
                              </span>
                            )}
                          </div>
                        ),
                      },
                      {
                        header: "SOID",
                        width: "70px",
                        render: (row) => row.supplier_order_id || "-",
                        align: "center",
                      },
                      {
                        header: "Status",
                        width: "90px",
                        render: (row) => (
                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {row.status || row.item_status || "Open"}
                          </span>
                        ),
                        align: "center",
                      },
                      {
                        header: "Actions",
                        width: "180px",
                        align: "center",
                        render: (row) => (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditQty(row)}
                              className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-[4px] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                              <PencilIcon className="h-3.5 w-3.5" /> edit
                            </button>
                            <button
                              onClick={() => handlePrintLabel(row)}
                              className="bg-[#059669] hover:bg-green-700 text-white px-3 py-1.5 rounded-[4px] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                              <PrinterIcon className="h-3.5 w-3.5" /> Print
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage="No items ready for print found"
                    loading={loadingOrders}
                  />
                </div>
              </div>
            ) : (
              <>
                {activeTab === "order_items" && orderNoFilter && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-100">
                    <span className="text-xs text-blue-700 font-medium">
                      🔍 Showing items for order:&nbsp;
                      <span className="font-bold bg-blue-100 px-1.5 py-0.5 rounded">
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
                  orders={visibleOrders}
                  loading={loadingOrders}
                  getCategoryName={getCategoryName}
                  getSupplierName={getSupplierName}
                  getOrderStatusColor={getOrderStatusColor}
                  onView={openView}
                  onEdit={openEdit}
                  onDelete={handleDeleteOrder}
                  canDelete={user?.role === UserRole.ADMIN}
                  showConvert={false}
                  onConvert={openConvert}
                  onReassign={(o) => {
                    setSelectedItem(o);
                    setTargetCargoId(o.cargo_id ? String(o.cargo_id) : "");
                    setShowREModal(true);
                  }}
                  onGoToItems={(orderNo) => {
                    router.push(`/invoices?tab=order_items&order_no=${orderNo}`);
                  }}
                  activeTab={activeTab}
                  itemById={itemById}
                  suppliers={suppliers}
                  onAssignSupplier={handleAssignSupplier}
                  onSplit={(row) => {
                    setSelectedItem(row);
                    setSplitQty(Math.floor(Number(row.qty || 0) / 2) || 1);
                    setShowSPModal(true);
                  }}
                  router={router}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {showSupplierConfirm && pendingNsoGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 rounded-full p-2">
                <PlusCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Create Supplier Order
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              You are about to create a supplier order for:
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-5 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Supplier</span>
                <span className="font-semibold text-gray-800">
                  {pendingNsoGroup.supplier_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items</span>
                <span className="font-semibold text-gray-800">
                  {pendingNsoGroup.count} item(s)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Qty</span>
                <span className="font-semibold text-gray-800">
                  {pendingNsoGroup.qty}
                </span>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-[4px] px-3 py-2 mb-5">
              ⚠ These items will be moved out of NSO and linked to the new
              supplier order.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSupplierConfirm(false);
                  setPendingNsoGroup(null);
                }}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-[4px] hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateSupplierOrder}
                className="px-5 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition font-bold flex items-center gap-2"
              >
                <PlusCircleIcon className="h-4 w-4" />
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

        <OrderDetailsModal
          isOpen={showViewModal}
          onClose={closeView}
          viewOrder={viewOrder}
          viewItems={viewItems}
          getCategoryName={getCategoryName}
          getSupplierName={getSupplierName}
        />

      {showModal && !isSOEditing && (
        <CustomModal
          isOpen={showModal}
          onClose={closeModal}
          width={(activeTab === "purchase_order" || isPOEditing) ? "max-w-6xl" : "max-w-4xl"}
          title={
            (activeTab === "purchase_order" || isPOEditing)
              ? `Purchase Order Items (Order ID: ${selectedOrder?.id})`
              : mode === "convert"
                ? "CONVERT ORDER"
                : mode === "edit"
                  ? "Edit Order"
                  : isTab2
                    ? "Create Customer Order"
                    : "Create New Order"
          }
          footer={
            (activeTab === "purchase_order" || isPOEditing) ? (
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePO}
                  className="px-6 py-2 rounded-lg bg-[#059669] text-white font-semibold hover:bg-green-700 shadow-md transition-all"
                >
                  {selectedOrder?.is_po_created ? "Update Purchase Order" : "Create Purchase order"}
                </button>
              </div>
            ) : (
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
            )
          }
        >
          {(activeTab === "purchase_order" || isPOEditing) ? (
            <div className="space-y-6">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#f8f9fa]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">ID Supplier name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">ID - Item name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Model</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-[80px]">QTY</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200 w-[100px]">Price (RMB)</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider w-[120px]">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.map((item, idx) => {
                      const price = Number(item.price || 0);
                      const qty = Number(item.qty || 0);
                      const total = price * qty;
                      const sid = item.supplier_id || (item.item as any)?.supplier_id || (selectedOrder as any)?.supplier_id;
                      const sname = item.supplier_name || (item.item as any)?.supplier?.company_name || (selectedOrder as any)?.supplier?.company_name || "-";
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">{idx + 1}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-r border-gray-200 font-medium">{sid} - {sname}</td>
                          <td className="px-4 py-2 text-sm text-gray-600 border-r border-gray-200">
                            <div className="font-semibold text-gray-800">{item.item_id}</div>
                            <div className="text-[11px] leading-tight text-gray-500">{item.itemName || (item.item as any)?.item_name || (item.item as any)?.name}</div>
                          </td>
                          <td className="px-2 py-1 border-r border-gray-200">
                            <input
                              type="text"
                              value={item.remark_de || ""}
                              onChange={(e) => handleUpdateOrderItemRemark(item.item_id, e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                              placeholder="Model / Remark..."
                            />
                          </td>
                          <td className="px-2 py-1 border-r border-gray-200">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleUpdateOrderItemQty(item.item_id, Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded text-center font-bold"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-700 border-r border-gray-200 font-medium">
                            {price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 font-bold bg-gray-50/30">
                            {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={6} className="px-4 py-3 text-center text-sm text-gray-800 uppercase tracking-wider border-r border-gray-200">Grand total</td>
                      <td className="px-4 py-3 text-sm text-right text-[#059669] text-lg">
                        {orderItems.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {[
                  { label: "Description", key: "po_description" },
                  { label: "Comment below item table", key: "comment_items" },
                  { label: "Comment below attachments", key: "comment_attachments" },
                  { label: "Comment below quality criteria", key: "comment_quality" },
                  { label: "Comment below delivery", key: "comment_delivery_left" },
                  { label: "Comment below delivery", key: "comment_delivery_right" },
                ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{field.label}</label>
                    <textarea
                      value={(poForm as any)[field.key]}
                      onChange={(e) => setPoForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm transition-all"
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-gray-100">
                <div className="text-center mb-4">
                  <h3 className="text-sm font-bold text-gray-700">
                    Previously created POs for supplier {getSupplierName(selectedOrder?.supplier_id)}
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#f8f9fa]">
                      <tr>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">#</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">PO No.</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Supplier</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-right text-[10px] font-bold text-gray-500 uppercase">Total RMB</th>
                        <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Date created</th>
                        <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {supplierOrdersList
                        .filter(so => so.supplier_id === selectedOrder?.supplier_id && so.id !== selectedOrder?.id)
                        .map((so, idx) => {
                          const total = (so.items || []).reduce((sum: number, it: any) => sum + (Number(it.price || 0) * (it.qty || 0)), 0);
                          const items = so.items || [];
                          const desc = items.map((i: any) => i.item?.item_name || i.item?.name).filter(Boolean).join(", ");
                          return (
                            <tr key={so.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2 text-xs text-gray-500">{idx + 1}</td>
                              <td className="px-4 py-2 text-xs font-semibold text-gray-700">{so.id}</td>
                              <td className="px-4 py-2 text-xs font-bold text-[#059669]">
                                {`PO${new Date(so.created_at).getFullYear().toString().slice(-2)}${String(so.id).padStart(3, "0")}`}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600">{getSupplierName(so.supplier_id)}</td>
                              <td className="px-4 py-2 text-xs text-gray-500 max-w-[200px] truncate">{desc || so.remark || "-"}</td>
                              <td className="px-4 py-2 text-xs text-right font-bold text-gray-900">¥ {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2 text-xs text-center text-gray-500">{new Date(so.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  onClick={() => openPO(so)}
                                  className="text-[#059669] hover:text-green-700 font-bold text-[10px] uppercase"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {supplierOrdersList.filter(so => so.supplier_id === selectedOrder?.supplier_id && so.id !== selectedOrder?.id).length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-xs text-gray-400 font-medium italic">
                            No previous records found for this supplier
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isConvertMode && (
                <div className="mb-4 rounded-[4px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <b>Note</b>. All other fields are locked. Only <b>QTY</b> and{" "}
                  <b>Item remark</b> is editable.
                </div>
              )}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isTab1 ? "Select Order Type:" : "Select Category:"}
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={lockAllExceptQty}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="">{isTab1 ? "Select Order Type" : "Select Category"}</option>
                    {categories
                      .filter((c) => {
                        if (!isTab1) return true;
                        const name = c.name?.toLowerCase() || "";
                        return (
                          name === "taobao" ||
                          name === "purchase order" ||
                          name === "others" ||
                          name === "1688"
                        );
                      })
                      .map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{isTab1 ? "Select Supplier:" : "Select Customer:"}</label>
                  {isTab1 ? (
                    <select
                      value={form.supplier_id}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      disabled={lockAllExceptQty}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => <option key={s.id} value={String(s.id)}>{s.company_name || s.name || "Unnamed Supplier"}</option>)}
                    </select>
                  ) : (
                    <select
                      value={form.customer_id}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      disabled={lockAllExceptQty}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => <option key={customer.id} value={String(customer.id)}>{customer.companyName}</option>)}
                    </select>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Item then quantity:</label>
                <ItemSelectorWithQuantity
                  items={effectiveItems}
                  selectedItemId={selectedItemId}
                  onItemChange={setSelectedItemId}
                  onAdd={handleAddItemToOrder}
                  disabled={lockAllExceptQty || loadingItems}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comment:</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                  disabled={lockAllExceptQty}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                  placeholder="Enter order comment..."
                  rows={3}
                />
              </div>
              {orderItems.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-[4px] shadow-md">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">ID</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b w-[120px]">Item name</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Qty</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item remark</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Price</th>
                        <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((row) => (
                        <tr key={row.item_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.item_id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b"><div className="line-clamp-2 leading-tight max-w-[120px]">{row.itemName}</div></td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={(e) => handleUpdateOrderItemQty(row.item_id, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-gray-300 rounded-[4px]"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">
                            <input
                              type="text"
                              value={row.remark_de}
                              onChange={(e) => handleUpdateOrderItemRemark(row.item_id, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-[4px]"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.price} {row.currency}</td>
                          <td className="px-4 py-2 text-center border-b">
                            <button onClick={() => handleRemoveOrderItem(row.item_id)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CustomModal>
      )}
      {isEditQtyModalOpen && editQtyItem && (
        <CustomModal
          isOpen={isEditQtyModalOpen}
          onClose={() => setIsEditQtyModalOpen(false)}
          title={`Update QTY QtyLabel (ID: ${editQtyItem.id})`}
          width="max-w-md"
          footer={
            <button
              onClick={saveQtyChanges}
              className="bg-[#059669] hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              Save QTY changes
            </button>
          }
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                New QTY:
              </label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none transition-all font-medium text-lg text-gray-800"
                placeholder="Enter new quantity..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Enter Remarks RemarkCN:
              </label>
              <textarea
                value={newRemarkCN}
                onChange={(e) => setNewRemarkCN(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:ring-2 focus:ring-[#059669] focus:border-transparent outline-none transition-all font-medium text-gray-600 resize-none"
                placeholder="Enter Chinese remarks..."
              />
            </div>
          </div>
        </CustomModal>
      )}
      {showREModal && selectedItem && (
        <CustomModal
          isOpen={showREModal}
          onClose={() => setShowREModal(false)}
          width="max-w-2xl"
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
                    .find((opt) => opt.value === String(targetCargoId)) || null
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
                onClick={handleReassignItemAction}
                disabled={!targetCargoId}
                className="px-6 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 disabled:opacity-50 transition-all font-bold uppercase shadow-md flex items-center gap-2"
              >
                <ArrowRightCircleIcon className="h-4 w-4" />
                {selectedItem.cargo_id ? "Confirm Reassign" : "Confirm Assign"}
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {isSOEditing && (
        <CustomModal
          isOpen={isSOEditing}
          onClose={closeModal}
          width="max-w-xl"
          title="Update Supplier order"
          footer={
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-2 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSO}
                className="px-6 py-2 rounded-lg bg-[#059669] text-white font-semibold hover:bg-green-700 shadow-md transition-all"
              >
                Save changes
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="text-sm text-gray-500 -mt-2 mb-4">
              Make changes to this supplier order details.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Select Supplier:</label>
                <select
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none text-sm"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.company_name} - {s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 ml-1">Select Order Type:</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none text-sm"
                >
                  <option value="">Select Order Type</option>
                  {categories
                    .filter((c) => {
                      const name = c.name?.toLowerCase() || "";
                      return (
                        name === "taobao" ||
                        name === "purchase order" ||
                        name === "others" ||
                        name === "1688"
                      );
                    })
                    .map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1">Reference No:</label>
              <input
                type="text"
                value={form.ref_no}
                onChange={(e) => setForm({ ...form, ref_no: e.target.value })}
                placeholder="Reference number..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none text-sm border-2 border-green-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1">Supplier order remark:</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all outline-none text-sm resize-none"
                placeholder="."
              />
            </div>
          </div>
        </CustomModal>
      )}

      {showSPModal && selectedItem && (
        <CustomModal
          isOpen={showSPModal}
          onClose={() => setShowSPModal(false)}
          title={`Update Label Quantity - Item ${selectedItem.id}`}
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Original Order Qty: <span className="font-bold">{selectedItem.qty}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label Quantity
              </label>
              <input
                type="number"
                value={splitQty}
                onChange={(e) => setSplitQty(Number(e.target.value))}
                min={0}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review (CN)
              </label>
              <textarea
                value={remarksCN}
                onChange={(e) => setRemarksCN(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter Chinese review..."
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSPModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSplitItemAction}
                disabled={splitQty < 0}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Update Qty
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </>
  );
};

const OrderPageWrapper: React.FC = () => (
  <Suspense
    fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}
  >
    <OrderPage />
  </Suspense>
);

export default OrderPageWrapper;
