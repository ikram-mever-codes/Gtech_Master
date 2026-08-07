"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { XMarkIcon, CubeIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { getAllCustomers } from "@/api/customers";
import { getItems } from "@/api/items";
import { createAuftragFromItems } from "@/api/customer_orders";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2 } from "lucide-react";
import { getAllPaymentMethods } from "@/api/payment_methods";
import { getAllShippingMethods } from "@/api/shipping_methods";

const PAYMENT_METHODS = [
  "Prepayment (Vorkasse)",
  "Bank Transfer (Rechnung)",
  "PayPal",
  "Credit Card",
  "Cash on Delivery (Nachnahme)",
];

const SHIPPING_METHODS = [
  "Standard Shipping (DHL)",
  "Express Shipping (DHL Express)",
  "Freight / Freight Forwarder (Spedition)",
  "Customer Pickup (Selbstabholung)",
];

const ItemRow: React.FC<{
  item: any;
  selected: boolean;
  onClick: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}> = ({ item, selected, onClick, rowRef }) => {
  const thumb = item.photo || item.pix_path;
  const name = item.item_name_de || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  const model = item.model || "";

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
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
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-gray-700">{itemNo || "—"}</span>
        </div>
      </div>
    </div>
  );
};

interface AuftragCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: any;
  initialCustomerId?: string;
}

export default function AuftragCreateModal({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
  initialCustomerId,
}: AuftragCreateModalProps) {
  const selectedSectionRef = useRef<HTMLDivElement | null>(null);
  const qtyInputRef = useRef<HTMLInputElement | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const [dbPaymentMethods, setDbPaymentMethods] = useState<any[]>([]);
  const [dbShippingMethods, setDbShippingMethods] = useState<any[]>([]);

  const [filterCustomerId, setFilterCustomerId] = useState<string>("");
  const [searchEan, setSearchEan] = useState("");
  const [searchItemNo, setSearchItemNo] = useState("");
  const [searchName, setSearchName] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>(
    {},
  );

  const [title, setTitle] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [notes, setNotes] = useState("");

  const performSearch = async (
    fields: { ean: string; itemNo: string; name: string },
    companyId?: string,
  ) => {
    const { ean, itemNo, name } = fields;
    const hasAnyTerm = !!(ean.trim() || itemNo.trim() || name.trim());

    if (!hasAnyTerm) {
      await loadInitialItems(companyId);
      return;
    }

    setSearchLoading(true);
    setHasSearched(true);

    try {
      const params: any = {
        limit: 1000,
        isActive: "Y",
      };

      // Search parameters - try different possible parameter names
      if (ean.trim()) {
        params.eanSearch = ean.trim();
        // Also try alternative parameter names
        params.ean = ean.trim();
      }

      if (itemNo.trim()) {
        params.itemNoSearch = itemNo.trim();
        params.itemNo = itemNo.trim();
        params.de_no = itemNo.trim();
      }

      if (name.trim()) {
        // Try multiple possible parameter names for name search
        params.nameSearch = name.trim();
        params.name = name.trim();
        params.itemName = name.trim();
        params.item_name = name.trim();
        params.search = name.trim(); // Generic search fallback
      }

      console.log("Search params:", params); // Debug log to see what's being sent

      const response = await getItems(params, { refresh: true });
      const itemData = response?.data ?? response;
      setItems(Array.isArray(itemData) ? itemData : []);
    } catch (err) {
      console.error("Error searching items:", err);
      toast.error("Failed to search items", errorStyles);
      setItems([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadInitialItems = async (companyId?: string) => {
    setLoading(true);
    setHasSearched(false);
    try {
      const params: any = {
        limit: 1000,
        isActive: "Y",
      };

      if (companyId) {
        params.company = companyId;
      }

      const response = await getItems(params, { refresh: true });
      const itemData = response?.data ?? response;
      setItems(Array.isArray(itemData) ? itemData : []);
    } catch (err) {
      console.error("Error loading items:", err);
      toast.error("Failed to load items", errorStyles);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSearchChange = (
    field: "ean" | "itemNo" | "name",
    value: string,
  ) => {
    const next = {
      ean: field === "ean" ? value : searchEan,
      itemNo: field === "itemNo" ? value : searchItemNo,
      name: field === "name" ? value : searchName,
    };

    if (field === "ean") setSearchEan(value);
    if (field === "itemNo") setSearchItemNo(value);
    if (field === "name") setSearchName(value);

    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    const hasAnyTerm = !!(
      next.ean.trim() ||
      next.itemNo.trim() ||
      next.name.trim()
    );

    if (!hasAnyTerm) {
      loadInitialItems(filterCustomerId || undefined);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(next, filterCustomerId || undefined);
    }, 400);

    setSearchTimer(timer);
  };

  useEffect(() => {
    if (!isOpen) return;

    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [isOpen, searchTimer]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const itemKey = initialItem?.id ? String(initialItem.id) : "";
    setSelectedItems(initialItem ? [initialItem] : []);
    setItemQuantities(itemKey ? { [itemKey]: "" } : {});
    setFilterCustomerId(initialCustomerId ? String(initialCustomerId) : "");
    setSearchEan("");
    setSearchItemNo("");
    setSearchName("");
    setHasSearched(false);
    setTitle(initialItem ? initialItem.item_name_de || "" : "");
    setPaymentMethod("");
    setShippingMethod("");
    setNotes("");

    Promise.all([
      getAllCustomers({ limit: 1000 }).catch(() => ({ data: [] })),
      getAllPaymentMethods(true).catch(() => ({ data: [] })),
      getAllShippingMethods(true).catch(() => ({ data: [] })),
    ])
      .then(([custRes, pmRes, smRes]: any) => {
        const custData = custRes?.data?.businesses ?? custRes?.data ?? custRes;
        setCustomers(Array.isArray(custData) ? custData : []);
        if (pmRes?.data) setDbPaymentMethods(pmRes.data);
        if (smRes?.data) setDbShippingMethods(smRes.data);
      })
      .catch((err) =>
        console.error("Error loading customers/payment methods:", err),
      )
      .finally(() => {
        loadInitialItems(
          initialCustomerId ? String(initialCustomerId) : undefined,
        );
        if (initialItem) {
          setTimeout(() => {
            selectedSectionRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            qtyInputRef.current?.focus();
          }, 300);
        }
      });
  }, [isOpen]);

  const selectedCustomer = useMemo(() => {
    return customers.find(
      (c: any) => String(c.id) === String(filterCustomerId),
    );
  }, [customers, filterCustomerId]);

  useEffect(() => {
    if (!selectedCustomer) return;
    setPaymentMethod(selectedCustomer.defaultPaymentMethod || "");
    setShippingMethod(selectedCustomer.defaultShippingMethod || "");
  }, [selectedCustomer]);

  const toggleItem = (it: any) => {
    const key = String(it.id);
    setSelectedItems((prev) => {
      const exists = prev.some((p) => String(p.id) === key);
      const next = exists
        ? prev.filter((p) => String(p.id) !== key)
        : [...prev, it];

      if (!title.trim() && next.length > 0) {
        const first = next[0];
        setTitle(first.item_name_de || "");
      }
      return next;
    });

    setItemQuantities((prev) => {
      const exists = prev[key] !== undefined;
      if (exists) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: "" };
    });
  };

  const setItemQuantity = (itemId: string | number, qty: string) => {
    setItemQuantities((prev) => ({ ...prev, [String(itemId)]: qty }));
  };

  const canCreate = () => {
    return !!filterCustomerId && selectedItems.length > 0;
  };

  const handleCreate = async () => {
    if (!filterCustomerId) {
      toast.error("Select a recipient customer", errorStyles);
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Select at least 1 item", errorStyles);
      return;
    }

    try {
      setCreating(true);
      const formattedItems = selectedItems.map((it) => ({
        itemId: it.id,
        qty: Number(itemQuantities[String(it.id)]) || 1,
        price: Number(it.sales_price || it.price || 0),
        itemName: it.item_name_de || "Item",
      }));

      const payload = {
        customerId: filterCustomerId,
        selectedItems: formattedItems,
        title: title.trim() || undefined,
        paymentMethod: paymentMethod || undefined,
        shippingMethod: shippingMethod || undefined,
        notes: notes || undefined,
      };

      const res = await createAuftragFromItems(payload);
      if (res?.success) {
        toast.success(
          res.message || "Auftrag created successfully!",
          successStyles,
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create Auftrag", errorStyles);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = loading || searchLoading;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            Create new Auftrag
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div className="w-[30%]">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Recipient customer * (required)
              </label>
              <CustomerSearchInput
                value={filterCustomerId}
                onChange={(id: string) => {
                  setFilterCustomerId(id);
                  // Reload items when company changes
                  const hasAnySearch =
                    searchEan.trim() ||
                    searchItemNo.trim() ||
                    searchName.trim();
                  if (hasAnySearch) {
                    performSearch(
                      {
                        ean: searchEan,
                        itemNo: searchItemNo,
                        name: searchName,
                      },
                      id,
                    );
                  } else {
                    loadInitialItems(id || undefined);
                  }
                }}
                placeholder="Select a customer..."
                mode="customers"
                className="w-full"
              />
            </div>
            <div className="w-[70%] flex justify-between items-start gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  EAN
                </label>
                <input
                  value={searchEan}
                  onChange={(e) =>
                    handleFieldSearchChange("ean", e.target.value)
                  }
                  placeholder="Exact EAN..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Item No.
                </label>
                <input
                  value={searchItemNo}
                  onChange={(e) =>
                    handleFieldSearchChange("itemNo", e.target.value)
                  }
                  placeholder="Exact item no..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Item Name (EN/DE)
                </label>
                <input
                  value={searchName}
                  onChange={(e) =>
                    handleFieldSearchChange("name", e.target.value)
                  }
                  placeholder="Item name..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {selectedCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Customer address
                </p>
                <div className="text-xs text-gray-700 space-y-0.5">
                  <p className="font-semibold text-gray-900">
                    {selectedCustomer.companyName || selectedCustomer.legalName}
                  </p>
                  <p>
                    {selectedCustomer.addressLine1 ||
                      selectedCustomer.businessDetails?.address ||
                      "No address on file"}
                  </p>
                  <p>
                    {[
                      selectedCustomer.postalCode,
                      selectedCustomer.city,
                      selectedCustomer.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Delivery address
                </p>
                <div className="text-xs text-gray-700 space-y-0.5">
                  <p className="font-semibold text-gray-900">
                    {selectedCustomer.deliveryAddressLine1
                      ? selectedCustomer.companyName
                      : "Same as customer address"}
                  </p>
                  {selectedCustomer.deliveryAddressLine1 && (
                    <>
                      <p>{selectedCustomer.deliveryAddressLine1}</p>
                      <p>
                        {[
                          selectedCustomer.deliveryPostalCode,
                          selectedCustomer.deliveryCity,
                          selectedCustomer.deliveryCountry,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-56 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/50">
            {isLoading ? (
              <div className="text-center py-6 text-gray-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                {searchLoading ? "Searching items..." : "Loading items..."}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                {hasSearched ? (
                  <span>
                    No items match your search.
                    {(searchEan.length > 0 || searchItemNo.length > 0) &&
                      /^\d+$/.test(searchEan || searchItemNo) && (
                        <span className="block text-xs text-gray-400 mt-1">
                          Tip: Try searching by item number or name instead of
                          EAN.
                        </span>
                      )}
                  </span>
                ) : (
                  "No items found."
                )}
              </div>
            ) : (
              items.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  selected={selectedItems.some(
                    (p) => String(p.id) === String(it.id),
                  )}
                  onClick={() => toggleItem(it)}
                />
              ))
            )}
          </div>

          {selectedItems.length > 0 && (
            <div
              ref={selectedSectionRef}
              className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white scroll-mt-6"
            >
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Selected items ({selectedItems.length})
              </p>
              <div className="space-y-2">
                {selectedItems.map((it, idx) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <ItemRow
                        item={it}
                        selected
                        onClick={() => toggleItem(it)}
                      />
                    </div>
                    <div className="w-24 shrink-0">
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Qty
                      </label>
                      <input
                        ref={idx === 0 ? qtyInputRef : undefined}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent font-bold bg-amber-50/40"
                        value={itemQuantities[String(it.id)] ?? ""}
                        onChange={(e) => setItemQuantity(it.id, e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleItem(it)}
                      className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 shrink-0 transition"
                      title="Remove item"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auftrag title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
              placeholder="Defaults to the first item's name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            >
              <option value="">Select…</option>
              {paymentMethod &&
                !(
                  dbPaymentMethods.length > 0
                    ? dbPaymentMethods.map((pm: any) => pm.name)
                    : PAYMENT_METHODS
                ).includes(paymentMethod) && (
                  <option value={paymentMethod}>{paymentMethod}</option>
                )}
              {(dbPaymentMethods.length > 0
                ? dbPaymentMethods.map((pm: any) => pm.name)
                : PAYMENT_METHODS
              ).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shipping method
            </label>
            <select
              value={shippingMethod}
              onChange={(e) => setShippingMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            >
              <option value="">Select…</option>
              {shippingMethod &&
                !(
                  dbShippingMethods.length > 0
                    ? dbShippingMethods.map((sm: any) => sm.name)
                    : SHIPPING_METHODS
                ).includes(shippingMethod) && (
                  <option value={shippingMethod}>{shippingMethod}</option>
                )}
              {(dbShippingMethods.length > 0
                ? dbShippingMethods.map((sm: any) => sm.name)
                : SHIPPING_METHODS
              ).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate() || creating}
            className="px-4 py-2 text-sm font-bold bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] disabled:opacity-50 transition flex items-center gap-1.5 shadow-md"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create Auftrag"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
