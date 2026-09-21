"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { Loader2, ClipboardCheck } from "lucide-react";
import ItemPreviewModal from "@/components/Item/ItemPreviewModal";
import { updateItem, getAllTarics, type Taric } from "@/api/items";
import { parseFlexibleNumber } from "@/utils/decimal";
import { updateLineItem } from "@/api/offers";

interface DraftLineItemPreview {
  lineItemId: string;
  itemId: number;
  position: number;
  photo?: string;
  itemName: string;
  material?: string;
  itemNo?: string | null;
  itemNameDe?: string | null;
  quantity?: string | number;
  price?: number;
  taric?: string | null;
  taricId?: number | null;
  weight?: number | null;
  salesPrice?: number | null;
  isDimWeightEstimated?: boolean;
  remarkEx?: string | null;
}

interface DraftItemConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: any;
  draftItems: DraftLineItemPreview[];
  onSubmit: (selectedItems: any[]) => Promise<boolean>;
  onLineItemPriceSync?: (lineItemId: string, price: number) => void;
}

const getMissingFields = (item: DraftLineItemPreview): string[] => {
  const missing: string[] = [];
  if (!item.taricId) missing.push("TARIC");
  if (!item.weight || item.weight <= 0) missing.push("Weight");
  if (
    item.salesPrice === null ||
    item.salesPrice === undefined ||
    item.salesPrice <= 0
  )
    missing.push("Sales Price");
  return missing;
};

const cellInputCls =
  "w-full px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all";

export default function DraftItemConversionModal({
  isOpen,
  onClose,
  offer,
  draftItems,
  onSubmit,
  onLineItemPriceSync,
}: DraftItemConversionModalProps) {
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(draftItems.map((it) => [it.lineItemId, true])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [localItems, setLocalItems] =
    useState<DraftLineItemPreview[]>(draftItems);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [tarics, setTarics] = useState<Taric[]>([]);

  useEffect(() => {
    setLocalItems(draftItems);
    setSelection(
      Object.fromEntries(draftItems.map((it) => [it.lineItemId, true])),
    );
  }, [draftItems]);

  useEffect(() => {
    if (!isOpen) return;
    getAllTarics({ page: 1, limit: 100000 })
      .then((res: any) => setTarics(res?.data || []))
      .catch((err) => console.error("Failed to load TARICs:", err));
  }, [isOpen]);

  if (!isOpen || !offer) return null;

  const toggleSelect = (lineItemId: string) =>
    setSelection((prev) => ({ ...prev, [lineItemId]: !prev[lineItemId] }));

  const selectedCount = Object.values(selection).filter(Boolean).length;

  const saveField = async (
    item: DraftLineItemPreview,
    payload: Record<string, any>,
    localPatch: Partial<DraftLineItemPreview>,
  ) => {
    const key = `${item.lineItemId}`;
    setSavingField(key);
    try {
      await updateItem(item.itemId, payload);
      setLocalItems((prev) =>
        prev.map((it) =>
          it.lineItemId === item.lineItemId ? { ...it, ...localPatch } : it,
        ),
      );
    } catch (err: any) {
      console.error("Failed to save item field:", err);
      toast.error(err?.message || "Failed to save change", {
        duration: 4000,
      });
    } finally {
      setSavingField((cur) => (cur === key ? null : cur));
    }
  };

  const handleNameCommit = (item: DraftLineItemPreview, raw: string) => {
    const value = raw.trim();
    if (value === (item.itemName || "")) return;
    saveField(item, { item_name: value }, { itemName: value });
  };

  const handleNameDeCommit = (item: DraftLineItemPreview, raw: string) => {
    const value = raw.trim();
    if (value === (item.itemNameDe || "")) return;
    saveField(item, { item_name_de: value }, { itemNameDe: value });
  };

  const handleRemarkExCommit = (item: DraftLineItemPreview, raw: string) => {
    const value = raw.trim();
    if (value === (item.remarkEx || "")) return;
    saveField(item, { remark_ex: value }, { remarkEx: value });
  };

  const handleWeightCommit = (item: DraftLineItemPreview, raw: string) => {
    const parsed = parseFlexibleNumber(raw);
    const value = parsed ?? 0;
    if (value === (item.weight ?? 0)) return;
    saveField(item, { weight: value }, { weight: value });
  };

  const handleEstimatedChange = (
    item: DraftLineItemPreview,
    value: boolean,
  ) => {
    if (value === item.isDimWeightEstimated) return;
    saveField(
      item,
      { is_dim_weight_estimated: value },
      { isDimWeightEstimated: value },
    );
  };

  const handleTaricChange = (
    item: DraftLineItemPreview,
    taricId: number | null,
  ) => {
    const matched = taricId ? tarics.find((t: any) => t.id === taricId) : null;
    saveField(
      item,
      { taric_id: taricId },
      {
        taricId: taricId,
        taric: matched?.code || null,
      },
    );
  };

  const handleSalesPriceCommit = (item: DraftLineItemPreview, raw: string) => {
    const parsed = parseFlexibleNumber(raw);
    const value = parsed ?? 0;
    const currentPrice = item.salesPrice ?? item.price ?? 0;
    if (value === currentPrice) return;
    saveField(item, { sales_price: value }, { salesPrice: value });
    const lineItem = offer.lineItems?.find(
      (li: any) => li.id === item.lineItemId,
    );
    const lineHasNoPrice =
      Number(lineItem?.basePrice) === null || Number(lineItem?.basePrice) === 0;
    if (lineHasNoPrice) {
      updateLineItem(offer.id, item.lineItemId, { basePrice: value }).catch(
        (err) => {
          console.error("Failed to sync line item price:", err);
        },
      );
      onLineItemPriceSync?.(item.lineItemId, value);
    }
  };

  const handleSubmit = async () => {
    const invalidItems = localItems.filter(
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
      const draftLineIds = new Set(localItems.map((it) => it.lineItemId));
      const lineItems =
        offer.lineItems?.filter((li: any) => !li.isComponent) || [];

      const selectedItems = lineItems
        .filter((li: any) => !draftLineIds.has(li.id) || !!selection[li.id])
        .map((li: any) => {
          const base = {
            lineItemId: li.id,
            quantity: Number(li.baseQuantity || 1) || 1,
            price: Number(li.basePrice) || 0,
            itemName: li.itemName || li.notes || li.description || "Line Item",
          };
          if (draftLineIds.has(li.id)) {
            return { ...base, convertDraft: true };
          }
          return base;
        });

      if (selectedItems.length === 0) {
        toast.error("Select at least one item to include in the Auftrag.");
        return;
      }

      const ok = await onSubmit(selectedItems);
      if (!ok) {
        toast.error("Conversion failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-gray-900 font-sans">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-gray-900 truncate">
                Draft items — Angebot {offer.offerNumber}
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              Edit Item Name, Name DE, TARIC, Weight, Estimated?, Remark Ex, and Sales Price directly. Click "Item Info" for full details.
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-800">
              {selectedCount} / {localItems.length} selected
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

        <div className="flex-1 bg-white overflow-y-auto p-6 space-y-5">
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-xs">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 text-xs">
                <tr>
                  <th className="px-2 py-2 text-center font-semibold w-10">✓</th>
                  <th className="px-2 py-2 text-left font-semibold w-10">Pos</th>
                  <th className="px-2 py-2 text-left font-semibold w-12">Pic</th>
                  <th className="px-2 py-2 text-left font-semibold">Item Name (EN)</th>
                  <th className="px-2 py-2 text-left font-semibold w-48">Name DE</th>
                  <th className="px-2 py-2 text-left font-semibold w-24">Art.-Nr.</th>
                  <th className="px-2 py-2 text-right font-semibold w-16">Qty</th>
                  <th className="px-2 py-2 text-right font-semibold w-28">Sales Price</th>
                  <th className="px-2 py-2 text-center font-semibold w-24">Info</th>
                </tr>
              </thead>
              <tbody>
                {localItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-6 text-sm text-gray-500"
                    >
                      No draft items on this Angebot.
                    </td>
                  </tr>
                )}
                {localItems.map((item) => {
                  const selected = !!selection[item.lineItemId];
                  const missing = getMissingFields(item);
                  const isInvalid = selected && missing.length > 0;
                  const isSavingThisRow = savingField === item.lineItemId;
                  return (
                    <React.Fragment key={item.lineItemId}>
                      <tr
                        className={`transition-colors border-t border-gray-200 ${isInvalid
                          ? "bg-rose-50/70"
                          : selected
                            ? "bg-[#dff0d8]"
                            : "bg-white"
                          }`}
                      >
                        <td
                          className="px-2 py-2 text-center align-middle"
                          rowSpan={2}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(item.lineItemId)}
                            className="w-4 h-4 rounded border-gray-400 accent-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td
                          className="px-2 py-2 align-middle font-medium text-gray-700 text-xs"
                          rowSpan={2}
                        >
                          {item.position}
                        </td>
                        <td className="px-2 py-2 align-middle" rowSpan={2}>
                          <div className="w-9 h-9 rounded bg-white flex items-center justify-center border border-gray-200 overflow-hidden shrink-0">
                            {item.photo ? (
                              <img
                                src={item.photo}
                                alt="thumb"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-gray-400 text-[10px]">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <NameEnCell
                            value={item.itemName || ""}
                            disabled={isSavingThisRow}
                            onCommit={(raw) => handleNameCommit(item, raw)}
                          />
                        </td>

                        <td className="px-2 py-1.5">
                          <NameDeCell
                            value={item.itemNameDe || ""}
                            disabled={isSavingThisRow}
                            onCommit={(raw) => handleNameDeCommit(item, raw)}
                          />
                        </td>

                        <td className="px-2 py-1.5 text-gray-700 text-xs align-middle">
                          {item.itemNo || "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-700 text-xs align-middle font-medium">
                          {item.quantity || 1}
                        </td>
                        <td className="px-2 py-1.5">
                          <SalesPriceCell
                            value={
                              item.salesPrice !== undefined &&
                                item.salesPrice !== null
                                ? item.salesPrice
                                : item.price ?? ""
                            }
                            disabled={isSavingThisRow}
                            onCommit={(raw) =>
                              handleSalesPriceCommit(item, raw)
                            }
                          />
                        </td>

                        <td
                          className="px-2 py-2 text-center align-middle"
                          rowSpan={2}
                        >
                          <button
                            type="button"
                            onClick={() => setEditingItemId(item.itemId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold whitespace-nowrap shadow-xs"
                          >
                            <InformationCircleIcon className="w-3.5 h-3.5" />
                            Item Info
                          </button>
                        </td>
                      </tr>
                      <tr
                        className={`transition-colors border-b border-gray-300 ${isInvalid
                          ? "bg-rose-50/70"
                          : selected
                            ? "bg-[#d4e9cd]"
                            : "bg-gray-50/50"
                          }`}
                      >
                        <td colSpan={5} className="px-2 py-1.5">
                          <div className="flex items-center gap-3 w-full text-xs">
                            <div className="flex items-center gap-1.5 min-w-[200px] flex-1">
                              <span className="text-gray-600 font-bold text-[11px] shrink-0">
                                Remark Ex:
                              </span>
                              <RemarkExCell
                                value={item.remarkEx || ""}
                                disabled={isSavingThisRow}
                                onCommit={(raw) =>
                                  handleRemarkExCommit(item, raw)
                                }
                              />
                            </div>
                            <div className="flex items-center gap-1.5 min-w-[240px] flex-[1.4]">
                              <span className="text-gray-600 font-bold text-[11px] shrink-0">
                                TARIC:
                              </span>
                              <select
                                value={item.taricId ?? ""}
                                disabled={isSavingThisRow}
                                onChange={(e) =>
                                  handleTaricChange(
                                    item,
                                    e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  )
                                }
                                className={cellInputCls}
                              >
                                <option value="">— Select TARIC —</option>
                                {tarics.map((t: any) => (
                                  <option key={t.id} value={t.id}>
                                    {t.code}
                                    {t.name_de ||
                                      t.name_en ||
                                      t.description_de ||
                                      t.description_en ||
                                      t.name ||
                                      t.description
                                      ? ` - ${t.name_de ||
                                      t.name_en ||
                                      t.description_de ||
                                      t.description_en ||
                                      t.name ||
                                      t.description
                                      }`
                                      : ""}
                                    {t.duty_rate !== null &&
                                      t.duty_rate !== undefined
                                      ? ` (${t.duty_rate}%)`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 w-32">
                              <span className="text-gray-600 font-bold text-[11px] shrink-0">
                                Weight:
                              </span>
                              <WeightCell
                                value={item.weight ?? ""}
                                disabled={isSavingThisRow}
                                onCommit={(raw) =>
                                  handleWeightCommit(item, raw)
                                }
                              />
                              <span className="text-gray-500 text-[10px] shrink-0">
                                g
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 w-28">
                              <span className="text-gray-600 font-bold text-[11px] shrink-0">
                                Est?:
                              </span>
                              <select
                                value={item.isDimWeightEstimated ? "Y" : "N"}
                                disabled={isSavingThisRow}
                                onChange={(e) =>
                                  handleEstimatedChange(
                                    item,
                                    e.target.value === "Y",
                                  )
                                }
                                className={`${cellInputCls} !w-16`}
                              >
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                              </select>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Selected draft items need TARIC, weight, sales price, and confirmed
            dimensions before converting. All key fields can be edited directly
            above — click "Item Info" for complete catalog attributes.
          </p>
        </div>

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
            setEditingItemId(null);
          }}
        />
      )}
    </div>
  );
}

const NameEnCell: React.FC<{
  value: string;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      disabled={disabled}
      placeholder="Item Name (EN)"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className={cellInputCls}
    />
  );
};

const NameDeCell: React.FC<{
  value: string;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      disabled={disabled}
      placeholder="Name DE"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className={cellInputCls}
    />
  );
};

const RemarkExCell: React.FC<{
  value: string;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      disabled={disabled}
      placeholder="Remark Ex"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className={cellInputCls}
    />
  );
};

const WeightCell: React.FC<{
  value: string | number;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(String(value ?? ""));

  useEffect(() => {
    setLocal(String(value ?? ""));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      disabled={disabled}
      placeholder="0"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className={`${cellInputCls} text-right`}
    />
  );
};

const SalesPriceCell: React.FC<{
  value: string | number;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(String(value ?? ""));

  useEffect(() => {
    setLocal(String(value ?? ""));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      disabled={disabled}
      placeholder="0.00"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      className={`${cellInputCls} text-right`}
    />
  );
};
