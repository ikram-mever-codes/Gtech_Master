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
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  ArrowRightIcon,
  PlusCircleIcon,
  PrinterIcon,
  ScissorsIcon,
  ArrowRightCircleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderItemStatus,
  splitOrderItem,
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
  deleteSupplierOrder,
  type SupplierOrder,
} from "@/api/supplier_orders";

import { getAllCustomers } from "@/api/customers";
import {
  getAllSuppliers,
  getSupplierItems,
  type Supplier,
} from "@/api/suppliers";
import { getItems } from "@/api/items";
import { getCategories } from "@/api/categories";
import CustomButton from "@/components/UI/CustomButton";
import CustomModal from "@/components/UI/CustomModal";
import PageHeader from "@/components/UI/PageHeader";
import { DataTable, ColumnDef } from "@/components/UI/DataTable";
import { ShoppingCart } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/app/Redux/store";
import { UserRole } from "@/utils/interfaces";

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
  price?: number;
  currency?: string;
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
              "border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500",
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
        className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
        min="1"
        disabled={disabled}
      />

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled || !selectedItemId || !quantity}
        className="px-4 py-2 text-sm bg-green-700 text-white rounded-[4px] hover:bg-green-600 disabled:opacity-50"
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
      render: (row) => row.item?.ean || "-",
    },
    {
      header: "Item name",
      width: "150px",
      render: (row) => (
        <div className="truncate" title={row.item?.item_name || row.item?.name}>
          {row.item?.item_name || row.item?.name || "Unknown"}
        </div>
      ),
    },
    {
      header: "Price",
      width: "80px",
      render: (row) => (
        <div className="font-semibold">
          {row.price || row.item?.price
            ? `${row.currency || row.item?.currency || "CNY"} ${row.price || row.item?.price}`
            : row.rmb_special_price
              ? `CNY ${row.rmb_special_price}`
              : "-"}
        </div>
      ),
    },
    { header: "QTY", width: "40px", render: (row) => row.qty, align: "center" },
    {
      header: "Total",
      width: "80px",
      render: (row) => {
        const p = row.price || row.rmb_special_price || row.item?.price;
        const currency = row.currency || row.item?.currency || "CNY";
        return p ? `${currency} ${(p * row.qty).toFixed(2)}` : "-";
      },
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
      render: (row) => row.item_status || row.status || "-",
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
      width: "135px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onReassign(row)}
            title="Re-assign to Cargo"
            className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-green-700 transition shadow-md flex items-center gap-1"
          >
            <span>&#8617;</span> ReAssign
          </button>
          <button
            onClick={() => {
              // setSelectedItem(row);
              // setSplitQty(0);
              // setShowSPModal(true);
            }}
            title="Split Order Item"
            className="px-2 py-1 text-[10px] font-bold bg-amber-600 text-white rounded-[4px] hover:bg-amber-700 transition shadow-md"
          >
            Split
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
      className={count > 0 ? "text-green-600 font-semibold" : "text-gray-800"}
    >
      {count}
    </span>
  );

  const ActionCell = ({ row }: { row: any }) => (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onReassign(row)}
        title="Re-assign to Cargo"
        className="px-2 py-1 text-[10px] font-bold bg-[#8CC21B] text-white rounded-[4px] hover:bg-green-700 transition shadow-md flex items-center gap-1"
      >
        <span>&#8617;</span> ReAssign
      </button>
      <button
        onClick={() => onEdit(row)}
        title="Edit Order"
        className="px-2 py-1 text-[10px] font-bold bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition shadow-md"
      >
        Edit
      </button>
    </div>
  );

  const orderColumns: ColumnDef<any>[] = [
    {
      header: "No",
      width: "40px",
      render: (_, i) => i + 1,
      align: "center",
      renderTotal: () => <span className="text-transparent">Total</span>,
    },
    {
      header: "Actions",
      width: "150px",
      align: "center",
      render: (row) => <ActionCell row={row} />,
    },
    {
      header: "Order No.",
      width: "90px",
      render: (row) => (
        <button
          onClick={() => onView(row)}
          className="text-green-600 hover:underline font-semibold whitespace-nowrap"
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
  const [supplierOrdersList, setSupplierOrdersList] = useState<SupplierOrder[]>(
    [],
  );
  const [expandedSupplierOrderId, setExpandedSupplierOrderId] = useState<
    number | null
  >(null);
  const [loadingSupplierOrders, setLoadingSupplierOrders] = useState(false);
  const [supplierOrderSearch, setSupplierOrderSearch] = useState("");

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
  });

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [nsoSearch, setNsoSearch] = useState("");

  const [isEditQtyModalOpen, setIsEditQtyModalOpen] = useState(false);
  const [editQtyItem, setEditQtyItem] = useState<any>(null);
  const [newQty, setNewQty] = useState<string>("");
  const [newRemarkCN, setNewRemarkCN] = useState<string>("");
  const [reprintSearch, setReprintSearch] = useState("");

  const [showREModal, setShowREModal] = useState(false);
  const [showSPModal, setShowSPModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [splitQty, setSplitQty] = useState<number>(0);
  const [targetCargoId, setTargetCargoId] = useState<string>("");

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
    return list;
  }, [orders]);

  const reprintItems = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const isPrinted =
          it.status?.toLowerCase() === "printed" || it.printed === "Y";
        if (isPrinted) {
          const matchesSearch =
            !reprintSearch ||
            String(it.id).includes(reprintSearch) ||
            String(it.item_id).includes(reprintSearch) ||
            itemById
              .get(String(it.item_id))
              ?.ean?.toString()
              .includes(reprintSearch) ||
            itemById
              .get(String(it.item_id))
              ?.item_name?.toLowerCase()
              .includes(reprintSearch.toLowerCase());

          if (matchesSearch) {
            list.push({ ...it, parentOrder: o });
          }
        }
      });
    });
    return list;
  }, [orders, reprintSearch, itemById]);

  // Inside your Component logic
  const handlePrintLabel = async (row: any) => {
    if (!row.id) {
      toast.error("Invalid Item ID");
      return;
    }

    // Call the function we just created
    await downloadItemLabel(row.id);
  };

  const labelPrintItems = useMemo(() => {
    const list: any[] = [];
    orders.forEach((o: any) => {
      (o.items || []).forEach((it: any) => {
        const matchesSearch =
          !reprintSearch ||
          String(it.id).includes(reprintSearch) ||
          String(it.item_id).includes(reprintSearch) ||
          itemById
            .get(String(it.item_id))
            ?.ean?.toString()
            .includes(reprintSearch) ||
          itemById
            .get(String(it.item_id))
            ?.item_name?.toLowerCase()
            .includes(reprintSearch.toLowerCase());

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
          price: it.price || it.rmb_special_price || it.price_eur || 0,
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
        const sId = o.supplier_id || itemDetails?.supplier_id || 0;

        const sid = Number(sId);
        if (!targetMap.has(sid)) {
          targetMap.set(sid, {
            supplier_id: sid,
            supplier_name: sid === 0 ? "Unassigned" : getSupplierName(sid),
            order_type: getCategoryName(o.category_id) || "Taobao",
            category_id: o.category_id,
            count: 0,
            qty: 0,
            items: [],
          });
        }

        const g = targetMap.get(sid);
        g.count += 1;
        g.qty += Number(item.qty || 0);
        g.items.push(item);
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

  const isTab1 = activeTab !== "order_items";
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
    if (!selectedItem || splitQty <= 0) return;
    try {
      await splitOrderItem(selectedItem.id, splitQty);
      toast.success("Item split successfully");
      setShowSPModal(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReassignItemAction = async () => {
    if (!selectedItem || !targetCargoId) return;
    try {
      await updateOrderItemStatus(selectedItem.id, {
        cargo_id: Number(targetCargoId),
      });
      toast.success("Item reassigned successfully");
      setShowREModal(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
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

  const fetchSupplierOrders = useCallback(async () => {
    try {
      setLoadingSupplierOrders(true);
      const res: any = await getAllSupplierOrders({
        search: supplierOrderSearch,
      });
      if (res.success) setSupplierOrdersList(res.data);
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
      await createSupplierOrder({
        supplier_id: pendingNsoGroup.supplier_id,
        order_type_id: pendingNsoGroup.category_id,
        item_ids: pendingNsoGroup.items.map((i: any) => i.id),
      });
      await fetchOrders();
      await fetchSupplierOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setPendingNsoGroup(null);
    }
  };

  useEffect(() => {
    if (activeTab === "supplier_orders") fetchSupplierOrders();
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
          comment: o.comment,
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
        className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50"
      >
        <ArrowPathIcon
          className={`h-4 w-4 ${loadingOrders ? "animate-spin" : ""}`}
        />
        Refresh
      </button>

      <CustomButton
        gradient={true}
        onClick={openCreate}
        className="px-4 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition-all shadow-md font-bold flex items-center gap-2"
      >
        <PlusIcon className="h-4 w-4" />
        New Order
      </CustomButton>
    </div>
  );

  const tabActions: Record<(typeof tabs)[number]["id"], React.ReactNode> = {
    orders: defaultAction,
    order_items: defaultAction,
    nso: defaultAction,
    supplier_orders: defaultAction,
    problems: defaultAction,
    label_print: defaultAction,
  };

  const lockAllExceptQty = isConvertMode;

  return (
    <>
      <div className="min-h-screen bg-white shadow-xl rounded-[4px] p-2 md:p-4">
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

          <div className="bg-white rounded-[4px] shadow-lg border border-gray-200 overflow-hidden">
            {activeTab === "nso" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="flex items-center justify-between mb-8 px-4">
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="bg-[#059669] text-white rounded-[4px] px-6 py-2 flex items-center gap-2 font-bold text-sm shadow-md hover:bg-green-700 transition"
                  >
                    <XMarkIcon className="h-4 w-4 bg-white text-[#059669] rounded-full p-0.5" />
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
                      className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 w-80 shadow-md text-sm"
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
                            <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-md">
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
                            <button
                              onClick={() =>
                                handleCreateSupplierOrderFromNSO(row)
                              }
                              className="bg-[#059669] text-white px-4 py-2 rounded-[4px] flex items-center gap-2 text-xs font-bold hover:bg-green-700 transition shadow-md"
                            >
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
                            <div className="bg-[#475569] text-white rounded px-3 py-1.5 flex items-center gap-4 text-xs font-bold w-20 justify-between shadow-md">
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
                            <button
                              onClick={() =>
                                handleCreateSupplierOrderFromNSO(row)
                              }
                              className="bg-[#059669] text-white px-4 py-2 rounded-[4px] flex items-center gap-2 text-xs font-bold hover:bg-green-700 transition shadow-md"
                            >
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
            ) : activeTab === "supplier_orders" ? (
              <div className="p-4 bg-gray-50/30 min-h-[600px]">
                <div className="flex justify-between items-center mb-6 gap-4">
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="bg-[#059669] text-white px-4 py-2 rounded-[4px] text-xs font-bold hover:bg-green-700 transition shadow-md"
                    >
                      Back
                    </button>
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search Supplier Orders..."
                        className="pl-9 pr-4 py-2 border border-gray-200 rounded-[4px] text-xs w-64 focus:ring-2 focus:ring-blue-500 transition"
                        value={supplierOrderSearch}
                        onChange={(e) => setSupplierOrderSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="text-[#059669] font-bold text-lg">
                    Supplier Orders
                  </div>
                </div>
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
                                    <span className="text-blue-600 hover:underline cursor-pointer font-semibold text-[10px]">
                                      {details?.ean || "-"}
                                    </span>
                                  </div>
                                );
                              },
                              align: "center",
                            },
                            {
                              header: "Item Name",
                              render: (item: any) => (
                                <div className="text-[10px] leading-tight font-semibold text-gray-800 break-words max-w-[180px]">
                                  {itemById.get(String(item.item_id))
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
                                  det?.price ||
                                  item.price ||
                                  det?.rmb_special_price ||
                                  item.rmb_special_price ||
                                  "-";
                                const c = item.currency || "CNY";
                                return p !== "-" ? `${c} ${p}` : "-";
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
                                  det?.price ||
                                  item.price ||
                                  det?.rmb_special_price ||
                                  item.rmb_special_price ||
                                  0;
                                return `${item.currency || "CNY"} ${(Number(p) * (item.qty || 0)).toFixed(2)}`;
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
                                        det?.price ||
                                        it.price ||
                                        det?.rmb_special_price ||
                                        it.rmb_special_price ||
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
                                const st =
                                  orderItemDetailsMap.get(String(item.id))
                                    ?.status ||
                                  item.status ||
                                  "SO";
                                const isPurchased =
                                  st?.toLowerCase() === "purchased";
                                return (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isPurchased ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
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
                                const st = det?.status || item.status || "SO";
                                const isSO = st?.toUpperCase() === "SO";
                                const isPurchased =
                                  st?.toLowerCase() === "purchased";

                                return (
                                  <div className="flex gap-1.5 justify-center flex-wrap w-fit mx-auto">
                                    <button
                                      onClick={() => handleEditQty(item)}
                                      className="bg-slate-600 hover:bg-slate-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <PencilIcon className="h-3 w-3" /> QTY
                                    </button>

                                    <button
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setSplitQty(Math.floor(item.qty / 2));
                                        setShowSPModal(true);
                                      }}
                                      className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <ScissorsIcon className="h-3 w-3" /> Split
                                    </button>

                                    <button
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setTargetCargoId(det?.cargo_id || "");
                                        setShowREModal(true);
                                      }}
                                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <ArrowRightCircleIcon className="h-3 w-3" />{" "}
                                      ReAssgn
                                    </button>

                                    <button
                                      onClick={() => handlePrintLabel(row)}
                                      className="bg-[#059669] hover:bg-green-700 text-white px-3 py-1.5 rounded-[4px] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                                    >
                                      <PrinterIcon className="h-3.5 w-3.5" />{" "}
                                      Print
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (det?.parentOrder)
                                          openEdit(det.parentOrder);
                                        else
                                          toast.error(
                                            "Could not find parent order to view",
                                          );
                                      }}
                                      className="bg-[#059669] hover:bg-green-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                    >
                                      <EyeIcon className="h-3 w-3" /> Full Order
                                    </button>

                                    {isSO && (
                                      <button
                                        onClick={() =>
                                          handlePurchaseItem(item.id)
                                        }
                                        className="bg-[#059669] hover:bg-green-700 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap"
                                      >
                                        <PlusCircleIcon className="h-3 w-3" />{" "}
                                        Purchase
                                      </button>
                                    )}

                                    {isPurchased && (
                                      <>
                                        <button className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap">
                                          <EyeIcon className="h-3 w-3" />{" "}
                                          P_Problem
                                        </button>
                                        <button className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-[9px] font-bold uppercase flex items-center gap-1 shadow-sm transition-all active:scale-95 whitespace-nowrap">
                                          <DocumentTextIcon className="h-3 w-3" />{" "}
                                          Ref No.
                                        </button>
                                      </>
                                    )}
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
                      render: (row) => (
                        <button
                          onClick={() => openEdit(row as any)}
                          className="px-6 py-1.5 bg-[#059669] text-white text-xs font-bold rounded-[4px] hover:bg-green-700 transition flex items-center gap-2 shadow-md mx-auto"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </button>
                      ),
                    },
                  ]}
                  loading={loadingSupplierOrders}
                  getRowClassName={(row) =>
                    expandedSupplierOrderId === row.id ? "bg-blue-50/30" : ""
                  }
                  emptyMessage="No Supplier Orders Found"
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
                        render: (row) => (
                          <div
                            className="truncate max-w-[200px]"
                            title={itemById.get(String(row.item_id))?.item_name}
                          >
                            {itemById.get(String(row.item_id))?.item_name ||
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
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={reprintSearch}
                        onChange={(e) => setReprintSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-64 shadow-sm text-xs"
                      />
                    </div>
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
                        render: (row) => (
                          <div
                            className="truncate max-w-[200px]"
                            title={itemById.get(String(row.item_id))?.item_name}
                          >
                            {itemById.get(String(row.item_id))?.item_name ||
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
                        render: (row) =>
                          row.price
                            ? `${row.currency || "CNY"} ${row.price}`
                            : row.rmb_special_price
                              ? `CNY ${row.rmb_special_price}`
                              : "-",
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
                {/* <div className="mb-4 bg-green-50 border border-green-200 rounded-[4px] p-3 flex items-center gap-3 shadow-sm">
                  <div className="bg-green-500 rounded-full p-1">
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-800">
                    QTY delivery set successfully!
                  </span>
                </div> */}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">
                      Label Management
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search items..."
                          value={reprintSearch}
                          onChange={(e) => setReprintSearch(e.target.value)}
                          className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#059669] w-64 shadow-sm text-xs text-gray-900"
                        />
                      </div>
                    </div>
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
                        render: (row) => (
                          <span className="font-medium text-gray-600">
                            {/* FIX: Use nested item object */}
                            {row.item?.ean || "-"}
                          </span>
                        ),
                        align: "center",
                      },
                      {
                        header: "Item Name",
                        render: (row) => (
                          <div
                            className="font-semibold text-gray-800 line-clamp-2"
                            /* FIX: Use nested item object */
                            title={row.item?.item_name || row.item?.name}
                          >
                            {row.item?.item_name || row.item?.name || "Unknown"}
                          </div>
                        ),
                      },
                      {
                        header: "Remark",
                        render: (row) => (
                          <div className="text-gray-500 italic text-xs">
                            {row.remarks_cn || row.remark_de || "//"}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm"
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
                      toast.error("Failed to reassign order to cargo");
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
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-[4px] hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                <table className="min-w-full bg-white border border-gray-200 rounded-[4px] shadow-md">
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
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all"
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
                <div className="mb-4 rounded-[4px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
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
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
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
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                            Price
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
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent"
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
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-[4px] focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:bg-gray-50"
                              />
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b whitespace-nowrap">
                              {row.currency || "CNY"} {row.price || 0}
                            </td>

                            <td className="px-4 py-2 text-sm text-gray-700 border-b text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveOrderItem(row.item_id)
                                }
                                disabled={lockAllExceptQty}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-[4px] hover:bg-red-500 disabled:opacity-50"
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
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-[4px] hover:bg-gray-50 transition-all"
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
                    className="px-6 py-2 text-sm bg-[#059669] text-white rounded-[4px] hover:bg-green-700 transition-all shadow-md font-bold disabled:opacity-50"
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
          title={`Reassign Item ${selectedItem.id}`}
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Cargo
              </label>
              <select
                value={targetCargoId}
                onChange={(e) => setTargetCargoId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]"
              >
                <option value="">-- Choose Cargo --</option>
                {cargos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cargo_no}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowREModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReassignItemAction}
                disabled={!targetCargoId}
                className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Reassign
              </button>
            </div>
          </div>
        </CustomModal>
      )}

      {showSPModal && selectedItem && (
        <CustomModal
          isOpen={showSPModal}
          onClose={() => setShowSPModal(false)}
          title={`Split Item ${selectedItem.id}`}
        >
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Current Qty: <span className="font-bold">{selectedItem.qty}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Split Quantity (amount to move to new row)
              </label>
              <input
                type="number"
                value={splitQty}
                onChange={(e) => setSplitQty(Number(e.target.value))}
                min={1}
                max={selectedItem.qty - 1}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
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
                disabled={splitQty <= 0 || splitQty >= selectedItem.qty}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                Split Now
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </>
  );
};

export default OrderPage;
