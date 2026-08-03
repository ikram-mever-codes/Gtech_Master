"use client";

import React, { useState, useEffect } from "react";
import { LinkIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, FileText, Pencil, Save, X, AlertCircle } from "lucide-react";
import {
  updateRechnungKItem,
  createRechnungKFromRechnung,
} from "@/api/rechnungen_k";
import { formatDate } from "@/utils/date";

const formatDeCurrency = (val: number) => {
  const num = isNaN(val) || !isFinite(val) ? 0 : val;
  return `${num.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
};

const formatWeight = (kg: number): string =>
  `${(isNaN(kg) || !isFinite(kg) ? 0 : kg).toLocaleString("de-DE", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} kg`;

const COUNTRY_CODES: Record<string, string> = {
  germany: "DE",
  deutschland: "DE",
  austria: "AT",
  österreich: "AT",
  switzerland: "CH",
  schweiz: "CH",
};

const getCountryCode = (country?: string): string => {
  if (!country) return "";
  const trimmed = country.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_CODES[trimmed.toLowerCase()] || trimmed;
};

const isGermanCountry = (country?: string): boolean => {
  if (!country) return false;
  const normalized = country.trim().toLowerCase();
  return (
    normalized === "germany" ||
    normalized === "de" ||
    normalized === "deutschland"
  );
};

const AddressBlock: React.FC<{ addr: any; emptyText: string }> = ({
  addr,
  emptyText,
}) => {
  if (!addr) return <div className="text-sm text-gray-400">{emptyText}</div>;
  const countryCode = getCountryCode(addr.country);
  const isGermany = isGermanCountry(addr.country);
  const cityLine = `${addr.postalCode || ""} ${addr.city || ""}`.trim();
  const addressLine = [
    addr.address || addr.street,
    cityLine,
    !isGermany ? countryCode : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-1 text-sm text-gray-700">
      {addr.legalName && <div>{addr.legalName}</div>}
      {addr.contactName && <div>{addr.contactName}</div>}
      {addressLine && (
        <div className="whitespace-normal break-words">{addressLine}</div>
      )}
      {addr.vatId && !isGermany && (
        <div className="text-gray-500">VAT ID: {addr.vatId}</div>
      )}
      {addr.contactPhone && (
        <div className="text-gray-500">Phone: {addr.contactPhone}</div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
      {label}
    </p>
    <div className="text-sm text-gray-900 break-words">{value || "—"}</div>
  </div>
);

const inputCls =
  "w-24 px-2 py-1 text-sm border border-gray-300/80 bg-white rounded-lg focus:ring-2 focus:ring-gray-500/50 focus:border-transparent transition-all text-right";

interface RechnungDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rechnung: any;
  isCorrection?: boolean;
  openQuantities?: Record<string, number>;
  onChanged?: () => void;
  onCorrectionCreated?: () => void;
  onSwitchTab?: (tab: string) => void;
  onSwitchToAuftrag?: (auftragId: string | number) => void;
  onSwitchToRechnung?: (rechnungId: string) => void;
  onSwitchToRechnungK?: (rechnungKId: string) => void;
}

const EditableCell: React.FC<{
  value: number | string;
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
      className={inputCls}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
    />
  );
};

const sortByCreatedAtDesc = (docs: any[]): any[] =>
  [...(docs || [])].sort((a, b) => {
    const timeA = new Date(a?.created_at || 0).getTime();
    const timeB = new Date(b?.created_at || 0).getTime();
    return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
  });

export default function RechnungDetailModal({
  isOpen,
  onClose,
  rechnung,
  isCorrection = false,
  openQuantities = {},
  onChanged,
  onCorrectionCreated,
  onSwitchTab,
  onSwitchToAuftrag,
  onSwitchToRechnung,
  onSwitchToRechnungK,
}: RechnungDetailModalProps) {
  const [data, setData] = useState<any>(rechnung);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [corrections, setCorrections] = useState<
    Record<string, { quantity: number; price: number }>
  >({});
  const [isCreating, setIsCreating] = useState(false);
  const linkedDocs = rechnung?.linkedDocuments || {};
  const auftragDocs = sortByCreatedAtDesc(linkedDocs.auftrag || []);
  const rechnungenKDocs = sortByCreatedAtDesc(linkedDocs.rechnungenK || []);
  const rechnungDocs = sortByCreatedAtDesc(linkedDocs.rechnung || []);

  useEffect(() => {
    setData(rechnung);
    setIsEditMode(false);
    // Initialize corrections with default values for items that have open quantity
    if (rechnung?.items) {
      const initialCorrections: Record<
        string,
        { quantity: number; price: number }
      > = {};
      rechnung.items.forEach((item: any) => {
        const openQty = openQuantities[item.id] || 0;
        if (openQty > 0) {
          initialCorrections[item.id] = {
            quantity: openQty,
            price: Number(item.price) || 0,
          };
        }
      });
      setCorrections(initialCorrections);
    }
  }, [rechnung, openQuantities]);

  if (!isOpen || !data) return null;

  const items = data.items || [];
  const netTotal = Number(data.subtotal ?? 0);
  const taxAmount = Number(data.tax_amount ?? 0);
  const grossTotal = Number(data.total_amount ?? 0);
  const taxRate = Number(data.tax_rate ?? 19);

  const invoiceNumber = data.invoice_number || data.rk_number || data.id;
  const companyName =
    data.customer?.company_name || data.customerSnapshot?.companyName || "—";
  const auftragNo = data.auftrag_no || "—";
  const deliveryDate = data.delivery_date || "";

  const netWeightKg = items.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity) || 1;
    return sum + (Number(it.weight) || 0) * qty;
  }, 0);
  const extraWeightKg = items.reduce(
    (sum: number, it: any) => sum + (Number(it.extraWeight) || 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  const rechnungCustomer = data.customer || {};
  const snapshot = data.customerSnapshot || null;

  const billingAddr = {
    legalName: companyName,
    contactName: snapshot?.contactName,
    address:
      snapshot?.address || snapshot?.street || rechnungCustomer.bill_to_address,
    postalCode: snapshot?.postalCode,
    city: snapshot?.city || rechnungCustomer.city,
    country: snapshot?.country || rechnungCustomer.country,
    vatId: snapshot?.vatId || rechnungCustomer.tax_number,
    contactPhone: snapshot?.contactPhoneNumber || rechnungCustomer.phone,
  };

  const deliveryAddressRaw = data.deliveryAddress || null;
  const deliveryAddr =
    deliveryAddressRaw ||
    (rechnungCustomer.ship_to_address
      ? { street: rechnungCustomer.ship_to_address }
      : null);

  const handleCorrectionChange = (
    itemId: string,
    field: "quantity" | "price",
    value: number,
  ) => {
    setCorrections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleCreateCorrections = async () => {
    // Build corrections array from the corrections state
    const correctionsArray = Object.entries(corrections)
      .filter(([itemId, corr]) => {
        const openQty = openQuantities[itemId] || 0;
        // Only include if quantity > 0 and doesn't exceed open quantity
        return corr.quantity > 0 && corr.quantity <= openQty;
      })
      .map(([itemId, corr]) => ({
        itemId,
        quantity: corr.quantity,
        price: corr.price,
      }));

    if (correctionsArray.length === 0) {
      toast.error(
        "No valid corrections to create. Please set quantity > 0 for at least one item.",
        errorStyles,
      );
      return;
    }

    // Validate all corrections
    const validationErrors: string[] = [];
    for (const corr of correctionsArray) {
      const openQty = openQuantities[corr.itemId] || 0;
      if (corr.quantity > openQty) {
        const item = items.find((i: any) => i.id === corr.itemId);
        validationErrors.push(
          `Item "${item?.item_name || corr.itemId}": Cannot correct ${corr.quantity} units. Only ${openQty} units remain uncorrected.`,
        );
      }
      if (corr.price < 0) {
        validationErrors.push(
          `Item "${corr.itemId}": Price cannot be negative.`,
        );
      }
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors.join("\n"), errorStyles);
      return;
    }

    setIsCreating(true);
    try {
      const res: any = await createRechnungKFromRechnung(
        data.id,
        correctionsArray,
      );

      if (res?.success) {
        toast.success(
          `Correction invoice created successfully with ${correctionsArray.length} item(s)!`,
          successStyles,
        );

        // Close the modal
        onClose();

        // Switch to RK tab
        if (onSwitchTab) {
          onSwitchTab("rk");
        }

        // Notify parent to refresh data
        if (onCorrectionCreated) {
          onCorrectionCreated();
        }
        if (onChanged) {
          onChanged();
        }
      } else {
        const errorMsg = res?.message || "Failed to create correction invoice.";
        toast.error(errorMsg, errorStyles);
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to create correction invoice.";
      toast.error(errorMsg, errorStyles);
    } finally {
      setIsCreating(false);
    }
  };

  const commitItemChange = async (
    item: any,
    field: "quantity" | "price",
    raw: string,
  ) => {
    if (!isCorrection) {
      toast.error(
        "Edits are only allowed on correction invoices (RK).",
        errorStyles,
      );
      return;
    }

    const parsed = Number(raw.replace(",", "."));
    if (isNaN(parsed)) {
      toast.error(
        field === "quantity"
          ? "Quantity must be a number."
          : "Price must be a number.",
        errorStyles,
      );
      return;
    }
    if (field === "quantity" && parsed <= 0) {
      toast.error("Quantity must be greater than 0.", errorStyles);
      return;
    }
    if (field === "price" && parsed < 0) {
      toast.error("Price cannot be negative.", errorStyles);
      return;
    }

    const currentVal = Number(item[field]);
    if (currentVal === parsed) return;

    setSavingItemId(item.id);
    try {
      const res: any = await updateRechnungKItem(data.id, item.id, {
        [field]: parsed,
      });
      const payload = res?.data ?? res;
      if (payload?.rechnungK) {
        setData(payload.rechnungK);
      }
      toast.success("Line item updated.", successStyles);
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update line item.", errorStyles);
    } finally {
      setSavingItemId(null);
    }
  };

  // Check if all items are fully corrected (no open quantity)
  const allItemsFullyCorrected = items.every((item: any) => {
    const openQty = openQuantities[item.id] || 0;
    return openQty <= 0;
  });

  // Check if any item has corrections
  const hasCorrections = Object.values(corrections).some(
    (corr) => corr.quantity > 0,
  );

  // Get total items being corrected
  const totalItemsToCorrect = Object.values(corrections).filter(
    (corr) => corr.quantity > 0,
  ).length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-[#8CC21B] shrink-0" />
              <p className="text-lg font-bold text-gray-900 truncate">
                {isCorrection
                  ? `RK ${invoiceNumber}`
                  : `Rechnung ${invoiceNumber}`}
              </p>
              {isCorrection && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">
                  Correction Invoice
                </span>
              )}
              {!isCorrection && allItemsFullyCorrected && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                  Fully Corrected
                </span>
              )}
              {!isCorrection && !allItemsFullyCorrected && hasCorrections && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                  {totalItemsToCorrect} item(s) to correct
                </span>
              )}
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {companyName}
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {isCorrection && (
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  isEditMode
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isEditMode ? (
                  <>
                    <X className="w-4 h-4" />
                    Exit Edit
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    Edit Mode
                  </>
                )}
              </button>
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
          {/* Bulk Correction Actions */}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            <div className="md:col-span-1 flex flex-col gap-3">
              <div className="block mb-1">
                <AddressBlock
                  addr={billingAddr}
                  emptyText="No customer snapshot."
                />
              </div>
              {deliveryAddr && (
                <div className="block mb-1">
                  <span className="text-sm font-bold text-gray-900">
                    Delivery:
                  </span>
                  <AddressBlock
                    addr={deliveryAddr}
                    emptyText="No delivery address set."
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="AUFTRAG NO" value={auftragNo} />
              <Field label="TAX PROFILE" value={`DE-VAT (${taxRate}%)`} />
              <Field
                label="Delivery Date"
                value={deliveryDate ? formatDate(deliveryDate) : ""}
              />
              <Field label="Payment method" value={data.payment_method} />
              <Field label="Payment terms" value={data.payment_terms} />
              <Field label="Shipping method" value={data.shipping_method} />
            </div>
          </div>

          <div className="space-y-2">
            {/* {isCorrection && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                Only Quantity and Price can be changed on a correction invoice.
                All other fields are copied from the original Rechnung and are
                fixed.
              </p>
            )} */}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-10">
                      Pos
                    </th>

                    {isCorrection && (
                      <th className="px-2 py-2 text-left font-semibold text-gray-600 w-12">
                        Pic
                      </th>
                    )}
                    <th className="px-2 py-2 text-left font-semibold text-gray-600 w-28">
                      Art.-Nr.
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600">
                      Bezeichnung
                    </th>
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">
                      MwSt.
                    </th>
                    {!isCorrection ? (
                      <>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-20">
                          Open Qty
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-28">
                          Qty
                        </th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-32">
                          Price
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                          Menge
                        </th>
                        <th className="px-2 py-2 text-right font-semibold text-gray-600 w-32">
                          Netto-Preis
                        </th>
                      </>
                    )}
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Netto gesamt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={isCorrection ? 8 : 8}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                  {items.map((item: any, idx: number) => {
                    const qty = Number(item.quantity) || 1;
                    const unitPrice = Number(item.price) || 0;
                    const lineTotal =
                      Number(item.total_price) || qty * unitPrice;
                    const lineTaxRate = Number(item.taxRate ?? taxRate);
                    const isSaving = savingItemId === item.id;
                    const openQty = openQuantities[item.id] || 0;
                    const isFullyCorrected = openQty <= 0;
                    const correction = corrections[item.id] || {
                      quantity: 0,
                      price: unitPrice,
                    };
                    const isRowDisabled = isFullyCorrected;

                    return (
                      <tr
                        key={item.id || idx}
                        className={
                          isRowDisabled && !isCorrection
                            ? "bg-gray-50 opacity-60"
                            : ""
                        }
                      >
                        <td className="px-2 py-2 text-gray-500">{idx + 1}</td>

                        {isCorrection && (
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
                        )}
                        <td className="px-2 py-2">
                          {item.itemNo || item.material || "—"}
                        </td>
                        <td className="px-2 py-2">
                          {item.item_name || "Line Item"}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {lineTaxRate}%
                        </td>
                        {!isCorrection ? (
                          <>
                            {!isCorrection && (
                              <td className="px-2 py-2 text-center">
                                <span
                                  className={`font-semibold ${
                                    isFullyCorrected
                                      ? "text-green-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {openQty}
                                </span>
                              </td>
                            )}
                            <td className="px-2 py-2 text-center">
                              {!isFullyCorrected ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={openQty}
                                  step="1"
                                  value={correction.quantity}
                                  onChange={(e) =>
                                    handleCorrectionChange(
                                      item.id,
                                      "quantity",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-center"
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {!isFullyCorrected ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={correction.price}
                                  onChange={(e) =>
                                    handleCorrectionChange(
                                      item.id,
                                      "price",
                                      Number(e.target.value),
                                    )
                                  }
                                  className="w-28 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-right"
                                />
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2">
                              <div className="flex justify-end items-center gap-1">
                                {isSaving && (
                                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                )}
                                {isCorrection && isEditMode ? (
                                  <EditableCell
                                    value={qty}
                                    disabled={isSaving}
                                    onCommit={(raw) =>
                                      commitItemChange(item, "quantity", raw)
                                    }
                                  />
                                ) : (
                                  <span className="text-right font-medium">
                                    {qty}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex justify-end">
                                {isCorrection && isEditMode ? (
                                  <EditableCell
                                    value={unitPrice}
                                    disabled={isSaving}
                                    onCommit={(raw) =>
                                      commitItemChange(item, "price", raw)
                                    }
                                  />
                                ) : (
                                  <span className="font-medium">
                                    {formatDeCurrency(unitPrice)}
                                  </span>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                        <td className="px-2 py-2 text-right font-medium">
                          {formatDeCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Net weight (items)"
                value={formatWeight(netWeightKg)}
              />
              <Field label="Extra weight" value={formatWeight(extraWeightKg)} />
              <Field label="Total weight" value={formatWeight(totalWeightKg)} />
            </div>
            <div className="max-w-sm ml-auto w-full space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatDeCurrency(netTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">MwSt. ({taxRate}%)</span>
                <span className="font-medium">
                  {formatDeCurrency(taxAmount)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatDeCurrency(grossTotal)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 px-2 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-900">
                Linked documents
              </h3>
            </div>
            {auftragDocs.length === 0 &&
            rechnungenKDocs.length === 0 &&
            rechnungDocs.length === 0 ? (
              <p className="text-sm text-gray-500">No linked documents yet.</p>
            ) : (
              <div className="space-y-3">
                {!isCorrection && auftragDocs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Auftrag
                    </p>
                    {auftragDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onSwitchToAuftrag?.(doc.id);
                          }}
                          className="text-sm font-medium text-[#8CC21B] hover:text-[#7ab318] hover:underline flex items-center gap-1"
                        >
                          {doc.order_no}{" "}
                          <span className="text-xs text-gray-400">→</span>
                        </button>
                        <span className="text-gray-400 text-xs">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {!isCorrection && rechnungenKDocs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      RK
                    </p>
                    {rechnungenKDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onSwitchToRechnungK?.(doc.id);
                          }}
                          className="text-sm font-medium text-[#8CC21B] hover:text-[#7ab318] hover:underline flex items-center gap-1"
                        >
                          {doc.invoice_number}{" "}
                          <span className="text-xs text-gray-400">→</span>
                        </button>
                        <span className="text-gray-400 text-xs">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {isCorrection && rechnungDocs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Rechnung
                    </p>
                    {rechnungDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onSwitchToRechnung?.(doc.id);
                          }}
                          className="text-sm font-medium text-[#8CC21B] hover:text-[#7ab318] hover:underline flex items-center gap-1"
                        >
                          {doc.invoice_number}{" "}
                          <span className="text-xs text-gray-400">→</span>
                        </button>
                        <span className="text-gray-400 text-xs">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {isCorrection && auftragDocs.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Auftrag
                    </p>
                    {auftragDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center text-gray-700 hover:bg-gray-50 -mx-1 px-1 py-0.5 rounded"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onSwitchToAuftrag?.(doc.id);
                          }}
                          className="text-sm font-medium text-[#8CC21B] hover:text-[#7ab318] hover:underline flex items-center gap-1"
                        >
                          {doc.order_no}{" "}
                          <span className="text-xs text-gray-400">→</span>
                        </button>
                        <span className="text-gray-400 text-xs">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t gap-3 border-gray-200 flex justify-end items-center flex-shrink-0">
          <button
            onClick={handleCreateCorrections}
            disabled={isCreating || !hasCorrections}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition flex items-center gap-2 ${
              hasCorrections && !isCreating
                ? "bg-[#8CC21B] text-white hover:bg-[#7ab318]"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create RK"
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
