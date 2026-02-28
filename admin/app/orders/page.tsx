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
  MagnifyingGlassIcon,
  ArrowRightIcon,
  PlusCircleIcon,
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
import {
  getAllCargos,
  assignOrdersToCargo,
  type CargoType,
} from "@/api/cargos";

import { getAllCustomers } from "@/api/customers";
import {
  getAllSuppliers,
  getSupplierItems,
  type Supplier,
} from "@/api/suppliers";
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
  supplier_id?: string | number;
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
  onReassign: (o: any) => void;
  activeTab: string;
  itemById: Map<string, Item>;
};

const tabs = [
  { id: "orders", label: "List Orders", description: "View all orders" },
  {
    id: "order_items",
    label: "List Order Items",
    description: "View all order items",
  },
  { id: "cargos", label: "Cargos", description: "Manage Cargos and Shipments" },
  { id: "cargo_type", label: "Cargos type", description: "Manage Cargo Types" },
  {
    id: "nso",
    label: "NSO (No Supplier Orders)",
    description: "Orders with no supplier",
  },
  {
    id: "supplier_orders",
    label: "Supplier Orders",
    description: "Orders with suppliers",
  },
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
    [items],
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
  onConvert,
  onReassign,
  activeTab,
  itemById,
}: OrdersTableProps) {
  const isOrderItems = activeTab === "order_items";

  const itemColumns: ColumnDef<any>[] = [
    {
      header: "S. No",
      width: "30px",
      render: (_, i) => i + 1,
      align: "center",
    },
    {
      header: "EAN",
      width: "80px",
      render: (row) => itemById.get(String(row.item_id))?.ean || "-",
    },
    {
      header: "Item name",
      width: "150px",
      render: (row) => (
        <div
          className="truncate"
          title={
            itemById.get(String(row.item_id))?.item_name ||
            itemById.get(String(row.item_id))?.name
          }
        >
          {itemById.get(String(row.item_id))?.item_name ||
            itemById.get(String(row.item_id))?.name ||
            "Unknown"}
        </div>
      ),
    },
    {
      header: "Price",
      width: "60px",
      render: (row) => row.rmb_special_price ?? "-",
    },
    { header: "QTY", width: "40px", render: (row) => row.qty, align: "center" },
    {
      header: "Total",
      width: "60px",
      render: (row) =>
        row.rmb_special_price
          ? (row.rmb_special_price * row.qty).toFixed(2)
          : "-",
      align: "center",
    },
    {
      header: "Supplier",
      width: "100px",
      render: (row) => (
        <div className="truncate">
          {row.supplier_id
            ? getSupplierName?.(row.supplier_id)
            : getCategoryName(row.category_id)}
        </div>
      ),
    },
    { header: "Order No.", width: "80px", render: (row) => row.order_no },
    {
      header: "Remarks",
      width: "150px",
      render: (row) => (
        <div className="line-clamp-2" title={row.remarks_cn || row.remark_de}>
          {row.remarks_cn || row.remark_de || "-"}
        </div>
      ),
    },
    {
      header: "Status",
      width: "60px",
      render: (row) => row.item_status || "-",
      align: "center",
    },
    {
      header: "Cargo",
      width: "40px",
      render: (row) => row.cargo_id || "-",
      align: "center",
    },
    {
      header: "SOID",
      width: "40px",
      render: (row) => row.supplier_order_id || "-",
      align: "center",
    },
    {
      header: "Actions",
      width: "130px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-600 text-white rounded hover:bg-amber-700 transition">
            Split
          </button>
          <button className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-600 text-white rounded hover:bg-gray-700 transition">
            ReAssign
          </button>
        </div>
      ),
    },
  ];

  const getCount = (items: any[] | undefined, ...statuses: string[]) => {
    return (
      items?.filter((i) => statuses.includes(i.status || "NSO")).length || 0
    );
  };

  const CountCell = ({ count }: { count: number }) => (
    <span
      className={count > 0 ? "text-blue-600 font-semibold" : "text-gray-800"}
    >
      {count}
    </span>
  );

  const orderColumns: ColumnDef<any>[] = [
    {
      header: "No",
      width: "30px",
      render: (_, i) => i + 1,
      align: "center",
      renderTotal: () => <span className="text-transparent">Total</span>,
    },
    {
      header: "Re Assign",
      width: "85px",
      align: "center",
      render: (row) => (
        <button
          onClick={() => onReassign(row)}
          className="px-2 py-0.5 text-[10px] font-semibold bg-gray-600 text-white rounded hover:bg-gray-700 transition whitespace-nowrap"
        >
          &#8617; ReAssign
        </button>
      ),
    },
    {
      header: "Order No.",
      render: (row) => (
        <button
          onClick={() => onView(row)}
          className="text-blue-600 hover:underline font-semibold whitespace-nowrap"
        >
          {row.order_no}
        </button>
      ),
      align: "center",
    },
    {
      header: "Catgy",
      render: (row) => getCategoryName(row.category_id),
      align: "center",
    },
    {
      header: "Order No.",
      width: "90px",
      render: (row) => (
        <button
          onClick={() => onView(row)}
          className="text-blue-600 hover:underline font-semibold whitespace-nowrap"
        >
          {row.order_no}
        </button>
      ),
      align: "center",
    },
    {
      header: "Catgy",
      width: "65px",
      render: (row) => getCategoryName(row.category_id),
      align: "center",
    },
    {
      header: "Cargo",
      width: "55px",
      render: (row) => row.cargo_id ?? "-",
      align: "center",
    },
    {
      header: "Comment",
      width: "250px",
      render: (row) => (
        <div className="line-clamp-2 leading-tight" title={row.comment}>
          {row.comment || "-"}
        </div>
      ),
      align: "left",
    },
    {
      header: "Created",
      width: "65px",
      render: (row) =>
        row.date_created ||
        (row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
            })
          : "-"),
      align: "center",
    },
    {
      header: "Emailed",
      width: "65px",
      render: (row) => row.date_emailed || "-",
      align: "center",
    },
    {
      header: "Delivery",
      width: "65px",
      render: (row) => row.date_delivery || "-",
      align: "center",
    },
    {
      header: "Total",
      width: "35px",
      render: (row) => (
        <span className="font-semibold">{row.items?.length || 0}</span>
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + (row.items?.length || 0), 0)}
        />
      ),
    },
    {
      header: "NSO",
      width: "35px",
      render: (row) => <CountCell count={getCount(row.items, "NSO")} />,
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + getCount(row.items, "NSO"), 0)}
        />
      ),
    },
    {
      header: "SO",
      width: "35px",
      render: (row) => <CountCell count={getCount(row.items, "SO")} />,
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce((acc, row) => acc + getCount(row.items, "SO"), 0)}
        />
      ),
    },
    {
      header: "Problem",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Problem", "problem")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Problem", "problem"),
            0,
          )}
        />
      ),
    },
    {
      header: "Purchase",
      width: "35px",
      render: (row) => (
        <CountCell
          count={getCount(
            row.items,
            "Purchase",
            "Purchased",
            "purchase",
            "purchased",
          )}
        />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) =>
              acc +
              getCount(
                row.items,
                "Purchase",
                "Purchased",
                "purchase",
                "purchased",
              ),
            0,
          )}
        />
      ),
    },
    {
      header: "Paid",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Paid", "paid")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Paid", "paid"),
            0,
          )}
        />
      ),
    },
    {
      header: "Checked",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Checked", "checked")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Checked", "checked"),
            0,
          )}
        />
      ),
    },
    {
      header: "Printed",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Printed", "printed")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Printed", "printed"),
            0,
          )}
        />
      ),
    },
    {
      header: "Invoiced",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Invoiced", "invoiced")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Invoiced", "invoiced"),
            0,
          )}
        />
      ),
    },
    {
      header: "Shipped",
      width: "35px",
      render: (row) => (
        <CountCell count={getCount(row.items, "Shipped", "shipped")} />
      ),
      align: "center",
      renderTotal: (data) => (
        <CountCell
          count={data.reduce(
            (acc, row) => acc + getCount(row.items, "Shipped", "shipped"),
            0,
          )}
        />
      ),
    },
  ];

  return (
    <DataTable
      data={orders}
      columns={isOrderItems ? itemColumns : orderColumns}
      loading={loading}
      emptyMessage={isOrderItems ? "No Order Items Found" : "No Orders Found"}
      showTotals={!isOrderItems}
      getRowClassName={(row) => {
        const isExpress = (row.comment || "").toLowerCase().includes("express");
        return isExpress ? "bg-red-50" : "";
      }}
    />
  );
}

const OrderPage = () => {
  const { user } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("orders");
  const activeTabObj = tabs.find((t) => t.id === activeTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [cargos, setCargos] = useState<CargoType[]>([]);

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

  const [form, setForm] = useState({
    comment: "",
    customer_id: "",
    category_id: "",
    supplier_id: "",
    status: "",
  });

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [nsoSearch, setNsoSearch] = useState("");

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
    [categories],
  );

  const getCustomerName = useCallback(
    (customerId: any) =>
      customers.find((c) => String(c.id) === String(customerId))?.companyName ??
      "-",
    [customers],
  );

  const getSupplierName = useCallback(
    (supplierId: any) =>
      suppliers.find((c) => String(c.id) === String(supplierId))
        ?.company_name ?? "-",
    [suppliers],
  );

  const nsoGroups = useMemo(() => {
    const groups = {
      express: new Map<number, any>(),
      normal: new Map<number, any>(),
    };

    orders.forEach((o: any) => {
      const isExpress = (o.comment || "").toLowerCase().includes("express");
      const targetMap = isExpress ? groups.express : groups.normal;

      (o.items || []).forEach((item: any) => {
        if (item.supplier_order_id) return;
        const itemDetails = itemById.get(String(item.item_id));
        const sId = o.supplier_id || itemDetails?.supplier_id;
        if (!sId) return;

        const sid = Number(sId);
        if (!targetMap.has(sid)) {
          targetMap.set(sid, {
            supplier_id: sid,
            supplier_name: getSupplierName(sid),
            order_type: getCategoryName(o.category_id) || "Taobao",
            count: 0,
            qty: 0,
          });
        }

        const g = targetMap.get(sid);
        g.count += 1;
        g.qty += Number(item.qty || 0);
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
  }, [orders, itemById, getSupplierName, getCategoryName, nsoSearch]);

  const isTab1 =
    activeTab !== "cargos" &&
    activeTab !== "cargo_type" &&
    activeTab !== "order_items";
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
    });
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
      const response: any = await getAllOrders(filters);
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
    fetchCargos();
  }, [fetchCustomers, fetchCategories, fetchSuppliers, fetchAllItems]);

  const fetchCargos = useCallback(async () => {
    try {
      const res = await getAllCargos();
      const data = res?.data ?? res;
      setCargos(Array.isArray(data) ? data : data?.cargos || []);
    } catch (e) {
      console.error(e);
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
      return [
        ...prev,
        { item_id: String(item_id), itemName, qty, remark_de: "" },
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

  const nsoOrders = useMemo(
    () => orders.filter((o: any) => !o.supplier_id),
    [orders],
  );
  const supplierOrders = useMemo(
    () => orders.filter((o: any) => !!o.supplier_id),
    [orders],
  );
  const orderItemsFlat = useMemo(
    () =>
      orders.flatMap((o: any) =>
        (o.items || []).map((i: any) => ({
          ...i,
          order_no: o.order_no,
          order_status: o.status,
          item_status: i.status || "NSO",
          supplier_id: o.supplier_id,
          category_id: o.category_id,
        })),
      ),
    [orders],
  );

  const visibleOrders =
    activeTab === "orders"
      ? orders
      : activeTab === "nso"
        ? nsoOrders
        : activeTab === "supplier_orders"
          ? supplierOrders
          : activeTab === "order_items"
            ? orderItemsFlat
            : [];

  const defaultAction = (
    <div className="flex gap-2">
      <button
        onClick={fetchOrders}
        disabled={loadingOrders}
        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <ArrowPathIcon
          className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`}
        />
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
      <div className="min-h-screen bg-white shadow-xl rounded-lg p-2 md:p-4">
        <div className="max-w-full mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <PageHeader
                  title={activeTabObj?.label || "Orders"}
                  icon={ShoppingCart}
                />
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
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
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
            ) : activeTab === "nso" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="flex items-center justify-between mb-8 px-4">
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="bg-[#1e40af] text-white rounded px-6 py-2 flex items-center gap-2 font-bold text-sm shadow-md hover:bg-blue-800 transition"
                  >
                    <XMarkIcon className="h-4 w-4 bg-white text-[#1e40af] rounded-full p-0.5" />
                    Back
                  </button>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search NSOs"
                      value={nsoSearch}
                      onChange={(e) => setNsoSearch(e.target.value)}
                      className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 w-80 shadow-sm text-sm"
                    />
                  </div>
                </div>
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
                            <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-sm">
                              {row.supplier_id}
                              <div className="bg-white rounded-full p-0.5">
                                <ArrowRightIcon className="h-2 w-2 text-[#475569]" />
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
                            <button className="bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-green-700 transition shadow-sm">
                              <PlusCircleIcon className="h-5 w-5" />
                              Supplier order
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    loading={loadingOrders}
                    emptyMessage="No Express NSOs found"
                    getRowClassName={() => "bg-red-50"}
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
                            <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-sm">
                              {row.supplier_id}
                              <div className="bg-white rounded-full p-0.5">
                                <ArrowRightIcon className="h-2 w-2 text-[#475569]" />
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
                            <button className="bg-[#059669] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-green-700 transition shadow-sm">
                              <PlusCircleIcon className="h-5 w-5" />
                              Supplier order
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    loading={loadingOrders}
                    emptyMessage="No Normal NSOs found"
                  />
                </div>
              </div>
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
                onReassign={(o) => {
                  setReassignOrder(o);
                  setShowReassignModal(true);
                }}
                activeTab={activeTab}
                itemById={itemById}
              />
            )}
          </div>
        </div>
      </div>

      {showReassignModal && reassignOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Reassign Order to Cargo
              </h3>
              <button onClick={() => setShowReassignModal(false)}>
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Order No:{" "}
              <span className="font-semibold">{reassignOrder.order_no}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Cargo
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  onChange={async (e) => {
                    const cargoId = Number(e.target.value);
                    if (!cargoId) return;
                    try {
                      await assignOrdersToCargo(cargoId, [reassignOrder.id]);
                      toast.success(`Order reassigned to Cargo ${cargoId}`);
                      setShowReassignModal(false);
                      fetchOrders();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <option value="">Select Cargo...</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cargo_no} ({c.cargo_status || "Open"})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

                <button
                  onClick={closeView}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
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
                    {viewOrder.customer_id != null
                      ? getCustomerName(viewOrder.customer_id)
                      : "-"}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-gray-500">Comment</div>
                  <div className="font-medium text-gray-900">
                    {viewOrder.comment ?? "-"}
                  </div>
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
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          {row.item_id}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          {row.itemName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          {row.qty}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700 border-b">
                          {row.remark_de || "-"}
                        </td>
                      </tr>
                    ))}

                    {viewItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-6 text-center text-sm text-gray-500"
                        >
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
                  <b>Note</b>. All other fields are locked. Only <b>QTY</b> and{" "}
                  <b>Item remark</b> is editable.
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comment:
                  </label>
                  <textarea
                    value={form.comment}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
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
                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              {row.item_id}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              {row.itemName}
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              <input
                                type="number"
                                min={1}
                                value={row.qty}
                                onChange={(e) =>
                                  handleUpdateOrderItemQty(
                                    row.item_id,
                                    Number(e.target.value),
                                  )
                                }
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                              />
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b">
                              <input
                                type="text"
                                value={row.remark_de}
                                onChange={(e) =>
                                  handleUpdateOrderItemRemark(
                                    row.item_id,
                                    String(e.target.value),
                                  )
                                }
                                className="w-64 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                              />
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveOrderItem(row.item_id)
                                }
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
