"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { createRechnungFromAuftrag } from "@/api/rechnungen";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2 } from "lucide-react";

interface SelectedItemState {
  lineItemId: string;
  sourceItemId?: string;
  itemName: string;
  max_qty: number;
  qty: number;
  price: number;
  selected: boolean;
}

interface AuftragToRechnungModalProps {
  isOpen: boolean;
  onClose: () => void;
  auftrag: any;
  onSuccess: () => void;
}

export default function AuftragToRechnungModal({
  isOpen,
  onClose,
  auftrag,
  onSuccess,
}: AuftragToRechnungModalProps) {
  const [items, setItems] = useState<SelectedItemState[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !auftrag) return;

    const sourceItems = auftrag.orderItems || auftrag.items || [];
    const mapped = sourceItems.map((it: any) => {
      const origQty = Number(it.quantity || it.qty) || 1;
      const itemPrice = Number(it.price || 0);
      return {
        lineItemId: String(it.id),
        sourceItemId: it.sourceItemId ? String(it.sourceItemId) : undefined,
        itemName: it.itemName || it.item_name || "Line Item",
        max_qty: origQty,
        qty: origQty,
        price: itemPrice,
        selected: true,
      };
    });

    setItems(mapped);
    setNotes(auftrag.notes || "");
  }, [isOpen, auftrag]);

  if (!isOpen || !auftrag) return null;

  const toggleSelect = (lineItemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.lineItemId === lineItemId ? { ...it, selected: !it.selected } : it,
      ),
    );
  };

  const updateQty = (lineItemId: string, val: string) => {
    const parsed = parseFloat(val);
    setItems((prev) =>
      prev.map((it) => {
        if (it.lineItemId !== lineItemId) return it;
        const newQty = isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), it.max_qty);
        return { ...it, qty: newQty };
      }),
    );
  };

  const selectedItems = items.filter((it) => it.selected && it.qty > 0);
  const subtotal = selectedItems.reduce((acc, it) => acc + it.qty * it.price, 0);
  const taxRate = Number(auftrag.tax_rate ?? 19);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least 1 item with quantity > 0", errorStyles);
      return;
    }

    try {
      setSubmitting(true);
      const payloadItems = selectedItems.map((it) => ({
        lineItemId: it.lineItemId,
        qty: it.qty,
        price: it.price,
        itemName: it.itemName,
      }));

      const res = await createRechnungFromAuftrag(auftrag.id, payloadItems, notes);
      if (res?.success) {
        toast.success(
          res.message || `Rechnung & Lieferschein created from ${auftrag.order_no}!`,
          successStyles,
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Generate Rechnung & Lieferschein
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Source Auftrag: <span className="font-semibold text-gray-800">{auftrag.order_no}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/70 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  <th className="p-3 text-center w-10">Select</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3 text-center w-24">Max Qty</th>
                  <th className="p-3 text-center w-32">Convert Qty</th>
                  <th className="p-3 text-right w-24">Price</th>
                  <th className="p-3 text-right w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {items.map((it) => (
                  <tr
                    key={it.lineItemId}
                    className={`transition-colors ${it.selected ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 opacity-60"
                      }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={it.selected}
                        onChange={() => toggleSelect(it.lineItemId)}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-medium text-gray-900">{it.itemName}</td>
                    <td className="p-3 text-center font-semibold text-gray-600">
                      {it.max_qty}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={it.max_qty}
                        step="any"
                        disabled={!it.selected}
                        value={it.qty}
                        onChange={(e) => updateQty(it.lineItemId, e.target.value)}
                        className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-xs font-semibold disabled:bg-gray-100"
                      />
                    </td>
                    <td className="p-3 text-right text-gray-700">
                      €{it.price.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">
                      €{(it.qty * it.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes / Comment
            </label>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional invoice notes or internal comments..."
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Summary Panel */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center text-xs">
            <div>
              <span className="text-gray-500">Selected Items: </span>
              <span className="font-bold text-gray-900">{selectedItems.length}</span>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-gray-500">Subtotal: </span>
                <span className="font-semibold text-gray-800">€{subtotal.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">VAT ({taxRate}%): </span>
                <span className="font-semibold text-gray-800">€{taxAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total: </span>
                <span className="font-bold text-emerald-700 text-sm">
                  €{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedItems.length === 0 || submitting}
            className="px-4 py-2 text-xs font-bold bg-[#2F6B46] text-white rounded-lg hover:bg-[#255638] disabled:opacity-50 transition flex items-center gap-1.5 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Rechnung & Lieferschein"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
