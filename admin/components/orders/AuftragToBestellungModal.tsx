"use client";

import React, { useState, useEffect } from "react";
import CustomModal from "@/components/UI/CustomModal";
import { toast } from "react-hot-toast";
import { createBestellungFromAuftrag } from "@/api/transfer_orders";
import { Loader2, ArrowRight } from "lucide-react";

interface ItemRow {
  sourceLineItemId: string;
  itemName: string;
  itemNo?: string;
  material?: string;
  specification?: string;
  description?: string;
  price: number;
  max_qty: number;
  qty: number;
  selected: boolean;
}

interface AuftragToBestellungModalProps {
  isOpen: boolean;
  onClose: () => void;
  auftrag: any;
  onSuccess: () => void;
}

export default function AuftragToBestellungModal({
  isOpen,
  onClose,
  auftrag,
  onSuccess,
}: AuftragToBestellungModalProps) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auftrag && auftrag.items) {
      const rawItems = auftrag.items || auftrag.orderItems || [];
      const mapped: ItemRow[] = rawItems.map((it: any) => {
        const originalQty = Number(it.quantity || it.qty || 1) || 1;
        return {
          sourceLineItemId: String(it.id || it.sourceLineItemId || ""),
          itemName: it.itemName || it.item_name || it.item?.item_name || "Item",
          itemNo: it.itemNo || it.item_no || undefined,
          material: it.material || undefined,
          specification: it.specification || undefined,
          description: it.description || undefined,
          price: Number(it.price || it.unitPrice || 0),
          max_qty: originalQty,
          qty: originalQty, // Default qty is MAX
          selected: true,
        };
      });
      setItems(mapped);
      setNotes(
        auftrag.internal_notes ||
          auftrag.comment_internal ||
          auftrag.comment ||
          auftrag.notes ||
          "",
      );
    }
  }, [auftrag]);

  if (!isOpen || !auftrag) return null;

  const handleToggleSelect = (index: number) => {
    setItems((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, selected: !row.selected } : row,
      ),
    );
  };

  const handleQtyChange = (index: number, val: number) => {
    setItems((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const safeQty = Math.max(1, Math.min(row.max_qty, val));
        return { ...row, qty: safeQty };
      }),
    );
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const handleSubmit = async () => {
    const activeItems = items.filter((i) => i.selected);
    if (activeItems.length === 0) {
      toast.error("Please select at least 1 line item to convert");
      return;
    }

    try {
      setSubmitting(true);
      const selectedItems = activeItems.map((it) => ({
        sourceLineItemId: it.sourceLineItemId,
        qty: it.qty,
        max_qty: it.max_qty,
        price: it.price,
        itemName: it.itemName,
        itemNo: it.itemNo,
        material: it.material,
        specification: it.specification,
        description: it.description,
      }));

      const res = await createBestellungFromAuftrag(
        auftrag.id,
        selectedItems,
        notes,
      );
      if (res?.success) {
        toast.success(res.message || "Converted to Bestellung successfully!");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const calcSubtotal = items
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Auftrag (${auftrag.order_no || `ID #${auftrag.id}`}) → Bestellung`}
      width="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-gray-500 font-medium">
            Subtotal:{" "}
            <span className="font-bold text-gray-900">
              €{calcSubtotal.toFixed(2)}
            </span>{" "}
            ({selectedCount} item{selectedCount === 1 ? "" : "s"} selected)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedCount === 0}
              className="px-4 py-2 text-xs font-bold text-white bg-[#8CC21B] hover:bg-[#7ab015] disabled:opacity-50 rounded-md shadow-md transition flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Converting...
                </>
              ) : (
                <>
                  Convert to Bestellung (Draft)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <p className="font-semibold mb-1">Auftrag Conversion Summary</p>
          <p>
            Customer:{" "}
            <strong>
              {auftrag.customerSnapshot?.companyName ||
                auftrag.customer_name ||
                auftrag.customer?.companyName ||
                "N/A"}
            </strong>
          </p>
          <p>
            Review items and quantities below. By default, quantity is set to
            maximum.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">Select</th>
                <th className="p-3">Item Name</th>
                <th className="p-3 w-28 text-center">Qty (Max)</th>
                <th className="p-3 w-24 text-right">Price</th>
                <th className="p-3 w-28 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    row.selected ? "bg-white" : "bg-gray-50/50 opacity-60"
                  }
                >
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleToggleSelect(idx)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-3">
                    <div className="font-semibold text-gray-900">
                      {row.itemName}
                    </div>
                    {row.description && (
                      <div className="text-[11px] text-gray-400 truncate max-w-xs">
                        {row.description}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={row.max_qty}
                        disabled={!row.selected}
                        value={row.qty}
                        onChange={(e) =>
                          handleQtyChange(idx, Number(e.target.value))
                        }
                        className="w-16 px-2 py-1 text-center font-bold border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white disabled:bg-gray-100"
                      />
                      <span className="text-[10px] text-gray-500 font-medium">
                        / {row.max_qty}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium text-gray-700">
                    €{Number(row.price).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">
                    €{(row.qty * row.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Notes / Remark
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this Bestellung..."
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>
    </CustomModal>
  );
}
