"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, FileText, Pencil, Save, X, Truck, Calendar, CheckCircle, Ban } from "lucide-react";
import { formatDate } from "@/utils/date";
import {
  updateLieferscheinStatus,
  confirmLieferscheinDelivery,
  stornierLieferschein,
} from "@/api/lieferscheine";
import ViewEditToggle from "@/components/UI/ViewEditToggle";

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

const formatFullDate = (val: any): string => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
};

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

  return (
    <div className="space-y-0.5 text-sm text-gray-700">
      {addr.legalName && <div className="font-medium">{addr.legalName}</div>}
      {addr.contactName && <div>{addr.contactName}</div>}
      {(addr.address || addr.street) && <div>{addr.address || addr.street}</div>}
      {(addr.postalCode || addr.city) && (
        <div>{[addr.postalCode, addr.city].filter(Boolean).join(" ")}</div>
      )}
      {!isGermany && countryCode && <div>{countryCode}</div>}
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

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "vorläufig":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "bestätigt":
    case "open":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "storniert":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

interface ConfirmDeliveryPopupProps {
  deliveryNoteNo: string;
  title: string;
  customerDisplayName: string;
  deliveryDate: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ConfirmDeliveryPopup: React.FC<ConfirmDeliveryPopupProps> = ({
  deliveryNoteNo,
  title,
  customerDisplayName,
  deliveryDate,
  onConfirm,
  onCancel,
  isLoading,
}) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
        <h3 className="text-base font-bold text-gray-900">Lieferung bestätigen</h3>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-6">
        Wurde Lieferung <strong>{deliveryNoteNo}</strong>{title ? ` – ${title}` : ""} an Kunde{" "}
        <strong>{customerDisplayName}</strong> erfolgreich am{" "}
        <strong>{deliveryDate}</strong> geliefert?
      </p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Ja, bestätigen
        </button>
      </div>
    </div>
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

  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [pendingDeliveryDate, setPendingDeliveryDate] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState<string>("");

  const [showStornierConfirm, setShowStornierConfirm] = useState(false);
  const [isStorniering, setIsStorniering] = useState(false);

  useEffect(() => {
    setData(lieferschein);
    setIsEditMode(false);
    if (lieferschein?.date) {
      setDeliveryDate(lieferschein.date);
    }
    const today = new Date().toISOString().split("T")[0];
    setPickedDate(today);
  }, [lieferschein]);

  if (!isOpen || !data) return null;

  const items = data.items || [];
  const customer = data.customer || {};
  const snapshot = data.customerSnapshot || {};

  const companyName = snapshot.companyName || customer.company_name || "—";
  const displayName =
    snapshot.displayName ||
    snapshot.display_name ||
    customer.display_name ||
    customer.displayName ||
    companyName;
  const docTitle =
    data.title ||
    data.auftragTitle ||
    data.orderTitle ||
    items[0]?.itemName ||
    items[0]?.item_name ||
    "";
  const deliveryNoteNo = data.deliveryNoteNo || data.id;
  const invoiceNumber = data.invoiceNumber || "—";
  const orderNumber = data.orderNumber || "—";
  const status = data.status || "vorläufig";
  const date = data.date || "";
  const highlightColor = data.highlightColor || "";
  const confirmedAt = data.confirmedAt || data.confirmed_at;
  const confirmedBy = data.confirmedBy || data.confirmed_by;

  const netWeightKg = items.reduce((sum: number, it: any) => {
    const qty = Number(it.quantity) || 1;
    return sum + (Number(it.weight) || 0) * qty / 1000;
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
      customer.billToAddress || snapshot.billToAddress || customer.bill_to_address || snapshot.address,
    postalCode: customer.postalCode || snapshot.postalCode,
    city: customer.city || snapshot.city,
    country: customer.country || snapshot.country,
    vatId: customer.taxNumber || snapshot.vatId || customer.tax_number,
    contactPhone:
      customer.phone || snapshot.phone || customer.contactPhoneNumber,
  };

  const deliveryAddr = data.deliveryAddress
    ? {
      legalName: data.deliveryAddress.addressName,
      contactName: data.deliveryAddress.contactName,
      street: data.deliveryAddress.street,
      postalCode: data.deliveryAddress.postalCode,
      city: data.deliveryAddress.city,
      country: data.deliveryAddress.country,
      contactPhone: data.deliveryAddress.contactPhone,
    }
    : {
      street: customer.shipToAddress || snapshot.street || customer.ship_to_address,
      city: customer.city || snapshot.city || customer.deliveryCity,
      postalCode: customer.postalCode || snapshot.postalCode,
      country: customer.country || snapshot.country,
      contactName: customer.contactName || snapshot.contactName,
      contactPhone: customer.phone || snapshot.phone || customer.contactPhoneNumber,
    };

  const handleSaveDeliveryDate = async () => {
    if (!deliveryDate) {
      toast.error("Please select a delivery date.", errorStyles);
      return;
    }
    setIsSaving(true);
    try {
      await updateLieferscheinStatus(data.id, status);
      toast.success("Delivery date updated successfully.", successStyles);
      onChanged?.();
      setIsEditMode(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update delivery date.", errorStyles);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLieferdatumHeute = () => {
    const today = new Date().toISOString().split("T")[0];
    setPendingDeliveryDate(today);
    setShowConfirmPopup(true);
  };

  const handleBestaetigeLieferdatum = () => {
    if (!pickedDate) return;
    setPendingDeliveryDate(pickedDate);
    setShowDatePicker(false);
    setShowConfirmPopup(true);
  };

  const handleConfirmDelivery = async () => {
    setIsConfirming(true);
    try {
      const result = await confirmLieferscheinDelivery(data.id, pendingDeliveryDate);
      toast.success("Lieferung erfolgreich bestätigt!", successStyles);
      setData((prev: any) => ({
        ...prev,
        status: "bestätigt",
        date: pendingDeliveryDate,
        confirmed_at: new Date().toISOString(),
        confirmed_by: result?.data?.confirmed_by || "",
      }));
      setShowConfirmPopup(false);
      onChanged?.();
    } catch (error: any) {
      toast.error(error?.message || "Fehler beim Bestätigen.", errorStyles);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleStornieren = async () => {
    setIsStorniering(true);
    try {
      await stornierLieferschein(data.id);
      toast.success("Lieferschein wurde storniert.", successStyles);
      setData((prev: any) => ({ ...prev, status: "storniert" }));
      setShowStornierConfirm(false);
      onChanged?.();
    } catch (error: any) {
      toast.error(error?.message || "Fehler beim Stornieren.", errorStyles);
    } finally {
      setIsStorniering(false);
    }
  };

  return (
    <>
      {showConfirmPopup && (
        <ConfirmDeliveryPopup
          deliveryNoteNo={deliveryNoteNo}
          title={docTitle}
          customerDisplayName={displayName}
          deliveryDate={formatFullDate(pendingDeliveryDate)}
          onConfirm={handleConfirmDelivery}
          onCancel={() => setShowConfirmPopup(false)}
          isLoading={isConfirming}
        />
      )}

      {showStornierConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="w-6 h-6 text-rose-500 shrink-0" />
              <h3 className="text-base font-bold text-gray-900">Lieferschein stornieren?</h3>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Möchten Sie Lieferschein <strong>{deliveryNoteNo}</strong> wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowStornierConfirm(false)} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleStornieren}
                disabled={isStorniering}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isStorniering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Stornieren
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Truck className="w-5 h-5 text-[#8CC21B] shrink-0" />
                <p className="text-lg font-bold text-gray-900 truncate">
                  Lieferschein {deliveryNoteNo}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getStatusColor(status)}`}>
                  {status === "open" ? "bestätigt" : status}
                </span>
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
                <span>{docTitle || "—"}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(docTitle || "");
                    toast.success("Copied to clipboard!");
                  }}
                  className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded cursor-pointer shrink-0"
                  title="Copy"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {status === "vorläufig" && (
                <>
                  <button
                    type="button"
                    onClick={handleLieferdatumHeute}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all"
                    title="Setzt heute als Lieferdatum und bestätigt"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Lieferdatum HEUTE
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all"
                      title="Datum wählen und bestätigen"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      bestätige Lieferdatum
                    </button>
                    {showDatePicker && (
                      <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-10 min-w-[220px]">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Lieferdatum wählen</p>
                        <input
                          type="date"
                          value={pickedDate}
                          onChange={(e) => setPickedDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg mb-2"
                        />
                        <button
                          onClick={handleBestaetigeLieferdatum}
                          className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                        >
                          Bestätigen
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              <ViewEditToggle
                isEditEnabled={isEditMode}
                onToggle={() => setIsEditMode(!isEditMode)}
              />
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
            {isEditMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-blue-700">
                <Save className="w-4 h-4" />
                <span>
                  <strong>Edit Mode Enabled:</strong> You can modify the delivery
                  date. Click &quot;Save&quot; to apply changes.
                </span>
              </div>
            )}

            {status === "bestätigt" && confirmedAt && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  Bestätigt von <strong>{confirmedBy || "—"}</strong> am{" "}
                  <strong>{formatFullDate(confirmedAt)}</strong>
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

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-4">
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
                      {date ? formatFullDate(date) : "—"}
                    </div>
                  )}
                </div>
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
                      const weight = (Number(item.weight) || 0) / 1000;
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field
                label="Net weight (items)"
                value={formatWeight(netWeightKg)}
              />
              <Field label="Extra weight" value={formatWeight(extraWeightKg)} />
              <Field label="Total weight" value={formatWeight(totalWeightKg)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-lg px-2 p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Pencil className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1">
                    Comment intern
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
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
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
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  {data.notes || data.comment || data.notes_external || data.remark || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
            <div>
              {status === "vorläufig" && (
                <button
                  type="button"
                  onClick={() => setShowStornierConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all"
                >
                  <Ban className="w-4 h-4" />
                  Stornieren
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
