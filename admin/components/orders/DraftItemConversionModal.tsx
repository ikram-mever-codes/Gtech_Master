"use client";

import React, { useState } from "react";
import { XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Loader2, ClipboardCheck } from "lucide-react";
import ItemPreviewModal from "@/components/Item/ItemPreviewModal";

interface DraftLineItemPreview {
  lineItemId: string;
  itemId: number;
  position: number;
  photo?: string;
  itemName: string;
  material?: string;
  itemNoDe?: string | null;
  quantity?: string;
  price?: number;
  // Validation fields — see backend note in getOfferDraftItemsPreview.
  taric?: string | null;
  weight?: number | null;
  salesPrice?: number | null;
  isDimWeightEstimated?: boolean;
}

interface DraftItemConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any; // the Angebot, with lineItems
  draftItems: DraftLineItemPreview[]; // from getOfferDraftItemsPreview
  onSubmit: (selectedItems: any[]) => Promise<boolean>;
}

/**
 * Fields that must be filled on a draft item's backing Item before it can
 * be converted (isDraft -> false). Returns the list of missing-field
 * labels for one item, empty if it's ready.
 *
 * isDimWeightEstimated is validated as "must be explicitly true" rather
 * than "must be set" — it's a non-nullable boolean on Item with a default
 * of false, so there's no way to distinguish "never touched" from
 * "confirmed not estimated." If that's not the intended rule, this needs
 * a different signal from the backend (e.g. a real nullable flag) to
 * validate correctly.
 */
const getMissingFields = (item: DraftLineItemPreview): string[] => {
  const missing: string[] = [];
  if (!item.taric || !item.taric.trim()) missing.push("TARIC");
  if (!item.weight || item.weight <= 0) missing.push("Weight");
  if (!item.salesPrice || item.salesPrice <= 0) missing.push("Sales Price");
  if (item.isDimWeightEstimated !== true)
    missing.push("Dimensions marked as estimated");
  return missing;
};

export default function DraftItemConversionModal({
  isOpen,
  onClose,
  offer,
  draftItems,
  onSubmit,
}: DraftItemConversionModalProps) {
  // draft rows, keyed by lineItemId, selected true by default per spec
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(draftItems.map((it) => [it.lineItemId, true])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  if (!isOpen || !offer) return null;

  const toggleSelect = (lineItemId: string) =>
    setSelection((prev) => ({ ...prev, [lineItemId]: !prev[lineItemId] }));

  const selectedCount = Object.values(selection).filter(Boolean).length;

  const handleSubmit = async () => {
    // Validate every selected draft item before doing anything else — a
    // line left unselected stays a Freizeile as today and needs no check.
    const invalidItems = draftItems.filter(
      (it) => selection[it.lineItemId] && getMissingFields(it).length > 0,
    );
    if (invalidItems.length > 0) {
      const summary = invalidItems
        .map(
          (it) =>
            `"${it.itemName}": missing ${getMissingFields(it).join(", ")}`,
        )
        .join(" · ");
      toast.error(
        `Fill in the required fields before converting — ${summary}`,
        { duration: 6000 },
      );
      return;
    }

    setSubmitting(true);
    try {
      // Every non-component offer line goes into the Auftrag, same as the
      // direct-conversion path — only draft lines carry a convertDraft
      // flag, telling the backend whether to graduate that line's Item.
      const draftLineIds = new Set(draftItems.map((it) => it.lineItemId));
      const lineItems =
        offer.lineItems?.filter((li: any) => !li.isComponent) || [];

      const selectedItems = lineItems.map((li: any) => {
        const base = {
          lineItemId: li.id,
          quantity: Number(li.baseQuantity || 1) || 1,
          price: Number(li.basePrice) || 0,
          itemName: li.itemName || li.notes || li.description || "Line Item",
        };
        if (draftLineIds.has(li.id)) {
          return { ...base, convertDraft: !!selection[li.id] };
        }
        return base;
      });

      const ok = await onSubmit(selectedItems);
      if (!ok) {
        toast.error("Conversion failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">
        {/* Header — same bar style as Ausliefern */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Draft items — Angebot {offer.offerNumber}
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              Choose which draft items become real catalog items. Click "Item
              Info" to edit missing details.
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
              {selectedCount} / {draftItems.length} selected
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                <tr>
                  <th className="px-2 py-2 text-center font-semibold w-10">
                    ✓
                  </th>
                  <th className="px-2 py-2 text-left font-semibold w-10">
                    Pos
                  </th>
                  <th className="px-2 py-2 text-left font-semibold w-12">
                    Pic
                  </th>
                  <th className="px-2 py-2 text-left font-semibold">
                    Item Name
                  </th>
                  <th className="px-2 py-2 text-left font-semibold w-28">
                    Art.-Nr.
                  </th>
                  <th className="px-2 py-2 text-right font-semibold w-20">
                    Qty
                  </th>
                  <th className="px-2 py-2 text-right font-semibold w-24">
                    Price
                  </th>
                  <th className="px-2 py-2 text-center font-semibold w-32">
                    Required Data
                  </th>
                  <th className="px-2 py-2 text-center font-semibold w-24">
                    Info
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {draftItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-6 text-sm text-gray-500"
                    >
                      No draft items on this Angebot.
                    </td>
                  </tr>
                )}
                {draftItems.map((item) => {
                  const selected = !!selection[item.lineItemId];
                  const missing = getMissingFields(item);
                  const isInvalid = selected && missing.length > 0;
                  return (
                    <tr
                      key={item.lineItemId}
                      className={`transition-colors ${
                        isInvalid
                          ? "bg-rose-50"
                          : selected
                            ? "bg-[#dff0d8]"
                            : "bg-white"
                      }`}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(item.lineItemId)}
                          className="w-4 h-4 rounded border-gray-400 accent-emerald-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2">{item.position}</td>
                      <td className="px-2 py-2">
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden">
                          {item.photo ? (
                            <img
                              src={item.photo}
                              alt="thumb"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 font-medium">{item.itemName}</td>
                      <td className="px-2 py-2 text-gray-600">
                        {item.itemNoDe || "—"}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.quantity || 1}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {item.price !== undefined
                          ? Number(item.price).toFixed(2)
                          : "0.00"}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {!selected ? (
                          <span className="text-gray-400 text-xs">—</span>
                        ) : missing.length === 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                            Complete
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-700 rounded-full cursor-help"
                            title={`Missing: ${missing.join(", ")}`}
                          >
                            Missing {missing.length}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(item.itemId)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold whitespace-nowrap"
                        >
                          <InformationCircleIcon className="w-3.5 h-3.5" />
                          Item Info
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Selected draft items need TARIC, weight, sales price, and confirmed
            dimensions before they can convert. Unselected items stay as-is —
            they won't be marked as finished catalog items.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end items-center flex-shrink-0 bg-gray-50 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 text-sm font-bold bg-[#2F6B46] text-white rounded-lg hover:bg-[#255638] disabled:opacity-50 transition flex items-center gap-2 shadow-md"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                <ClipboardCheck className="w-4 h-4" />
                Convert &amp; Create Auftrag
              </>
            )}
          </button>
        </div>
      </div>

      {editingItemId !== null && (
        <ItemPreviewModal
          isOpen={editingItemId !== null}
          onClose={() => setEditingItemId(null)}
          itemId={editingItemId}
          isRequest={false}
          zIndex="z-[60000]"
          onSaved={() => {
            // ItemPreviewModal persists edits directly via updateItem.
            // This modal's draftItems prop is a snapshot fetched before
            // the user opened the editor — it does NOT auto-refresh, so
            // the "Required Data" badge and Art.-Nr./price/weight shown
            // in the table won't reflect this save until the parent
            // re-fetches draft items (e.g. by re-opening the conversion
            // modal).
            setEditingItemId(null);
          }}
        />
      )}
    </div>
  );
}
