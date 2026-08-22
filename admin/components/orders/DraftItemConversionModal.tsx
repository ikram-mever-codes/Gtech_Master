"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, PencilIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Loader2, ClipboardCheck, PackagePlus } from "lucide-react";
import { convertDraftItemsAndCreateAuftrag } from "@/api/customer_orders"; // NEW — see backend section

interface DraftLineItem {
  lineItemId: string;
  position: number;
  photo?: string;
  itemName: string;
  material?: string; // Art.-Nr / model
  ean?: string;
  weight?: number; // kg
  basePrice: number;
  notes?: string;
  selected: boolean;
}

interface DraftItemConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any; // the Angebot, with lineItems
  onConverted: (auftragId: string | number) => void;
}

const inputCls =
  "w-full px-2.5 py-1 text-xs border border-gray-300 bg-white rounded focus:ring-2 focus:ring-emerald-500 font-medium";

/**
 * A line counts as a "draft item" if it came from an inquiry request
 * (requestedItemId set) but was never linked to a real catalog Item
 * (sourceItemId still empty). Working definition inferred from
 * isFreetextLine's third-category behavior across the Offer files —
 * confirm against the real OfferLineItem entity before relying on it
 * elsewhere.
 */
const isDraftItem = (li: any): boolean =>
  !!li?.requestedItemId && !li?.sourceItemId;

export default function DraftItemConversionModal({
  isOpen,
  onClose,
  offer,
  onConverted,
}: DraftItemConversionModalProps) {
  const [items, setItems] = useState<DraftLineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [infoModalItemId, setInfoModalItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !offer) return;
    const draftLines = (offer.lineItems || []).filter(
      (li: any) => !li.isComponent && isDraftItem(li),
    );
    setItems(
      draftLines.map((li: any) => ({
        lineItemId: li.id,
        position: li.position || 0,
        photo: li.photo,
        itemName: li.itemName || "",
        material: li.material || "",
        ean: li.ean || "",
        weight: li.weight ? Number(li.weight) / 1000 : undefined, // stored g -> shown kg, matches ItemPreviewModal's convention
        basePrice: Number(li.basePrice) || 0,
        notes: li.notes || "",
        selected: true, // all selected by default, per spec
      })),
    );
  }, [isOpen, offer]);

  if (!isOpen || !offer) return null;

  const toggleSelect = (id: string) =>
    setItems((prev) =>
      prev.map((it) =>
        it.lineItemId === id ? { ...it, selected: !it.selected } : it,
      ),
    );

  const updateField = (id: string, field: keyof DraftLineItem, val: any) =>
    setItems((prev) =>
      prev.map((it) => (it.lineItemId === id ? { ...it, [field]: val } : it)),
    );

  const selectedCount = items.filter((it) => it.selected).length;

  const validateSelected = (): string | null => {
    for (const it of items) {
      if (!it.selected) continue;
      if (!it.itemName.trim())
        return `"${it.itemName || "Item"}" needs a name.`;
      // Add further required-field checks here once the Item entity's
      // NOT NULL columns are confirmed.
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validateSelected();
    if (err) {
      toast.error(err, { duration: 4000 });
      return;
    }
    if (items.length === 0) {
      toast.error("No draft items to convert — nothing to do here.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = items.map((it) => ({
        lineItemId: it.lineItemId,
        convert: it.selected,
        itemName: it.itemName,
        material: it.material,
        ean: it.ean,
        weightKg: it.weight,
        price: it.basePrice,
        notes: it.notes,
      }));
      const res = await convertDraftItemsAndCreateAuftrag(offer.id, payload);
      if (res?.success && res?.data?.id) {
        toast.success(res.message || "Auftrag created.");
        onConverted(res.data.id);
        onClose();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Conversion failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeInfoItem = items.find((it) => it.lineItemId === infoModalItemId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">
        {/* Header — same bar as Ausliefern */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Draft items — Angebot {offer.offerNumber}
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              Choose which draft items become real catalog items before this
              converts to an Auftrag.
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
              {selectedCount} / {items.length} selected
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
                    Model / Art.-Nr.
                  </th>
                  <th className="px-2 py-2 text-left font-semibold w-28">
                    EAN
                  </th>
                  <th className="px-2 py-2 text-right font-semibold w-20">
                    Weight (kg)
                  </th>
                  <th className="px-2 py-2 text-right font-semibold w-24">
                    Price
                  </th>
                  <th className="px-2 py-2 text-center font-semibold w-24">
                    Info
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-6 text-sm text-gray-500"
                    >
                      No draft items on this Angebot — nothing to convert.
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr
                    key={item.lineItemId}
                    className={`transition-colors ${
                      item.selected ? "bg-[#dff0d8]" : "bg-white"
                    }`}
                  >
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
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
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        disabled={!item.selected}
                        value={item.itemName}
                        onChange={(e) =>
                          updateField(
                            item.lineItemId,
                            "itemName",
                            e.target.value,
                          )
                        }
                        className={`${inputCls} font-bold disabled:opacity-50`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        disabled={!item.selected}
                        value={item.material}
                        onChange={(e) =>
                          updateField(
                            item.lineItemId,
                            "material",
                            e.target.value,
                          )
                        }
                        className={`${inputCls} disabled:opacity-50`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        disabled={!item.selected}
                        value={item.ean}
                        onChange={(e) =>
                          updateField(item.lineItemId, "ean", e.target.value)
                        }
                        className={`${inputCls} disabled:opacity-50`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="any"
                        disabled={!item.selected}
                        value={item.weight ?? ""}
                        onChange={(e) =>
                          updateField(
                            item.lineItemId,
                            "weight",
                            Number(e.target.value) || 0,
                          )
                        }
                        className={`${inputCls} text-right disabled:opacity-50`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        step="any"
                        disabled={!item.selected}
                        value={item.basePrice}
                        onChange={(e) =>
                          updateField(
                            item.lineItemId,
                            "basePrice",
                            Number(e.target.value) || 0,
                          )
                        }
                        className={`${inputCls} text-right disabled:opacity-50`}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setInfoModalItemId(item.lineItemId)}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
                      >
                        Item Info
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Unselected items stay as freetext lines on the Auftrag, exactly as
            today — only selected rows get a new catalog Item.
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

      {activeInfoItem && (
        <DraftItemInfoModal
          item={activeInfoItem}
          onClose={() => setInfoModalItemId(null)}
          onSave={(patch) => {
            updateField(activeInfoItem.lineItemId, "itemName", patch.itemName);
            updateField(activeInfoItem.lineItemId, "material", patch.material);
            updateField(activeInfoItem.lineItemId, "ean", patch.ean);
            updateField(activeInfoItem.lineItemId, "weight", patch.weight);
            updateField(activeInfoItem.lineItemId, "notes", patch.notes);
            setInfoModalItemId(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Click-to-edit panel for one draft item, styled after ItemPreviewModal's
 * header + Field-grid pattern (same rounded-2xl/backdrop-blur shell, same
 * uppercase Field labels). Scoped only to the fields relevant for creating
 * an Item from a draft line — not the full Item entity (supplier pricing,
 * stock, TARIC, etc. don't apply yet since the Item doesn't exist).
 */
const DraftItemInfoModal: React.FC<{
  item: DraftLineItem;
  onClose: () => void;
  onSave: (patch: {
    itemName: string;
    material?: string;
    ean?: string;
    weight?: number;
    notes?: string;
  }) => void;
}> = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState({
    itemName: item.itemName,
    material: item.material || "",
    ean: item.ean || "",
    weight: item.weight ?? 0,
    notes: item.notes || "",
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Item Info</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
              Item Name
            </p>
            <input
              className={inputCls}
              value={form.itemName}
              onChange={(e) =>
                setForm((f) => ({ ...f, itemName: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                Model / Art.-Nr.
              </p>
              <input
                className={inputCls}
                value={form.material}
                onChange={(e) =>
                  setForm((f) => ({ ...f, material: e.target.value }))
                }
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                EAN
              </p>
              <input
                className={inputCls}
                value={form.ean}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ean: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
              Weight (kg)
            </p>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.weight}
              onChange={(e) =>
                setForm((f) => ({ ...f, weight: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
              Remark
            </p>
            <textarea
              rows={3}
              className={inputCls}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 text-sm bg-[#8CC21B] text-white rounded-lg hover:bg-[#7ab318] font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
