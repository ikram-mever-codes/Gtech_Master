"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import {
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowUturnRightIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  type Order,
  type OrderSearchFilters,
  getOrderStatusColor,
} from "@/api/orders";

import { getAllCustomers } from "@/api/customers";
import { getAllSuppliers, getSupplierItems, type Supplier } from "@/api/suppliers";
import { getItems } from "@/api/items";
import { getCategories } from "@/api/categories";
import CustomButton from "@/components/UI/CustomButton";
import PageHeader from "@/components/UI/PageHeader";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import { ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";
import CargosTab from "@/components/cargos/CargosTab";
import CargoTypesTab from "@/components/cargos/CargoTypesTab";

type Item = {
  id: string | number;
  item_name?: string;
  name?: string;
  ean?: number | string;
  rmb_special_price?: number;
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
  remark_de: string;
};

type Mode = "create" | "edit" | "convert";

type ItemSelectorProps = {
  items: Item[];
  selectedItemId: string;
  onItemChange: (item_id: string) => void;
  onAdd: (item_id: string, qty: number) => void;
  disabled?: boolean;
};

type OrdersTableProps = {
  orders: Order[];
  loading: boolean;
  getCategoryName: (id: any) => string;
  getSupplierName?: (id: any) => string;
  getOrderStatusColor: (status: any) => string;
  onView: (o: any) => void;
  onEdit: (o: any) => void;
  onDelete: (id: string | number) => void;
  canDelete: boolean;

  showConvert: boolean;
  onConvert: (o: any) => void;
  activeTab: string;
  itemById: Map<string, Item>;
};

const tabs = [
  { id: "orders", label: "Orders List", description: "View all orders" },
  { id: "order_items", label: "Order Items", description: "View all order items" },
  { id: "cargos", label: "Cargos", description: "Manage Cargos and Shipments" },
  { id: "cargo_type", label: "Cargos type", description: "Manage Cargo Types" },
  { id: "nso", label: "NSO (No Supplier Orders)", description: "Orders with no supplier" },
  { id: "supplier_orders", label: "Supplier Orders", description: "Orders with suppliers" },
] as const;

function ItemSelectorWithQuantity({
  items,
  selectedItemId,
  onItemChange,
  onAdd,
  disabled = false,
}: ItemSelectorProps) {
  const [quantity, setQuantity] = useState<string>("");

  const options: Option[] = useMemo(
    () => [
      { value: "", label: "Search or select item" },
      ...items.map((item) => ({
        value: String(item.id),
        label: item.item_name || item.name || "Unnamed Item",
      })),
    ],
    [items]
  );

  const handleAdd = () => {
    if (disabled) return;
    if (!selectedItemId || !quantity.trim()) return;

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    onAdd(selectedItemId, qty);
    setQuantity("");
    onItemChange("");
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Select
          className="text-sm"
          classNames={{
            control: () =>
              "border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500",
          }}
          options={options}
          value={options.find((opt) => opt.value === selectedItemId) || null}
          onChange={(newValue) => onItemChange(newValue?.value ?? "")}
          placeholder="Search or select item..."
          isSearchable
          isClearable
          isDisabled={disabled}
        />
      </div>

      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
        min="1"
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || !selectedItemId || !quantity}
        className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

function OrdersTable({
  orders,
  loading,
  getCategoryName,
  getSupplierName,
  getOrderStatusColor,
  onView,
  onEdit,
  onDelete,
  canDelete,
  showConvert,
  onConvert,
  activeTab,
  itemById,
}: OrdersTableProps) {
  const isOrderItems = activeTab === "order_items";

  const itemColumns: ColumnDef<any>[] = [
    { header: "S. No", render: (_, i) => i + 1, align: "center" },
    { header: "EAN", render: (row) => itemById.get(String(row.item_id))?.ean || "-" },
    { header: "Item name", render: (row) => itemById.get(String(row.item_id))?.item_name || itemById.get(String(row.item_id))?.name || "Unknown" },
    { header: "Price", render: (row) => row.rmb_special_price ?? "-" },
    { header: "QTY", render: (row) => row.qty, align: "center" },
    { header: "Total", render: (row) => (row.rmb_special_price ? (row.rmb_special_price * row.qty).toFixed(2) : "-"), align: "center" },
    { header: "Supplier", render: (row) => row.supplier_id ? getSupplierName?.(row.supplier_id) : getCategoryName(row.category_id) },
    { header: "Order No.", render: (row) => row.order_no },
    { header: "Remarks", render: (row) => row.remarks_cn || row.remark_de || "-" },
    { header: "Status", render: (row) => row.item_status || "-", align: "center" },
    { header: "Cargo", render: (row) => row.cargo_id || "-", align: "center" },
    { header: "SOID", render: (row) => row.supplier_order_id || "-", align: "center" },
    {
      header: "Actions", align: "center", render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button className="px-3 py-1 text-xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 transition">
            &lt; Split
          </button>
          <button className="px-3 py-1 text-xs font-semibold bg-gray-600 text-white rounded hover:bg-gray-700 transition">
            &#8617; ReAssign
          </button>
        </div>
      )
    },
  ];

  const getCount = (items: any[] | undefined, ...statuses: string[]) => {
    return items?.filter((i) => statuses.includes(i.status || "NSO")).length || 0;
  };

  const CountCell = ({ count }: { count: number }) => (
    <span className={count > 0 ? "text-blue-600 font-semibold" : "text-gray-800"}>{count}</span>
  );

  const orderColumns: ColumnDef<any>[] = [
    { header: "No", render: (_, i) => i + 1, align: "center", renderTotal: () => <span className="text-transparent">Total</span> },
    {
      header: "Re Assign", align: "center", render: () => (
        <button className="px-3 py-1 text-xs font-semibold bg-gray-600 text-white rounded hover:bg-gray-700 transition whitespace-nowrap">
          &#8617; ReAssign
        </button>
      )
    },
    { header: "Order No.", render: (row) => <button onClick={() => onView(row)} className="text-blue-600 hover:underline font-semibold whitespace-nowrap">{row.order_no}</button>, align: "center" },
    { header: "Catgy", render: (row) => getCategoryName(row.category_id), align: "center" },
    { header: "Cargo", render: (row) => row.cargo_id ?? "-", align: "center" },
    { header: "Comment", render: (row) => row.comment || "-", align: "left" },
    { header: "Created", render: (row) => row.date_created || (row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : "-"), align: "center" },
    { header: "Emailed", render: (row) => row.date_emailed || "-", align: "center" },
    { header: "Delivery", render: (row) => row.date_delivery || "-", align: "center" },
    { header: "Total", render: (row) => <span className="font-semibold">{row.items?.length || 0}</span>, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + (row.items?.length || 0), 0)} /> },
    { header: "NSO", render: (row) => <CountCell count={getCount(row.items, "NSO")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "NSO"), 0)} /> },
    { header: "SO", render: (row) => <CountCell count={getCount(row.items, "SO")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "SO"), 0)} /> },
    { header: "Problem", render: (row) => <CountCell count={getCount(row.items, "Problem", "problem")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Problem", "problem"), 0)} /> },
    { header: "Purchase", render: (row) => <CountCell count={getCount(row.items, "Purchase", "Purchased", "purchase", "purchased")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Purchase", "Purchased", "purchase", "purchased"), 0)} /> },
    { header: "Paid", render: (row) => <CountCell count={getCount(row.items, "Paid", "paid")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Paid", "paid"), 0)} /> },
    { header: "Checked", render: (row) => <CountCell count={getCount(row.items, "Checked", "checked")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Checked", "checked"), 0)} /> },
    { header: "Printed", render: (row) => <CountCell count={getCount(row.items, "Printed", "printed")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Printed", "printed"), 0)} /> },
    { header: "Invoiced", render: (row) => <CountCell count={getCount(row.items, "Invoiced", "invoiced")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Invoiced", "invoiced"), 0)} /> },
    { header: "Shipped", render: (row) => <CountCell count={getCount(row.items, "Shipped", "shipped")} />, align: "center", renderTotal: (data) => <CountCell count={data.reduce((acc, row) => acc + getCount(row.items, "Shipped", "shipped"), 0)} /> },
  ];

  return (
    <DataTable
      data={orders}
      columns={isOrderItems ? itemColumns : orderColumns}
      loading={loading}
      emptyMessage={isOrderItems ? "No Order Items Found" : "No Orders Found"}
      showTotals={!isOrderItems}
    />
  );
}

const OrderPage = () => {
  const { user } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    "orders"
  );
  const activeTabObj = tabs.find((t) => t.id === activeTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

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

  const [form, setForm] = useState({
    comment: "",
    customer_id: "",
    category_id: "",
    supplier_id: "",
    status: "",
  });

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  const isTab1 = activeTab !== "cargos" && activeTab !== "cargo_type" && activeTab !== "order_items";
  const isTab2 = false;
  const isConvertMode = mode === "convert";

  const effectiveItems: Item[] = useMemo(() => {
    if (form.supplier_id) return itemsBySupplier;
    if (form.category_id) return itemsByCategory;
    return itemsAll;
  }, [form.supplier_id, itemsBySupplier, form.category_id, itemsByCategory, itemsAll]);

  const loadingItems =
    loadingItemsAll ||
    (isTab1 && !!form.supplier_id && loadingItemsBySupplier) ||
    (isTab1 && !!form.category_id && loadingItemsByCategory);

  const itemById = useMemo(() => {
    const map = new Map<string, Item>();
    for (const it of itemsAll) map.set(String(it.id), it);
    for (const it of itemsByCategory) map.set(String(it.id), it);
    for (const it of itemsBySupplier) map.set(String(it.id), it);
    return map;
  }, [itemsAll, itemsByCategory, itemsBySupplier]);

  const getCategoryName = useCallback(
    (categoryId: string | number) =>
      categories.find((c) => String(c.id) === String(categoryId))?.name ?? "-",
    [categories]
  );

  const getCustomerName = useCallback(
    (customerId: any) =>
      customers.find((c) => String(c.id) === String(customerId))
        ?.companyName ?? "-",
    [customers]
  );

  const getSupplierName = useCallback(
    (supplierId: any) =>
      suppliers.find((c) => String(c.id) === String(supplierId))
        ?.company_name ?? "-",
    [suppliers]
  );

  const canSubmit = useMemo(() => {
    if (isConvertMode) return orderItems.length > 0;

    const hasItems = orderItems.length > 0;
    const hasComment = !!form.comment?.trim();
    const tabOk =
      (isTab1 ? (!!form.category_id || !!form.supplier_id) : true) && (isTab2 ? !!form.customer_id : true);
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
    setForm({ comment: "", customer_id: "", category_id: "", supplier_id: "", status: "" });
    setSelectedItemId("");
    setOrderItems([]);
    setItemsByCategory([]);
    setItemsBySupplier([]);
    setSelectedOrder(null);
    setMode("create");
  }, []);

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
      const response = await getAllCustomers();
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
      const response = await getAllSuppliers();
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
      const response = await getItems();
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
    fetchCustomers();
    fetchCategories();
    fetchSuppliers();
    fetchAllItems();
  }, [fetchCustomers, fetchCategories, fetchSuppliers, fetchAllItems]);

  const handleCustomerChange = (customer_id: string) =>
    setForm((prev) => ({ ...prev, customer_id }));

  const handleCategoryChange = async (
    category_id: string,
    resetOrderItemsFlag: boolean = true
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
    resetOrderItemsFlag: boolean = true
  ) => {
    setForm((prev) => ({ ...prev, supplier_id }));
    setSelectedItemId("");
    if (resetOrderItemsFlag) setOrderItems([]);

    if (supplier_id) {
      setLoadingItemsBySupplier(true);
      try {
        const response: any = await getSupplierItems(supplier_id);
        const data = response?.data ?? response;
        const arr = Array.isArray(data) ? data : [];
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
      return [...prev, { item_id: String(item_id), itemName, qty, remark_de: "" }];
    });

    toast.success(`Added ${qty}x ${itemName} to order`);
  };

  const handleRemoveOrderItem = (item_id: string) =>
    setOrderItems((prev) => prev.filter((x) => x.item_id !== item_id));

  const handleUpdateOrderItemQty = (item_id: string, qty: number) => {
    if (!qty || qty <= 0) return;
    setOrderItems((prev) => prev.map((x) => (x.item_id === item_id ? { ...x, qty } : x)));
  };

  const handleUpdateOrderItemRemark = (item_id: string, remark_de: string) => {
    setOrderItems((prev) =>
      prev.map((x) => (x.item_id === item_id ? { ...x, remark_de } : x))
    );
  };

  const openCreate = () => {
    resetForm();
    setMode("create");
    setShowModal(true);
  };

  const openEdit = async (order: Order) => {
    setMode("edit");
    setSelectedOrder(order);
    setShowModal(true);

    setForm({
      category_id: String(order.category_id ?? ""),
      customer_id: String((order as any).customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
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
        })
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
      customer_id: String((order as any).customer_id ?? ""),
      supplier_id: String(order.supplier_id ?? ""),
      comment: order.comment ?? "",
      status: String(order.status ?? ""),
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
            itemName: item?.item_name || item?.name || "Unknown item",
            qty: Number(l.qty ?? 1),
            remark_de: String(l.remark_de ?? ""),
          };
        })
      );
    } else {
      setOrderItems([]);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const openView = async (order: Order) => {
    setViewOrder(order);
    setShowViewModal(true);

    try {
      const detailRes: any = await getOrderById(order.id);
      const detail = detailRes?.data ?? detailRes;
      const lines = detail?.items ?? detail?.data?.items ?? [];

      if (Array.isArray(lines)) {
        setViewItems(
          lines.map((l: any) => {
            const id = String(l.item_id ?? "");
            const item = itemById.get(id);
            return {
              item_id: id,
              itemName: item?.item_name || item?.name || "Unknown item",
              qty: Number(l.qty ?? 1),
              remark_de: String(l.remark_de ?? ""),
            };
          })
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
    if (orderItems.length === 0) return toast.error("Please add at least one item");
    if (isTab1 && !form.category_id && !form.supplier_id) return toast.error("Please select a category or supplier for Orders");
    if (isTab2 && !form.customer_id) return toast.error("Please select a customer for Customer Orders");

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
    if (orderItems.length === 0) return toast.error("Please add at least one item");

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
        comment: (selectedOrder.comment ?? form.comment ?? "").slice(0, 200) || null,
        status: 1,
        items: orderItems.map((x) => ({
          item_id: Number(x.item_id),
          qty: Number(x.qty),
          remark_de: x.remark_de?.trim() ? x.remark_de : null,
        })),
      };

      const created: any = await createOrder(createPayload as any);
      const newOrderNo =
        created?.data?.order_no || created?.data?.data?.order_no || created?.order_no || "";

      const marker = newOrderNo ? ` | Converted to ${newOrderNo}` : ` | Converted`;
      const nextComment = ((selectedOrder.comment ?? "") + marker).slice(0, 200);

      await updateOrder(originalId, {
        status: 4,
        comment: nextComment,
      });

      toast.success(
        newOrderNo ? `Converted ${originalOrderNo} → ${newOrderNo}` : `Converted ${originalOrderNo}`
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

  const nsoOrders = useMemo(() => orders.filter((o: any) => !o.supplier_id), [orders]);
  const supplierOrders = useMemo(() => orders.filter((o: any) => !!o.supplier_id), [orders]);
  const orderItemsFlat = useMemo(() => orders.flatMap((o: any) =>
    (o.items || []).map((i: any) => ({ ...i, order_no: o.order_no, order_status: o.status, item_status: i.status || "NSO", supplier_id: o.supplier_id, category_id: o.category_id }))
  ), [orders]);

  const visibleOrders = activeTab === "orders" ? orders
    : activeTab === "nso" ? nsoOrders
      : activeTab === "supplier_orders" ? supplierOrders
        : activeTab === "order_items" ? orderItemsFlat
          : [];

  const defaultAction = (
    <div className="flex gap-2">
      <button
        onClick={fetchOrders}
        disabled={loadingOrders}
        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <ArrowPathIcon className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`} />
        Refresh
      </button>

      <CustomButton
        gradient={true}
        onClick={openCreate}
        className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2"
      >
        <PlusIcon className="h-4 w-4" />
        New Order
      </CustomButton>
    </div>
  );

  const tabActions: Record<(typeof tabs)[number]["id"], React.ReactNode> = {
    orders: defaultAction,
    order_items: defaultAction,
    cargos: null,
    cargo_type: null,
    nso: defaultAction,
    supplier_orders: defaultAction,
  };

  const lockAllExceptQty = isConvertMode;

  return (
    <>
      <div className="min-h-screen bg-white shadow-xl rounded-lg p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <PageHeader title={activeTabObj?.label || "Orders"} icon={ShoppingCart} />
              </div>

              {tabActions[activeTab]}
            </div>
          </div>

          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? "border-gray-600 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
            {activeTab === "cargos" ? (
              <CargosTab customers={customers} />
            ) : activeTab === "cargo_type" ? (
              <CargoTypesTab />
            ) : (
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
                activeTab={activeTab}
                itemById={itemById}
              />
            )}
          </div>
        </div>
      </div>

      {showViewModal && viewOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Order {viewOrder.order_no}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Status: {String(viewOrder.status ?? "-")}
                  </p>
                </div>

                <button onClick={closeView} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div>
                  <div className="text-gray-500">Category</div>
                  <div className="font-medium text-gray-900">
                    {getCategoryName(viewOrder.category_id)}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">Customer</div>
                  <div className="font-medium text-gray-900">
                    {viewOrder.customer_id != null ? getCustomerName(viewOrder.customer_id) : "-"}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-gray-500">Comment</div>
                  <div className="font-medium text-gray-900">{viewOrder.comment ?? "-"}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                        ID
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                        Item name
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                        Item remark
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {viewItems.map((row) => (
                      <tr key={row.item_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.item_id}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.itemName}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.qty}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          {row.remark_de || "-"}
                        </td>
                      </tr>
                    ))}

                    {viewItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  onClick={closeView}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {mode === "convert"
                    ? "CONVERT ORDER"
                    : mode === "edit"
                      ? "Edit Order"
                      : isTab2
                        ? "Create Customer Order"
                        : "Create New Order"}
                </h2>

                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {isConvertMode && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <b>Note</b>. All other fields are locked. Only <b>QTY</b> and <b>Item remark</b>  is editable.
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Category:
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      disabled={lockAllExceptQty}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isTab1 ? "Select Supplier:" : "Select Customer:"}
                    </label>
                    {isTab1 ? (
                      <select
                        value={form.supplier_id}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        disabled={lockAllExceptQty}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select Supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.company_name || s.name || "Unnamed Supplier"}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={form.customer_id}
                        onChange={(e) => handleCustomerChange(e.target.value)}
                        disabled={lockAllExceptQty}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={String(customer.id)}>
                            {customer.companyName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Item then quantity:
                  </label>
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter order comment..."
                    rows={3}
                  />
                </div>

                {orderItems.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                            ID
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                            Item name
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                            Item remark
                          </th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {orderItems.map((row) => (
                          <tr key={row.item_id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.item_id}</td>
                            <td className="px-4 py-2 text-sm text-gray-700 border-b">{row.itemName}</td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              <input
                                type="number"
                                min={1}
                                value={row.qty}
                                onChange={(e) =>
                                  handleUpdateOrderItemQty(row.item_id, Number(e.target.value))
                                }
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                              />
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              <input
                                type="text"
                                value={row.remark_de}
                                onChange={(e) =>
                                  handleUpdateOrderItemRemark(row.item_id, String(e.target.value))
                                }

                                className="w-64 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                              />
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderItem(row.item_id)}
                                disabled={lockAllExceptQty}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>

                  <CustomButton
                    gradient={true}
                    disabled={!canSubmit}
                    onClick={
                      mode === "convert"
                        ? handleConvertOrder
                        : mode === "edit"
                          ? handleUpdateOrder
                          : handleCreateOrder
                    }
                    className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all disabled:opacity-50"
                  >
                    {mode === "convert"
                      ? "CONVERT ORDER"
                      : mode === "edit"
                        ? "Update Order"
                        : "Create Order"}
                  </CustomButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderPage;