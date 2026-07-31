"use client";

import React, { useState, useEffect, useMemo } from "react";
import { XMarkIcon, CubeIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { getAllCustomers } from "@/api/customers";
import { getItems } from "@/api/items";
import { createAuftragFromItems } from "@/api/customer_orders";
import { CustomerSearchInput } from "@/components/UI/CustomerSearchInput";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2 } from "lucide-react";

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
}> = ({ item, selected, onClick }) => {
  const thumb = item.photo || item.pix_path;
  const name = item.item_name || item.itemName || "Unnamed item";
  const itemNo = item.de_no || item.ItemID_DE || item.itemNo || "";
  const model = item.model || "";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${selected
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
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-gray-700">{itemNo || "—"}</span>
          {model && (
            <>
              <span>-</span>
              <span className="text-blue-600 font-medium truncate max-w-[10rem]">
                {model}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface AuftragCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuftragCreateModal({
  isOpen,
  onClose,
  onSuccess,
}: AuftragCreateModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const [filterCustomerId, setFilterCustomerId] = useState<string>("");
  const [sourceSearch, setSourceSearch] = useState("");

  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedItems([]);
    setItemQuantities({});
    setFilterCustomerId("");
    setSourceSearch("");
    setTitle("");
    setPaymentMethod("");
    setShippingMethod("");
    setNotes("");

    Promise.all([
      getAllCustomers({ limit: 1000 }).catch(() => ({ data: [] })),
      getItems({ limit: 1000 }).catch(() => ({ data: [] })),
    ])
      .then(([custRes, itemRes]: any) => {
        const custData = custRes?.data?.businesses ?? custRes?.data ?? custRes;
        const itemData = itemRes?.data ?? itemRes;
        setCustomers(Array.isArray(custData) ? custData : []);
        setItems(Array.isArray(itemData) ? itemData : []);
      })
      .catch((err) => console.error("Error loading customers/items:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const selectedCustomer = useMemo(() => {
    return customers.find((c: any) => String(c.id) === String(filterCustomerId));
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
        setTitle(first.item_name || first.itemName || "");
      }
      return next;
    });

    setItemQuantities((prev) => {
      const exists = prev[key] !== undefined;
      if (exists) {
        const { [key]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: "1" };
    });
  };

  const setItemQuantity = (itemId: string | number, qty: string) => {
    setItemQuantities((prev) => ({ ...prev, [String(itemId)]: qty }));
  };

  const visibleItems = useMemo(() => {
    return items.filter((it) => {
      if (!sourceSearch.trim()) return true;
      const q = sourceSearch.toLowerCase().trim();
      const name = String(it.item_name || it.itemName || "").toLowerCase();
      const ean = String(it.ean || "");
      const model = String(it.model || "").toLowerCase();
      const deNo = String(it.de_no || it.ItemID_DE || "").toLowerCase();
      return (
        name.includes(q) ||
        ean.includes(q) ||
        model.includes(q) ||
        deNo.includes(q)
      );
    });
  }, [items, sourceSearch]);

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
        itemName: it.item_name || it.itemName || "Item",
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
        toast.success(res.message || "Auftrag created successfully!", successStyles);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Create new Auftrag</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Recipient customer * (required)
              </label>
              <CustomerSearchInput
                value={filterCustomerId}
                onChange={(id: string) => setFilterCustomerId(id)}
                placeholder="Select a customer..."
                mode="customers"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search items
              </label>
              <input
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
                placeholder="Search items or EAN…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
              />
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
                  <p>{selectedCustomer.addressLine1 || selectedCustomer.businessDetails?.address || "No address on file"}</p>
                  <p>
                    {[selectedCustomer.postalCode, selectedCustomer.city, selectedCustomer.country]
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
                        {[selectedCustomer.deliveryPostalCode, selectedCustomer.deliveryCity, selectedCustomer.deliveryCountry]
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
            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Loading items…
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                {sourceSearch ? "No items match your search." : "No items found."}
              </div>
            ) : (
              visibleItems.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  selected={selectedItems.some((p) => String(p.id) === String(it.id))}
                  onClick={() => toggleItem(it)}
                />
              ))
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="space-y-2 border border-gray-200 rounded-lg p-3 bg-white">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Selected items ({selectedItems.length})
              </p>
              <div className="space-y-2">
                {selectedItems.map((it) => (
                  <div key={it.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <ItemRow item={it} selected onClick={() => toggleItem(it)} />
                    </div>
                    <div className="w-24 shrink-0">
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Qty
                      </label>
                      <input
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        value={itemQuantities[String(it.id)] ?? "1"}
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
              {PAYMENT_METHODS.map((m) => (
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
              {SHIPPING_METHODS.map((m) => (
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
