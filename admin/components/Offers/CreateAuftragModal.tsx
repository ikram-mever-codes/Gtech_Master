"use client";
import React, { useState, useEffect } from "react";
import { X, Check, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "react-hot-toast";
import { createAuftragFromOffer } from "@/api/customer_orders";

interface ItemRowState {
  lineItemId: string;
  selected: boolean;
  position: number;
  itemName: string;
  itemNo: string;
  quantity: string;
  price: string;
}

interface CreateAuftragModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any;
  onSuccess?: () => void;
}

export const CreateAuftragModal: React.FC<CreateAuftragModalProps> = ({
  isOpen,
  onClose,
  offer,
  onSuccess,
}) => {
  const [items, setItems] = useState<ItemRowState[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (offer && offer.lineItems && Array.isArray(offer.lineItems)) {
      const initialItems: ItemRowState[] = offer.lineItems.map(
        (item: any, idx: number) => {
          const qty = item.baseQuantity || "1";
          const price = item.basePrice !== undefined && item.basePrice !== null ? String(item.basePrice) : "0";
          return {
            lineItemId: item.id,
            selected: true, // Default select all items
            position: item.position || idx + 1,
            itemName: item.itemName || "Item",
            itemNo: item.itemNo || item.material || "-",
            quantity: String(qty),
            price: String(price),
          };
        },
      );
      setItems(initialItems);
    } else {
      setItems([]);
    }
  }, [offer, isOpen]);

  if (!isOpen || !offer) return null;

  const toggleSelect = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.lineItemId === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const updateItemQty = (id: string, qty: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.lineItemId === id ? { ...item, quantity: qty } : item,
      ),
    );
  };

  const updateItemPrice = (id: string, price: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.lineItemId === id ? { ...item, price: price } : item,
      ),
    );
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const subtotal = items.reduce((acc, item) => {
    if (!item.selected) return acc;
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.price) || 0;
    return acc + q * p;
  }, 0);

  const taxRate = Number(offer.taxRate ?? 19);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const currency = offer.currency || "EUR";

  const handleSaveAuftrag = async () => {
    const selectedItemsToSubmit = items
      .filter((i) => i.selected)
      .map((i) => ({
        lineItemId: i.lineItemId,
        quantity: Math.max(1, parseFloat(i.quantity) || 1),
        price: Math.max(0, parseFloat(i.price) || 0),
        itemName: i.itemName,
      }));

    if (selectedItemsToSubmit.length === 0) {
      toast.error("Minimum 1 item MUST be selected for Auftrag");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createAuftragFromOffer(offer.id, selectedItemsToSubmit);
      if (res && res.success) {
        toast.success(res.message || "Auftrag created successfully!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(res?.message || "Failed to create Auftrag");
      }
    } catch (error: any) {
      toast.error(error?.message || "Error creating Auftrag from Offer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                mache Auftrag (Create Order)
              </h2>
              <p className="text-xs text-gray-500">
                Source Offer:{" "}
                <span className="font-semibold text-gray-700">
                  {offer.offerNumber}
                </span>{" "}
                • Customer:{" "}
                <span className="font-semibold text-gray-700">
                  {offer.customerSnapshot?.companyName || "N/A"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="bg-blue-50/80 border border-blue-200/60 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                Select items to include in this Auftrag. Minimum 1 item MUST be selected.
              </p>
              <p className="text-blue-600 mt-0.5">
                Quantities and Prices are fully editable for the new Auftrag.
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2.5 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        items.length > 0 &&
                        items.every((i) => i.selected)
                      }
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-2.5 text-left w-12">Pos</th>
                  <th className="px-3 py-2.5 text-left">Item Name</th>
                  <th className="px-3 py-2.5 text-left w-32">Art.-Nr.</th>
                  <th className="px-3 py-2.5 text-right w-28">Quantity</th>
                  <th className="px-3 py-2.5 text-right w-32">Unit Price ({currency})</th>
                  <th className="px-3 py-2.5 text-right w-32">Total ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-sm text-gray-500">
                      No line items found in offer.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const q = parseFloat(item.quantity) || 0;
                    const p = parseFloat(item.price) || 0;
                    const lineTotal = q * p;

                    return (
                      <tr
                        key={item.lineItemId}
                        className={
                          item.selected
                            ? "bg-white hover:bg-gray-50/80"
                            : "bg-gray-50/50 opacity-60"
                        }
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelect(item.lineItemId)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-2 py-2.5 text-gray-500 font-medium">
                          {item.position}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">
                          {item.itemName}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500 text-xs">
                          {item.itemNo}
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            disabled={!item.selected}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItemQty(item.lineItemId, e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!item.selected}
                            value={item.price}
                            onChange={(e) =>
                              updateItemPrice(item.lineItemId, e.target.value)
                            }
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-800">
                          {lineTotal.toFixed(2)} {currency}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Validation Warning */}
          {selectedCount === 0 && (
            <p className="text-xs text-rose-600 font-medium text-center">
              ⚠️ Please select at least 1 item to save the Auftrag.
            </p>
          )}

          {/* Totals Summary */}
          <div className="max-w-xs ml-auto space-y-1.5 text-sm pt-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({selectedCount} items):</span>
              <span className="font-medium">
                {subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>VAT ({taxRate}%):</span>
              <span className="font-medium">
                {taxAmount.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-1.5">
              <span>Total Auftrag Amount:</span>
              <span className="text-emerald-700">
                {totalAmount.toFixed(2)} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50/80">
          <span className="text-xs text-gray-500">
            Selected: <strong className="text-gray-800">{selectedCount}</strong> / {items.length} items
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAuftrag}
              disabled={selectedCount === 0 || submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              {submitting ? "Saving Auftrag…" : "Save Auftrag"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
