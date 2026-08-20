"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  LinkIcon,
  UserIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import ViewEditToggle from "@/components/UI/ViewEditToggle";
import SystemColourSelect from "@/components/UI/SystemColourSelect";
import {
  getTransferOrderById,
  updateTransferOrder,
  deleteTransferOrder,
  createTransferOrderLineItem,
  updateTransferOrderLineItem,
  deleteTransferOrderLineItem,
  createTransferOrder,
} from "@/api/transfer_orders";
import { getItems } from "@/api/items";
import { getAllCustomers } from "@/api/customers";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { UserRole } from "@/utils/interfaces";
import { errorStyles, successStyles } from "@/utils/constants";
import { parseFlexibleNumber } from "@/utils/decimal";
import { formatDate } from "@/utils/offers";
import { formatCurrency } from "@/api/customer_orders";

interface BestellungPreviewModalProps {
  isOpen: boolean;
  orderId?: string | number | null;
  onClose: () => void;
  onChanged?: () => void;
  onCreated?: (id: string | number) => void;
  userRole?: UserRole;
  initialEdit?: boolean;
  isCreate?: boolean;
}
const inputCls =
  "w-full px-2.5 py-1.5 text-sm border border-gray-300/80 bg-white/70 rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all disabled:bg-gray-50 disabled:text-gray-700 disabled:cursor-default";

const ORDER_STATUSES = [
  "draft",
  "to be processed",
  "partially delivered",
  "delivered",
];

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;

const toDateInputValue = (value: any): string => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const currencySymbol = (currency?: string | null): string =>
  currency === "USD"
    ? "$"
    : currency === "RMB"
      ? "¥"
      : currency === "EUR"
        ? "€"
        : "";

const formatPrice = (
  price: number | null | undefined,
  currency?: string | null,
): string => {
  if (price === null || price === undefined) return "—";
  const symbol = currencySymbol(currency);
  return `${symbol}${Number(price).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const Field: React.FC<{
  label: string;
  edit: boolean;
  value: any;
  children?: React.ReactNode;
}> = ({ label, edit, value, children }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">
      {edit ? children : value || "—"}
    </div>
  </div>
);

const DecimalInput: React.FC<{
  value: string | number | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
}> = ({ value, onCommit, className }) => {
  const [local, setLocal] = useState(
    value === null || value === undefined ? "" : String(value),
  );
  useEffect(() => {
    setLocal(value === null || value === undefined ? "" : String(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      className={className || inputCls}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

const TextCellInput: React.FC<{
  value: string | null | undefined;
  onCommit: (raw: string) => void;
  className?: string;
  placeholder?: string;
}> = ({ value, onCommit, className, placeholder }) => {
  const [local, setLocal] = useState(value || "");
  useEffect(() => {
    setLocal(value || "");
  }, [value]);
  return (
    <input
      type="text"
      className={
        className ||
        "w-full px-1.5 py-1 text-sm border border-gray-300 rounded bg-white"
      }
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

const ItemRow: React.FC<{ item: any; onClick: () => void }> = ({
  item,
  onClick,
}) => {
  const name = item.item_name || item.itemName || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all border-gray-200 hover:bg-gray-50"
    >
      <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
        {item.photo ? (
          <img
            src={item.photo}
            alt="thumb"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5">{itemNo || "—"}</div>
      </div>
    </div>
  );
};

const getLineItemTotal = (item: any): number => {
  const qty = parseFlexibleNumber(item?.qty) ?? 1;
  const price =
    parseFlexibleNumber(item?.purchasePrice ?? item?.transferPrice ?? 0) ?? 0;
  return qty * price;
};

export const BestellungPreviewModal: React.FC<BestellungPreviewModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onChanged,
  onCreated,
  userRole,
  initialEdit = false,
  isCreate = false,
}) => {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [newLine, setNewLine] = useState({ itemName: "", qty: 0 });
  const [customers, setCustomers] = useState<any[]>([]);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [orderItemSupplierById, setOrderItemSupplierById] = useState<
    Record<string, number | undefined>
  >({});
  // For create mode
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");

  const isFromAuftrag =
    order?.auftrag_id !== null && order?.auftrag_id !== undefined;

  const lockedSupplierId = useMemo(() => {
    if (form.supplierId) return Number(form.supplierId);
    const catalogLineItems = (order?.orderItems || []).filter(
      (li: any) => li.sourceItemId,
    );
    for (const li of catalogLineItems) {
      const sId = orderItemSupplierById[String(li.sourceItemId)];
      if (sId) return sId;
    }
    return null;
  }, [form.supplierId, order?.orderItems, orderItemSupplierById]);

  const pickerItems = useMemo(() => {
    if (!lockedSupplierId) return items;
    return items.filter(
      (it) => Number(it.supplier_id) === Number(lockedSupplierId),
    );
  }, [items, lockedSupplierId]);

  const fetchOrder = useCallback(async () => {
    console.log("fetchOrder called", { orderId, isCreate });
    if (!orderId || isCreate) {
      console.log("fetchOrder skipped - no orderId or isCreate");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log("Fetching order with ID:", orderId);
      const res = await getTransferOrderById(orderId);
      console.log("Fetch response:", res);
      if (res.success) {
        setOrder(res.data);
        setForm(buildForm(res.data));
      }
    } catch (e) {
      console.error("Failed to load Bestellung:", e);
    } finally {
      setLoading(false);
    }
  }, [orderId, isCreate]);

  useEffect(() => {
    console.log("BestellungPreviewModal mounted", {
      isOpen,
      orderId,
      isCreate,
    });
    if (!isOpen) return;
    if (isCreate) {
      console.log("Create mode - setting up form");
      // ... rest of create mode setup
    } else {
      console.log("View/Edit mode - fetching order", orderId);
      setEdit(initialEdit);
      setShowItemPicker(false);
      setItemPickerSearch("");
      fetchOrder();
    }
  }, [isOpen, orderId, fetchOrder, initialEdit, isCreate]);

  useEffect(() => {
    if (!isOpen || isCreate || !order?.orderItems?.length) return;
    (async () => {
      setLoadingSuppliers(true);
      try {
        const sourceItemIds = order.orderItems
          .filter((li: any) => li.sourceItemId)
          .map((li: any) => Number(li.sourceItemId))
          .filter((id: number) => !isNaN(id));

        if (sourceItemIds.length === 0) {
          setSuppliers([]);
          setOrderItemSupplierById({});
          setLoadingSuppliers(false);
          return;
        }

        const { getItems } = await import("@/api/items");
        const itemsRes: any = await getItems({
          ids: sourceItemIds.join(","),
          limit: 1000,
        });

        const itemsData = Array.isArray(itemsRes?.data) ? itemsRes.data : [];

        const supplierByItemId: Record<string, number | undefined> = {};
        itemsData.forEach((item: any) => {
          supplierByItemId[String(item.id)] = item.supplier_id
            ? Number(item.supplier_id)
            : undefined;
        });
        setOrderItemSupplierById(supplierByItemId);

        const supplierIds = new Set<number>();
        itemsData.forEach((item: any) => {
          if (item.supplier_id) {
            supplierIds.add(Number(item.supplier_id));
          }
          if (item.supplierItems) {
            item.supplierItems.forEach((si: any) => {
              if (si.supplierId) {
                supplierIds.add(Number(si.supplierId));
              }
            });
          }
        });

        if (supplierIds.size > 0) {
          const { getAllSuppliers } = await import("@/api/suppliers");
          const suppliersRes: any = await getAllSuppliers({
            ids: Array.from(supplierIds).join(","),
            limit: 1000,
          });
          setSuppliers(
            Array.isArray(suppliersRes?.data) ? suppliersRes.data : [],
          );
        } else {
          setSuppliers([]);
        }
      } catch (e) {
        console.error("Failed to load suppliers:", e);
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    })();
  }, [isOpen, isCreate, order?.orderItems]);
  // Load customers for create mode
  useEffect(() => {
    if (!isOpen || !isCreate) return;
    (async () => {
      try {
        const res: any = await getAllCustomers({ limit: 1000 });
        setCustomers(res?.data?.customers || res?.data || []);
      } catch (e) {
        console.error("Failed to load customers:", e);
      }
    })();
  }, [isOpen, isCreate]);

  // Load suppliers - only those associated with items in this order
  useEffect(() => {
    if (!isOpen || isCreate || !order?.orderItems?.length) return;
    (async () => {
      setLoadingSuppliers(true);
      try {
        const sourceItemIds = order.orderItems
          .filter((li: any) => li.sourceItemId)
          .map((li: any) => Number(li.sourceItemId))
          .filter((id: number) => !isNaN(id));

        if (sourceItemIds.length === 0) {
          setSuppliers([]);
          setLoadingSuppliers(false);
          return;
        }

        const { getItems } = await import("@/api/items");
        const itemsRes: any = await getItems({
          ids: sourceItemIds.join(","),
          limit: 1000,
        });

        const itemsData = Array.isArray(itemsRes?.data) ? itemsRes.data : [];

        const supplierIds = new Set<number>();
        itemsData.forEach((item: any) => {
          if (item.supplier_id) {
            supplierIds.add(Number(item.supplier_id));
          }
          if (item.supplierItems) {
            item.supplierItems.forEach((si: any) => {
              if (si.supplierId) {
                supplierIds.add(Number(si.supplierId));
              }
            });
          }
        });

        if (supplierIds.size > 0) {
          const { getAllSuppliers } = await import("@/api/suppliers");
          const suppliersRes: any = await getAllSuppliers({
            ids: Array.from(supplierIds).join(","),
            limit: 1000,
          });
          setSuppliers(
            Array.isArray(suppliersRes?.data) ? suppliersRes.data : [],
          );
        } else {
          setSuppliers([]);
        }
      } catch (e) {
        console.error("Failed to load suppliers:", e);
        setSuppliers([]);
      } finally {
        setLoadingSuppliers(false);
      }
    })();
  }, [isOpen, isCreate, order?.orderItems]);

  useEffect(() => {
    if (!showItemPicker || items.length > 0) return;
    (async () => {
      try {
        const res: any = await getItems({ limit: 1000 });
        setItems(Array.isArray(res?.data) ? res.data : res?.data?.items || []);
      } catch (e) {
        console.error("Error loading items:", e);
      }
    })();
  }, [showItemPicker, items.length]);

  if (!isOpen) return null;

  function buildForm(o: any) {
    return {
      title: o.title || "",
      status: o.status || "draft",
      currency: o.currency || "EUR",
      notes: o.notes || "",
      highlightColor: o.highlight_color || "",
      receiver: o.receiver || "Gtech Hong Kong",
      supplierId: o.supplier_id ?? null,
      dateDelivery: o.date_delivery || "",
      customerId: o.customer_id || "",
      zweck: o.zweck || "direkt",
    };
  }

  const patch = (p: any) => setForm((f: any) => ({ ...f, ...p }));

  const refreshLocal = async () => {
    if (!order || isCreate) return;
    const updated = await getTransferOrderById(order.id);
    if (updated.success) setOrder(updated.data);
  };

  const setHighlightColor = async (color: string) => {
    patch({ highlightColor: color });
    if (!order || isCreate) return;
    try {
      await updateTransferOrder(order.id, { highlightColor: color });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't update highlight color:", e);
    }
  };

  const handleStartEdit = () => setEdit(true);
  const handleCancelEdit = () => {
    if (isCreate) {
      onClose();
      return;
    }
    setForm(buildForm(order));
    setEdit(false);
    setShowItemPicker(false);
  };

  const handleSave = async () => {
    if (form.receiver === "Supplier" && !form.supplierId) {
      toast.error("Select a supplier for this Bestellung.", errorStyles);
      return;
    }

    setSaving(true);
    try {
      let res;
      if (isCreate) {
        // Create new Bestellung
        res = await createTransferOrder({
          title: form.title,
          status: form.status,
          currency: form.currency,
          notes: form.notes,
          highlightColor: form.highlightColor ?? "",
          dateDelivery: form.dateDelivery,
          receiver: form.receiver,
          supplierId: form.receiver === "Supplier" ? form.supplierId : null,
          customerId: selectedCustomerId,
          zweck: form.zweck || "direkt",
          // Line items will be added separately
        });
      } else {
        // Update existing
        res = await updateTransferOrder(order.id, {
          title: form.title,
          status: form.status,
          currency: form.currency,
          notes: form.notes,
          highlightColor: form.highlightColor ?? "",
          dateDelivery: form.dateDelivery,
          receiver: form.receiver,
          supplierId: form.receiver === "Supplier" ? form.supplierId : null,
          zweck: form.zweck || "direkt",
        });
      }

      if (res.success) {
        toast.success(
          isCreate
            ? "Bestellung created successfully."
            : "Bestellung updated successfully.",
          successStyles,
        );
        if (isCreate) {
          const newOrder = res.data;
          onChanged?.();
          if (newOrder?.id) {
            onCreated?.(newOrder.id);
          } else {
            onClose();
          }
        } else {
          await refreshLocal();
          setEdit(false);
          onChanged?.();
        }
      } else {
        toast.error(
          res.message ||
          `Failed to ${isCreate ? "create" : "update"} Bestellung.`,
          errorStyles,
        );
      }
    } catch (e: any) {
      toast.error(
        e.message ||
        `An error occurred while ${isCreate ? "creating" : "saving"}.`,
        errorStyles,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm("Delete this Bestellung? This can't be undone."))
      return;
    try {
      await deleteTransferOrder(order.id);
      onClose();
      onChanged?.();
    } catch (e) {
      console.error("Error deleting Bestellung:", e);
    }
  };

  const persistLine = async (lineItemId: string, payload: any) => {
    if (!order || isCreate) return;
    try {
      const res: any = await updateTransferOrderLineItem(
        order.id,
        lineItemId,
        payload,
      );
      const updatedItem = res?.data ?? res;
      if (updatedItem?.id) {
        setOrder((prev: any) => ({
          ...prev,
          orderItems: prev.orderItems.map((li: any) =>
            li.id === lineItemId ? updatedItem : li,
          ),
        }));
        await refreshLocal();
      }
    } catch (e) {
      console.error("Couldn't save line item change:", e);
      toast.error("Couldn't save that change.", errorStyles);
    }
  };

  const addLineItem = async () => {
    if (!newLine.itemName.trim()) {
      toast.error("Enter a name for the Freizeile first.", errorStyles);
      return;
    }
    if (!order && !isCreate) return;
    try {
      const orderIdToUse = order?.id;
      if (!orderIdToUse) {
        toast.error(
          "Please save the Bestellung first before adding items.",
          errorStyles,
        );
        return;
      }
      await createTransferOrderLineItem(orderIdToUse, {
        itemName: newLine.itemName.trim(),
        qty: Number(newLine.qty) || 0,
      });
      setNewLine({ itemName: "", qty: 0 });
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the Freizeile:", e);
    }
  };
  const addExistingItem = async (it: any) => {
    if (!order && !isCreate) return;
    try {
      const orderIdToUse = order?.id;
      if (!orderIdToUse) {
        toast.error(
          "Please save the Bestellung first before adding items.",
          errorStyles,
        );
        return;
      }

      const itemSupplierId = it.supplier_id
        ? Number(it.supplier_id)
        : undefined;

      if (
        lockedSupplierId &&
        itemSupplierId !== undefined &&
        itemSupplierId !== lockedSupplierId
      ) {
        toast.error(
          "This item belongs to a different supplier. Remove the existing items first if you want to switch suppliers.",
          errorStyles,
        );
        return;
      }

      await createTransferOrderLineItem(orderIdToUse, {
        itemName: it.item_name || it.itemName || "Item",
        material: it.model || "",
        itemNo: it.de_no,
        weight: it.weight,
        sourceItemId: String(it.id),
      });

      // Do NOT auto-change receiver/supplier here — that's a user-driven
      // decision made via the Receiver/Supplier dropdowns. The item's
      // supplier is still enforced for the picker via lockedSupplierId,
      // which is derived from orderItemSupplierById once refreshLocal()
      // reloads the order below — no server-side receiver update needed.

      setShowItemPicker(false);
      setItemPickerSearch("");
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't add the item:", e);
    }
  };
  const removeLineItem = async (lineItemId: string) => {
    if (!order || isCreate) return;
    if (!window.confirm("Remove this line item?")) return;
    try {
      await deleteTransferOrderLineItem(order.id, lineItemId);
      await refreshLocal();
      onChanged?.();
    } catch (e) {
      console.error("Couldn't remove the item:", e);
    }
  };

  // Calculate totals from line items
  const calculateTotals = useCallback(() => {
    const items = order?.orderItems || [];
    let total = 0;
    let firstCurrency = "EUR";
    let allSameCurrency = true;

    items.forEach((item: any) => {
      const lineTotal = getLineItemTotal(item);
      total += lineTotal;

      const itemCurrency =
        order?.receiver === "Supplier" ? item.purchaseCurrency || "EUR" : "EUR";

      if (firstCurrency === "EUR") {
        firstCurrency = itemCurrency;
      } else if (firstCurrency !== itemCurrency) {
        allSameCurrency = false;
      }
    });

    const displayCurrency = allSameCurrency ? firstCurrency : "EUR";
    return { total, displayCurrency };
  }, [order?.orderItems, order?.receiver]);

  const { total: displayTotal, displayCurrency } = calculateTotals();

  const visibleLineItems = order?.orderItems
    ? [...order.orderItems].sort(
      (a: any, b: any) => (a.position || 0) - (b.position || 0),
    )
    : [];

  // Loading state for existing order
  // Loading state - only show when NOT in create mode AND (loading OR no order)
  if (!isCreate) {
    if (loading || !order) {
      return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 rounded-2xl shadow-xl max-w-5xl w-full p-6 py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary" />
            <p className="mt-2 text-sm text-gray-500">Loading Bestellung…</p>
          </div>
        </div>
      );
    }
  }
  // Check if customer field should be editable
  const isCustomerEditable = isCreate || !isFromAuftrag;

  // For create mode, we need a placeholder order object
  const displayOrder = order || {
    order_no: "New Bestellung",
    title: form.title || "New Bestellung",
    status: form.status || "draft",
    receiver: form.receiver || "Gtech Hong Kong",
    supplier: null,
    highlight_color: form.highlightColor || "",
    date_delivery: form.dateDelivery || "",
    notes: form.notes || "",
    net_weight: 0,
    extra_weight: 0,
    total_weight: 0,
    customer_id: selectedCustomerId,
    orderItems: [],
    zweck: form.zweck || "direkt",
  };

  const title = isCreate
    ? "Create Bestellung"
    : `Bestellung ${displayOrder.order_no}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-lg font-bold text-gray-900 truncate">
                {title}
              </p>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${(form.zweck || displayOrder.zweck) === "direkt"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : (form.zweck || displayOrder.zweck) === "periodisch"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : (form.zweck || displayOrder.zweck) === "ReserveEU"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : (form.zweck || displayOrder.zweck) === "ReserveCN"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
              >
                {form.zweck || displayOrder.zweck || "direkt"}
              </span>
              {isCreate && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                  New
                </span>
              )}
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5 flex items-center gap-1">
              <span>{displayOrder.title}</span>
              {displayOrder.title && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(displayOrder.title);
                    toast.success("Title copied to clipboard!");
                  }}
                  className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                  title="Copy Title"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {!isCreate && (
              <SystemColourSelect
                value={form.highlightColor ?? displayOrder.highlight_color}
                onChange={setHighlightColor}
                edit={edit}
              />
            )}
            {!isCreate && (
              <ViewEditToggle
                isEditEnabled={edit}
                onToggle={() => (edit ? handleCancelEdit() : handleStartEdit())}
                disabled={saving}
              />
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {(isCreate || isCustomerEditable) && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Customer
                </p>
                {isCreate || isCustomerEditable ? (
                  <CustomerSearchInput
                    value={selectedCustomerId || displayOrder.customer_id || ""}
                    initialLabel={(() => {
                      const cust = customers.find(
                        (c) =>
                          String(c.id) ===
                          String(
                            selectedCustomerId || displayOrder.customer_id,
                          ),
                      );
                      return cust?.companyName || cust?.name || "";
                    })()}
                    disabled={!edit && !isCreate}
                    onChange={(id) => {
                      setSelectedCustomerId(id);
                      if (isCreate) {
                        patch({ customerId: id });
                      }
                    }}
                    placeholder="Search customer..."
                    className="w-full"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {(() => {
                      const cust = customers.find(
                        (c) =>
                          String(c.id) === String(displayOrder.customer_id),
                      );
                      return cust?.companyName || cust?.name || "—";
                    })()}
                  </div>
                )}
              </div>
            )}
            <Field
              label="Receiver"
              edit={edit || isCreate}
              value={
                displayOrder.receiver === "Supplier"
                  ? `Supplier — ${displayOrder.supplier?.company_name || displayOrder.supplier?.name || "—"}`
                  : displayOrder.receiver
              }
            >
              <select
                className={inputCls}
                value={form.receiver}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val !== "Supplier" && lockedSupplierId) {
                    toast.error(
                      "This Bestellung already contains items tied to a supplier. Remove them first before changing the receiver.",
                      errorStyles,
                    );
                    return;
                  }
                  patch({
                    receiver: val,
                    supplierId: val === "Supplier" ? form.supplierId : null,
                  });
                }}
              >
                <option value="Gtech Hong Kong">Gtech Hong Kong</option>
                <option value="Supplier">Supplier</option>
              </select>
            </Field>
            <Field
              label="Title"
              edit={edit || isCreate}
              value={displayOrder.title}
            >
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>
            <Field
              label="Delivery Date"
              edit={edit || isCreate}
              value={
                displayOrder.date_delivery
                  ? formatDate(displayOrder.date_delivery)
                  : ""
              }
            >
              <input
                type="date"
                className={inputCls}
                value={toDateInputValue(form.dateDelivery)}
                onChange={(e) => patch({ dateDelivery: e.target.value })}
              />
            </Field>
            <Field
              label="Zweck"
              edit={edit || isCreate}
              value={displayOrder.zweck || form.zweck || "direkt"}
            >
              <select
                className={inputCls}
                value={form.zweck || "direkt"}
                onChange={(e) => patch({ zweck: e.target.value })}
              >
                <option value="direkt">direkt</option>
                <option value="periodisch">periodisch</option>
                <option value="ReserveEU">ReserveEU</option>
                <option value="ReserveCN">ReserveCN</option>
              </select>
            </Field>
            {!isCreate && !isCustomerEditable && displayOrder.customer_id && (
              <Field
                label="Customer"
                edit={false}
                value={displayOrder.customer?.companyName || "—"}
              />
            )}

            {form.receiver === "Supplier" && (
              <Field
                label="Supplier"
                edit={edit || isCreate}
                value={
                  displayOrder.supplier?.company_name ||
                  displayOrder.supplier?.name
                }
              >
                <select
                  className={inputCls}
                  value={form.supplierId ?? ""}
                  onChange={(e) => {
                    const newSupplierId = e.target.value
                      ? Number(e.target.value)
                      : null;
                    const catalogLineItems = (order?.orderItems || []).filter(
                      (li: any) => li.sourceItemId,
                    );
                    const hasConflictingItems = catalogLineItems.some(
                      (li: any) => {
                        const sId =
                          orderItemSupplierById[String(li.sourceItemId)];
                        return sId !== undefined && sId !== newSupplierId;
                      },
                    );
                    if (hasConflictingItems) {
                      toast.error(
                        "This Bestellung already contains items from another supplier. Remove them first before changing the supplier.",
                        errorStyles,
                      );
                      return;
                    }
                    patch({ supplierId: newSupplierId });
                  }}
                  disabled={loadingSuppliers}
                >
                  <option value="">
                    {loadingSuppliers
                      ? "Loading suppliers..."
                      : "Select supplier..."}
                  </option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.company_name || s.name || `Supplier #${s.id}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
                      Pos
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">
                      Pic
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
                      Art.-Nr.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600">
                      Bezeichnung
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">
                      Hinweis
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-40">
                      Remark
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-20">
                      Menge
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Price
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Netto gesamt
                    </th>
                    {(edit || isCreate) && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {visibleLineItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={edit || isCreate ? 11 : 10}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        {isCreate
                          ? "Save the Bestellung first, then add items."
                          : "No line items yet."}
                      </td>
                    </tr>
                  )}
                  {visibleLineItems.map((item: any) => {
                    const isFreetext = !item.sourceItemId;
                    const total = getLineItemTotal(item);
                    const qtyDisplay = Math.round(
                      parseFlexibleNumber(item.qty) ?? 1,
                    );
                    const lineCurrency =
                      displayOrder.receiver === "Supplier"
                        ? item.purchaseCurrency || "EUR"
                        : "EUR";
                    return (
                      <tr key={item.id}>
                        <td className="px-2 py-2 text-gray-500">
                          {item.position}
                        </td>
                        <td className="px-2 py-2">
                          <div className="w-9 h-9 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="thumb"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-300 text-[10px]">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {edit || isCreate ? (
                            <TextCellInput
                              value={item.itemNo || item.material}
                              placeholder="Art.-Nr."
                              onCommit={(raw) =>
                                persistLine(item.id, { itemNo: raw })
                              }
                            />
                          ) : (
                            <span>{item.itemNo || item.material || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {edit || isCreate ? (
                            <TextCellInput
                              value={item.itemName}
                              onCommit={(raw) =>
                                persistLine(item.id, {
                                  itemName: raw || item.itemName,
                                })
                              }
                            />
                          ) : (
                            <span>{item.itemName || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {edit || isCreate ? (
                            <TextCellInput
                              value={item.notes}
                              placeholder="Hinweis"
                              onCommit={(raw) =>
                                persistLine(item.id, { notes: raw })
                              }
                            />
                          ) : (
                            <span className="text-gray-600">
                              {item.notes || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {edit || isCreate ? (
                            <TextCellInput
                              value={item.remark_order_item}
                              placeholder="Remark Order Item"
                              onCommit={(raw) =>
                                persistLine(item.id, { remark_order_item: raw })
                              }
                            />
                          ) : (
                            <span className="text-gray-600">
                              {item.remark_order_item || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {edit || isCreate ? (
                            <DecimalInput
                              className="w-full px-1.5 py-1 text-sm border border-gray-300 rounded text-right"
                              value={item.qty}
                              onCommit={(raw) =>
                                persistLine(item.id, {
                                  qty: raw.trim() || "1",
                                })
                              }
                            />
                          ) : (
                            <div className="text-right">{qtyDisplay}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-600">
                          {item.sourceItemId
                            ? formatPrice(
                                item.purchasePrice ?? item.transferPrice,
                                lineCurrency,
                              )
                            : "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {formatPrice(total, lineCurrency)}
                        </td>
                        {(edit || isCreate) && (
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => removeLineItem(item.id)}
                              className="text-rose-500 hover:text-rose-700"
                              title="Remove line"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {(edit || isCreate) && !isCreate && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowItemPicker((s) => !s)}
                    className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add existing item
                  </button>
                  {/* <div className="flex-1 min-w-[200px]">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <input
                          className={inputCls}
                          value={newLine.itemName}
                          placeholder="Freizeile — text"
                          onChange={(e) =>
                            setNewLine((n) => ({
                              ...n,
                              itemName: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <button
                        onClick={addLineItem}
                        className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Freizeile
                      </button>
                    </div>
                  </div> */}
                </div>

                {showItemPicker && (
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 space-y-2">
                    {lockedSupplierId && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                        Showing items from the locked supplier only.
                      </p>
                    )}
                    <input
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                      placeholder="Search items…"
                      value={itemPickerSearch}
                      onChange={(e) => setItemPickerSearch(e.target.value)}
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {pickerItems.filter((it) => {
                        if (!itemPickerSearch) return true;
                        const q = itemPickerSearch.toLowerCase();
                        const name = it.item_name || it.itemName || "";
                        return (
                          name.toLowerCase().includes(q) ||
                          String(it.ean || "").includes(itemPickerSearch)
                        );
                      }).length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-3">
                          No items match.
                        </div>
                      ) : (
                        pickerItems
                          .filter((it) => {
                            if (!itemPickerSearch) return true;
                            const q = itemPickerSearch.toLowerCase();
                            const name = it.item_name || it.itemName || "";
                            return (
                              name.toLowerCase().includes(q) ||
                              String(it.ean || "").includes(itemPickerSearch)
                            );
                          })
                          .map((it) => (
                            <ItemRow
                              key={it.id}
                              item={it}
                              onClick={() => addExistingItem(it)}
                            />
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isCreate && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p>💡 Save the Bestellung first to start adding line items.</p>
              </div>
            )}
          </div>

          {/* Weights & Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Net weight (items)"
                edit={false}
                value={formatWeight(displayOrder.net_weight || 0)}
              />
              <Field
                label="Extra weight"
                edit={edit || isCreate}
                value={formatWeight(displayOrder.extra_weight || 0)}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  className={inputCls}
                  defaultValue={
                    visibleLineItems[0]?.extraWeight === null ||
                      visibleLineItems[0]?.extraWeight === undefined
                      ? ""
                      : (
                        parseFlexibleNumber(
                          visibleLineItems[0].extraWeight,
                        ) ?? 0
                      ).toFixed(1)
                  }
                  placeholder="0"
                  disabled={visibleLineItems.length === 0 || isCreate}
                  onBlur={(e) => {
                    if (!visibleLineItems[0] || isCreate) return;
                    persistLine(visibleLineItems[0].id, {
                      extraWeight:
                        e.target.value.trim() === "" ? "0" : e.target.value,
                    });
                  }}
                />
              </Field>
              <Field
                label="Total weight"
                edit={false}
                value={formatWeight(displayOrder.total_weight || 0)}
              />
            </div>
            <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(displayTotal, displayCurrency)}</span>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-white rounded-lg p-4 px-2 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <LinkIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900">
                  Linked documents
                </h3>
              </div>
              <p className="text-sm text-gray-500">No linked documents yet.</p>
            </div>

            <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <PencilIcon className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  Comment
                  {(displayOrder.notes || form.notes) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(displayOrder.notes || form.notes || "");
                        toast.success("Comment copied to clipboard!");
                      }}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                      title="Copy Comment"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  )}
                </h3>
              </div>
              {edit || isCreate ? (
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.notes}
                  placeholder="Notes for this Bestellung."
                  onChange={(e) => patch({ notes: e.target.value })}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {displayOrder.notes || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            {!isCreate && edit && userRole === UserRole.ADMIN && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm text-red-700 bg-white border border-red-300/80 rounded-lg hover:bg-red-50 flex items-center gap-1 font-semibold"
              >
                <TrashIcon className="h-4 w-4" />
                Delete Bestellung
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={edit || isCreate ? handleCancelEdit : onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {edit || isCreate ? "Cancel" : "Close"}
            </button>
            {(edit || isCreate) && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50"
              >
                {saving
                  ? isCreate
                    ? "Creating…"
                    : "Saving…"
                  : isCreate
                    ? "Create Bestellung"
                    : "Save changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestellungPreviewModal;
