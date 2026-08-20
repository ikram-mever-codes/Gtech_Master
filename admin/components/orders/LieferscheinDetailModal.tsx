"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, FileText, Pencil, Save, X, Truck, Copy } from "lucide-react";
import { formatDate } from "@/utils/date";
import { updateLieferscheinStatus } from "@/api/lieferscheine";

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

interface LieferscheinDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lieferschein: any;
  onChanged?: () => void;
}

export default function LieferscheinDetailModal({
  isOpen,
  onClose,
  lieferschein,
  onChanged,
}: LieferscheinDetailModalProps) {
  const [data, setData] = useState<any>(lieferschein);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<string>("");

  useEffect(() => {
    setData(lieferschein);
    setIsEditMode(false);
    if (lieferschein?.date) {
      setDeliveryDate(lieferschein.date);
    }
  }, [lieferschein]);

  if (!isOpen || !data) return null;

  const items = data.items || [];
  const customer = data.customer || {};
  const snapshot = data.customerSnapshot || {};

  const companyName = snapshot.companyName || customer.company_name || "—";
  const deliveryNoteNo = data.deliveryNoteNo || data.id;
  const invoiceNumber = data.invoiceNumber || "—";
  const orderNumber = data.orderNumber || "—";
  const status = data.status || "open";
  const date = data.date || "";
  const highlightColor = data.highlightColor || "";

  // Calculate weights from items
  const netWeightKg = items.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity) || 1;
    return sum + (Number(it.weight) || 0) * qty;
  }, 0);
  const extraWeightKg = items.reduce(
    (sum: number, it: any) => sum + (Number(it.extraWeight) || 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  const billingAddr = {
    legalName: companyName,
    contactName: customer.contactName || snapshot.contactName,
    address:
      customer.billToAddress || snapshot.address || customer.bill_to_address,
    postalCode: customer.postalCode || snapshot.postalCode,
    city: customer.city || snapshot.city,
    country: customer.country || snapshot.country,
    vatId: customer.taxNumber || snapshot.vatId || customer.tax_number,
    contactPhone:
      customer.phone || snapshot.phone || customer.contactPhoneNumber,
  };

  const deliveryAddr = {
    street:
      customer.shipToAddress || snapshot.street || customer.ship_to_address,
    city: customer.city || snapshot.city || customer.deliveryCity,
    postalCode: customer.postalCode || snapshot.postalCode,
    country: customer.country || snapshot.country,
    contactName: customer.contactName || snapshot.contactName,
    contactPhone:
      customer.phone || snapshot.phone || customer.contactPhoneNumber,
  };

  const handleSaveDeliveryDate = async () => {
    if (!deliveryDate) {
      toast.error("Please select a delivery date.", errorStyles);
      return;
    }

    setIsSaving(true);
    try {
      // Update the Lieferschein status or date via API
      // Note: You may need to add a dedicated API endpoint for updating delivery date
      await updateLieferscheinStatus(data.id, status);
      toast.success("Delivery date updated successfully.", successStyles);
      onChanged?.();
      setIsEditMode(false);
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to update delivery date.",
        errorStyles,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "bg-blue-100 text-blue-700";
      case "in progress":
      case "processing":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Truck className="w-5 h-5 text-[#8CC21B] shrink-0" />
              <p className="text-lg font-bold text-gray-900 truncate">
                Lieferschein {deliveryNoteNo}
              </p>
              {/* <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getStatusColor(
                  status,
                )}`}
              >
                {status}
              </span> */}
              {highlightColor && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold text-white"
                  style={{ backgroundColor: highlightColor }}
                >
                  Priority
                </span>
              )}
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5 flex items-center gap-1">
              <span>{companyName}</span>
              {companyName && companyName !== "—" && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(companyName);
                    toast.success("Title copied to clipboard!");
                  }}
                  className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                  title="Copy Title"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
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
          {/* Edit Mode Banner */}
          {isEditMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
              <Save className="w-4 h-4" />
              <span>
                <strong>Edit Mode Enabled:</strong> You can modify the delivery
                date. Click "Save" to apply changes.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            <div className="md:col-span-1 flex flex-col gap-3">
              <div className="block mb-1">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Bill To
                </p>
                <AddressBlock
                  addr={billingAddr}
                  emptyText="No customer snapshot."
                />
              </div>
              {deliveryAddr && (
                <div className="block mb-1">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Ship To
                  </p>
                  <AddressBlock
                    addr={deliveryAddr}
                    emptyText="No delivery address set."
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Invoice No" value={invoiceNumber} />
              <Field label="Order No" value={orderNumber} />
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">
                  Delivery Date
                </p>
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSaveDeliveryDate}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-[#8CC21B] text-white text-sm font-semibold rounded-lg hover:bg-[#7ab318] transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-900">
                    {date ? formatDate(date) : "—"}
                  </div>
                )}
              </div>
              <Field label="Items Count" value={items.length || "—"} />
            </div>
          </div>

          <div className="space-y-2">
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
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Menge
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-32">
                      Weight
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-600">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                  {items.map((item: any, idx: number) => {
                    const qty = Number(item.quantity) || 1;
                    const weight = Number(item.weight) || 0;
                    const totalWeight = qty * weight;

                    return (
                      <tr key={item.id || idx}>
                        <td className="px-2 py-2 text-gray-500">{idx + 1}</td>
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
                          {item.itemNo || item.material || "—"}
                        </td>
                        <td className="px-2 py-2">
                          {item.itemName || item.item_name || "Line Item"}
                        </td>
                        <td className="px-2 py-2 text-right font-medium">
                          {qty}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {formatWeight(totalWeight)}
                        </td>
                        <td className="px-2 py-2 text-gray-500">
                          {item.remark || item.notes || "—"}
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
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium">{items.length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  Comment intern
                  {(data.internal_notes || data.internalNotes) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(data.internal_notes || data.internalNotes || "");
                        toast.success("Internal comment copied to clipboard!");
                      }}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                      title="Copy Internal Comment"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {data.internal_notes || data.internalNotes || "—"}
              </p>
            </div>

            <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Pencil className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  Comment extern
                  {(data.notes || data.comment || data.notes_external || data.remark) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(data.notes || data.comment || data.notes_external || data.remark || "");
                        toast.success("External comment copied to clipboard!");
                      }}
                      className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer font-normal"
                      title="Copy External Comment"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                {data.notes || data.comment || data.notes_external || data.remark || "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end items-center flex-shrink-0">
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
