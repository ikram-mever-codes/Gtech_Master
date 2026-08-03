"use client";

import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import { errorStyles, successStyles } from "@/utils/constants";
import { Loader2, FileText } from "lucide-react";
import { updateRechnungKItem } from "@/api/rechnungen_k";
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

/** Same address rendering as RechnungDetailModal/AuftragPreviewModal —
 * always read-only here, correction invoices never edit the address. */
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

interface RechnungKPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rechnungK: any;
  onSuccess?: () => void;
}

const EditableCell: React.FC<{
  value: number | string;
  disabled?: boolean;
  onCommit: (raw: string) => void;
}> = ({ value, disabled, onCommit }) => {
  const [local, setLocal] = useState(String(value ?? ""));
  React.useEffect(() => {
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

export default function RechnungKPreviewModal({
  isOpen,
  onClose,
  rechnungK,
  onSuccess,
}: RechnungKPreviewModalProps) {
  const [data, setData] = useState<any>(rechnungK);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  React.useEffect(() => {
    setData(rechnungK);
  }, [rechnungK]);

  if (!isOpen || !data) return null;

  const invoiceItems: any[] = data.items || [];

  const rechnungCustomer = data.customer || {};
  const snapshot = data.customerSnapshot || null;

  const companyName =
    snapshot?.legalName ||
    snapshot?.companyName ||
    rechnungCustomer.company_name ||
    "—";

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

  const netTotal = Number(data.subtotal ?? 0);
  const taxAmount = Number(data.tax_amount ?? 0);
  const grossTotal = Number(data.total_amount ?? 0);
  const taxRate = Number(data.tax_rate ?? 19);

  const invoiceNumber = data.invoice_number || data.id;
  const originalInvoiceNumber = data.original_rechnung_id ? "—" : "—";
  const auftragNo = data.auftrag_no || "—";
  const deliveryDate = data.delivery_date || "";

  const netWeightKg = invoiceItems.reduce((sum, it) => {
    const qty = Number(it.quantity) || 1;
    return sum + (Number(it.weight) || 0) * qty;
  }, 0);
  const extraWeightKg = invoiceItems.reduce(
    (sum, it) => sum + (Number(it.extraWeight) || 0),
    0,
  );
  const totalWeightKg = netWeightKg + extraWeightKg;

  const commitItemChange = async (
    item: any,
    field: "quantity" | "price",
    raw: string,
  ) => {
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
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update line item.", errorStyles);
    } finally {
      setSavingItemId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between flex-shrink-0 select-none">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-[#8CC21B] shrink-0" />
              <p className="text-lg font-bold text-gray-900 truncate">
                RK {invoiceNumber}
              </p>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">
                Correction Invoice
              </span>
            </div>
            <h2 className="text-sm font-medium text-gray-500 truncate mt-0.5">
              {companyName}
            </h2>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
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
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              Only Quantity and Price can be changed on a correction invoice.
              All other fields are copied from the original Rechnung and are
              fixed.
            </p>
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
                    <th className="px-2 py-2 text-center font-semibold text-gray-600 w-16">
                      MwSt.
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Menge
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-32">
                      Netto-Preis
                    </th>
                    <th className="px-2 py-2 text-right font-semibold text-gray-600 w-28">
                      Netto gesamt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoiceItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-6 text-sm text-gray-500"
                      >
                        No line items found.
                      </td>
                    </tr>
                  )}
                  {invoiceItems.map((item: any, idx: number) => {
                    const qty = Number(item.quantity) || 1;
                    const unitPrice = Number(item.price) || 0;
                    const lineTotal =
                      Number(item.total_price) || qty * unitPrice;
                    const lineTaxRate = Number(item.taxRate ?? taxRate);
                    const isSaving = savingItemId === item.id;

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
                          {item.item_name || "Line Item"}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600">
                          {lineTaxRate}%
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end items-center gap-1">
                            {isSaving && (
                              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                            )}
                            <EditableCell
                              value={qty}
                              disabled={isSaving}
                              onCommit={(raw) =>
                                commitItemChange(item, "quantity", raw)
                              }
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end">
                            <EditableCell
                              value={unitPrice}
                              disabled={isSaving}
                              onCommit={(raw) =>
                                commitItemChange(item, "price", raw)
                              }
                            />
                          </div>
                        </td>
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
